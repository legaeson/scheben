// ==========================================================================
// шебень.рф — Interactive Application Logic (Yandex Maps API & Express API)
// ==========================================================================

// Internal reference coordinates for Krasnoyarsk routing calculations (Base warehouse)
const defaultStartCoords = [56.0355, 93.0085];

const materialsData = {
    crushed_stone: {
        id: 'crushed_stone',
        name: 'Щебень',
        category: 'crushed',
        img: 'images/crushed_stone.jpg',
        badge: 'ГОСТ 8267-93',
        variants: [
            { id: 'frac_4_8', name: 'Фракция 4-8', price: 750 },
            { id: 'frac_5_10', name: 'Фракция 5-10', price: 750 },
            { id: 'frac_8_16', name: 'Фракция 8-16', price: 1000 },
            { id: 'frac_5_20', name: 'Фракция 5-20', price: 1000 },
            { id: 'frac_10_20', name: 'Фракция 10-20', price: 1000 }
        ]
    },
    sand: {
        id: 'sand',
        name: 'Песок',
        category: 'sand_pgs',
        img: 'images/sand.jpg',
        badge: 'ГОСТ 8736-2014',
        variants: [
            { id: 'sand_0_5', name: 'Отсев дробления 0-5', price: 850 },
            { id: 'sand_washed', name: 'Песок мытый (2 кл)', price: 1400 }
        ]
    },
    pshs: {
        id: 'pshs',
        name: 'ПЩС',
        category: 'sand_pgs',
        img: 'images/pgs.jpg',
        badge: 'Для дорог и отсыпки',
        variants: [
            { id: 'pshs_0_10', name: 'Фракция 0-10', price: 750 },
            { id: 'pshs_0_8', name: 'Фракция 0-8', price: 800 },
            { id: 'pshs_0_20', name: 'Фракция 0-20', price: 1000 },
            { id: 'pshs_0_40', name: 'Фракция 0-40', price: 1000 }
        ]
    },
    gps_gravel: {
        id: 'gps_gravel',
        name: 'ГПС / Гравий',
        category: 'gravel',
        img: 'images/gravel.jpg',
        badge: 'Природный материал',
        variants: [
            { id: 'gps_0_20', name: 'ГПС 0-20', price: 550 },
            { id: 'gravel_5_20', name: 'Гравий 5-20', price: 550 }
        ]
    },
    crushed_brick: {
        id: 'crushed_brick',
        name: 'Битый кирпич',
        category: 'secondary',
        img: 'images/crushed_brick.jpg',
        badge: 'Для въездов',
        price: 800
    },
    expanded_clay: {
        id: 'expanded_clay',
        name: 'Керамзит',
        category: 'secondary',
        img: 'images/expanded_clay.jpg',
        badge: 'Утеплитель',
        price: 1600
    },
    chernozem: {
        id: 'chernozem',
        name: 'Чернозём',
        category: 'secondary',
        img: 'images/chernozem.jpg',
        badge: 'Плодородный грунт',
        price: 1000
    }
};

// Global App State
let appState = {
    startCoords: [...defaultStartCoords],
    deliveryRate: 400,
    selectedMaterialId: 'crushed_stone',
    selectedVariantId: 'frac_4_8',
    volume: 15,
    distanceKm: 0,
    addressName: '',
    destCoords: null
};

let myMap = null;
let originMarker = null;
let destMarker = null;
let multiRoute = null;
let searchTimeout = null;
let activeSuggestionIndex = -1;

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderMaterialCards('all');
    setupCategoryTabs();
    setupVolumeControls();
    setupFAQAccordion();
    setupModalsAndForm();
    setupQuickPresets();
    setupAddressSearch();
    setupMobileNav();
    setupScrollSpyAndBackToTop();
    initYandexMap();
    fetchServerSettings();
    setupCookieConsent();
}

// Utility: Number formatter
function formatCurrency(val) {
    return `${Math.round(val).toLocaleString('ru-RU')} ₽`;
}

// Render Material Cards Grid
function renderMaterialCards(categoryFilter) {
    const grid = document.getElementById('material-grid');
    if (!grid) return;
    grid.innerHTML = '';

    Object.values(materialsData).forEach(mat => {
        if (categoryFilter !== 'all' && mat.category !== categoryFilter) return;

        const isSelected = mat.id === appState.selectedMaterialId;
        const card = document.createElement('div');
        card.className = `material-card ${isSelected ? 'selected' : ''}`;
        card.dataset.id = mat.id;

        let selectedPrice = mat.price || (mat.variants && mat.variants[0] ? mat.variants[0].price : 0);
        let variantSelectHTML = '';
        let priceText = '';

        if (mat.variants && mat.variants.length > 0) {
            const currentVar = mat.variants.find(v => v.id === appState.selectedVariantId) || mat.variants[0];
            selectedPrice = currentVar.price;
            priceText = `${formatCurrency(selectedPrice)}/м³`;

            variantSelectHTML = `<select class="variant-dropdown" data-mat="${mat.id}" aria-label="Выбор фракции для ${mat.name}">`;
            mat.variants.forEach(v => {
                const optSelected = (isSelected && v.id === appState.selectedVariantId) || (!isSelected && v.id === mat.variants[0].id) ? 'selected' : '';
                variantSelectHTML += `<option value="${v.id}" ${optSelected}>${v.name} (${formatCurrency(v.price)})</option>`;
            });
            variantSelectHTML += `</select>`;
        } else {
            priceText = `${formatCurrency(mat.price)}/м³`;
        }

        card.innerHTML = `
            <div class="material-img-wrapper">
                <img src="${mat.img}" alt="${mat.name}" class="material-img" loading="lazy">
                <span class="material-badge">${mat.badge}</span>
                <span class="selected-check">✓</span>
            </div>
            <div class="material-content">
                <div class="material-name">${mat.name}</div>
                <div class="material-price" id="price-display-${mat.id}">${priceText}</div>
                ${variantSelectHTML}
            </div>
        `;

        // Card Click Handler
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('variant-dropdown')) return;
            selectMaterial(mat.id);
        });

        // Variant Dropdown Handler
        const selectElem = card.querySelector('.variant-dropdown');
        if (selectElem) {
            selectElem.addEventListener('change', (e) => {
                const newVarId = e.target.value;
                appState.selectedVariantId = newVarId;
                selectMaterial(mat.id, newVarId);
            });
        }

        grid.appendChild(card);
    });
}

function selectMaterial(matId, explicitVariantId = null) {
    appState.selectedMaterialId = matId;
    const mat = materialsData[matId];
    if (mat && mat.variants && mat.variants.length > 0) {
        if (explicitVariantId) {
            appState.selectedVariantId = explicitVariantId;
        } else {
            const cardSelect = document.querySelector(`.material-card[data-id="${matId}"] .variant-dropdown`);
            appState.selectedVariantId = cardSelect ? cardSelect.value : mat.variants[0].id;
        }
    } else {
        appState.selectedVariantId = null;
    }

    // Update active class on cards
    document.querySelectorAll('.material-card').forEach(c => {
        const selected = c.dataset.id === matId;
        c.classList.toggle('selected', selected);
        if (selected) {
            const priceDisp = c.querySelector(`#price-display-${matId}`);
            if (priceDisp && mat) {
                let p = mat.price;
                if (mat.variants) {
                    const v = mat.variants.find(i => i.id === appState.selectedVariantId) || mat.variants[0];
                    p = v.price;
                }
                priceDisp.textContent = `${formatCurrency(p)}/м³`;
            }
        }
    });

    recalculateTotalCost();
}

// Category Filter Tabs
function setupCategoryTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            renderMaterialCards(tab.dataset.category);
        });
    });
}

// Volume Controller (Slider & Numeric Input & Preset Buttons)
function setupVolumeControls() {
    const slider = document.getElementById('volume-slider');
    const numInput = document.getElementById('volume-num-input');
    const presetBtns = document.querySelectorAll('.vol-preset-btn');

    if (!slider || !numInput) return;

    slider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        numInput.value = val;
        updateVolume(val);
    });

    numInput.addEventListener('input', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 200) val = 200;
        slider.value = Math.min(val, 50);
        updateVolume(val);
    });

    numInput.addEventListener('blur', () => {
        if (!numInput.value || parseInt(numInput.value, 10) < 1) {
            numInput.value = 5;
            slider.value = 5;
            updateVolume(5);
        }
    });

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const vol = parseInt(btn.dataset.vol, 10);
            slider.value = vol;
            numInput.value = vol;
            updateVolume(vol);
        });
    });
}

function updateVolume(vol) {
    appState.volume = vol;

    document.querySelectorAll('.vol-preset-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.vol, 10) === vol);
    });

    // Update truck recommendation text
    const truckText = document.getElementById('truck-type-text');
    if (truckText) {
        const truckCount = Math.ceil(vol / 20);
        if (truckCount === 1) {
            truckText.textContent = `1 Самосвал (до 20 м³) — 1 рейс`;
        } else if (truckCount <= 4) {
            truckText.textContent = `${truckCount} Самосвала (по 20 м³) — ${truckCount} рейса`;
        } else {
            truckText.textContent = `${truckCount} Самосвалов (по 20 м³) — ${truckCount} рейсов`;
        }
    }

    recalculateTotalCost();
}

// Helper for calculating delivery cost per truck trip:
// - Minimum fee: 13,000 ₽ for regular materials, 16,000 ₽ for crushed brick
// - Average city fee: ~13,000 ₽ (regular) / ~16,000 ₽ (crushed brick)
// - Maximum fee cap: 18,000 ₽ (suburban locations like Yemelyanovo)
function calculateDeliveryCostPerTrip(distanceKm) {
    if (!distanceKm || distanceKm <= 0) return 0;

    const isBrick = appState.selectedMaterialId === 'crushed_brick' || 
                    (materialsData[appState.selectedMaterialId] && 
                     materialsData[appState.selectedMaterialId].name.toLowerCase().includes('кирпич'));

    const MIN_TRIP_FEE = isBrick ? 16000 : 13000;
    const MAX_TRIP_FEE = 18000;

    const ratePerKm = appState.deliveryRate || 320;
    let rawFee = 8000 + (distanceKm * ratePerKm);
    let fee = Math.min(Math.max(rawFee, MIN_TRIP_FEE), MAX_TRIP_FEE);
    return Math.round(fee / 100) * 100;
}

// Recalculate Live Prices
function recalculateTotalCost() {
    const mat = materialsData[appState.selectedMaterialId];
    if (!mat) return;

    let unitPrice = mat.price || 0;
    let selectedName = mat.name;

    if (mat.variants && mat.variants.length > 0) {
        const v = mat.variants.find(item => item.id === appState.selectedVariantId) || mat.variants[0];
        unitPrice = v.price;
        selectedName = `${mat.name} (${v.name})`;
    }

    const materialTotalCost = unitPrice * appState.volume;
    const truckCount = appState.volume <= 20 ? 1 : Math.ceil(appState.volume / 20);
    const singleTripCost = calculateDeliveryCostPerTrip(appState.distanceKm);
    const deliveryTotalCost = singleTripCost * truckCount;
    const grandTotal = materialTotalCost + deliveryTotalCost;

    // Update UI elements
    const summaryMatName = document.getElementById('summary-mat-name');
    const summaryVolume = document.getElementById('summary-volume');
    const matCostVal = document.getElementById('material-cost-val');
    const distanceVal = document.getElementById('distance-val');
    const deliveryRateLabel = document.getElementById('delivery-rate-label');
    const deliveryCostVal = document.getElementById('delivery-cost-val');
    const totalCostVal = document.getElementById('total-cost-val');
    const deliveryNoticeBadge = document.getElementById('delivery-notice-badge');

    if (summaryMatName) summaryMatName.textContent = selectedName;
    if (summaryVolume) summaryVolume.textContent = appState.volume;
    if (matCostVal) matCostVal.textContent = formatCurrency(materialTotalCost);

    if (deliveryRateLabel) {
        if (appState.distanceKm > 0) {
            deliveryRateLabel.textContent = truckCount > 1 ? `${formatCurrency(singleTripCost)} / рейс × ${truckCount} рейса` : `${formatCurrency(singleTripCost)} / рейс`;
        } else {
            deliveryRateLabel.textContent = `рейс самосвала`;
        }
    }

    if (appState.distanceKm > 0) {
        if (distanceVal) distanceVal.textContent = `${appState.distanceKm} км`;
        if (deliveryCostVal) deliveryCostVal.textContent = formatCurrency(deliveryTotalCost);
        if (totalCostVal) totalCostVal.textContent = formatCurrency(grandTotal);
        if (deliveryNoticeBadge) deliveryNoticeBadge.style.display = 'none';
    } else {
        if (distanceVal) distanceVal.textContent = `Укажите адрес`;
        if (deliveryCostVal) deliveryCostVal.textContent = `Укажите адрес на карте`;
        if (totalCostVal) totalCostVal.textContent = formatCurrency(materialTotalCost);
        if (deliveryNoticeBadge) {
            deliveryNoticeBadge.style.display = 'inline-block';
            deliveryNoticeBadge.textContent = '(+ доставка)';
        }
    }

    // Modal summary
    const modalMat = document.getElementById('modal-mat-summary');
    const modalAddr = document.getElementById('modal-addr-summary');
    const modalCost = document.getElementById('modal-cost-summary');

    if (modalMat) modalMat.textContent = `${selectedName} (${appState.volume} м³)`;
    if (modalAddr) modalAddr.textContent = appState.addressName || 'Адрес не указан (согласование с диспетчером)';
    if (modalCost) modalCost.textContent = appState.distanceKm > 0 ? formatCurrency(grandTotal) : `${formatCurrency(materialTotalCost)} (+ доставка)`;
}

// Yandex Maps Initialization
function initYandexMap() {
    if (typeof ymaps === 'undefined') return;

    ymaps.ready(() => {
        myMap = new ymaps.Map('map', {
            center: [56.0105, 92.8525], // Center on Krasnoyarsk
            zoom: 11,
            controls: ['zoomControl', 'geolocationControl', 'typeSelector', 'fullscreenControl']
        }, {
            suppressMapOpenBlock: true
        });

        // Base Warehouse Origin Pin
        originMarker = new ymaps.Placemark(appState.startCoords, {
            hintContent: 'База погрузки: г. Красноярск',
            balloonContent: '<b>База погрузки:</b><br>г. Красноярск'
        }, {
            preset: 'islands#orangeFactoryIcon'
        });
        myMap.geoObjects.add(originMarker);

        // Map Click Listener - Reverse Geocoding via Yandex Geocoder
        myMap.events.add('click', (e) => {
            const coords = e.get('coords');
            
            if (typeof ymaps !== 'undefined' && ymaps.geocode) {
                ymaps.geocode(coords).then((res) => {
                    const firstGeoObject = res.geoObjects.get(0);
                    let label = '';
                    if (firstGeoObject) {
                        label = firstGeoObject.getAddressLine().replace('Россия, Красноярский край, ', '').replace('Россия, ', '');
                    } else {
                        label = `Точка на карте (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`;
                    }
                    setDestinationPoint(coords, label);
                }).catch(() => {
                    const label = `Точка на карте (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`;
                    setDestinationPoint(coords, label);
                });
            } else {
                const label = `Точка на карте (${coords[0].toFixed(4)}, ${coords[1].toFixed(4)})`;
                setDestinationPoint(coords, label);
            }
        });

        // Reset Calc Button Listener
        const resetBtn = document.getElementById('btn-reset-calc');
        if (resetBtn) {
            resetBtn.addEventListener('click', resetCalculatorState);
        }
    });
}

function resetCalculatorState() {
    appState.destCoords = null;
    appState.addressName = '';
    appState.distanceKm = 0;

    const input = document.getElementById('address-input');
    if (input) input.value = '';

    const clearBtn = document.getElementById('btn-clear-address');
    if (clearBtn) clearBtn.style.display = 'none';

    const mapHint = document.getElementById('map-click-hint');
    if (mapHint) mapHint.style.display = 'flex';

    if (myMap) {
        if (destMarker) {
            myMap.geoObjects.remove(destMarker);
            destMarker = null;
        }
        if (multiRoute) {
            myMap.geoObjects.remove(multiRoute);
            multiRoute = null;
        }
        myMap.setCenter([56.0105, 92.8525], 11, { duration: 300 });
    }

    document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));

    recalculateTotalCost();
    showToast('Параметры доставки сброшены');
}

function setDestinationPoint(coords, name) {
    appState.destCoords = coords;
    appState.addressName = name;
    
    const input = document.getElementById('address-input');
    if (input) input.value = name;

    const clearBtn = document.getElementById('btn-clear-address');
    if (clearBtn) clearBtn.style.display = 'block';

    // Hide map hint on destination selection
    const mapHint = document.getElementById('map-click-hint');
    if (mapHint) mapHint.style.display = 'none';

    if (myMap) {
        if (destMarker) {
            myMap.geoObjects.remove(destMarker);
        }

        destMarker = new ymaps.Placemark(coords, {
            hintContent: name,
            balloonContent: `<b>Точка доставки:</b><br>${name}`
        }, {
            preset: 'islands#greenDotIconWithCaption'
        });

        myMap.geoObjects.add(destMarker);
        destMarker.balloon.open();
    }

    calculateYandexRoute(coords);
}

// Yandex MultiRoute Driving Distance Calculation & Route Drawing
function calculateYandexRoute(coords) {
    const spinner = document.getElementById('calc-spinner');
    if (spinner) spinner.style.display = 'inline-block';

    if (typeof ymaps === 'undefined' || !myMap) {
        if (spinner) spinner.style.display = 'none';
        return;
    }

    if (multiRoute) {
        myMap.geoObjects.remove(multiRoute);
        multiRoute = null;
    }

    multiRoute = new ymaps.multiRouter.MultiRoute({
        referencePoints: [
            appState.startCoords,
            coords
        ],
        params: {
            routingMode: 'auto'
        }
    }, {
        boundsAutoApply: true,
        wayPointVisible: false,
        routeActiveStrokeWidth: 5,
        routeActiveStrokeColor: '#059669',
        routeActiveStrokeStyle: 'solid'
    });

    myMap.geoObjects.add(multiRoute);

    multiRoute.model.events.add('requestsuccess', () => {
        if (spinner) spinner.style.display = 'none';
        const activeRoute = multiRoute.getActiveRoute();
        if (activeRoute) {
            const distanceMeters = activeRoute.properties.get("distance").value;
            appState.distanceKm = Math.round((distanceMeters / 1000) * 10) / 10;
            recalculateTotalCost();
            showToast(`Расстояние доставки: ${appState.distanceKm} км`);
        }
    });

    multiRoute.model.events.add('requestfail', () => {
        if (spinner) spinner.style.display = 'none';
        console.warn('Yandex MultiRoute error, calculating fallback distance');
        const dist = getHaversineDistance(appState.startCoords[0], appState.startCoords[1], coords[0], coords[1]);
        appState.distanceKm = Math.round(dist * 1.35 * 10) / 10;
        recalculateTotalCost();
        showToast(`Расстояние (расчётное): ${appState.distanceKm} км`);
    });
}

function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Quick Location Presets
function setupQuickPresets() {
    const chips = document.querySelectorAll('.preset-chip');
    chips.forEach(c => {
        c.addEventListener('click', () => {
            chips.forEach(other => other.classList.remove('active'));
            c.classList.add('active');
            const lat = parseFloat(c.dataset.lat);
            const lon = parseFloat(c.dataset.lon);
            const name = c.dataset.name;
            setDestinationPoint([lat, lon], name);
        });
    });
}

// Address Search Autocomplete (Yandex Suggest + Geocode + Keyboard Nav)
function setupAddressSearch() {
    const input = document.getElementById('address-input');
    const list = document.getElementById('suggestions');
    const calcBtn = document.getElementById('btn-calculate');
    const clearBtn = document.getElementById('btn-clear-address');

    if (!input || !list) return;

    input.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = input.value.trim();

        if (clearBtn) clearBtn.style.display = query.length > 0 ? 'block' : 'none';

        if (query.length < 2) {
            list.classList.remove('active');
            activeSuggestionIndex = -1;
            return;
        }

        searchTimeout = setTimeout(() => {
            if (typeof ymaps !== 'undefined' && ymaps.suggest) {
                const fullQuery = query.toLowerCase().includes('красноярск') ? query : `Красноярск, ${query}`;
                ymaps.suggest(fullQuery).then((items) => {
                    list.innerHTML = '';
                    activeSuggestionIndex = -1;

                    if (items && items.length > 0) {
                        items.forEach((item, idx) => {
                            const li = document.createElement('li');
                            li.className = 'suggestion-item';
                            li.setAttribute('role', 'option');
                            li.dataset.index = idx;
                            const name = item.displayName.replace('Россия, Красноярский край, ', '').replace('Россия, ', '');
                            li.textContent = name;
                            li.addEventListener('click', () => {
                                input.value = name;
                                list.classList.remove('active');
                                geocodeAndSetAddress(item.value || name);
                            });
                            list.appendChild(li);
                        });
                        list.classList.add('active');
                    } else {
                        list.classList.remove('active');
                    }
                }).catch(() => list.classList.remove('active'));
            } else {
                list.classList.remove('active');
            }
        }, 250);
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            input.value = '';
            clearBtn.style.display = 'none';
            list.classList.remove('active');
            input.focus();
        });
    }

    // Keyboard Arrow Navigation & Enter / Escape handler
    input.addEventListener('keydown', (e) => {
        const items = list.querySelectorAll('.suggestion-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (items.length === 0) return;
            activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
            highlightSuggestion(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (items.length === 0) return;
            activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
            highlightSuggestion(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
                items[activeSuggestionIndex].click();
            } else if (items.length > 0) {
                items[0].click();
            } else if (input.value.trim().length >= 2) {
                geocodeAndSetAddress(input.value.trim());
            }
        } else if (e.key === 'Escape') {
            list.classList.remove('active');
        }
    });

    if (calcBtn) {
        calcBtn.addEventListener('click', () => {
            if (appState.destCoords) {
                calculateYandexRoute(appState.destCoords);
            } else if (input.value.trim().length >= 2) {
                geocodeAndSetAddress(input.value.trim());
            } else {
                showToast('Введите адрес или выберите точку на карте');
            }
        });
    }
}

function highlightSuggestion(items) {
    items.forEach((item, idx) => {
        item.classList.toggle('highlighted', idx === activeSuggestionIndex);
    });
}

function geocodeAndSetAddress(query) {
    const list = document.getElementById('suggestions');
    const spinner = document.getElementById('calc-spinner');
    if (spinner) spinner.style.display = 'inline-block';

    if (typeof ymaps === 'undefined' || !ymaps.geocode) {
        if (spinner) spinner.style.display = 'none';
        showToast('Ошибка сервиса Яндекс Карт');
        return;
    }

    const searchQuery = query.toLowerCase().includes('красноярск') ? query : `Красноярск, ${query}`;

    ymaps.geocode(searchQuery, { results: 1 }).then((res) => {
        if (spinner) spinner.style.display = 'none';
        const firstGeoObject = res.geoObjects.get(0);
        if (firstGeoObject) {
            const coords = firstGeoObject.geometry.getCoordinates();
            const name = firstGeoObject.getAddressLine().replace('Россия, Красноярский край, ', '').replace('Россия, ', '');
            setDestinationPoint(coords, name);
            if (list) list.classList.remove('active');
        } else {
            showToast('Адрес не найден. Попробуйте кликнуть на карте');
        }
    }).catch((err) => {
        if (spinner) spinner.style.display = 'none';
        console.error('Yandex geocode error:', err);
        showToast('Ошибка поиска адреса');
    });
}

// FAQ Accordion
function setupFAQAccordion() {
    const items = document.querySelectorAll('.faq-item');
    items.forEach(item => {
        const btn = item.querySelector('.faq-question');
        if (btn) {
            btn.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                items.forEach(i => i.classList.remove('active'));
                if (!isActive) item.classList.add('active');
            });
        }
    });
}

// Modals & Order Form Setup
function setupModalsAndForm() {
    const orderOverlay = document.getElementById('order-modal-overlay');
    const successOverlay = document.getElementById('success-modal-overlay');
    const openBtn = document.getElementById('btn-order-call');
    const closeBtn = document.getElementById('modal-close-btn');
    const successCloseBtn = document.getElementById('success-close-btn');
    const successDoneBtn = document.getElementById('btn-success-done');
    const copyOrderBtn = document.getElementById('btn-copy-order');
    const form = document.getElementById('order-form');
    const phoneInput = document.getElementById('user-phone');
    const personalDataConsent = document.getElementById('pd-consent-checkbox');
    const submitBtn = document.getElementById('order-submit-btn');

    const updateSubmitAvailability = () => {
        if (!submitBtn) return;
        submitBtn.disabled = !(personalDataConsent && personalDataConsent.checked);
    };

    if (personalDataConsent) {
        personalDataConsent.addEventListener('change', () => {
            personalDataConsent.closest('.legal-consent-item')?.classList.remove('consent-error');
            updateSubmitAvailability();
        });
    }
    updateSubmitAvailability();

    if (openBtn && orderOverlay) {
        openBtn.addEventListener('click', () => {
            recalculateTotalCost();
            if (personalDataConsent) personalDataConsent.checked = false;
            updateSubmitAvailability();
            orderOverlay.classList.add('active');
            if (phoneInput) setTimeout(() => phoneInput.focus(), 150);
        });
    }

    if (closeBtn) closeBtn.addEventListener('click', () => orderOverlay.classList.remove('active'));
    if (successCloseBtn) successCloseBtn.addEventListener('click', () => successOverlay.classList.remove('active'));
    if (successDoneBtn) successDoneBtn.addEventListener('click', () => successOverlay.classList.remove('active'));

    [orderOverlay, successOverlay].forEach(overlay => {
        if (!overlay) return;
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('active');
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (orderOverlay && orderOverlay.classList.contains('active')) orderOverlay.classList.remove('active');
            if (successOverlay && successOverlay.classList.contains('active')) successOverlay.classList.remove('active');
        }
    });

    // Copy Order ID Button
    if (copyOrderBtn) {
        copyOrderBtn.addEventListener('click', () => {
            const orderIdText = document.getElementById('success-order-id').textContent;
            navigator.clipboard.writeText(orderIdText).then(() => {
                showToast(`Номер заявки скопирован: ${orderIdText}`);
            });
        });
    }

    // Phone Auto-Format (Robust handling)
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            phoneInput.classList.remove('input-error');
            let inputVal = e.target.value;
            let num = inputVal.replace(/\D/g, '');

            if (num.startsWith('7') || num.startsWith('8')) {
                num = num.substring(1);
            }
            if (num.length > 10) num = num.substring(0, 10);

            let formatted = '+7 ';
            if (num.length > 0) formatted += '(' + num.substring(0, 3);
            if (num.length >= 3) formatted += ') ' + num.substring(3, 6);
            if (num.length >= 6) formatted += '-' + num.substring(6, 8);
            if (num.length >= 8) formatted += '-' + num.substring(8, 10);

            e.target.value = formatted;
        });
    }

    // Form Submission
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = phoneInput.value.trim();
            if (phone.length < 16) {
                if (phoneInput) phoneInput.classList.add('input-error');
                showToast('Введите полный номер телефона: +7 (XXX) XXX-XX-XX');
                return;
            }
            if (!personalDataConsent || !personalDataConsent.checked) {
                personalDataConsent?.closest('.legal-consent-item')?.classList.add('consent-error');
                showToast('Подтвердите согласие на обработку персональных данных');
                return;
            }

            const spinner = document.getElementById('modal-spinner');
            const btnText = document.getElementById('modal-btn-text');
            if (spinner) spinner.style.display = 'inline-block';
            if (btnText) btnText.textContent = 'Отправка...';

            const mat = materialsData[appState.selectedMaterialId];
            let matName = mat ? mat.name : 'Щебень';
            if (mat && mat.variants) {
                const v = mat.variants.find(i => i.id === appState.selectedVariantId);
                if (v) matName += ` (${v.name})`;
            }

            const unitPrice = mat && mat.variants ? (mat.variants.find(i => i.id === appState.selectedVariantId) || {}).price : (mat.price || 0);
            const materialTotalCost = unitPrice * appState.volume;
            const truckCount = appState.volume <= 20 ? 1 : Math.ceil(appState.volume / 20);
            const singleTripCost = calculateDeliveryCostPerTrip(appState.distanceKm);
            const deliveryTotalCost = singleTripCost * truckCount;
            const grandTotal = materialTotalCost + deliveryTotalCost;
            const notesInput = document.getElementById('user-notes');

            const orderPayload = {
                phone: phone,
                material: matName,
                volume: appState.volume,
                distance: appState.distanceKm,
                totalCost: grandTotal,
                destinationAddress: appState.addressName || 'Не указан (выбор по звонку)',
                notes: notesInput ? notesInput.value.trim() : '',
                consentMeta: {
                    personalDataAccepted: true,
                    acceptedAt: new Date().toISOString(),
                    consentDocument: 'consent.html',
                    privacyDocument: 'privacy.html',
                    cookieDocument: 'cookies.html',
                    formId: 'order-form'
                }
            };

            fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(data => {
                        throw new Error(data.message || 'Не удалось отправить заявку');
                    });
                }
                return res.json();
            })
            .then(data => {
                if (spinner) spinner.style.display = 'none';
                if (btnText) btnText.textContent = 'Отправить заявку';

                const createdId = data.orderId || `SCH-${Math.floor(1000 + Math.random() * 9000)}`;

                orderOverlay.classList.remove('active');
                form.reset();
                updateSubmitAvailability();

                // Open Success Modal
                document.getElementById('success-order-id').textContent = `#${createdId}`;
                document.getElementById('success-mat-text').textContent = `${matName} (${appState.volume} м³)`;
                document.getElementById('success-addr-text').textContent = appState.addressName || 'Согласование по телефону';
                document.getElementById('success-cost-text').textContent = formatCurrency(grandTotal);

                if (successOverlay) successOverlay.classList.add('active');
                showToast(`Заявка #${createdId} успешно принята!`);
            })
            .catch(() => {
                if (spinner) spinner.style.display = 'none';
                if (btnText) btnText.textContent = 'Отправить заявку';
                showToast('Заявка не отправлена. Позвоните диспетчеру или попробуйте еще раз.');
            });
        });
    }
}

// Mobile Menu Drawer Navigation
function setupMobileNav() {
    const toggleBtn = document.getElementById('mobile-toggle');
    const drawer = document.getElementById('mobile-nav-drawer');

    if (!toggleBtn || !drawer) return;

    toggleBtn.addEventListener('click', () => {
        drawer.classList.toggle('active');
    });

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            drawer.classList.remove('active');
        });
    });
}

// ScrollSpy & Back To Top Button
function setupScrollSpyAndBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    const sections = document.querySelectorAll('section[id], main[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        if (backToTopBtn) {
            backToTopBtn.classList.toggle('active', window.scrollY > 400);
        }

        let currentSectionId = '';
        sections.forEach(sec => {
            const secTop = sec.offsetTop - 120;
            if (window.scrollY >= secTop) {
                currentSectionId = sec.getAttribute('id');
            }
        });

        if (currentSectionId) {
            navLinks.forEach(link => {
                const href = link.getAttribute('href').replace('#', '');
                link.classList.toggle('active', href === currentSectionId);
            });
        }
    });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// Fetch Server Settings
function fetchServerSettings() {
    fetch('/api/settings')
        .then(res => res.json())
        .then(data => {
            if (data.deliveryRate) appState.deliveryRate = data.deliveryRate;
            if (data.startCoords) appState.startCoords = data.startCoords;
            recalculateTotalCost();
        })
        .catch(() => {});
}

// Toast Helper with max 3 limit
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    while (container.children.length >= 3) {
        container.removeChild(container.firstChild);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Cookie Consent Banner Handling (152-ФЗ & Роскомнадзор)
function setupCookieConsent() {
    const banner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('cookie-accept-btn');
    const essentialBtn = document.getElementById('cookie-essential-btn');
    if (!banner || !acceptBtn || !essentialBtn) return;

    const consentValue = localStorage.getItem('cookieConsent_scheben_rf');
    if (!consentValue) {
        setTimeout(() => {
            banner.classList.add('show');
        }, 1200);
    } else {
        banner.style.display = 'none';
    }

    const saveCookieChoice = (status) => {
        localStorage.setItem('cookieConsent_scheben_rf', JSON.stringify({
            status,
            acceptedAt: new Date().toISOString(),
            policy: 'cookies.html'
        }));
        banner.classList.remove('show');
        setTimeout(() => {
            banner.style.display = 'none';
        }, 400);
    };

    acceptBtn.addEventListener('click', () => saveCookieChoice('accepted'));
    essentialBtn.addEventListener('click', () => saveCookieChoice('essential_only'));
}
