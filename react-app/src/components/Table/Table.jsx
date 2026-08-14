import React, { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Info, Edit2, X, Star } from 'lucide-react';
import './Table.css';
import { useIsMobile } from '../../hooks/useIsMobile';
import { Tooltip } from '../Tooltip/Tooltip';
import { Modal } from '../Modal/Modal';

export function Table({ 
  data, tab, onRemoveProvider, pinnedFeatures, onTogglePin, onProviderClick,
  editingProvider, pendingChanges, onEnterEditMode, onEditFeature, selectedProviders
}) {
  const isMobile = useIsMobile();
  const columnHelper = createColumnHelper();
  
  const [mobileModalData, setMobileModalData] = useState(null);
  const hasVisibleProviders = (data.columns || []).length > 0;

  const columns = useMemo(() => {
    // Base column for the feature/os/hardware name
    const cols = [
      columnHelper.accessor('name', {
        id: 'name',
        header: () => (
          <span style={{ color: '#888', textTransform: 'uppercase', fontSize: '12px', fontWeight: 'bold' }}>
            PARAMETER
          </span>
        ),
        cell: info => {
          const rowData = info.row.original;
          const isPinned = pinnedFeatures?.has(rowData.name);
          return (
            <div 
              className={`feature-cell ${isMobile ? 'clickable' : ''}`}
            >
              <button 
                className={`icon-btn pin-btn ${isPinned ? 'active' : ''}`}
                style={{ display: isMobile ? 'none' : 'flex' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin?.(rowData.name);
                }}
                title={isPinned ? "Unpin parameter" : "Pin parameter"}
              >
                <Star size={14} className={isPinned ? "star-filled" : ""} />
              </button>
              <span
                style={{ 
                  flex: 1, 
                  cursor: isMobile ? 'pointer' : 'default',
                  color: isPinned ? '#c3e679' : 'inherit'
                }}
                onClick={() => {
                  if (isMobile) {
                    setMobileModalData({
                      title: rowData.name,
                      content: rowData.description,
                      name: rowData.name,
                      isPinned: isPinned,
                      isParam: true
                    });
                  }
                }}
              >
                {info.getValue()}
              </span>
              {!isMobile && rowData.description && (
                <Tooltip text={rowData.description}>
                  <Info size={14} className="info-icon" />
                </Tooltip>
              )}
            </div>
          );
        },
        size: isMobile ? 150 : 250, // Smaller on mobile
      })
    ];

    // Dynamic provider columns
    if (!hasVisibleProviders) {
      cols.push(
        columnHelper.accessor('__empty_provider__', {
          header: () => <div className="provider-header provider-header-placeholder" aria-hidden="true" />,
          cell: () => <div className="empty-provider-cell" aria-hidden="true" />,
          size: isMobile ? 120 : 180
        })
      );
      return cols;
    }

    (data.columns || []).forEach(provider => {
      cols.push(
        columnHelper.accessor((row) => row[provider.key], {
          id: provider.key,
          header: () => {
            const isEditing = editingProvider === provider.key;

            return (
              <div className={`provider-header ${isEditing ? 'editing-active' : ''}`}>
                <div 
                  className="provider-info" 
                  onClick={() => onProviderClick?.(provider)}
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {provider.key !== 'draft' && (
                      <img 
                        src={provider.icon} 
                        alt={provider.key} 
                        className="provider-icon"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    {provider.key === 'draft' && (
                      <div className="provider-icon-fallback" style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#4caf50', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                        {provider.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="provider-name" style={{ display: 'inline-block' }}>
                      {isMobile ? (provider.mobileName || provider.name) : provider.name}
                    </span>
                  </div>
                </div>
                {!isMobile && (
                  <div className="provider-actions">
                    <button 
                      className={`icon-btn edit-btn ${isEditing ? 'active' : ''}`} 
                      title={isEditing ? "Editing..." : "Edit provider"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isEditing) {
                          onEnterEditMode(null);
                        } else {
                          onEnterEditMode(provider.key);
                        }
                      }}
                    >
                      <Edit2 size={14} />
                    </button>
                    <button className="icon-btn remove-btn" title="Hide provider" onClick={() => onRemoveProvider(provider.key)}>
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          },
          cell: info => {
            const featureName = info.row.original.name;
            const featureType = info.row.original.type; // 'boolean' or 'text'
            const originalValObj = info.getValue();
            const pendingValObj = editingProvider === provider.key && pendingChanges?.[featureName];
            
            const valObj = pendingValObj || originalValObj;
            
            let val = valObj ? valObj.status : null;
            const comment = valObj ? valObj.comment : null;
            
            if (!val && provider.key === 'draft') {
              val = 'Unknown';
            }

            let badgeClass = null;
            if (val === 'Yes') badgeClass = 'badge-yes';
            else if (val === 'No') badgeClass = 'badge-no';
            else if (val === 'Partial') badgeClass = 'badge-partial';
            else if (val === 'Paid') badgeClass = 'badge-paid';
            else if (val === 'Unknown') badgeClass = 'badge-unknown';

            // If it's a text type, don't show badges for 'Unknown', 'Yes', 'No' etc unless it really makes sense.
            // The user requested that text parameters show text, not boolean badges.
            if (featureType === 'text' && badgeClass) {
              badgeClass = null; // render as plain text
            }

            if (!val) return null;

            const isEditing = editingProvider === provider.key;
            const hasChanged = !!pendingValObj;

            return (
              <div 
                className={`status-cell ${isMobile ? 'clickable' : ''} ${isEditing ? 'editing' : ''}`}
                onClick={() => {
                  if (isMobile) {
                    if (isEditing) {
                      onEditFeature(provider.key, featureName, val, comment);
                    } else {
                      setMobileModalData({
                        title: `${provider.name} - ${featureName}`,
                        content: (
                          <div>
                            <div style={{ marginBottom: '12px' }}>
                              <strong>Status:</strong> 
                              {badgeClass ? (
                                <span className={`badge ${badgeClass}`}>{val}</span>
                              ) : (
                                <span className="plain-text-value">{val}</span>
                              )}
                            </div>
                            {comment && (
                              <div>
                                <strong>Comment:</strong>
                                <p style={{ marginTop: '4px' }}>{comment}</p>
                              </div>
                            )}
                          </div>
                        )
                      });
                    }
                  }
                }}
              >
                <div style={{ gridColumn: 2, display: 'flex', justifyContent: 'center' }}>
                  {badgeClass ? (
                    <span className={`badge ${badgeClass} ${hasChanged ? 'changed' : ''}`}>
                      {val.toUpperCase()}
                    </span>
                  ) : (
                    <span className={`plain-text-value ${hasChanged ? 'changed' : ''}`}>
                      {val}
                    </span>
                  )}
                </div>
                
                {(isEditing || comment) && (
                  <div className="status-cell-icons">
                    {isEditing && (
                      <button 
                        className="inline-edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditFeature(provider.key, featureName, val, comment);
                        }}
                        title="Edit this feature"
                      >
                        <Edit2 size={12} />
                      </button>
                    )}
                    
                    {comment && !isEditing && (
                      <Tooltip text={comment}>
                        <Info size={14} className="info-icon" />
                      </Tooltip>
                    )}
                  </div>
                )}
              </div>
            );
          }
        })
      );
    });

    return cols;
  }, [data.columns, tab, isMobile, columnHelper]);

  const table = useReactTable({
    data: data.rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (data.error) return <div className="table-error">Error: {data.error}</div>;

  const providerColumnsCount = hasVisibleProviders ? (data.columns?.length || 0) : 1;
  const minTableWidth = (isMobile ? 150 : 250) + (providerColumnsCount * (isMobile ? 120 : 180));

  return (
    <div style={{ position: 'relative' }}>
      <div 
        style={{
          position: 'absolute',
          top: '1px',
          right: '1px',
          width: '8px',
          height: '55px',
          backgroundColor: '#242424',
          zIndex: 10,
          borderTopRightRadius: '7px',
          pointerEvents: 'none'
        }}
      />
      <div className={`table-container ${data.loading ? 'loading' : ''}`}>
        <table className="matrix-table" style={{ minWidth: `${minTableWidth}px` }}>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
                <td key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <Modal 
        isOpen={!!mobileModalData} 
        onClose={() => setMobileModalData(null)}
        title={mobileModalData?.title}
      >
        <div style={{ marginBottom: mobileModalData?.isParam ? '24px' : '0', fontSize: '14px', color: '#ccc', lineHeight: 1.5 }}>
          {mobileModalData?.content || 'No description available for this parameter.'}
        </div>
        {mobileModalData?.isParam && (
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              style={{ 
                flex: 1, padding: '12px', borderRadius: '12px', background: '#1c1c1c', color: '#fff', border: '1px solid #333', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' 
              }}
              onClick={() => {
                onTogglePin?.(mobileModalData.name);
                setMobileModalData(null);
              }}
            >
              <Star size={16} className={mobileModalData?.isPinned ? "star-filled" : ""} />
              {mobileModalData?.isPinned ? "Unpin" : "Pin to top"}
            </button>
            <button 
              style={{ 
                flex: 1, padding: '12px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 'bold', cursor: 'pointer' 
              }}
              onClick={() => {
                if (typeof onHideFeature === 'function') {
                  onHideFeature(mobileModalData.name);
                }
                setMobileModalData(null);
              }}
            >
              <X size={16} />
              Hide
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
