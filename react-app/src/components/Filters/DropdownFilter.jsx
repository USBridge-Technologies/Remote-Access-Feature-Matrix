import React, { useState, useRef, useEffect, cloneElement } from 'react';
import './DropdownFilter.css';

export function DropdownFilter({
  label,
  items,
  selectedItems,
  onToggle,
  onSelectAll,
  onDeselectAll,
  searchPlaceholder = "Search...",
  totalCount,
  addAction,
  variant = 'default',
  menuTitle,
  menuSubtitle,
  showBulkActions = true,
  bulkActionsMode = 'both',
  selectAllLabel = 'Select All',
  deselectAllLabel = 'Deselect All',
  showItemIcons = true,
  showStatusLabel = true,
  selectedVariant = 'accent',
  children,
  isMobile = false,
  customTrigger = null
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openDirection, setOpenDirection] = useState('down');
  const [menuMaxHeight, setMenuMaxHeight] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen || isMobile) return;

    const updatePosition = () => {
      const container = dropdownRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom - 12;
      const spaceAbove = rect.top - 12;
      const shouldOpenUp = spaceBelow < 360 && spaceAbove > spaceBelow;

      setOpenDirection(shouldOpenUp ? 'up' : 'down');
      setMenuMaxHeight(Math.max(220, shouldOpenUp ? spaceAbove : spaceBelow));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, search, items.length]);

  const filteredItems = items.filter(item =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = items.filter(item => selectedItems.has(item.id)).length;
  const displayTotal = totalCount !== undefined ? totalCount : items.length;
  const isSolutionsMenu = variant === 'solutions';
  const showInlineBulkControls = showBulkActions && bulkActionsMode !== 'none';

  return (
    <div className="dropdown-container" ref={dropdownRef}>
      {customTrigger ? (
        cloneElement(customTrigger, {
          onClick: (e) => {
            if (customTrigger.props.onClick) customTrigger.props.onClick(e);
            setIsOpen(!isOpen);
          }
        })
      ) : (
        <button
          className={`dropdown-btn ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {label}: <strong>{activeCount}/{displayTotal}</strong>
        </button>
      )}

      {isOpen && isMobile && (
        <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
      )}

      {isOpen && (
        <div
          className={`dropdown-menu ${isSolutionsMenu ? 'dropdown-menu-solutions' : ''} ${isMobile ? 'dropdown-menu-mobile' : openDirection === 'up' ? 'dropdown-menu-up' : 'dropdown-menu-down'}`}
          style={!isMobile && menuMaxHeight ? { maxHeight: `${menuMaxHeight}px` } : undefined}
        >
          {isSolutionsMenu && (
            <div className="dropdown-header">
              <div>
                <div className="dropdown-title">{menuTitle || label}</div>
                <div className="dropdown-subtitle">{menuSubtitle || 'Toggle providers in the matrix'}</div>
              </div>
              <button
                type="button"
                className="dropdown-close-btn"
                onClick={() => setIsOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
          )}

          <div className={`dropdown-search ${isSolutionsMenu ? 'dropdown-search-inline' : 'dropdown-search-compact'}`}>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {showInlineBulkControls && isSolutionsMenu && (
              <button
                type="button"
                className="dropdown-inline-action-btn"
                onClick={onDeselectAll}
              >
                {deselectAllLabel}
              </button>
            )}

            {showInlineBulkControls && !isSolutionsMenu && (
              <div className="dropdown-search-actions">
                {bulkActionsMode === 'both' && (
                  <button type="button" className="dropdown-inline-action-btn" onClick={onSelectAll}>
                    {selectAllLabel}
                  </button>
                )}
                <button
                  type="button"
                  className="dropdown-inline-action-btn"
                  onClick={onDeselectAll}
                >
                  {deselectAllLabel}
                </button>
              </div>
            )}
          </div>

          {children && (
            <div className="dropdown-custom-children">
              {children}
            </div>
          )}

          <div className={`dropdown-list-shell ${isSolutionsMenu ? 'dropdown-list-shell-solutions' : ''}`}>
            <div className="dropdown-list">
              {filteredItems.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={`dropdown-item-card ${selectedItems.has(item.id) ? `selected selected-${selectedVariant}` : ''}`}
                  onClick={() => onToggle(item.id)}
                  aria-pressed={selectedItems.has(item.id)}
                >
                  <span className="dropdown-item-left">
                    {showItemIcons && (
                      <span className="dropdown-item-icon">
                        {item.icon ? (
                          <img src={item.icon} alt="" aria-hidden="true" />
                        ) : (
                          <span className="dropdown-item-fallback">{(item.label || '?').trim().charAt(0).toUpperCase()}</span>
                        )}
                      </span>
                    )}
                    <span className="dropdown-item-text">
                      {item.label}
                      {item.subtype === 'protocol' && (
                        <span className="dropdown-item-subtype">(protocol)</span>
                      )}
                    </span>
                  </span>
                  {showStatusLabel && (
                    <span className="dropdown-item-status">
                      {selectedItems.has(item.id) ? 'shown' : ''}
                    </span>
                  )}
                </button>
              ))}
              {filteredItems.length === 0 && (
                <div style={{ padding: '8px', color: '#888', textAlign: 'center' }}>No results</div>
              )}
            </div>
          </div>

          {addAction && (
            <button
              className="dropdown-add-btn"
              onClick={() => {
                addAction.onClick();
                setIsOpen(false);
              }}
            >
              {addAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
