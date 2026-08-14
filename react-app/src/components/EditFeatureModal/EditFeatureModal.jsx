import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import './EditFeatureModal.css';

const STATUS_OPTIONS = [
  { value: 'Yes', label: 'Yes', color: '#c3e679' },
  { value: 'No', label: 'No', color: '#ff6b6b' },
  { value: 'Partial', label: 'Partial', color: '#feca57' },
  { value: 'Paid', label: 'Paid', color: '#a29bfe' },
  { value: 'Unknown', label: 'Unknown', color: '#888888' }
];

function StatusSelect({ value, onChange, isTextField }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isTextField) return;
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isTextField]);

  if (isTextField) {
    return (
      <input 
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="edit-textarea"
        style={{ minHeight: 'auto' }}
        placeholder="Type value..."
      />
    );
  }

  const knownOption = STATUS_OPTIONS.find(opt => opt.value.toLowerCase() === value.toLowerCase());
  const inputColor = knownOption ? knownOption.color : '#ffffff';

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer' }}
      >
        <input 
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly
          style={{ 
            color: inputColor, 
            fontWeight: 600, 
            background: 'transparent', 
            border: 'none', 
            outline: 'none',
            width: '100%',
            fontSize: '15px',
            pointerEvents: 'none'
          }}
          placeholder="Type status..."
        />
        <ChevronDown 
          size={16} 
          className="select-arrow" 
        />
      </div>
      
      {isOpen && (
        <div className="custom-select-menu">
          {STATUS_OPTIONS.map(option => (
            <div 
              key={option.value}
              className={`custom-select-option ${value.toLowerCase() === option.value.toLowerCase() ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span style={{ color: option.color, fontWeight: 600 }}>{option.label}</span>
              {value.toLowerCase() === option.value.toLowerCase() && <Check size={14} className="check-icon" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function EditFeatureModal({ providerName, featureName, initialValue, initialComment, featureType, onSave, onClose }) {
  const [status, setStatus] = useState(initialValue || 'Unknown');
  const [comment, setComment] = useState(initialComment || '');
  const MAX_CHARS = 150;
  
  // Determine if this is a custom text field instead of a standard status
  const isTextField = featureType === 'text' || (!featureType && initialValue && 
    !STATUS_OPTIONS.some(opt => opt.value.toLowerCase() === initialValue.toLowerCase()));

  useEffect(() => {
    setStatus(initialValue || 'Unknown');
    setComment(initialComment || '');
  }, [initialValue, initialComment]);

  const handleSave = () => {
    onSave({ status, comment });
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="edit-modal-overlay" onClick={handleBackdropClick}>
      <div className="edit-modal-content">
        <div className="edit-modal-header">
          <h2 className="edit-modal-title">{providerName} / {featureName}</h2>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="form-group">
          <label>Status / Value:</label>
          <StatusSelect value={status} onChange={setStatus} isTextField={isTextField} />
        </div>

        <div className="form-group">
          <label>Comment (max {MAX_CHARS} chars):</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, MAX_CHARS))}
            className="edit-textarea"
            rows={4}
            placeholder="Add an optional comment..."
          />
          <div className="char-counter">
            {comment.length} / {MAX_CHARS}
          </div>
        </div>

        <div className="edit-modal-actions">
          <button 
            className="btn-clear" 
            onClick={() => {
              setStatus(isTextField ? '' : 'Unknown');
              setComment('');
            }}
          >
            Delete
          </button>
          <button className="btn-save" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
