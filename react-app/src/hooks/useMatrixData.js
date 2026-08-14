import { useState, useEffect } from 'react';

export function useMatrixData(type = 'soft', tab = 'features') {
  const [data, setData] = useState({ rows: [], columns: [], loading: true, error: null });

  useEffect(() => {
    let isMounted = true;
    const basePath = type === 'kvm' ? './kvm/' : './software/';

    const loadData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));
        
        // 1. Fetch providers index
        const providersRes = await fetch(`${basePath}providers.json?t=${Date.now()}`);
        if (!providersRes.ok) throw new Error('Failed to load providers list');
        const providersList = await providersRes.json();
        
        // 2. Fetch data for each provider
        const providersData = {};
        await Promise.all(
          providersList.map(async (provKey) => {
            const res = await fetch(`${basePath}providers/${provKey}.json?t=${Date.now()}`);
            if (res.ok) {
              providersData[provKey] = await res.json();
            }
          })
        );

        // 3. Fetch rows for the current tab
        let tabFile = 'features.json';
        if (tab === 'os') tabFile = 'os.json';
        if (tab === 'hardware') tabFile = 'hardware.json';
        if (tab === 'pricing') tabFile = 'pricing.json';

        const rowsRes = await fetch(`${basePath}${tabFile}?t=${Date.now()}`);
        if (!rowsRes.ok) throw new Error(`Failed to load ${tabFile}`);
        const rawRowsData = await rowsRes.json();

        const mappedRows = rawRowsData.map(rowItem => {
          const newRow = { ...rowItem };
          Object.values(providersData).forEach(provider => {
            const providerCategoryData = provider[tab];
            if (providerCategoryData && providerCategoryData[rowItem.name]) {
              newRow[provider.key] = providerCategoryData[rowItem.name];
            } else {
              newRow[provider.key] = null;
            }
          });
          return newRow;
        });

        if (isMounted) {
          setData({
            columns: Object.values(providersData).map(provider => ({
              ...provider,
              icon: `${import.meta.env.BASE_URL}asset/${type}/${provider.key}/logo.png`
            })),
            rows: mappedRows,
            loading: false,
            error: null
          });
        }
      } catch (err) {
        if (isMounted) {
          setData(prev => ({ ...prev, loading: false, error: err.message }));
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [type, tab]);

  return data;
}
