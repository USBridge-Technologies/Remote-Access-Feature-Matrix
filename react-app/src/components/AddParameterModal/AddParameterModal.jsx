import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Info, ChevronDown, Check } from 'lucide-react';
import './AddParameterModal.css';

const TYPE_OPTIONS = [
  { value: 'boolean', label: 'Boolean (Yes/No)' },
  { value: 'text', label: 'Text' }
];

function TypeSelect({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const currentOption = TYPE_OPTIONS.find(option => option.value === value) || TYPE_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="custom-select-container" ref={dropdownRef}>
      <div className={`custom-select-trigger ${isOpen ? 'open' : ''}`} onClick={() => setIsOpen(prev => !prev)}>
        <span className="custom-select-value">{currentOption.label}</span>
        <ChevronDown size={16} className="select-arrow" />
      </div>

      {isOpen && (
        <div className="custom-select-menu">
          {TYPE_OPTIONS.map(option => (
            <div
              key={option.value}
              className={`custom-select-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span>{option.label}</span>
              {value === option.value && <Check size={14} className="check-icon" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AddParameterModal({ isOpen, onClose, onAdd, categoryOptions = [] }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [dataType, setDataType] = useState('boolean');
  const [selectedCategories, setSelectedCategories] = useState([]);

  const [showAuthBlock, setShowAuthBlock] = useState(false);
  const [githubToken, setGithubToken] = useState(localStorage.getItem('github_token') || '');
  const [githubRepo, setGithubRepo] = useState(localStorage.getItem('github_repo') || 'USBridge-Technologies/Remote-Access-Feature-Matrix');
  const [githubBranch, setGithubBranch] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setDescription('');
    setDataType('boolean');
    setSelectedCategories(categoryOptions[0] ? [categoryOptions[0].value] : []);
    setShowAuthBlock(false);
  }, [isOpen]);

  const generatedJson = useMemo(() => {
    const payload = {
      name: name.trim() || 'New Parameter',
      categories: selectedCategories,
      description: description.trim() || 'Short description of the parameter.',
      type: dataType
    };

    return JSON.stringify(payload, null, 2);
  }, [name, description, dataType, selectedCategories]);

  if (!isOpen) return null;

  const toggleCategory = (category) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return Array.from(next);
    });
  };

  const normalizedCategoryOptions = categoryOptions.length > 0
    ? categoryOptions
    : [{ value: 'software', label: 'Software' }];

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(generatedJson);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerate = () => {
    setShowAuthBlock(prev => !prev);
  };

  const handleSubmit = async () => {
    if (!githubToken) {
      alert("Please provide a GitHub PAT.");
      return;
    }
    localStorage.setItem('github_token', githubToken);
    setIsSubmitting(true);
    
    const autoBranch = `add-param-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
    const defaultRepo = 'USBridge-Technologies/Remote-Access-Feature-Matrix';
    const finalCommitMessage = commitMessage || `Add new parameter: ${name || 'unknown'}`;

    // Pass everything to the parent to handle the actual commit
    try {
      if (onAdd) {
        await onAdd(generatedJson, { githubToken, githubRepo: defaultRepo, githubBranch: autoBranch, commitMessage: finalCommitMessage });
      }
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="add-parameter-overlay" onClick={handleBackdropClick}>
      <div className="add-parameter-modal">
        <button className="add-parameter-close" onClick={onClose} aria-label="Close modal">
          <X size={28} />
        </button>

        <h2 className="add-parameter-title">Propose a new parameter</h2>
        <p className="add-parameter-desc">
          Fill out the form to generate JSON for adding to the comparison schema.
        </p>

        <div className="add-parameter-field">
          <label>Parameter name:</label>
          <input
            type="text"
            className="add-parameter-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hardware encryption"
          />
        </div>

        <div className="add-parameter-field">
          <label>Description (tooltip <Info size={14} className="add-parameter-info-icon" />) - max 150 chars:</label>
          <textarea
            className="add-parameter-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 150))}
            placeholder="Briefly describe the parameter..."
            rows={4}
          />
          <div className="add-parameter-counter">{description.length} / 150</div>
        </div>

        <div className="add-parameter-field">
          <label>Data type:</label>
          <TypeSelect value={dataType} onChange={setDataType} />
        </div>

        <div className="add-parameter-field">
          <label>Classification categories:</label>
          <div className="add-parameter-categories">
            {normalizedCategoryOptions.map(option => (
              <label key={option.value} className="add-parameter-category">
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(option.value)}
                  onChange={() => toggleCategory(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {showAuthBlock && (
          <div className="submit-pr-auth-block">
            <div className="submit-pr-form-group">
              <label>GitHub Personal Access Token (PAT):</label>
              <input 
                type="password" 
                value={githubToken} 
                onChange={e => setGithubToken(e.target.value)} 
                placeholder="github_pat_..."
                className="submit-pr-input"
              />
            </div>
            <div className="submit-pr-form-group">
              <label>Commit Message:</label>
              <input 
                type="text" 
                value={commitMessage || `Add new parameter: ${name || 'unknown'}`} 
                onChange={e => setCommitMessage(e.target.value)} 
                placeholder="Update provider data"
                className="submit-pr-input"
              />
            </div>
            <button 
              className="submit-pr-send-btn" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending PR..." : "Send Pull Request"}
            </button>
          </div>
        )}

        <div className="add-parameter-actions">
          <button className="add-parameter-secondary" onClick={handleGenerate}>
            Auto-commit / PR
          </button>
          <button className="add-parameter-primary" onClick={handleCopyJson}>
            Copy JSON
          </button>
        </div>
      </div>
    </div>
  );
}
