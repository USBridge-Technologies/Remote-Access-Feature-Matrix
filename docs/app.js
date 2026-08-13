document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const dataType = urlParams.get('type') || 'soft';
    const basePath = dataType === 'kvm' ? './kvm/' : './software/';

    if (dataType === 'kvm') {
        const kvmBtn = document.getElementById('type-btn-kvm');
        const softBtn = document.getElementById('type-btn-soft');
        if (kvmBtn) kvmBtn.classList.add('active');
        if (softBtn) softBtn.classList.remove('active');
        const osTabBtn = document.querySelector('.tab-btn[data-tab="os"]');
        if (osTabBtn) osTabBtn.style.display = 'none';
    } else {
        const kvmBtn = document.getElementById('type-btn-kvm');
        const softBtn = document.getElementById('type-btn-soft');
        if (softBtn) softBtn.classList.add('active');
        if (kvmBtn) kvmBtn.classList.remove('active');
    }

    const addProviderBtn = document.getElementById('add-provider-btn');
    const addProviderBtnDesktop = document.getElementById('add-provider-btn-desktop');
    if (addProviderBtn) {
        addProviderBtn.textContent = dataType === 'kvm' ? '+ Add KVM' : '+ Add Solution';
    }
    if (addProviderBtnDesktop) {
        addProviderBtnDesktop.textContent = dataType === 'kvm' ? '+ Add KVM' : '+ Add Software';
    }

    
    let currentTab = urlParams.get('tab') || "features";
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-tab') === currentTab) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    function updateUrlState() {
        const url = new URL(window.location.href);
        url.searchParams.set('type', dataType);
        url.searchParams.set('tab', currentTab);
        if (providersList.length === 0) {
            url.searchParams.set('providers', 'none');
        } else {
            url.searchParams.set('providers', providersList.join(','));
        }
        window.history.replaceState({}, '', url.toString());
    }

    const state = {
        features: {
            hidden: new Set(),
            starred: new Set(),
            all: [],
            data: [],
            field: "feature",
            title: "Parameter / Feature",
            section: "features"
        },
        os: {
            hidden: new Set(),
            starred: new Set(),
            all: [],
            data: [],
            field: "os",
            title: "Operating System",
            section: "os"
        },
        hardware: {
            hidden: new Set(),
            starred: new Set(),
            all: [],
            data: [],
            field: "hardware",
            title: "Component / Hardware",
            section: "hardware"
        },
        pricing: {
            hidden: new Set(),
            starred: new Set(),
            all: [],
            data: [],
            field: "pricing",
            title: "Plan / Pricing",
            section: "pricing"
        }
    };

    let providersList = [];
    let providersData = {};
    let modifiedProvidersData = {};
    
    let isEditMode = false;
    let activeEditProvider = null;
    
    let providersListBackup = [];
    let softCheckboxes = [];
    let activeCategoryFilter = null;
    let table = null;

    function statusFormatter(cell) {
        const val = cell.getValue();
        const rowData = cell.getRow().getData();
        const colField = cell.getColumn().getField();
        const comment = rowData[`${colField}_comment`] || rowData[`${colField}_info`];
        
        const tabState = state[currentTab];
        if (!tabState) return val || "";
        const isDirty = checkCellDirty(colField, rowData[tabState.field]);
        const dirtyClass = isDirty ? "cell-edited-dirty" : "";

        if (!val) {
            if (isEditMode && activeEditProvider === colField) {
                return `
                    <div class="status-cell-wrapper ${dirtyClass}" style="display: flex; align-items: center; justify-content: center; width: 100%; min-height: 20px; cursor: pointer;">
                        <span style="color: #666666; font-size: 11px;">[изменить]</span>
                        <span class="edit-cell-icon">✏️</span>
                    </div>
                `;
            }
            return "";
        }
        
        let badgeHtml = "";
        const lower = String(val).toLowerCase();
        if (lower === "yes") badgeHtml = `<span class="badge badge-yes">Yes</span>`;
        else if (lower === "no") badgeHtml = `<span class="badge badge-no">No</span>`;
        else if (lower === "partial") badgeHtml = `<span class="badge badge-partial">Partial</span>`;
        else if (lower === "paid") badgeHtml = `<span class="badge badge-paid">Paid</span>`;
        else if (lower === "unknown") badgeHtml = `<span class="badge badge-unknown">Unknown</span>`;
        else if (lower === "in development" || lower === "wip") badgeHtml = `<span class="badge badge-dev">WIP</span>`;
        else badgeHtml = `<span class="badge" style="background: #212121; color: #ffffff;">${val}</span>`;

        let editIconHtml = "";
        if (isEditMode && activeEditProvider === colField) {
            editIconHtml = `<span class="edit-cell-icon" style="display: flex; align-items: center;"><img src="./asset/icons/edit.svg" style="width: 12px; height: 12px; filter: invert(1);"></span>`;
        }

        const commentHtml = comment ? `
            <div class="tooltip-container">
                <span class="info-icon" data-tooltip="${comment.replace(/"/g, '&quot;')}" style="display: flex; align-items: center;"><img src="./asset/icons/info.svg" style="width: 14px; height: 14px; filter: invert(0.7);"></span>
            </div>
        ` : "";

        const rightIconsHtml = (commentHtml || editIconHtml) ? `
            <div style="position: absolute; left: 100%; margin-left: 6px; top: 50%; transform: translateY(-50%); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
                ${commentHtml}
                ${editIconHtml}
            </div>
        ` : "";

        const fName = String(rowData[tabState.field]).replace(/"/g, '&quot;');
        const pData = providersData[colField];
        const pName = pData ? String(pData.name).replace(/"/g, '&quot;') : colField;
        const cText = comment ? String(comment).replace(/"/g, '&quot;') : "";
        const vHtml = badgeHtml.replace(/"/g, '&quot;');

        return `
            <div class="status-cell-wrapper ${dirtyClass}" data-feature="${fName}" data-provider="${pName}" data-comment="${cText}" data-value-html="${vHtml}" style="position: relative; display: flex; align-items: center; justify-content: center; width: 100%; min-height: 24px; cursor: pointer;">
                <div style="position: relative; display: inline-flex; align-items: center; justify-content: center;">
                    ${badgeHtml}
                    ${rightIconsHtml}
                </div>
            </div>
        `;
    }

    function getOsIconHtml(paramName) {
        return "";
    }

    function featureFormatter(cell) {
        const value = cell.getValue();
        const rowData = cell.getRow().getData();
        const description = rowData.description || "";
        
        const tabState = state[currentTab];
        const isStarred = tabState.starred.has(value);
        const starClass = isStarred ? "star-btn active" : "star-btn";
        const starIcon = isStarred ? "★" : "☆";
        const osIconHtml = getOsIconHtml(value);

        let descHtml = "";
        if (description) {
            descHtml = `
                <div class="tooltip-container" style="margin-left: 4px;">
                    <span class="info-icon" data-tooltip="${description.replace(/"/g, '&quot;')}" style="display: flex; align-items: center; justify-content: center;"><img src="./asset/icons/info.svg" style="width: 14px; height: 14px; filter: invert(0.6);"></span>
                </div>
            `;
        }
        const pinnedTextColor = isStarred ? "color: #c3e679;" : "";

        return `
            <div class="feature-cell" style="cursor: pointer; ${pinnedTextColor}" onclick="if(window.innerWidth <= 768) openMobileFeatureModal('${value.replace(/'/g, "\\'")}')">
                <div class="feature-left" style="display: flex; align-items: center;">
                    <button class="${starClass} desktop-only" data-feature="${value}" title="Закрепить вверху" onclick="event.stopPropagation()">${starIcon}</button>
                    ${osIconHtml}
                    <span style="${isStarred && window.innerWidth <= 768 ? 'color: #c3e679;' : ''}">${value}</span>
                    <div class="desktop-only">${descHtml}</div>
                </div>
                <button class="hide-feature-btn desktop-only" data-feature="${value}" title="Скрыть параметр" onclick="event.stopPropagation()">✕</button>
            </div>
        `;
    }

    function featureSorter(a, b, aRow, bRow) {
        const tabState = state[currentTab];
        if (!tabState) return 0;
        const aData = aRow.getData();
        const bData = bRow.getData();
        const fieldName = tabState.field;
        const aValue = aData[fieldName];
        const bValue = bData[fieldName];
        const aStarred = tabState.starred.has(aValue);
        const bStarred = tabState.starred.has(bValue);

        if (aStarred && !bStarred) return -1;
        if (!aStarred && bStarred) return 1;
        return aData._index - bData._index;
    }

    function combinedFilter(data) {
        const tabState = state[currentTab];
        if (!tabState) return true;
        const fieldName = tabState.field;
        const val = data[fieldName];
        
        if (tabState.hidden.has(val)) return false;
        
        return true;
    }


    function buildTabulatorData(schemaArray, sectionKey, fieldName) {
        return schemaArray.map((rowSchema, index) => {
            const rowName = rowSchema.name;
            const rowObject = {
                [fieldName]: rowName,
                "categories": rowSchema.categories || [],
                "description": rowSchema.description || "",
                "_index": index
            };

            providersListBackup.forEach(provKey => {
                const provider = modifiedProvidersData[provKey] || providersData[provKey];
                if (provider && provider[sectionKey] && provider[sectionKey][rowName]) {
                    const info = provider[sectionKey][rowName];
                    rowObject[provKey] = info.status || "";
                    if (info.comment) {
                        rowObject[`${provKey}_comment`] = info.comment;
                    } else {
                        rowObject[`${provKey}_comment`] = "";
                    }
                } else {
                    rowObject[provKey] = "";
                    rowObject[`${provKey}_comment`] = "";
                }
            });

            return rowObject;
        });
    }

    function checkCellDirty(provKey, rowName) {
        const tabState = state[currentTab];
        if (!tabState) return false;
        
        const sectionKey = tabState.section;
        const original = providersData[provKey]?.[sectionKey]?.[rowName];
        const modified = modifiedProvidersData[provKey]?.[sectionKey]?.[rowName];
        
        if (!modified) return false;
        
        const origStatus = original?.status || "";
        const origComment = original?.comment || "";
        const modStatus = modified.status || "";
        const modComment = modified.comment || "";
        
        return origStatus !== modStatus || origComment !== modComment;
    }

    function countTotalChanges(provKey) {
        const modified = modifiedProvidersData[provKey];
        if (!modified) return 0;
        
        let count = 0;
        ["features", "os", "hardware"].forEach(sectionKey => {
            const modSection = modified[sectionKey] || {};
            const origSection = providersData[provKey]?.[sectionKey] || {};
            
            const allKeys = new Set([...Object.keys(modSection), ...Object.keys(origSection)]);
            allKeys.forEach(key => {
                const origVal = origSection[key]?.status || "";
                const origComment = origSection[key]?.comment || "";
                const modVal = modSection[key]?.status || "";
                const modComment = modSection[key]?.comment || "";
                
                if (origVal !== modVal || origComment !== modComment) {
                    count++;
                }
            });
        });
        
        return count;
    }

    function buildChangesDiffJson(provKey) {
        const modified = modifiedProvidersData[provKey];
        if (!modified) return "{}";
        
        const diffObject = {
            "name": modified.name,
            "key": provKey,
            "type": dataType,
            "changes": {}
        };
        
        ["features", "os", "hardware", "pricing"].forEach(sectionKey => {
            const modSection = modified[sectionKey] || {};
            const origSection = providersData[provKey]?.[sectionKey] || {};
            
            const sectionDiff = {};
            const allKeys = new Set([...Object.keys(modSection), ...Object.keys(origSection)]);
            
            allKeys.forEach(key => {
                const origVal = origSection[key]?.status || "";
                const origComment = origSection[key]?.comment || "";
                const modVal = modSection[key]?.status || "";
                const modComment = modSection[key]?.comment || "";
                
                if (origVal !== modVal || origComment !== modComment) {
                    sectionDiff[key] = {
                        "status": { "before": origVal, "after": modVal }
                    };
                    if (origComment !== modComment) {
                        sectionDiff[key]["comment"] = { "before": origComment, "after": modComment };
                    }
                }
            });
            
            if (Object.keys(sectionDiff).length > 0) {
                diffObject.changes[sectionKey] = sectionDiff;
            }
        });
        
        return JSON.stringify(diffObject, null, 2);
    }

    function buildFullProviderJson(provKey) {
        const sourceData = modifiedProvidersData[provKey] || providersData[provKey];
        if (!sourceData) return "{}";
        
        const rawOutput = JSON.parse(JSON.stringify(sourceData));
        ["features", "os", "hardware", "pricing"].forEach(sectionKey => {
            if (rawOutput[sectionKey]) {
                Object.keys(rawOutput[sectionKey]).forEach(paramKey => {
                    const item = rawOutput[sectionKey][paramKey];
                    if (!item.status) {
                        delete rawOutput[sectionKey][paramKey];
                    } else if (item.comment === "") {
                        delete item.comment;
                    }
                });
            }
        });
        
        const output = {};
        if (rawOutput.name !== undefined) output.name = rawOutput.name;
        if (rawOutput.key !== undefined) output.key = rawOutput.key;
        if (rawOutput.type !== undefined) output.type = rawOutput.type;
        output.website = rawOutput.website || rawOutput.site || "";
        if (rawOutput.github !== undefined) output.github = rawOutput.github;
        if (rawOutput.description !== undefined) output.description = rawOutput.description || rawOutput.modelDescription || "";
        
        const skipKeys = ["name", "key", "type", "website", "site", "github", "description", "modelDescription"];
        Object.keys(rawOutput).forEach(k => {
            if (!skipKeys.includes(k)) {
                output[k] = rawOutput[k];
            }
        });
        
        return JSON.stringify(output, null, 2);
    }

    function generateColumnsConfig() {
        const tabState = state[currentTab];
        if (!tabState) return [];
        
        const addParamBtnHtml = `<button id="add-param-btn-table" class="edit-header-btn desktop-only" style="border: 1px dashed rgba(195, 230, 121, 0.4); color: #c3e679; border-radius: 4px; padding: 1px 6px; font-weight: bold; margin-left: 10px; cursor: pointer; font-size: 13px;" title="Предложить новый параметр">+</button>`;
        
        const columns = [
            { 
                title: window.innerWidth <= 768 ? `<span style="font-size: 11px; letter-spacing: 1px; color: #888;">PARAMETER</span>` : `${tabState.title} ${addParamBtnHtml}`, 
                field: tabState.field, 
                width: window.innerWidth <= 768 ? 140 : (currentTab === "hardware" ? 380 : 350),
                minWidth: window.innerWidth <= 768 ? 140 : 250,
                frozen: window.innerWidth <= 768,
                formatter: featureFormatter,
                sorter: featureSorter,
                vertAlign: "middle",
                headerSort: window.innerWidth > 768
            }
        ];

        providersList.forEach(provKey => {
            if (window.innerWidth <= 768 && isEditMode && activeEditProvider && activeEditProvider !== provKey) {
                return;
            }
            
            const provider = providersData[provKey];
            if (!provider) return;
            const name = provider.name || provKey;
            
            const logoPath = `./asset/${dataType === 'kvm' ? 'kvm' : 'soft'}/${provKey}/logo.png`;
            const initial = name.charAt(0).toUpperCase();
            const fallbackHtml = `<span style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: rgba(195, 230, 121, 0.15); color: #c3e679; font-size: 13px; font-weight: 800; margin-right: 8px; flex-shrink: 0; line-height: 1; ">${initial}</span>`;
            
            const fallbackHtmlEscaped = fallbackHtml.replace(/"/g, '&quot;');
            let logoIconHtml = `<img src="${logoPath}" alt="${name}" style="width: 24px; height: 24px; object-fit: cover; margin-right: 8px; flex-shrink: 0; border-radius: 50%;" onerror="this.outerHTML='${fallbackHtmlEscaped}'">`;

            let yesCountStr = "";
            if ( (dataType === "soft" && (currentTab === "features" || currentTab === "os")) ||
                 (dataType === "kvm" && currentTab === "features") ) {
                let yesCount = 0;
                let totalItems = tabState.data ? tabState.data.length : 0;
                if (tabState.data) {
                    tabState.data.forEach(row => {
                        let val = row[provKey];
                        if (val && String(val).toLowerCase() === "yes") {
                            yesCount++;
                        }
                    });
                }
                yesCountStr = `<span style="font-size: 11px; color: #888; font-weight: normal; margin-top: 1px; display: block;">${yesCount}/${totalItems} yes</span>`;
            }

            const nameMaxWidth = window.innerWidth <= 768 ? "90px" : "250px";
            let nameHtml = `<span class="provider-name-clickable" data-provider-key="${provKey}" style="font-weight: 700; display: inline-flex; align-items: center; max-width: 100%; overflow: hidden;" title="Посмотреть информацию о поставщике">${logoIconHtml}<span style="display: flex; flex-direction: column; align-items: flex-start; overflow: hidden;"><span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: ${nameMaxWidth}; display: inline-block;">${name}</span>${yesCountStr}</span></span>`;
            if (dataType === "kvm") {
                nameHtml = `<span class="provider-header-clickable" onclick="openKvmCard('${provKey}')" style="font-weight: 700; display: inline-flex; align-items: center; max-width: 100%; overflow: hidden;" title="Посмотреть информацию о модели">${logoIconHtml}<span style="display: flex; flex-direction: column; align-items: flex-start; overflow: hidden;"><span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: ${nameMaxWidth}; display: inline-block;">${name}</span>${yesCountStr}</span></span>`;
            }
            
            const editBtnHtml = isEditMode && activeEditProvider === provKey
                ? `<button class="edit-header-btn desktop-only" data-provider-key="${provKey}" style="background: none; border: none; cursor: pointer; padding: 2px; font-size: 13px;" title="Выйти из редактирования"><img src="./asset/icons/edit.svg" style="width: 14px; height: 14px; filter: invert(0.8) sepia(1) saturate(5) hue-rotate(45deg);"></button>`
                : `<button class="edit-header-btn desktop-only" data-provider-key="${provKey}" style="background: none; border: none; cursor: pointer; padding: 2px; font-size: 13px;" title="Редактировать этого поставщика"><img src="./asset/icons/edit.svg" style="width: 14px; height: 14px; filter: invert(1); opacity: 0.6;"></button>`;

            const removeBtnHtml = `<button class="hide-provider-btn desktop-only" data-provider-key="${provKey}" style="background: none; border: none; color: #777777; cursor: pointer; padding: 2px 4px; font-size: 12px; font-weight: bold; line-height: 1;" title="Скрыть поставщика из таблицы">✕</button>`;

            const colDef = {
                title: `<div class="provider-header-wrapper">${nameHtml}<div class="provider-header-actions">${editBtnHtml}${removeBtnHtml}</div></div>`,
                field: provKey,
                formatter: statusFormatter,
                hozAlign: "center",
                headerHozAlign: "center",
                vertAlign: "middle",
                widthGrow: 1,
                headerSort: false,
                headerClick: function(e, column) {
                    if (e.target.closest(".edit-header-btn") || e.target.closest(".hide-provider-btn")) {
                        return;
                    }
                    const fieldKey = column.getField();
                    if (fieldKey && providersData[fieldKey]) {
                        if (currentTab === "hardware") {
                            openProviderCardModal(fieldKey);
                        } else {
                            openProviderCardModal(fieldKey);
                        }
                    }
                }
            };
            if (window.innerWidth <= 768) {
                colDef.minWidth = 130;
            }
            columns.push(colDef);
        });

        return columns;
    }

    let currentProviderImages = [];
    let currentProviderImageIndex = 0;
    
    function updateProviderCarouselPosition() {
        const track = document.getElementById('provider-carousel-track');
        if (!track) return;
        track.style.transform = `translateX(-${currentProviderImageIndex * 100}%)`;
        const dots = document.getElementById('provider-carousel-dots').querySelectorAll('.carousel-dot');
        dots.forEach((dot, i) => {
            dot.className = i === currentProviderImageIndex ? 'carousel-dot active' : 'carousel-dot';
        });
    }

    window.goToProviderSlide = function(index) {
        if (index < 0) index = currentProviderImages.length - 1;
        if (index >= currentProviderImages.length) index = 0;
        currentProviderImageIndex = index;
        updateProviderCarouselPosition();
    }

    const checkImageExists = (src) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
        });
    };

    window.providerImagesCache = {};
    window.providerImagesLoading = {};

    window.preloadVisibleProviderImages = function() {
        const dataType = basePath.includes("kvm") ? "kvm" : "soft";
        
        const providersToLoad = [...providersList];
        if (isEditMode && !providersToLoad.includes("draft")) {
            providersToLoad.push("draft");
        }

        providersToLoad.forEach(async (provKey) => {
            if (window.providerImagesCache[provKey] || window.providerImagesLoading[provKey]) {
                return;
            }
            
            window.providerImagesLoading[provKey] = true;
            const validImages = [];
            const folderPath = `./asset/${dataType}/${provKey}`;
            
            for (let i = 1; i <= 10; i++) {
                const src = `${folderPath}/${i}.png`;
                const exists = await checkImageExists(src);
                if (exists) {
                    validImages.push(src);
                } else {
                    break;
                }
            }
            
            window.providerImagesCache[provKey] = validImages;
            window.providerImagesLoading[provKey] = false;
        });
    };

    window.openMobileFeatureModal = function(featureName) {
        const modal = document.getElementById("mobile-feature-modal");
        const titleEl = document.getElementById("mobile-feature-modal-title");
        const descEl = document.getElementById("mobile-feature-modal-desc");
        const pinBtn = document.getElementById("mobile-feature-pin-btn");
        const hideBtn = document.getElementById("mobile-feature-hide-btn");
        
        if (!modal) return;
        
        const tabState = state[currentTab];
        const isStarred = tabState.starred.has(featureName);
        const featureItem = tabState.all.find(f => f.name === featureName || f[tabState.field] === featureName);
        
        titleEl.textContent = featureName;
        descEl.textContent = (featureItem && featureItem.description) ? featureItem.description : "Нет описания для данного параметра.";
        
        pinBtn.innerHTML = isStarred ? '<span class="star-icon" style="color: #ffb700;">★</span> Unpin' : '<span class="star-icon">☆</span> Pin to top';
        
        pinBtn.onclick = function() {
            if (isStarred) {
                tabState.starred.delete(featureName);
            } else {
                tabState.starred.add(featureName);
            }
            updateUrlState();
            refreshMatrixTable();
            closeMobileFeatureModal();
        };
        
        hideBtn.onclick = function() {
            tabState.hidden.add(featureName);
            table.setFilter(combinedFilter);
            updateFeatureCounts();
            closeMobileFeatureModal();
        };
        
        modal.classList.add("show");
    };

    window.closeMobileFeatureModal = function() {
        const modal = document.getElementById("mobile-feature-modal");
        if (modal) {
            modal.classList.remove("show");
        }
    };

    window.openMobileCellModal = function(featureName, providerName, valueHtml, description) {
        const modal = document.getElementById("mobile-cell-modal");
        const titleEl = document.getElementById("mobile-cell-modal-title");
        const valueEl = document.getElementById("mobile-cell-modal-value");
        const descEl = document.getElementById("mobile-cell-modal-desc");
        
        if (!modal) return;
        
        titleEl.innerHTML = `<span style="font-size: 14px; font-weight: normal; color: #888;">${featureName}</span><br/>${providerName}`;
        valueEl.innerHTML = valueHtml;
        
        if (description && description.trim() !== "") {
            descEl.textContent = description;
            descEl.style.display = "block";
        } else {
            descEl.style.display = "none";
        }
        
        modal.classList.add("show");
    };

    window.closeMobileCellModal = function() {
        const modal = document.getElementById("mobile-cell-modal");
        if (modal) {
            modal.classList.remove("show");
        }
    };

    window.openProviderCardModal = async function(provKey) {
        const provider = providersData[provKey];
        if (!provider) return;

        const modal = document.getElementById("provider-card-modal");
        const titleEl = document.getElementById("provider-card-title");
        const descEl = document.getElementById("provider-card-desc");
        const logoWrapper = document.getElementById("provider-card-logo-wrapper");
        const siteLink = document.getElementById("provider-card-site-link");
        const githubLink = document.getElementById("provider-card-github-link");

        if (!modal) return;

        titleEl.textContent = provider.name || provKey;
        descEl.textContent = provider.modelDescription || provider.description || provider.companyDescription || "Описание для данного поставщика пока не добавлено.";

        const logoPath = `./asset/${dataType}/${provKey}/logo.png`;
        const initial = (provider.name || provKey).charAt(0).toUpperCase();
        const fallbackSpan = `<span>${initial}</span>`;
        logoWrapper.innerHTML = `<img src="${logoPath}" alt="${provider.name}" style="width: 100%; height: 100%; object-fit: cover; background: #fff;" onerror="this.outerHTML='${fallbackSpan}'">`;

        let siteUrl = provider.website || provider.site;
        if (siteUrl) {
            siteLink.href = siteUrl;
            siteLink.style.display = "flex";
        } else {
            siteLink.style.display = "none";
        }

        if (provider.github) {
            githubLink.href = provider.github;
            githubLink.style.display = "flex";
        } else {
            githubLink.style.display = "none";
        }

        currentProviderImages = provider.images || [];
        currentProviderImageIndex = 0;
        
        const renderProviderCarousel = () => {
            const carousel = document.getElementById('provider-card-carousel');
            if (!carousel) return;
            const track = document.getElementById('provider-carousel-track');
            const dotsContainer = document.getElementById('provider-carousel-dots');
            const prevBtn = carousel.querySelector('.prev-btn');
            const nextBtn = carousel.querySelector('.next-btn');

            track.innerHTML = '';
            dotsContainer.innerHTML = '';
            
            if (currentProviderImages.length > 0) {
                carousel.style.display = 'block';
                currentProviderImages.forEach((imgSrc, i) => {
                    const slide = document.createElement('div');
                    slide.className = 'carousel-slide';
                    slide.innerHTML = `<img src="${imgSrc}" alt="Photo ${i + 1}" style="width:100%; border-radius:4px;">`;
                    track.appendChild(slide);

                    if (currentProviderImages.length > 1) {
                        const dot = document.createElement('div');
                        dot.className = i === 0 ? 'carousel-dot active' : 'carousel-dot';
                        dot.onclick = () => window.goToProviderSlide(i);
                        dotsContainer.appendChild(dot);
                    }
                });

                if (currentProviderImages.length > 1) {
                    prevBtn.style.display = 'flex';
                    nextBtn.style.display = 'flex';
                    prevBtn.onclick = () => window.goToProviderSlide(currentProviderImageIndex - 1);
                    nextBtn.onclick = () => window.goToProviderSlide(currentProviderImageIndex + 1);
                } else {
                    prevBtn.style.display = 'none';
                    nextBtn.style.display = 'none';
                }
                updateProviderCarouselPosition();
            } else {
                carousel.style.display = 'none';
            }
        };

        const mobEditBtn = document.getElementById("mobile-provider-edit-btn");
        const mobHideBtn = document.getElementById("mobile-provider-hide-btn");
        
        if (mobEditBtn) {
            mobEditBtn.onclick = () => {
                isEditMode = true;
                activeEditProvider = provKey;
                modal.classList.remove('show');
                
                if (!modifiedProvidersData[provKey]) {
                    modifiedProvidersData[provKey] = JSON.parse(JSON.stringify(providersData[provKey]));
                }
                updateFloatingBar();
                
                refreshMatrixTable();
            };
        }
        
        if (mobHideBtn) {
            mobHideBtn.onclick = () => {
                modal.classList.remove('show');
                if (isEditMode && activeEditProvider === provKey) {
                    isEditMode = false;
                    activeEditProvider = null;
                }
                providersList = providersList.filter(p => p !== provKey);
                renderSoftCheckboxes();
                if (table && typeof table.setColumns === 'function') {
                    table.setColumns(generateColumnsConfig());
                } else {
                    refreshMatrixTable();
                }
                updateUrlState();
            };
        }

        if (currentProviderImages.length === 0) {
            if (window.providerImagesCache[provKey]) {
                currentProviderImages = window.providerImagesCache[provKey];
                renderProviderCarousel();
            } else {
                if (!window.providerImagesLoading[provKey]) {
                    window.preloadVisibleProviderImages();
                }
                renderProviderCarousel();
                
                const checkInterval = setInterval(() => {
                    if (window.providerImagesCache[provKey]) {
                        clearInterval(checkInterval);
                        currentProviderImages = window.providerImagesCache[provKey];
                        renderProviderCarousel();
                    }
                }, 100);
            }
        } else {
            renderProviderCarousel();
        }

        modal.classList.add("show");
    }
    const cardModalEl = document.getElementById("provider-card-modal");
    const cardCloseBtnEl = document.getElementById("provider-card-close-btn");

    if (cardCloseBtnEl && cardModalEl) {
        cardCloseBtnEl.addEventListener("click", () => {
            cardModalEl.classList.remove("show");
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target.classList.contains("modal")) {
            e.target.classList.remove("show");
        }
    });

    function refreshMatrixTable() {
        const tabState = state[currentTab];
        if (!tabState) return;

        let scrollY = 0;
        let scrollX = 0;
        const holder = document.querySelector('.tabulator-tableholder');
        if (holder) {
            scrollY = holder.scrollTop;
            scrollX = holder.scrollLeft;
        }

        if (table && typeof table.destroy === "function") {
            try { table.destroy(); } catch (e) {}
        }

        table = new Tabulator("#matrix-table", {
            index: tabState.field,
            data: tabState.data,
            layout: (window.innerWidth <= 768 && (!isEditMode || !activeEditProvider)) ? "fitData" : "fitColumns",
            pagination: false,
            maxHeight: "calc(100vh - 120px)",
            initialSort: [{ column: tabState.field, dir: "asc" }],
            initialFilter: combinedFilter,
            columns: generateColumnsConfig(),
            nestedFieldSeparator: false,
        });
        
        let scrollRestored = false;
        table.on("renderComplete", () => {
            if (!scrollRestored) {
                const newHolder = document.querySelector('.tabulator-tableholder');
                if (newHolder) {
                    newHolder.scrollTop = scrollY;
                    newHolder.scrollLeft = scrollX;
                }
                scrollRestored = true;
            }
        });
        
        window.preloadVisibleProviderImages();
    }

    try {
        const providersIndexResponse = await fetch(basePath + 'providers.json?t=' + Date.now());
        const loadedList = await providersIndexResponse.json();
        const urlProviders = urlParams.get('providers');
        if (urlProviders) {
            if (urlProviders === 'none') {
                providersList = [];
            } else {
                const requested = urlProviders.split(',');
                providersList = requested.filter(p => loadedList.includes(p));
            }
        } else {
            let defaultVisible = ["usbridge", "rustdesk", "parsec", "usbridgekvm2.0", "jetkvm", "pikvm-v4-plus"];
            if (window.innerWidth <= 768) {
                defaultVisible = ["usbridge", "rustdesk", "parsec", "usbridgekvm2.0", "jetkvm"];
            }
            providersList = loadedList.filter(k => k !== "draft" && defaultVisible.includes(k));
        }
        providersListBackup = [...loadedList];

        const safeFetchJson = async (url) => {
            try {
                const res = await fetch(url);
                if (!res.ok) return [];
                return await res.json();
            } catch (e) {
                return [];
            }
        };

        const [featuresSchema, osSchema, hardwareSchema, pricingSchema] = await Promise.all([
            safeFetchJson(basePath + 'features.json?t=' + Date.now()),
            safeFetchJson(basePath + 'os.json?t=' + Date.now()),
            safeFetchJson(basePath + 'hardware.json?t=' + Date.now()),
            safeFetchJson(basePath + 'pricing.json?t=' + Date.now())
        ]);

        state.features.all = featuresSchema;
        state.os.all = osSchema;
        state.hardware.all = hardwareSchema;
        state.pricing.all = pricingSchema;

        const providerPromises = providersListBackup.map(async (provKey) => {
            try {
                const res = await fetch(`${basePath}providers/${provKey}.json?t=${Date.now()}`);
                if (!res.ok) throw new Error();
                providersData[provKey] = await res.json();
            } catch (e) {
                console.error(`Failed to load provider data for ${provKey}, using empty schema`);
                providersData[provKey] = { name: provKey, key: provKey, features: {}, os: {}, hardware: {}, pricing: {} };
            }
        });
        await Promise.all(providerPromises);

        if (providersData["draft"]) {
            ["features", "os", "hardware", "pricing"].forEach(sec => {
                if (!providersData["draft"][sec]) providersData["draft"][sec] = {};
                state[sec].all.forEach(item => {
                    if (!providersData["draft"][sec][item.name]) {
                        providersData["draft"][sec][item.name] = { status: "Unknown" };
                    }
                });
            });
        }

        state.features.data = buildTabulatorData(state.features.all, "features", "feature");
        state.os.data = buildTabulatorData(state.os.all, "os", "os");
        state.hardware.data = buildTabulatorData(state.hardware.all, "hardware", "hardware");
        state.pricing.data = buildTabulatorData(state.pricing.all, "pricing", "pricing");

        const softCheckboxListContainer = document.getElementById('soft-checkbox-list');
        
        function renderSoftCheckboxes() {
            softCheckboxListContainer.innerHTML = "";
            const colors = ['#2196F3', '#E91E63', '#F44336', '#673AB7', '#03A9F4', '#FF9800', '#4CAF50', '#FFC107', '#9E9E9E'];
            providersListBackup.forEach((provKey, index) => {
                if (provKey === "draft" && !providersList.includes("draft")) {
                    return;
                }
                const provider = providersData[provKey];
                const isChecked = providersList.includes(provKey);
                const name = provider ? provider.name : provKey;
                const initial = name.charAt(0).toUpperCase();
                const color = colors[index % colors.length];
                const logoPath = `./asset/${dataType === 'kvm' ? 'kvm' : 'soft'}/${provKey}/logo.png`;
                const fallbackHtml = `<span class="provider-logo-circle" style="background-color: ${color};">${initial}</span>`;
                const logoHtml = `<img src="${logoPath}" alt="${name}" class="provider-logo-circle" onerror="this.outerHTML='${fallbackHtml.replace(/"/g, '&quot;')}'">`;

                const label = document.createElement('label');
                label.className = `provider-list-item ${isChecked ? 'selected' : ''}`;
                label.innerHTML = `
                    <div class="provider-list-left">
                        ${logoHtml}
                        <span class="provider-name">${name}</span>
                    </div>
                    <div class="provider-list-right">
                        <span class="provider-shown-text">${isChecked ? 'shown' : ''}</span>
                    </div>
                    <input type="checkbox" class="toggle-col" value="${provKey}" ${isChecked ? 'checked' : ''} style="display:none;">
                `;
                softCheckboxListContainer.appendChild(label);
            });
            softCheckboxes = document.querySelectorAll('.toggle-col');
        }
        
        renderSoftCheckboxes();

        refreshMatrixTable();

        const categoryConfigs = {
            features: dataType === 'kvm' ? [
                { id: "security", label: `<img src="./asset/icons/security.svg" class="category-icon"> Security` },
                { id: "video", label: `<img src="./asset/icons/lightning.svg" class="category-icon"> Latency` },
                { id: "hardware", label: `<img src="./asset/icons/plugging.svg" class="category-icon"> Peripherals` },
                { id: "software", label: `<img src="./asset/icons/laptop.svg" class="category-icon"> Software` },
                { id: "network", label: `<img src="./asset/icons/web.svg" class="category-icon"> Network` },
                { id: "advanced", label: `<img src="./asset/icons/robot.svg" class="category-icon"> AI & Advanced` }
            ] : [
                { id: "gaming", label: `<img src="./asset/icons/gaming.svg" class="category-icon"> Gaming` },
                { id: "sysadmin", label: `<img src="./asset/icons/repair.svg" class="category-icon"> Sysadmin` },
                { id: "artist", label: `<img src="./asset/icons/palette.svg" class="category-icon"> Artist` }
            ],
            os: [
                { id: "windows", label: `<img src="./asset/icons/windows.svg" class="category-icon"> Windows` },
                { id: "macos", label: `<img src="./asset/icons/apple.svg" class="category-icon"> macOS` },
                { id: "linux", label: `<img src="./asset/icons/linux.svg" class="category-icon"> Linux` },
                { id: "smartphone", label: `<img src="./asset/icons/smartphone.svg" class="category-icon"> Smartphones` }
            ],
            hardware: dataType === 'kvm' ? [
                { id: "computing", label: `<img src="./asset/icons/cpu.svg" class="category-icon"> Computing Platform` },
                { id: "capture", label: `<img src="./asset/icons/monitor.svg" class="category-icon"> Video Capture` },
                { id: "ports", label: `<img src="./asset/icons/plugging.svg" class="category-icon"> Ports & Connectors` },
                { id: "wireless", label: `<img src="./asset/icons/network.svg" class="category-icon"> Wireless` },
                { id: "display", label: `<img src="./asset/icons/display.svg" class="category-icon"> Display` },
                { id: "power", label: `<img src="./asset/icons/lightning.svg" class="category-icon"> Power` },
                { id: "cooling", label: `<img src="./asset/icons/thermometer.svg" class="category-icon"> Cooling & Chassis` },
                { id: "host_power", label: `<img src="./asset/icons/charge.svg" class="category-icon"> Host Power Mgmt` },
                { id: "certification", label: `<img src="./asset/icons/document.svg" class="category-icon"> Certification` }
            ] : [],
            pricing: dataType === 'kvm' ? [] : [
                { id: "personal", label: `<img src="./asset/icons/person.svg" class="category-icon"> Personal` },
                { id: "business", label: `<img src="./asset/icons/institution-corporate.svg" class="category-icon"> Business / Teams` }
            ]
        };

        const categoryContainer = document.getElementById("category-filters");

        function renderCategoryFilters() {
            categoryContainer.innerHTML = "";
            const categoryContainerMobile = document.getElementById("category-filters-mobile");
            if (categoryContainerMobile) categoryContainerMobile.innerHTML = "";
            const configs = categoryConfigs[currentTab] || [];
            
            configs.forEach(config => {
                const createButton = () => {
                    const button = document.createElement("button");
                    button.className = "category-tag";
                    if (activeCategoryFilter === config.id) {
                        button.classList.add("active");
                    }
                    button.innerHTML = config.label;
                    button.setAttribute("data-category", config.id);
                    
                    button.addEventListener("click", () => {
                        const tabState = state[currentTab];
                        if (activeCategoryFilter === config.id) {
                            activeCategoryFilter = null;
                            tabState.hidden.clear();
                        } else {
                            activeCategoryFilter = config.id;
                            
                            tabState.hidden.clear();
                            tabState.all.forEach(f => {
                                const categories = f.categories || [];
                                if (!categories.includes(config.id)) {
                                    tabState.hidden.add(f.name);
                                }
                            });
                        }
                        renderCategoryFilters(); // Re-render to update 'active' class on all buttons
                        table.setFilter(combinedFilter);
                        const searchInput = document.getElementById('feature-search-input');
                        if (searchInput) renderFeatureDropdown(searchInput.value.trim());
                        if (typeof updateFeatureCounts === 'function') updateFeatureCounts();
                    });
                    return button;
                };
                
                categoryContainer.appendChild(createButton());
                if (categoryContainerMobile) categoryContainerMobile.appendChild(createButton());
            });
        }

        renderCategoryFilters();

        const softBtn = document.getElementById('soft-dropdown-btn');
        const softMenu = document.getElementById('soft-dropdown-menu');
        const featureBtn = document.getElementById('feature-dropdown-btn');
        const featureMenu = document.getElementById('feature-dropdown-menu');
        const mobileChangeBtn = document.getElementById('mobile-change-solutions-btn');
        const cycleProviderBtn = document.getElementById('cycle-provider-btn');
        const closeFeatureModalBtn = document.getElementById('close-feature-modal');
        const closeProviderModalBtn = document.getElementById('close-provider-modal');

        if (cycleProviderBtn) {
            cycleProviderBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (providersList.length > 1) {
                    const holder = document.querySelector('.tabulator-tableholder');
                    let scrollY = 0, scrollX = 0;
                    if (holder) {
                        scrollY = holder.scrollTop;
                        scrollX = holder.scrollLeft;
                    }

                    const lastProv = providersList.pop();
                    providersList.unshift(lastProv);
                    renderSoftCheckboxes();
                    
                    if (table && typeof table.setColumns === 'function') {
                        try {
                            table.setColumns(generateColumnsConfig());
                        } catch (e) {
                            console.error(e);
                        }
                        if (holder) {
                            holder.scrollTop = scrollY;
                            holder.scrollLeft = scrollX;
                            setTimeout(() => {
                                holder.scrollTop = scrollY;
                                holder.scrollLeft = scrollX;
                            }, 50);
                        }
                    } else {
                        refreshMatrixTable();
                    }
                    updateUrlState();
                }
            });
        }

        function closeAllDropdowns() {
            softMenu.classList.remove('show');
            featureMenu.classList.remove('show');
        }

        softBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            featureMenu.classList.remove('show');
            softMenu.classList.toggle('show');
        });

        featureBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            softMenu.classList.remove('show');
            featureMenu.classList.toggle('show');
        });

        if (mobileChangeBtn) {
            mobileChangeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAllDropdowns();
                softMenu.classList.toggle('show');
            });
        }
        
        const mobileFilterBtn = document.getElementById('mobile-filter-btn');
        if (mobileFilterBtn) {
            mobileFilterBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeAllDropdowns();
                featureMenu.classList.toggle('show');
            });
        }
        
        if (closeFeatureModalBtn) {
            closeFeatureModalBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                featureMenu.classList.remove('show');
            });
        }
        
        if (closeProviderModalBtn) {
            closeProviderModalBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                softMenu.classList.remove('show');
            });
        }

        document.addEventListener('click', () => {
            closeAllDropdowns();
        });

        softMenu.addEventListener('click', (e) => e.stopPropagation());
        featureMenu.addEventListener('click', (e) => e.stopPropagation());

        const featureContainer = document.getElementById('feature-checkbox-list');
        const featureDropdownLabel = document.querySelector('#feature-dropdown-btn');
        
        function renderFeatureDropdown(filterText = "") {
            featureContainer.innerHTML = "";
            const tabState = state[currentTab];
            if (!tabState) return;
            tabState.all.forEach(item => {
                const itemName = item.name;
                if (filterText && !itemName.toLowerCase().includes(filterText.toLowerCase())) return;
                
                const isChecked = !tabState.hidden.has(itemName);
                const label = document.createElement('label');
                label.innerHTML = `
                    <input type="checkbox" data-feature="${itemName}" ${isChecked ? 'checked' : ''}>
                    <span>${itemName}</span>
                `;
                featureContainer.appendChild(label);
            });
        }

        function updateFeatureCounts() {
            const tabState = state[currentTab];
            if (!tabState) return;
            const visibleCount = tabState.all.length - tabState.hidden.size;
            
            const featureModalSubtitle = document.getElementById('feature-modal-subtitle');
            if (featureModalSubtitle) {
                featureModalSubtitle.textContent = `${visibleCount} of ${tabState.all.length} shown`;
            }

            document.getElementById('restore-features-btn').style.display = tabState.hidden.size > 0 ? 'inline-block' : 'none';
        }

        renderFeatureDropdown();
        updateFeatureCounts();
        updateSoftCount();

        document.getElementById('feature-search-input').addEventListener('input', (e) => {
            renderFeatureDropdown(e.target.value.trim());
        });

        featureContainer.addEventListener('change', (e) => {
            if (e.target.tagName === 'INPUT') {
                const item = e.target.getAttribute('data-feature');
                const tabState = state[currentTab];
                if (e.target.checked) {
                    tabState.hidden.delete(item);
                } else {
                    tabState.hidden.add(item);
                }
                
                if (activeCategoryFilter) {
                    activeCategoryFilter = null;
                    document.querySelectorAll(".category-tag").forEach(b => b.classList.remove("active"));
                }
                
                table.setFilter(combinedFilter);
                updateFeatureCounts();
            }
        });

        document.getElementById('feature-select-all').addEventListener('click', () => {
            state[currentTab].hidden.clear();
            if (activeCategoryFilter) {
                activeCategoryFilter = null;
                document.querySelectorAll(".category-tag").forEach(b => b.classList.remove("active"));
            }
            renderFeatureDropdown(document.getElementById('feature-search-input').value.trim());
            table.setFilter(combinedFilter);
            updateFeatureCounts();
        });

        document.getElementById('feature-deselect-all').addEventListener('click', () => {
            const tabState = state[currentTab];
            tabState.all.forEach(f => tabState.hidden.add(f.name));
            if (activeCategoryFilter) {
                activeCategoryFilter = null;
                document.querySelectorAll(".category-tag").forEach(b => b.classList.remove("active"));
            }
            renderFeatureDropdown(document.getElementById('feature-search-input').value.trim());
            table.setFilter(combinedFilter);
            updateFeatureCounts();
        });

        function updateSoftCount() {
            const checkedCount = Array.from(document.querySelectorAll('.toggle-col:checked'))
                                      .filter(cb => cb.value !== 'draft').length;
            const totalCount = providersListBackup.filter(p => p !== 'draft').length;
            const softCountEl = document.getElementById('soft-count');
            if (softCountEl) softCountEl.textContent = `${checkedCount}/${totalCount}`;
            const mobileSoftCountEl = document.getElementById('mobile-soft-count');
            if (mobileSoftCountEl) mobileSoftCountEl.textContent = `${checkedCount}/${totalCount}`;
            const providerModalSubtitle = document.getElementById('provider-modal-subtitle');
            if (providerModalSubtitle) {
                providerModalSubtitle.textContent = `${checkedCount} of ${totalCount} shown`;
            }
            
            const dropdownBtn = document.getElementById('soft-dropdown-btn');
            if (dropdownBtn) {
                const label = dataType === 'kvm' ? 'KVM Providers' : 'Software Providers';
                dropdownBtn.innerHTML = `${label}: <strong id="soft-count">${checkedCount}/${totalCount}</strong> ▾`;
            }
        }

        document.getElementById('soft-search-input').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            softCheckboxes.forEach(cb => {
                const label = cb.closest('label');
                const text = label.querySelector('span').textContent.toLowerCase();
                if (text.includes(query)) {
                    label.style.display = 'flex';
                } else {
                    label.style.display = 'none';
                }
            });
        });

        softCheckboxListContainer.addEventListener('change', (e) => {
            if (e.target.classList.contains('toggle-col')) {
                const fieldName = e.target.value;
                const label = e.target.closest('.provider-list-item');
                const shownText = label.querySelector('.provider-shown-text');
                if (e.target.checked) {
                    if (!providersList.includes(fieldName)) {
                        providersList.push(fieldName);
                    }
                    label.classList.add('selected');
                    shownText.textContent = 'shown';
                } else {
                    providersList = providersList.filter(k => k !== fieldName);
                    label.classList.remove('selected');
                    shownText.textContent = '';
                }
                updateUrlState();
                
                refreshMatrixTable();
                updateSoftCount();
            }
        });

        document.getElementById('soft-select-all').addEventListener('click', () => {
            providersList = providersList.includes("draft")
                ? [...providersListBackup]
                : providersListBackup.filter(k => k !== "draft");
            renderSoftCheckboxes();
            refreshMatrixTable();
            updateSoftCount();
            updateUrlState();
        });

        document.getElementById('soft-deselect-all').addEventListener('click', () => {
            providersList = [];
            renderSoftCheckboxes();
            refreshMatrixTable();
            updateSoftCount();
            updateUrlState();
        });

        const tabBtns = document.querySelectorAll('.tab-btn');
        const searchInput = document.getElementById('feature-search-input');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.target.closest('.tab-btn');
                if (!targetBtn || !targetBtn.hasAttribute('data-tab') || targetBtn.classList.contains('small-tab')) return;
                
                const tab = targetBtn.getAttribute('data-tab');
                if (tab === currentTab) return;

                searchInput.value = "";

                tabBtns.forEach(b => {
                    if (!b.classList.contains('small-tab') && b.hasAttribute('data-tab')) b.classList.remove('active');
                });
                targetBtn.classList.add('active');
                currentTab = tab;
                updateUrlState();

                const tabState = state[currentTab];
                if (!tabState) return;

                renderFeatureDropdown();
                updateFeatureCounts();

                activeCategoryFilter = null;
                renderCategoryFilters();

                refreshMatrixTable();
            });
        });

        document.getElementById("matrix-table").addEventListener("click", (e) => {
            const tabState = state[currentTab];
            
            if (e.target.classList.contains("star-btn")) {
                const itemName = e.target.getAttribute("data-feature");
                if (itemName) {
                    if (tabState.starred.has(itemName)) {
                        tabState.starred.delete(itemName);
                    } else {
                        tabState.starred.add(itemName);
                    }
                    updateUrlState();
                    refreshMatrixTable();
                }
                return;
            }

            if (e.target.classList.contains("hide-feature-btn")) {
                const itemName = e.target.getAttribute("data-feature");
                if (itemName) {
                    tabState.hidden.add(itemName);
                    table.setFilter(combinedFilter);
                    renderFeatureDropdown(document.getElementById('feature-search-input').value.trim());
                    updateFeatureCounts();
                }
                return;
            }

            if (isEditMode) {
                if (!tabState) return;
                const cellElement = e.target.closest(".tabulator-cell");
                if (!cellElement) return;

                const colField = cellElement.getAttribute("tabulator-field");
                if (colField !== activeEditProvider) return;

                const rowElement = cellElement.closest(".tabulator-row");
                if (!rowElement) return;

                const row = table.getRow(rowElement);
                if (!row) return;
                
                const rowData = row.getData();
                const paramName = rowData[tabState.field];
                
                if (!paramName) return;

                openCellEditModal(colField, paramName);
            }
        });

        document.getElementById("matrix-table").addEventListener("click", (e) => {
            const hideBtn = e.target.closest(".hide-provider-btn");
            if (hideBtn) {
                e.stopPropagation();
                const provKey = hideBtn.getAttribute("data-provider-key");
                if (provKey) {
                    if (isEditMode && activeEditProvider === provKey) {
                        isEditMode = false;
                        activeEditProvider = null;
                        document.getElementById("changes-floating-bar").style.display = "none";
                    }
                    providersList = providersList.filter(k => k !== provKey);
                    renderSoftCheckboxes();
                    updateSoftCount();
                    refreshMatrixTable();
                }
                return;
            }

            const statusCell = e.target.closest(".status-cell-wrapper");
            if (statusCell && window.innerWidth <= 768 && !isEditMode) {
                const fName = statusCell.getAttribute("data-feature");
                const pName = statusCell.getAttribute("data-provider");
                const cText = statusCell.getAttribute("data-comment");
                const vHtml = statusCell.getAttribute("data-value-html");
                
                openMobileCellModal(fName, pName, vHtml, cText);
                return;
            }

            const editBtn = e.target.closest(".edit-header-btn");
            if (editBtn) {
                e.stopPropagation();
                const provKey = editBtn.getAttribute("data-provider-key");
                
                if (isEditMode && activeEditProvider === provKey) {
                    isEditMode = false;
                    activeEditProvider = null;
                    document.getElementById("changes-floating-bar").style.display = "none";
                } else {
                    isEditMode = true;
                    activeEditProvider = provKey;
                    
                    if (!modifiedProvidersData[provKey]) {
                        modifiedProvidersData[provKey] = JSON.parse(JSON.stringify(providersData[provKey]));
                    }
                    
                    updateFloatingBar();
                }

                refreshMatrixTable();
            }
        });

        const editCellModal = document.getElementById("edit-cell-modal");
        const modalTitle = document.getElementById("modal-title");
        const modalStatusSelect = document.getElementById("modal-status-select");
        const modalStatusInput = document.getElementById("modal-status-input");
        const modalCommentInput = document.getElementById("modal-comment-input");
        const charCountLabel = document.getElementById("char-count");
        
        let currentEditingCellInfo = null;

        function openCellEditModal(provKey, paramName) {
            const providerName = providersData[provKey]?.name || provKey;
            modalTitle.textContent = `${providerName} / ${paramName}`;
            
            const sectionKey = state[currentTab].section;
            const currentValue = modifiedProvidersData[provKey]?.[sectionKey]?.[paramName] || 
                                 providersData[provKey]?.[sectionKey]?.[paramName] || {};
            
            const currentStatus = currentValue.status || "";
            const currentComment = currentValue.comment || "";

            const standardValues = ["Yes", "No", "Partial", "Paid", "Unknown", "In Development"];
            
            const paramSchema = state[currentTab].all.find(item => item.name === paramName);
            const paramType = paramSchema?.type || 'boolean';

            const hardwareBlock = document.getElementById("hardware-inputs-block");
            if (hardwareBlock) hardwareBlock.style.display = "none";

            if (paramType === 'text') {
                modalStatusSelect.style.display = "none";
                modalStatusInput.style.display = "block";
                modalStatusInput.value = currentStatus;
            } else {
                modalStatusSelect.style.display = "block";
                modalStatusInput.style.display = "none";
                
                if (standardValues.includes(currentStatus)) {
                    modalStatusSelect.value = currentStatus;
                } else {
                    modalStatusSelect.value = "Unknown";
                }
            }

            modalCommentInput.value = currentComment;
            charCountLabel.textContent = currentComment.length;
            
            currentEditingCellInfo = { provKey, paramName };
            editCellModal.classList.add("show");
        }

        modalCommentInput.addEventListener("input", (e) => {
            charCountLabel.textContent = e.target.value.length;
        });

        document.getElementById("modal-cancel-btn").addEventListener("click", () => {
            editCellModal.classList.remove("show");
        });

        document.getElementById("modal-save-btn").addEventListener("click", () => {
            if (!currentEditingCellInfo) return;
            const { provKey, paramName } = currentEditingCellInfo;
            const sectionKey = state[currentTab].section;
            
            let statusVal = "";
            const paramSchema = state[currentTab].all.find(item => item.name === paramName);
            const paramType = paramSchema?.type || 'boolean';

            if (paramType === 'text') {
                statusVal = modalStatusInput.value.trim();
            } else {
                statusVal = modalStatusSelect.value;
            }

            const commentVal = modalCommentInput.value.trim();

            if (!modifiedProvidersData[provKey]) {
                modifiedProvidersData[provKey] = JSON.parse(JSON.stringify(providersData[provKey]));
            }
            if (!modifiedProvidersData[provKey][sectionKey]) {
                modifiedProvidersData[provKey][sectionKey] = {};
            }
            
            modifiedProvidersData[provKey][sectionKey][paramName] = {
                status: statusVal,
                comment: commentVal
            };

            const tabDataRow = state[currentTab].data.find(r => r[state[currentTab].field] === paramName);
            if (tabDataRow) {
                tabDataRow[provKey] = statusVal;
                tabDataRow[`${provKey}_comment`] = commentVal;
            }

            refreshMatrixTable();

            editCellModal.classList.remove("show");
            updateFloatingBar();
        });

        function updateFloatingBar() {
            const bar = document.getElementById("changes-floating-bar");
            const mobileSaveBtn = document.getElementById("mobile-save-changes-btn");
            if (!isEditMode || !activeEditProvider) {
                bar.style.display = "none";
                if (mobileSaveBtn) mobileSaveBtn.style.display = "none";
                return;
            }
            
            const count = countTotalChanges(activeEditProvider);
            const providerName = providersData[activeEditProvider]?.name || activeEditProvider;
            
            if (count > 0) {
                document.getElementById("changes-counter-text").innerHTML = 
                    `Parameters modified for <strong>${providerName}</strong>: <strong>${count}</strong>`;
                bar.style.display = "flex";
                if (mobileSaveBtn) mobileSaveBtn.style.display = "flex";
            } else {
                document.getElementById("changes-counter-text").innerHTML = 
                    `Editing mode <strong>${providerName}</strong> (no changes)`;
                bar.style.display = "flex";
                if (mobileSaveBtn) mobileSaveBtn.style.display = "flex";
            }
        }

        const submitModal = document.getElementById("submit-changes-modal");
        const diffView = document.getElementById("changes-diff-view");
        const prAuthBlock = document.getElementById("pr-auth-block");
        
        const draftMetaBlock = document.getElementById("draft-meta-block");
        const draftMetaName = document.getElementById("draft-meta-name");
        const draftMetaSite = document.getElementById("draft-meta-site");
        const draftMetaGithub = document.getElementById("draft-meta-github");
        const draftMetaDesc = document.getElementById("draft-meta-desc");

        function updateDraftFullJsonPreview() {
            if (activeEditProvider !== "draft") return;

            const nameVal = draftMetaName.value.trim();
            const siteVal = draftMetaSite.value.trim();
            const githubVal = draftMetaGithub.value.trim();
            const descVal = draftMetaDesc.value.trim();

            let keyVal = "draft";
            if (nameVal) {
                keyVal = nameVal.toLowerCase()
                    .replace(/[^a-z0-9]/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-|-$/g, '') || "new-provider";
            }

            if (!modifiedProvidersData["draft"]) {
                modifiedProvidersData["draft"] = JSON.parse(JSON.stringify(providersData["draft"]));
            }
            
            modifiedProvidersData["draft"].name = nameVal || "Draft";
            modifiedProvidersData["draft"].key = keyVal;
            modifiedProvidersData["draft"].type = dataType === 'kvm' ? 'kvm' : 'software';
            modifiedProvidersData["draft"].website = siteVal;
            modifiedProvidersData["draft"].github = githubVal;
            modifiedProvidersData["draft"].description = descVal;
            
            // Cleanup any trailing site from old draft copy
            if ('site' in modifiedProvidersData["draft"]) {
                delete modifiedProvidersData["draft"].site;
            }
            
            diffView.value = buildFullProviderJson("draft");
        }

        if (draftMetaName) {
            [draftMetaName, draftMetaSite, draftMetaGithub, draftMetaDesc].forEach(el => {
                el.addEventListener("input", updateDraftFullJsonPreview);
            });
        }

        document.getElementById("propose-changes-btn").addEventListener("click", () => {
            if (!activeEditProvider) return;
            
            if (activeEditProvider === "draft") {
                if (draftMetaBlock) draftMetaBlock.style.display = "block";
                const diffLabel = document.getElementById("changes-diff-label");
                if (diffLabel) diffLabel.textContent = "Full new provider file (JSON):";
                
                const currentDraft = modifiedProvidersData["draft"] || providersData["draft"] || {};
                if (draftMetaName) draftMetaName.value = currentDraft.name !== "Draft" && currentDraft.name !== "Черновик" ? (currentDraft.name || "") : "";
                if (draftMetaSite) draftMetaSite.value = currentDraft.site || currentDraft.website || "";
                if (draftMetaGithub) draftMetaGithub.value = currentDraft.github || "";
                if (draftMetaDesc) draftMetaDesc.value = currentDraft.description || "";

                updateDraftFullJsonPreview();
            } else {
                if (draftMetaBlock) draftMetaBlock.style.display = "none";
                const diffLabel = document.getElementById("changes-diff-label");
                if (diffLabel) diffLabel.textContent = "Modified provider file (diff):";
                diffView.value = buildChangesDiffJson(activeEditProvider);
            }
            
            submitModal.classList.add("show");
        });

        const mobileSaveBtn = document.getElementById("mobile-save-changes-btn");
        if (mobileSaveBtn) {
            mobileSaveBtn.addEventListener("click", () => {
                document.getElementById("propose-changes-btn").click();
            });
        }

        document.getElementById("copy-json-btn").addEventListener("click", () => {
            const providerKey = activeEditProvider;
            if (!providerKey) return;

            const actualProviderKey = (providerKey === "draft")
                ? (modifiedProvidersData["draft"]?.key || "new-provider")
                : providerKey;

            const textToCopy = (providerKey === "draft") 
                ? buildFullProviderJson("draft")
                : buildChangesDiffJson(providerKey);

            navigator.clipboard.writeText(textToCopy).then(() => {
                if (providerKey === "draft") {
                    const dirPrefix = dataType === 'kvm' ? 'docs/kvm' : 'docs/software';
                    alert(`Success! Full new provider JSON has been copied to clipboard!\n\nYou can add it to the ${dirPrefix}/providers/${actualProviderKey}.json file and register it in ${dirPrefix}/providers.json.`);
                } else {
                    alert("Changes (JSON) successfully copied to clipboard!");
                }
                submitModal.classList.remove("show");
            }).catch(err => {
                alert("Failed to copy to clipboard: " + err);
            });
        });

        document.getElementById("toggle-pr-btn").addEventListener("click", () => {
            const isVisible = prAuthBlock.style.display === "block";
            prAuthBlock.style.display = isVisible ? "none" : "block";
        });

        document.getElementById("submit-close-btn").addEventListener("click", () => {
            submitModal.classList.remove("show");
        });

        const executePrBtn = document.getElementById("execute-pr-btn");
        if (executePrBtn) {
            executePrBtn.addEventListener("click", async () => {
                let providerKey = activeEditProvider;
                let actualProviderKey = providerKey === "draft" 
                    ? (modifiedProvidersData["draft"]?.key || "new-provider") 
                    : providerKey;
                
                const token = document.getElementById("github-pat-input").value.trim();
                const commitMsg = document.getElementById("commit-message-input").value.trim() || "Update provider data";
                const dirPrefix = dataType === 'kvm' ? 'docs/kvm' : 'docs/software';
                
                if (!token) {
                    alert("Пожалуйста, введите ваш Personal Access Token для авторизации на GitHub.");
                    return;
                }

                executePrBtn.disabled = true;
                executePrBtn.textContent = "Sending PR...";

                try {
                    const repoName = "bogomol2607/Remote-Desktop-Feature-Matrix";
                    const refRes = await fetch(`https://api.github.com/repos/${repoName}/git/ref/heads/main`, {
                        headers: { "Authorization": `token ${token}` }
                    });
                    if (!refRes.ok) throw new Error("Failed to get main branch hash. Please check your token validity.");
                    const refData = await refRes.json();
                    const mainSha = refData.object.sha;

                    const newBranchName = `patch-${actualProviderKey}-${Date.now().toString().slice(-5)}`;
                    const branchRes = await fetch(`https://api.github.com/repos/${repoName}/git/refs`, {
                        method: "POST",
                        headers: { 
                            "Authorization": `token ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            ref: `refs/heads/${newBranchName}`,
                            sha: mainSha
                        })
                    });
                    if (!branchRes.ok) throw new Error("Failed to create branch on GitHub.");

                    const isNewProvider = providerKey === "draft";
                    const dirPrefix = dataType === 'kvm' ? 'docs/kvm' : 'docs/software';
                    const fileUrl = `https://api.github.com/repos/${repoName}/contents/${dirPrefix}/providers/${actualProviderKey}.json`;
                    
                    let fileSha = undefined;
                    if (!isNewProvider) {
                        const fileRes = await fetch(fileUrl, {
                            headers: { "Authorization": `token ${token}` }
                        });
                        if (fileRes.ok) {
                            const fileData = await fileRes.json();
                            fileSha = fileData.sha;
                        }
                    }

                    const contentJson = isNewProvider 
                        ? buildFullProviderJson("draft")
                        : JSON.stringify(modifiedProvidersData[providerKey] || providersData[providerKey], null, 2);

                    const encoder = new TextEncoder();
                    const encodedBytes = encoder.encode(contentJson);
                    let binaryStr = '';
                    for (let i = 0; i < encodedBytes.length; i++) {
                        binaryStr += String.fromCharCode(encodedBytes[i]);
                    }
                    const base64Content = btoa(binaryStr);

                    const commitRes = await fetch(fileUrl, {
                        method: "PUT",
                        headers: { 
                            "Authorization": `token ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            message: commitMsg,
                            content: base64Content,
                            branch: newBranchName,
                            sha: fileSha
                        })
                    });
                    if (!commitRes.ok) throw new Error("Failed to commit provider file.");

                    const prUrl = `https://api.github.com/repos/${repoName}/pulls`;
                    const prBody = isNewProvider 
                        ? `User proposed to register a new remote desktop provider.\n\nName: **${providersData[providerKey].name}**\nKey (ID): \`${actualProviderKey}\`\n\nThis PR automatically registers the provider inside \`docs/providers.json\` and creates its schema \`docs/providers/${actualProviderKey}.json\` with populated features.`
                        : `User proposed changes to provider matrix database.\n\nChanges Summary:\n\`\`\`json\n${buildChangesDiffJson(providerKey)}\n\`\`\``;

                    const prRes = await fetch(prUrl, {
                        method: "POST",
                        headers: { 
                            "Authorization": `token ${token}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            title: isNewProvider ? `Add new software provider: ${providersData[providerKey].name}` : `Proposed changes for ${providersData[providerKey].name}`,
                            head: newBranchName,
                            base: "main",
                            body: prBody
                        })
                    });
                    
                    if (!prRes.ok) {
                        const prErrData = await prRes.json();
                        throw new Error(prErrData.message || "Failed to automatically create PR.");
                    }
                    
                    const prData = await prRes.json();
                    alert(`Success! Pull Request successfully created on GitHub.\nLink: ${prData.html_url}`);
                    
                    isEditMode = false;
                    activeEditProvider = null;
                    document.getElementById("changes-floating-bar").style.display = "none";
                    table.setColumns(generateColumnsConfig());
                    submitModal.classList.remove("show");

                } catch (err) {
                    alert("Submission error: " + err.message);
                } finally {
                    executePrBtn.disabled = false;
                    executePrBtn.textContent = "Send Pull Request";
                }
            });
        }

        document.getElementById("discard-changes-btn").addEventListener("click", async () => {
            if (!activeEditProvider) return;
            
            const provKey = activeEditProvider;
            if (confirm(`Are you sure you want to discard all changes for provider ${providersData[provKey]?.name || provKey}?`)) {
                delete modifiedProvidersData[provKey];
                
                ["features", "os", "hardware"].forEach(tabKey => {
                    const tabState = state[tabKey];
                    const sectionKey = tabState.section;
                    const origProvider = providersData[provKey];
                    
                    tabState.data.forEach(rowObject => {
                        const rowName = rowObject[tabState.field];
                        const origValInfo = origProvider?.[sectionKey]?.[rowName];
                        
                        rowObject[provKey] = origValInfo?.status || "";
                        rowObject[`${provKey}_comment`] = origValInfo?.comment || "";
                    });
                });

                isEditMode = false;
                activeEditProvider = null;
                document.getElementById("changes-floating-bar").style.display = "none";
                
                await table.setColumns(generateColumnsConfig());
                await table.setData(state[currentTab].data);
            }
        });

        const addParamModal = document.getElementById("add-param-modal");
        const newParamNameInput = document.getElementById("new-param-name");
        const newParamDescInput = document.getElementById("new-param-desc");
        const newParamCategoriesList = document.getElementById("new-param-categories-list");
        const addParamPrAuthBlock = document.getElementById("add-param-pr-auth-block");
        const addParamSaveBtn = document.getElementById("add-param-save-btn");
        
        let activeAddSubmitType = "copy";

        function openAddParamModal() {
            newParamNameInput.value = "";
            newParamDescInput.value = "";
            newParamCategoriesList.innerHTML = "";

            const configs = categoryConfigs[currentTab] || [];
            configs.forEach(config => {
                const label = document.createElement("label");
                label.style.display = "flex";
                label.style.alignItems = "center";
                label.style.gap = "8px";
                label.style.fontSize = "13px";
                label.style.cursor = "pointer";
                label.innerHTML = `
                    <input type="checkbox" value="${config.id}">
                    <span>${config.label}</span>
                `;
                newParamCategoriesList.appendChild(label);
            });

            addParamModal.classList.add("show");
        }

        document.getElementById("matrix-table").addEventListener("click", (e) => {
            if (e.target.id === "add-param-btn-table") {
                e.stopPropagation();
                openAddParamModal();
            }
        });
        document.getElementById("add-param-close-btn").addEventListener("click", () => {
            addParamModal.classList.remove("show");
        });

        document.getElementById("toggle-add-param-pr-btn").addEventListener("click", () => {
            const isVisible = addParamPrAuthBlock.style.display === "block";
            addParamPrAuthBlock.style.display = isVisible ? "none" : "block";
        });

        addParamSaveBtn.addEventListener("click", () => {
            const nameVal = newParamNameInput.value.trim();
            const descVal = newParamDescInput.value.trim();
            const typeVal = document.getElementById("new-param-type").value;
            
            if (!nameVal) {
                alert("Please enter a parameter name.");
                return;
            }

            const selectedCategories = [];
            newParamCategoriesList.querySelectorAll("input:checked").forEach(cb => {
                selectedCategories.push(cb.value);
            });

            const newParamObject = {
                name: nameVal,
                categories: selectedCategories,
                type: typeVal
            };
            if (descVal) {
                newParamObject.description = descVal;
            }

            const schemaFilename = `${currentTab}.json`;
            const outputJson = JSON.stringify({
                _meta: { target: dataType, tab: currentTab },
                ...newParamObject
            }, null, 2);
            navigator.clipboard.writeText(outputJson).then(() => {
                alert(`JSON for new parameter copied to clipboard!\nYou can append it to docs/${schemaFilename} on GitHub.`);
                addParamModal.classList.remove("show");
            }).catch(err => {
                alert("Error copying to clipboard: " + err);
            });
        });

        document.getElementById("execute-add-param-pr-btn").addEventListener("click", async () => {
            const nameVal = newParamNameInput.value.trim();
            const descVal = newParamDescInput.value.trim();
            const typeVal = document.getElementById("new-param-type").value;
            
            if (!nameVal) {
                alert("Please enter a parameter name.");
                return;
            }

            const selectedCategories = [];
            newParamCategoriesList.querySelectorAll("input:checked").forEach(cb => {
                selectedCategories.push(cb.value);
            });

            const newParamObject = {
                name: nameVal,
                categories: selectedCategories,
                type: typeVal
            };
            if (descVal) {
                newParamObject.description = descVal;
            }

            const schemaFilename = `${currentTab}.json`;
            const token = document.getElementById("new-param-github-pat").value.trim();
            if (!token) {
                alert("Please enter your GitHub Personal Access Token to send a PR.");
                return;
            }

            const execBtn = document.getElementById("execute-add-param-pr-btn");
            execBtn.disabled = true;
            execBtn.textContent = "Sending...";

            try {
                const repoName = "bogomol2607/Remote-Desktop-Feature-Matrix";
                
                const refRes = await fetch(`https://api.github.com/repos/${repoName}/git/ref/heads/main`, {
                    headers: { "Authorization": `token ${token}` }
                });
                if (!refRes.ok) throw new Error("Failed to get main branch hash.");
                const refData = await refRes.json();
                const mainSha = refData.object.sha;

                const dirPrefix = dataType === 'kvm' ? 'docs/kvm' : 'docs/software';
                const fileUrl = `https://api.github.com/repos/${repoName}/contents/${dirPrefix}/${schemaFilename}`;
                const fileRes = await fetch(fileUrl, {
                    headers: { "Authorization": `token ${token}` }
                });
                if (!fileRes.ok) throw new Error(`Failed to fetch file docs/${schemaFilename} from GitHub.`);
                const fileData = await fileRes.json();
                const currentSchema = JSON.parse(decodeURIComponent(escape(atob(fileData.content))));

                currentSchema.push(newParamObject);
                const updatedSchemaJson = JSON.stringify(currentSchema, null, 2);

                const newBranchName = `add-param-${currentTab}-${Date.now().toString().slice(-5)}`;
                const branchRes = await fetch(`https://api.github.com/repos/${repoName}/git/refs`, {
                    method: "POST",
                    headers: { 
                        "Authorization": `token ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        ref: `refs/heads/${newBranchName}`,
                        sha: mainSha
                    })
                });
                if (!branchRes.ok) throw new Error("Failed to create branch in repository.");

                const commitRes = await fetch(fileUrl, {
                    method: "PUT",
                    headers: { 
                        "Authorization": `token ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: `Propose new ${currentTab} parameter: ${nameVal}`,
                        content: btoa(unescape(encodeURIComponent(updatedSchemaJson))),
                        branch: newBranchName,
                        sha: fileData.sha
                    })
                });
                if (!commitRes.ok) throw new Error("Failed to commit updated schema file.");

                const prUrl = `https://api.github.com/repos/${repoName}/pulls`;
                const prRes = await fetch(prUrl, {
                    method: "POST",
                    headers: { 
                        "Authorization": `token ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        title: `Propose new parameter: ${nameVal} (${currentTab})`,
                        head: newBranchName,
                        base: "main",
                        body: `User proposed to add a new parameter to docs/${schemaFilename}.\n\nName: **${nameVal}**\nDescription: ${descVal || "_No description provided_"}\nCategories: ${selectedCategories.join(", ") || "_None_"}`
                    })
                });
                if (!prRes.ok) throw new Error("Failed to automatically create Pull Request.");
                
                const prData = await prRes.json();
                alert(`Success! Pull Request created on GitHub.\nLink: ${prData.html_url}`);
                addParamModal.classList.remove("show");

            } catch (e) {
                alert("Submit error: " + e.message);
            } finally {
                execBtn.disabled = false;
                execBtn.textContent = "Send Pull Request";
            }
        });

        const addProviderBtn = document.getElementById("add-provider-btn");
        const addProviderBtnDesktop = document.getElementById("add-provider-btn-desktop");
        
        function handleAddProvider() {
            try {
                if (!providersList.includes("draft")) {
                    providersList.push("draft");
                }

                renderSoftCheckboxes();
                updateSoftCount();

                state.features.data = buildTabulatorData(state.features.all, "features", "feature");
                state.os.data = buildTabulatorData(state.os.all, "os", "os");
                state.hardware.data = buildTabulatorData(state.hardware.all, "hardware", "hardware");
                state.pricing.data = buildTabulatorData(state.pricing.all, "pricing", "pricing");

                renderFeatureDropdown();
                updateFeatureCounts();

                refreshMatrixTable();

            } catch (err) {
                console.error("Error adding draft:", err);
                alert("Error: " + err.message);
            }
        }

        document.getElementById("restore-features-btn").addEventListener("click", () => {
            state[currentTab].hidden.clear();
            table.setFilter(combinedFilter);
            renderFeatureDropdown(document.getElementById('feature-search-input').value.trim());
            updateFeatureCounts();
        });

    } catch (error) {
        console.error("Error initializing matrix:", error);
    }
    
    window.addEventListener('beforeunload', (e) => {
        if (isEditMode) {
            e.preventDefault();
            e.returnValue = ''; // Standard browser warning
        }
    });
});

document.addEventListener('mouseover', (e) => {
    const icon = e.target.closest('.info-icon');
    if (!icon) return;
    const tooltipText = icon.getAttribute('data-tooltip');
    if (!tooltipText) return;

    const tooltip = document.getElementById('global-tooltip');
    if (!tooltip) return;

    tooltip.innerHTML = tooltipText;
    tooltip.style.display = 'block';
    tooltip.style.visibility = 'visible';
    tooltip.style.opacity = '1';

    const rect = icon.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    let top = rect.top - tooltipRect.height - 10;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

    if (top < 10) {
        top = rect.bottom + 10;
        tooltip.classList.add('tooltip-bottom');
    } else {
        tooltip.classList.remove('tooltip-bottom');
    }

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
});

document.addEventListener('mouseout', (e) => {
    const icon = e.target.closest('.info-icon');
    if (!icon) return;
    const tooltip = document.getElementById('global-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
        tooltip.style.visibility = 'hidden';
        tooltip.style.opacity = '0';
    }
});



let currentKvmImages = [];
let currentKvmImageIndex = 0;

window.openKvmCard = async function(providerKey) {
    const provider = providersData[providerKey];
    if (!provider) return;

    currentKvmImages = [];
    currentKvmImageIndex = 0;
    

    document.getElementById('kvm-card-title').textContent = provider.name || providerKey;
    
    const logoImg = document.getElementById('kvm-card-logo');
    logoImg.src = `./asset/kvm/${providerKey}/logo.png`;
    logoImg.style.display = 'block';
    logoImg.onerror = function() {
        this.style.display = 'none';
    };

    const companyDescBlock = document.getElementById('kvm-company-desc');
    if (provider.companyDescription) {
        companyDescBlock.querySelector('p').textContent = provider.companyDescription;
        companyDescBlock.style.display = 'block';
    } else {
        companyDescBlock.style.display = 'none';
    }

    const modelDescBlock = document.getElementById('kvm-model-desc');
    const modelDesc = provider.modelDescription || provider.description; // Fallback to 'description' if present
    if (modelDesc) {
        modelDescBlock.querySelector('p').textContent = modelDesc;
        modelDescBlock.style.display = 'block';
    } else {
        modelDescBlock.style.display = 'none';
    }

    const linksContainer = document.getElementById('kvm-card-links');
    linksContainer.innerHTML = '';
    if (provider.website) {
        linksContainer.innerHTML += `<a href="${provider.website}" target="_blank" class="kvm-link-btn primary">Website</a>`;
    }
    if (provider.github) {
        linksContainer.innerHTML += `<a href="${provider.github}" target="_blank" class="kvm-link-btn"><img src="./asset/icons/github.svg" style="width: 16px; height: 16px; filter: invert(1);"> GitHub</a>`;
    }

    const renderKvmCarousel = () => {
        const carousel = document.getElementById('kvm-card-carousel');
        if (!carousel) return;
        const track = document.getElementById('kvm-carousel-track');
        const dotsContainer = document.getElementById('kvm-carousel-dots');
        const prevBtn = carousel.querySelector('.prev-btn');
        const nextBtn = carousel.querySelector('.next-btn');

        track.innerHTML = '';
        dotsContainer.innerHTML = '';

        if (currentKvmImages.length > 0) {
            carousel.style.display = 'block';
            currentKvmImages.forEach((imgSrc, i) => {
                const slide = document.createElement('div');
                slide.className = 'carousel-slide';
                slide.innerHTML = `<img src="${imgSrc}" alt="Photo ${i + 1}">`;
                track.appendChild(slide);

                if (currentKvmImages.length > 1) {
                    const dot = document.createElement('div');
                    dot.className = i === 0 ? 'carousel-dot active' : 'carousel-dot';
                    dot.onclick = () => goToKvmSlide(i);
                    dotsContainer.appendChild(dot);
                }
            });

            if (currentKvmImages.length > 1) {
                prevBtn.style.display = 'flex';
                nextBtn.style.display = 'flex';
                prevBtn.onclick = () => goToKvmSlide(currentKvmImageIndex - 1);
                nextBtn.onclick = () => goToKvmSlide(currentKvmImageIndex + 1);
            } else {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            }
            updateKvmCarouselPosition();
        } else {
            carousel.style.display = 'none';
        }
    };

    if (window.providerImagesCache[providerKey]) {
        currentKvmImages = window.providerImagesCache[providerKey];
        renderKvmCarousel();
    } else {
        if (!window.providerImagesLoading[providerKey]) {
            window.preloadVisibleProviderImages(); 
        }
        renderKvmCarousel();
        
        const checkInterval = setInterval(() => {
            if (window.providerImagesCache[providerKey]) {
                clearInterval(checkInterval);
                currentKvmImages = window.providerImagesCache[providerKey];
                renderKvmCarousel();
            }
        }, 100);
    }

    document.getElementById('kvm-card-modal').classList.add('show');
};

function goToKvmSlide(index) {
    if (index < 0) index = currentKvmImages.length - 1;
    if (index >= currentKvmImages.length) index = 0;
    currentKvmImageIndex = index;
    updateKvmCarouselPosition();
}

function updateKvmCarouselPosition() {
    const track = document.getElementById('kvm-carousel-track');
    const dots = document.querySelectorAll('#kvm-carousel-dots .carousel-dot');
    track.style.transform = `translateX(-${currentKvmImageIndex * 100}%)`;
    
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === currentKvmImageIndex);
    });
}

document.getElementById('kvm-card-close').addEventListener('click', () => {
    document.getElementById('kvm-card-modal').classList.remove('show');
});

document.getElementById('kvm-card-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('kvm-card-modal')) {
        document.getElementById('kvm-card-modal').classList.remove('show');
    }
});
