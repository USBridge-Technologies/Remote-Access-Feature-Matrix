import React from 'react';
import { X } from 'lucide-react';
import './EditingActionPanel.css';

export function EditingActionPanel({ providerName, changeCount, onPropose, onClose }) {
  return (
    <div className="editing-action-panel">
      <div className="editing-info" style={{ display: 'flex', flexDirection: 'column' }}>
        <div>Editing mode <strong>{providerName}</strong></div>
        <div className="change-count" style={{ fontSize: '12px', marginLeft: 0, marginTop: '2px' }}>
          {changeCount === 0 ? 'no changes' : `${changeCount} change${changeCount > 1 ? 's' : ''} pending`}
        </div>
      </div>
      
      <div className="editing-actions">
        <button 
          className="btn-propose" 
          onClick={onPropose}
          disabled={changeCount === 0}
        >
          Save
        </button>
        <button className="btn-close-edit" onClick={onClose} title="Cancel editing">
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
