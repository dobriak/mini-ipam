import React from 'react'
export default function MyNodesPage({ nodes, collections, getGroupedSortedNodes }) {
  const groups = getGroupedSortedNodes();
  const colOrder = [...collections].sort((a,b) => (a.name || '').localeCompare(b.name || ''));
  return (
    <div className="card list-section">
      <h3>My Nodes</h3>
      {nodes.length === 0 ? <p>No data found.</p> : (
        <div>
          {colOrder.map(c => (
            <div key={c.id} className="nodes-group">
              <h4>{c.name} ({c.cidr})</h4>
              {(!groups[String(c.id)] || groups[String(c.id)].length === 0) ? <p>No nodes.</p> : (
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>IP Address</th>
                      <th>Port</th>
                      <th>Name</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups[String(c.id)]?.map(n => (
                      <tr key={n.id}>
                        <td>{n.id}</td>
                        <td>{n.ip_address}</td>
                        <td>{n.port}</td>
                        <td>{n.name || '-'}</td>
                        <td>{n.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}

          <div className="nodes-group">
            <h4>Unassigned</h4>
            {(!groups[''] || groups[''].length === 0) ? <p>No nodes.</p> : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>IP Address</th>
                    <th>Port</th>
                    <th>Name</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {groups['']?.map(n => (
                    <tr key={n.id}>
                      <td>{n.id}</td>
                      <td>{n.ip_address}</td>
                      <td>{n.port}</td>
                      <td>{n.name || '-'}</td>
                      <td>{n.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
