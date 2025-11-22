import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = "http://localhost:3001/api/nodes";
const API_URL_COLLECTIONS = "http://localhost:3001/api/collections";

function App() {
  const [nodes, setNodes] = useState([]);
  const [formData, setFormData] = useState({ ip_address: '', port: '', collection_id: '', name: '', notes: '' });
  const [editingId, setEditingId] = useState(null);
  // Collections state
  const [collections, setCollections] = useState([]);
  const [collectionForm, setCollectionForm] = useState({ name: '', cidr: '' });
  const [editingCollectionId, setEditingCollectionId] = useState(null);

  // Client-side CIDR/IP helpers (lightweight)
  const ipToInt = (ip) => ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
  const parseCIDR = (cidr) => {
    const parts = cidr.split('/');
    if (parts.length !== 2) return null;
    const ip = parts[0];
    const prefix = parseInt(parts[1], 10);
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(ip) || isNaN(prefix) || prefix < 0 || prefix > 32) return null;
    const ipInt = ipToInt(ip);
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    const network = ipInt & mask;
    return { network, mask, prefix };
  };
  const ipInCIDR = (ip, cidr) => {
    const parsed = parseCIDR(cidr);
    if (!parsed) return false;
    const ipInt = ipToInt(ip);
    return (ipInt & parsed.mask) === parsed.network;
  };
  const isRFC1918CIDR = (cidr) => {
    const parsed = parseCIDR(cidr);
    if (!parsed) return false;
    const { network } = parsed;
    const tenNet = ipToInt('10.0.0.0');
    const tenMask = (~0 << (32 - 8)) >>> 0;
    if ((network & tenMask) === (tenNet & tenMask)) return true;
    const a172 = ipToInt('172.16.0.0');
    const a172Mask = (~0 << (32 - 12)) >>> 0;
    if ((network & a172Mask) === (a172 & a172Mask)) return true;
    const n192 = ipToInt('192.168.0.0');
    const n192Mask = (~0 << (32 - 16)) >>> 0;
    if ((network & n192Mask) === (n192 & n192Mask)) return true;
    return false;
  };

  // Fetch data on load
  useEffect(() => {
    fetchNodes();
    fetchCollections();
  }, []);

  const fetchNodes = async () => {
    try {
      const response = await axios.get(API_URL);
      setNodes(response.data.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  /* Collections API */
  const fetchCollections = async () => {
    try {
      const response = await axios.get(API_URL_COLLECTIONS);
      setCollections(response.data.data);
    } catch (error) {
      console.error("Error fetching collections:", error);
    }
  };

  const handleCollectionChange = (e) => {
    setCollectionForm({ ...collectionForm, [e.target.name]: e.target.value });
  };

  const handleCollectionSubmit = async (e) => {
    e.preventDefault();
    if (!collectionForm.name || !collectionForm.cidr) return alert("Fill all fields");
    if (!parseCIDR(collectionForm.cidr)) return alert('Invalid CIDR format');
    if (!isRFC1918CIDR(collectionForm.cidr)) return alert('CIDR must be within RFC1918 private ranges');
    // ensure no overlap with existing collections (exclude current if editing)
    const newRange = (() => {
      const p = parseCIDR(collectionForm.cidr);
      return { start: p.network >>> 0, end: (p.network | ((~p.mask) >>> 0)) >>> 0 };
    })();
    for (const c of collections) {
      if (editingCollectionId && c.id === editingCollectionId) continue;
      const p = parseCIDR(c.cidr);
      if (!p) continue;
      const r = { start: p.network >>> 0, end: (p.network | ((~p.mask) >>> 0)) >>> 0 };
      if (newRange.start <= r.end && r.start <= newRange.end) return alert('CIDR overlaps existing collection');
    }
    try {
      if (editingCollectionId) {
        await axios.put(`${API_URL_COLLECTIONS}/${editingCollectionId}`, collectionForm);
        setEditingCollectionId(null);
      } else {
        await axios.post(API_URL_COLLECTIONS, collectionForm);
      }
      setCollectionForm({ name: '', cidr: '' });
      fetchCollections();
    } catch (error) {
      console.error("Error saving collection:", error);
    }
  };

  const handleCollectionEdit = (c) => {
    setEditingCollectionId(c.id);
    setCollectionForm({ name: c.name, cidr: c.cidr });
  };

  const handleCollectionDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`${API_URL_COLLECTIONS}/${id}`);
      fetchCollections();
    } catch (error) {
      console.error("Error deleting collection:", error);
    }
  };

  const handleCollectionCancel = () => {
    setEditingCollectionId(null);
    setCollectionForm({ name: '', cidr: '' });
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation: allow port 0 (so check for empty string instead of falsy)
    if (!formData.ip_address || formData.port === '' || formData.port === null || formData.port === undefined) return alert("Fill all fields");
    // port must be integer 0-65535
    const portNum = Number(formData.port);
    if (!Number.isInteger(portNum) || portNum < 0 || portNum > 65535) return alert('Port must be an integer between 0 and 65535');
    // if a collection is selected, ensure IP belongs to collection CIDR (client-side quick check)
    if (formData.collection_id) {
      const selected = collections.find(c => String(c.id) === String(formData.collection_id));
      if (selected && !ipInCIDR(formData.ip_address, selected.cidr)) return alert('IP is not within selected collection CIDR');
    }

    try {
      if (editingId) {
        // Update logic
        await axios.put(`${API_URL}/${editingId}`, { ...formData, port: portNum });
        setEditingId(null);
      } else {
        // Create logic
        await axios.post(API_URL, { ...formData, port: portNum });
      }
      setFormData({ ip_address: '', port: '', collection_id: '', name: '', notes: '' });
      fetchNodes();
    } catch (error) {
      console.error("Error saving data:", error);
    }
  };

  const handleEdit = (node) => {
    setEditingId(node.id);
    setFormData({ ip_address: node.ip_address, port: node.port, collection_id: node.collection_id || '', name: node.name || '', notes: node.notes || '' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchNodes();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({ ip_address: '', port: '', collection_id: '', name: '', notes: '' });
  };

  return (
    <div className="container">
      <h1>Network Manager (IP/Port)</h1>
      
      {/* Form Section */}
      <div className="card form-section">
        <h3>{editingId ? 'Edit Node' : 'Add New Node'}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="ip_address"
            placeholder="IP Address (e.g. 192.168.1.1)"
            value={formData.ip_address}
            onChange={handleChange}
          />
          <input
            type="text"
            name="name"
            placeholder="Node name (optional)"
            value={formData.name}
            onChange={handleChange}
          />
          <input
            type="number"
            name="port"
            placeholder="Port (e.g. 8080)"
            value={formData.port}
            onChange={handleChange}
            min={0}
            max={65535}
            step={1}
          />
          <input
            type="text"
            name="notes"
            placeholder="Notes (optional)"
            value={formData.notes}
            onChange={handleChange}
          />
          <select name="collection_id" value={formData.collection_id} onChange={handleChange}>
            <option value="">-- No Collection --</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.cidr})</option>
            ))}
          </select>
          <div className="buttons">
            <button type="submit">{editingId ? 'Update' : 'Add'}</button>
            {editingId && <button type="button" onClick={handleCancel} className="cancel">Cancel</button>}
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="card list-section">
        <h3>Current Nodes</h3>
        {nodes.length === 0 ? <p>No data found.</p> : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>IP Address</th>
                <th>Port</th>
                  <th>Name</th>
                  <th>Notes</th>
                  <th>Collection</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => (
                <tr key={node.id}>
                  <td>{node.id}</td>
                  <td>{node.ip_address}</td>
                  <td>{node.port}</td>
                    <td>{node.name || '-'}</td>
                    <td>{node.notes || '-'}</td>
                    <td>{node.collection_id ? (collections.find(c => c.id === node.collection_id)?.name || node.collection_id) : '-'}</td>
                  <td>
                    <button onClick={() => handleEdit(node)} className="edit-btn">Edit</button>
                    <button onClick={() => handleDelete(node.id)} className="delete-btn">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Collections Section */}
      <div className="card form-section">
        <h3>{editingCollectionId ? 'Edit Collection' : 'Add New Collection'}</h3>
        <form onSubmit={handleCollectionSubmit}>
          <input
            type="text"
            name="name"
            placeholder="Collection name"
            value={collectionForm.name}
            onChange={handleCollectionChange}
          />
          <input
            type="text"
            name="cidr"
            placeholder="CIDR (e.g. 192.168.1.0/24)"
            value={collectionForm.cidr}
            onChange={handleCollectionChange}
          />
          <div className="buttons">
            <button type="submit">{editingCollectionId ? 'Update' : 'Add'}</button>
            {editingCollectionId && <button type="button" onClick={handleCollectionCancel} className="cancel">Cancel</button>}
          </div>
        </form>
      </div>

      <div className="card list-section">
        <h3>Collections</h3>
        {collections.length === 0 ? <p>No collections found.</p> : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>CIDR</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td>{c.cidr}</td>
                  <td>
                    <button onClick={() => handleCollectionEdit(c)} className="edit-btn">Edit</button>
                    <button onClick={() => handleCollectionDelete(c.id)} className="delete-btn">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default App
