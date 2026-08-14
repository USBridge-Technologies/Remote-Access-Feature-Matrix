import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useMatrixData } from './hooks/useMatrixData';
import { useIsMobile } from './hooks/useIsMobile';
import { Table } from './components/Table/Table';
import { DropdownFilter } from './components/Filters/DropdownFilter';
import { ProviderCard } from './components/ProviderCard/ProviderCard';
import { EditFeatureModal } from './components/EditFeatureModal/EditFeatureModal';
import { EditingActionPanel } from './components/EditingActionPanel/EditingActionPanel';
import { AddParameterModal } from './components/AddParameterModal/AddParameterModal';
import { SubmitPRModal } from './components/SubmitPRModal/SubmitPRModal';
import { Filter, RefreshCcw } from 'lucide-react';
import './App.css';

function App() {
  const getUrlParam = (key, defaultVal) => {
    if (typeof window === 'undefined') return defaultVal;
    return new URLSearchParams(window.location.search).get(key) || defaultVal;
  };

  const [type, setType] = useState(getUrlParam('type', 'soft'));
  const [tab, setTab] = useState(getUrlParam('tab', 'features'));
  
  const rawData = useMatrixData(type, tab);
  const isMobile = useIsMobile();

  // Filter states
  const [selectedProviders, setSelectedProviders] = useState(new Set());
  const [isProvidersInitialized, setIsProvidersInitialized] = useState(false);
  const [selectedFeatures, setSelectedFeatures] = useState(new Set());
  const [activeCategory, setActiveCategory] = useState(null);
  const [pinnedFeatures, setPinnedFeatures] = useState(new Set());

  const [selectedProviderCard, setSelectedProviderCard] = useState(null);

  // Edit Mode states
  const [editingProvider, setEditingProvider] = useState(null);
  const [pendingChanges, setPendingChanges] = useState({});
  const [editingFeature, setEditingFeature] = useState(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isAddParameterModalOpen, setIsAddParameterModalOpen] = useState(false);

  // Tab indicator logic
  const tabsRef = useRef(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  useEffect(() => {
    // A small timeout ensures the DOM is painted and fonts/layouts are ready
    const timer = setTimeout(() => {
      if (tabsRef.current) {
        const activeTabElement = tabsRef.current.querySelector('.tab-btn.active');
        if (activeTabElement) {
          setIndicatorStyle({
            left: activeTabElement.offsetLeft,
            width: activeTabElement.offsetWidth
          });
        }
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [tab, type]);

  const togglePinFeature = (featureName) => {
    setPinnedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(featureName)) next.delete(featureName);
      else next.add(featureName);
      return next;
    });
  };

  // Initialize selected sets when data loads
  useEffect(() => {
    if (!rawData.loading && !rawData.error && rawData.columns.length > 0) {
      setSelectedProviders(prev => {
        const firstPrev = Array.from(prev)[0];
        const isSameType = firstPrev ? rawData.columns.some(c => c.key === firstPrev) : false;
        if (prev.size > 0 && isSameType) return prev;
        
        const allKeys = rawData.columns.filter(c => c.key !== 'draft').map(c => c.key);
        
        // Try to read from URL first
        const urlParams = new URLSearchParams(window.location.search);
        const urlProvidersStr = urlParams.get('providers');
        if (urlProvidersStr) {
          const keys = urlProvidersStr.split(',').filter(k => k);
          const validKeys = keys.filter(k => allKeys.includes(k));
          if (validKeys.length > 0) {
            return new Set(validKeys);
          }
        }

        let defaultKeys = [];
        if (type === 'soft') {
          defaultKeys = isMobile 
            ? ['usbridge', 'rustdesk', 'anydesk'] 
            : ['usbridge', 'rustdesk', 'anydesk', 'parsec'];
        } else {
          const usbridgeKey = allKeys.find(k => k.includes('usbridge'));
          const others = allKeys.filter(k => k !== usbridgeKey);
          const limit = isMobile ? 2 : 3;
          defaultKeys = usbridgeKey ? [usbridgeKey, ...others.slice(0, limit)] : allKeys.slice(0, limit + 1);
        }

        defaultKeys = defaultKeys.filter(k => allKeys.includes(k));
        return new Set(defaultKeys);
      });
      setSelectedFeatures(new Set(rawData.rows.map(r => r.name)));
      setIsProvidersInitialized(true);
      
      // Preload first screenshots in the background
      rawData.columns.forEach(p => {
        if (p.key !== 'draft') {
          const typeFolder = type === 'kvm' ? 'kvm' : 'soft';
          const img = new Image();
          img.src = `${import.meta.env.BASE_URL}asset/${typeFolder}/${p.key}/1.png`;
        }
      });
    }
  }, [type, tab, rawData.loading, isMobile]);

  // Update URL params
  useEffect(() => {
    if (!rawData.rows || !isProvidersInitialized) return;
    
    const newParams = new URLSearchParams(window.location.search);
    let changed = false;
    if (newParams.get('type') !== type) { newParams.set('type', type); changed = true; }
    if (newParams.get('tab') !== tab) { newParams.set('tab', tab); changed = true; }
    
    const providersArray = Array.from(selectedProviders).filter(k => k !== 'draft');
    if (providersArray.length > 0) {
      const providersStr = providersArray.join(',');
      if (newParams.get('providers') !== providersStr) {
        newParams.set('providers', providersStr);
        changed = true;
      }
    } else {
      if (newParams.has('providers')) {
        newParams.delete('providers');
        changed = true;
      }
    }
    
    if (changed) {
      const newUrl = `${window.location.pathname}?${newParams.toString()}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [rawData.rows, type, tab, selectedProviders]);

  // Extract unique categories for pills
  const categories = useMemo(() => {
    if (!rawData.rows) return [];
    const cats = new Set();
    rawData.rows.forEach(r => {
      if (r.categories) r.categories.forEach(c => cats.add(c));
    });

    let catArray = Array.from(cats);

    // Remove specific filters based on tab/type
    if (tab === 'hardware') {
      catArray = catArray.filter(c => c.toLowerCase() !== 'gpu');
    }
    if (tab === 'pricing') {
      catArray = catArray.filter(c => c.toLowerCase() !== 'general');
    }

    return catArray;
  }, [rawData.rows, type, tab]);

  const parameterCategoryOptions = useMemo(() => {
    if (!rawData.rows) return [];

    const categoriesSet = new Set();
    rawData.rows.forEach(row => {
      (row.categories || []).forEach(category => categoriesSet.add(category));
    });

    return Array.from(categoriesSet).map(category => ({
      value: category,
      label: category
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    })).filter(option => option.value.toLowerCase() !== 'software');
  }, [rawData.rows, type, tab]);

  // Apply filters
  const data = useMemo(() => {
    if (!rawData.rows || !rawData.columns) return rawData;
    
    let filteredRows = rawData.rows.filter(r => selectedFeatures.has(r.name));
    
    // Sort rows: pinned first, then alphabetical
    filteredRows.sort((a, b) => {
      const aPinned = pinnedFeatures.has(a.name);
      const bPinned = pinnedFeatures.has(b.name);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return a.name.localeCompare(b.name);
    });

    return {
      ...rawData,
      rows: filteredRows,
      columns: Array.from(selectedProviders)
        .map(key => rawData.columns.find(c => c.key === key))
        .filter(Boolean)
    };
  }, [rawData, selectedFeatures, selectedProviders, activeCategory, pinnedFeatures]);

  const toggleFeature = (name) => {
    setSelectedFeatures(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleProvider = (key) => {
    setSelectedProviders(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const removeProvider = (key) => {
    toggleProvider(key);
  };

  const selectAllFeatures = () => setSelectedFeatures(new Set(rawData.rows.map(r => r.name)));
  const deselectAllFeatures = () => setSelectedFeatures(new Set());
  
  const selectAllProviders = () => setSelectedProviders(new Set(rawData.columns.filter(c => c.key !== 'draft').map(c => c.key)));
  const deselectAllProviders = () => setSelectedProviders(new Set());

  const categoryPillsContent = (
    <div className="category-pills">
      {categories.filter(cat => type === 'kvm' || cat.toLowerCase() !== 'software').map(cat => {
        const c = cat.toLowerCase();
        let icon = 'info.svg';
        let iconSize = 14;
        
        // KVM Specific Features
        if (c === 'security') icon = 'security.svg';
        else if (c === 'latency') icon = 'lightning.svg';
        else if (c.includes('peripheral')) icon = 'plugging.svg';
        else if (c === 'software' || c.includes('dev')) icon = 'laptop.svg';
        else if (c === 'network' || c.includes('web') || c.includes('browser')) icon = 'web.svg';
        else if (c.includes('ai') || c.includes('advanced') || c.includes('bot') || c.includes('automation')) icon = 'robot.svg';
        
        // KVM Hardware Features
        else if (c.includes('computing')) icon = 'cpu.svg';
        else if (c.includes('capture')) icon = 'monitor.svg';
        else if (c.includes('ports')) icon = 'plugging.svg';
        else if (c.includes('wireless')) icon = 'network.svg';
        else if (c === 'power') icon = 'lightning.svg';
        else if (c.includes('cooling')) icon = 'thermometer.svg';
        else if (c.includes('host power')) icon = 'charge.svg';
        else if (c.includes('certification')) icon = 'document.svg';
        
        // Others
        else if (c === 'gaming') icon = 'gaming.svg';
        else if (c === 'artist' || c.includes('design') || c.includes('3d')) icon = 'palette.svg';
        else if (c === 'sysadmin' || c.includes('admin')) icon = 'repair.svg';
        else if (c.includes('business') || c.includes('corporate') || c.includes('team')) icon = 'institution-corporate.svg';
        else if (c.includes('personal')) icon = 'person.svg';
        else if (c.includes('remote') || c.includes('support')) icon = 'repair.svg';
        else if (c.includes('windows')) icon = 'windows.svg';
        else if (c.includes('mac') || c.includes('apple') || c.includes('ios')) icon = 'Mac.svg';
        else if (c.includes('linux') || c.includes('ubuntu')) icon = 'linux.svg';
        else if (c.includes('android')) icon = 'Android.svg';
        else if (c.includes('smartphone') || c.includes('mobile')) {
          icon = 'smartphone.svg';
          iconSize = 18;
        }
        else if (c.includes('lan')) icon = 'network.svg';
        else if (c.includes('display') || c.includes('monitor')) icon = 'display.svg';
        else if (c.includes('hardware')) icon = 'laptop.svg';

        const iconUrl = `${import.meta.env.BASE_URL}asset/icons/${icon}`;

        return (
          <button 
            key={cat}
            className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
            onClick={() => {
              if (activeCategory === cat) {
                setActiveCategory(null);
                setSelectedFeatures(new Set(rawData.rows.map(r => r.name)));
              } else {
                setActiveCategory(cat);
                const featuresInCat = rawData.rows.filter(r => r.categories && r.categories.includes(cat)).map(r => r.name);
                setSelectedFeatures(new Set(featuresInCat));
              }
            }}
          >
            <span 
              className="cat-icon" 
              style={{ 
                WebkitMaskImage: `url(${iconUrl})`,
                maskImage: `url(${iconUrl})`,
                width: `${iconSize}px`,
                height: `${iconSize}px`
              }} 
            />
            {cat}
          </button>
        );
      })}
    </div>
  );

  const parametersDropdownProps = {
    label: "Parameters",
    variant: isMobile ? 'solutions' : 'default',
    menuTitle: "Parameters",
    menuSubtitle: `${selectedFeatures.size} of ${rawData.rows?.length || 0} shown`,
    isMobile: isMobile,
    items: (rawData.rows || [])
      .map(r => ({ id: r.name, label: r.name })),
    selectedItems: selectedFeatures,
    totalCount: rawData.rows?.length || 0,
    onToggle: toggleFeature,
    onSelectAll: selectAllFeatures,
    onDeselectAll: deselectAllFeatures,
    searchPlaceholder: "Search parameters...",
    selectAllLabel: "All",
    deselectAllLabel: "Clear",
    showItemIcons: false,
    showStatusLabel: false,
    addAction: {
      label: '+ Parameter',
      onClick: () => setIsAddParameterModalOpen(true)
    }
  };

  const providersDropdownProps = {
    label: type === 'soft' ? 'Software' : 'Hardware',
    variant: isMobile ? 'solutions' : 'default',
    menuTitle: "Providers",
    menuSubtitle: `${selectedProviders.size} of ${(rawData.columns || []).filter(c => c.key !== 'draft').length} shown`,
    isMobile: isMobile,
    items: (rawData.columns || []).filter(c => c.key !== 'draft').map(c => ({ id: c.key, label: c.name, icon: c.icon, subtype: c.subtype })),
    selectedItems: selectedProviders,
    onToggle: toggleProvider,
    onSelectAll: selectAllProviders,
    onDeselectAll: deselectAllProviders,
    searchPlaceholder: "Search provider...",
    showBulkActions: true,
    bulkActionsMode: "both",
    deselectAllLabel: "Clear",
    addAction: {
      label: '+ Add Solution',
      onClick: () => {
        setSelectedProviders(prev => {
          const next = new Set(prev);
          if (isMobile) {
            next.clear();
          }
          next.add('draft');
          return next;
        });
        setEditingProvider('draft');
      }
    }
  };

  const cycleProviders = () => {
    setSelectedProviders(prev => {
      const arr = Array.from(prev);
      if (arr.length < 2) return prev;
      const last = arr.pop();
      arr.unshift(last);
      return new Set(arr);
    });
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="type-switch">
          <button 
            className={`type-btn ${type === 'soft' ? 'active' : ''}`}
            onClick={() => { setType('soft'); setTab('features'); }}
          >
            {isMobile ? 'Software' : 'Software Remote Access'}
          </button>
          <button 
            className={`type-btn ${type === 'kvm' ? 'active' : ''}`}
            onClick={() => { setType('kvm'); setTab('features'); }}
          >
            {isMobile ? 'IP KVM' : 'Hardware (IP-KVM)'}
          </button>
        </div>
      </header>

      <div className="tabs-container" ref={tabsRef}>
        <button className={`tab-btn ${tab === 'features' ? 'active' : ''}`} onClick={() => setTab('features')}>Features</button>
        {type !== 'kvm' && (
          <button className={`tab-btn ${tab === 'os' ? 'active' : ''}`} onClick={() => setTab('os')}>OS</button>
        )}
        <button className={`tab-btn ${tab === 'hardware' ? 'active' : ''}`} onClick={() => setTab('hardware')}>Hardware</button>
        <button className={`tab-btn ${tab === 'pricing' ? 'active' : ''}`} onClick={() => setTab('pricing')}>Pricing</button>
        <div className="tab-indicator" style={indicatorStyle} />
      </div>

      {!rawData.error && rawData.rows && rawData.rows.length > 0 && (
        <>
          {!isMobile && (
            <div className="filters-row">
              <div className="dropdowns">
                <DropdownFilter {...parametersDropdownProps} />
                <DropdownFilter {...providersDropdownProps} />
              </div>
              {categoryPillsContent}
            </div>
          )}

          {isMobile && (
            <div className="mobile-action-bar">
              <button className="icon-btn-large" aria-label="Change" onClick={cycleProviders}>
                <RefreshCcw size={20} />
              </button>

              <DropdownFilter 
                {...parametersDropdownProps}
                customTrigger={
                  <button className="icon-btn-large" aria-label="Filters">
                    <Filter size={20} />
                  </button>
                }
              >
                <div style={{ padding: '0 14px' }}>
                  {categoryPillsContent}
                </div>
              </DropdownFilter>

              <DropdownFilter 
                {...providersDropdownProps}
                customTrigger={
                  <button className="wide-btn">
                    <span>Change solutions</span>
                    <span className="count-badge">{selectedProviders.size}/{providersDropdownProps.items.length}</span>
                  </button>
                }
              />
            </div>
          )}
        </>
      )}

      <main className="main-content">
        <Table 
          data={data} 
          tab={tab} 
          onRemoveProvider={removeProvider} 
          pinnedFeatures={pinnedFeatures}
          onTogglePin={togglePinFeature}
          onProviderClick={setSelectedProviderCard}
          editingProvider={editingProvider}
          pendingChanges={pendingChanges}
          onHideFeature={toggleFeature}
          onEnterEditMode={setEditingProvider}
          selectedProviders={selectedProviders}
          onEditFeature={(providerKey, featureName, initialValue, initialComment) => {
            setEditingFeature({ providerKey, featureName, initialValue, initialComment });
          }}
        />
      </main>

      <ProviderCard 
        provider={selectedProviderCard} 
        onClose={() => setSelectedProviderCard(null)} 
        onEdit={(key) => {
          setEditingProvider(key);
          setSelectedProviderCard(null);
        }}
        onHide={(key) => {
          removeProvider(key);
          setSelectedProviderCard(null);
        }}
      />

      {editingProvider && (
        <EditingActionPanel
          providerName={rawData.columns.find(c => c.key === editingProvider)?.name || editingProvider}
          changeCount={Object.keys(pendingChanges).length}
          onPropose={() => setIsSubmitModalOpen(true)}
          onClose={() => {
            setEditingProvider(null);
            setPendingChanges({});
          }}
        />
      )}

      {editingFeature && (
        <EditFeatureModal
          providerName={rawData.columns.find(c => c.key === editingFeature.providerKey)?.name || editingFeature.providerKey}
          featureName={editingFeature.featureName}
          initialValue={editingFeature.initialValue}
          initialComment={editingFeature.initialComment}
          onSave={({ status, comment }) => {
            setPendingChanges(prev => ({
              ...prev,
              [editingFeature.featureName]: { status, comment }
            }));
          }}
          onClose={() => setEditingFeature(null)}
        />
      )}

      {isSubmitModalOpen && (
        <SubmitPRModal
          providerKey={editingProvider}
          providerName={rawData.columns.find(c => c.key === editingProvider)?.name || editingProvider}
          pendingChanges={pendingChanges}
          rawData={rawData.columns.find(c => c.key === editingProvider) || {}}
          onClose={() => setIsSubmitModalOpen(false)}
          onSuccess={() => {
            setIsSubmitModalOpen(false);
            setEditingProvider(null);
            setPendingChanges({});
          }}
        />
      )}

      <AddParameterModal
        isOpen={isAddParameterModalOpen}
        onClose={() => setIsAddParameterModalOpen(false)}
        categoryOptions={parameterCategoryOptions}
        onAdd={async (json) => {
          try {
            await navigator.clipboard.writeText(json);
          } catch (error) {
            console.error(error);
          }
        }}
      />
    </div>
  );
}

export default App;
