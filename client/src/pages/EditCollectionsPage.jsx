import React from 'react'
export default function EditCollectionsPage(props) {
  const { collectionForm, handleCollectionChange, handleCollectionSubmit, editingCollectionId, handleCollectionCancel, collections, handleCollectionEdit, handleCollectionDelete } = props;
  return (
    <>
      <div className="form-section">
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

      <div className="list-section">
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
    </>
  );
}
