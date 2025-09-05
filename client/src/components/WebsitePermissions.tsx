import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';
import { WebsitePermission } from '../types';

export const WebsitePermissions: React.FC = () => {
  const [permissions, setPermissions] = useState<WebsitePermission[]>([]);
  const [newWebsite, setNewWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const response = await userAPI.getWebsitePermissions();
      setPermissions(response.data);
    } catch (error) {
      setMessage('Failed to load permissions');
    }
  };

  const requestAccess = async () => {
    if (!newWebsite.trim()) return;
    
    setLoading(true);
    try {
      await userAPI.requestWebsiteAccess(newWebsite.trim());
      setMessage('Access request submitted');
      setNewWebsite('');
      loadPermissions();
    } catch (error: any) {
      setMessage(error.message || 'Failed to request access');
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (website: string, hasAccess: boolean) => {
    const updatedPermissions = permissions.map(p => 
      p.website === website ? { ...p, hasAccess } : p
    );
    
    try {
      await userAPI.updatePermissions(updatedPermissions);
      setPermissions(updatedPermissions);
      setMessage('Permissions updated');
    } catch (error: any) {
      setMessage(error.message || 'Failed to update permissions');
    }
  };

  return (
    <div className="website-permissions">
      <h3>Website Access Permissions</h3>
      
      <div className="request-access">
        <input
          type="text"
          placeholder="Enter website URL"
          value={newWebsite}
          onChange={(e) => setNewWebsite(e.target.value)}
        />
        <button onClick={requestAccess} disabled={loading}>
          Request Access
        </button>
      </div>

      <div className="permissions-list">
        {permissions.map((permission) => (
          <div key={permission.website} className="permission-item">
            <span className="website">{permission.website}</span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={permission.hasAccess}
                onChange={(e) => togglePermission(permission.website, e.target.checked)}
              />
              <span>Access Granted</span>
            </label>
            <span className="last-accessed">
              Last accessed: {permission.lastAccessed ? 
                new Date(permission.lastAccessed).toLocaleDateString() : 'Never'}
            </span>
          </div>
        ))}
      </div>

      {message && <div className="message">{message}</div>}
    </div>
  );
};