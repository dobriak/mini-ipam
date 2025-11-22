import React from 'react'
export default function EditNodesPage(props) {
  const { editingId, formData, handleChange, handleIPBlur, handleSubmit, collections, nodes, handleEdit, handleDelete, handleCancel } = props;
  return (
    <>
      <div className="card form-section">
        <h3>{editingId ? 'Edit Node' : 'Add New Node'}</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="ip_address"
            placeholder="IP Address (e.g. 192.168.1.1)"
            value={formData.ip_address}
            onChange={handleChange}
            onBlur={handleIPBlur}
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
    </>
  );
}
