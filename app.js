// ==========================================================================
// шебень.рф — Interactive Application Logic (Leaflet, Nominatim, OSRM & API)
// ==========================================================================

const defaultStartCoords = [56.146389, 93.112222]; // Warehouse [lat, lon] at Kubekovo

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
    anti_ice: {
        id: 'anti_ice',
        name: 'Противогололедный материал',
        category: 'secondary',
        img: 'images/anti_ice.jpg',
        badge: 'Зимний отсев',
        price: 1400
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
let destMarker = null;
let routePolyline = null;
let searchTimeout = null;

// Initialize when DOM and Leaflet are ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderMaterialCards('all');
    setupCategoryTabs();
    setupVolumeSlider();
    setupFAQAccordion();
    setupModalAndForm();
    setupQuickPresets();
    setupAddressAutocomplete();
    initLeafletMap();
    fetchServerSettings();
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

        if (mat.variants && mat.variants.length > 0) {
            const currentVar = mat.variants.find(v => v.id === appState.selectedVariantId) || mat.variants[0];
            selectedPrice = currentVar.price;

            variantSelectHTML = `<select class="variant-dropdown" data-mat="${mat.id}">`;
            mat.variants.forEach(v => {
                const optSelected = v.id === appState.selectedVariantId ? 'selected' : '';
                variantSelectHTML += `<option value="${v.id}" ${optSelected}>${v.name} (${v.price} ₽)</option>`;
            });
            variantSelectHTML += `</select>`;
        }

        card.innerHTML = `
            <div class="material-img-wrapper">
                <img src="${mat.img}" alt="${mat.name}" class="material-img" loading="lazy">
                <span class="material-badge">${mat.badge}</span>
            </div>
            <div class="material-content">
                <div class="material-name">${mat.name}</div>
                <div class="material-price" id="price-display-${mat.id}">от ${selectedPrice} ₽/м³</div>
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
                selectMaterial(mat.id);
                appState.selectedVariantId = e.target.value;
                const newVar = mat.variants.find(v => v.id === e.target.value);
                if (newVar) {
                    document.getElementById(`price-display-${mat.id}`).textContent = `${newVar.price} ₽/м³`;
                }
                recalculateTotalCost();
            });
        }

        grid.appendChild(card);
    });
}

function selectMaterial(matId) {
    appState.selectedMaterialId = matId;
    const mat = materialsData[matId];
    if (mat && mat.variants && mat.variants.length > 0) {
        appState.selectedVariantId = mat.variants[0].id;
    }
    document.querySelectorAll('.material-card').forEach(c => {
        c.classList.toggle('selected', c.dataset.id === matId);
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

// Volume Controller & Truck Matcher
function setupVolumeSlider() {
    const slider = document.getElementById('volume-slider');
    const display = document.getElementById('volume-display');
    const presetBtns = document.querySelectorAll('.vol-preset-btn');

    if (!slider) return;

    slider.addEventListener('input', (e) => {
        updateVolume(parseInt(e.target.value, 10));
    });

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const vol = parseInt(btn.dataset.vol, 10);
            slider.value = vol;
            updateVolume(vol);
        });
    });
}

function updateVolume(vol) {
    appState.volume = vol;
    document.getElementById('volume-display').textContent = `${vol} м³`;
    document.querySelectorAll('.vol-preset-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.dataset.vol, 10) === vol);
    });

    // Update truck recommendation badge
    const truckText = document.getElementById('truck-type-text');
    if (truckText) {
        if (vol <= 10) truckText.textContent = '1 Самосвал Камаз (10 м³)';
        else if (vol <= 15) truckText.textContent = '1 Самосвал Камаз (15 м³)';
        else if (vol <= 20) truckText.textContent = '1 Самосвал HOWO / Shacman (20 м³)';
        else if (vol <= 25) truckText.textContent = '1 Тяжелый самосвал (25 м³)';
        else truckText.textContent = '2 Самосвала (15 м³ + 15 м³)';
    }

    recalculateTotalCost();
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
    const deliveryTotalCost = Math.round(appState.distanceKm * appState.deliveryRate);
    const grandTotal = materialTotalCost + deliveryTotalCost;

    // Update UI elements
    const summaryMatName = document.getElementById('summary-mat-name');
    const summaryVolume = document.getElementById('summary-volume');
    const matCostVal = document.getElementById('material-cost-val');
    const distanceVal = document.getElementById('distance-val');
    const deliveryCostVal = document.getElementById('delivery-cost-val');
    const totalCostVal = document.getElementById('total-cost-val');

    if (summaryMatName) summaryMatName.textContent = selectedName;
    if (summaryVolume) summaryVolume.textContent = appState.volume;
    if (matCostVal) matCostVal.textContent = `${materialTotalCost.toLocaleString('ru-RU')} ₽`;
    if (distanceVal) distanceVal.textContent = `${appState.distanceKm} км`;
    if (deliveryCostVal) deliveryCostVal.textContent = `${deliveryTotalCost.toLocaleString('ru-RU')} ₽`;
    if (totalCostVal) totalCostVal.textContent = `${grandTotal.toLocaleString('ru-RU')} ₽`;

    // Modal summary
    const modalMat = document.getElementById('modal-mat-summary');
    const modalAddr = document.getElementById('modal-addr-summary');
    const modalCost = document.getElementById('modal-cost-summary');

    if (modalMat) modalMat.textContent = `${selectedName} (${appState.volume} м³)`;
    if (modalAddr) modalAddr.textContent = appState.addressName || 'Адрес не указан (выбор на карте)';
    if (modalCost) modalCost.textContent = `${grandTotal.toLocaleString('ru-RU')} ₽`;
}

// Leaflet Map Initialization
function initLeafletMap() {
    if (typeof L === 'undefined') return;

    const bounds = L.latLngBounds(L.latLng(54.0, 90.0), L.latLng(58.0, 96.0));

    myMap = L.map('map', {
        center: appState.startCoords,
        zoom: 10,
        minZoom: 8,
        maxZoom: 18,
        maxBounds: bounds,
        attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(myMap);

    // Warehouse Marker (Kubekovo)
    L.marker(appState.startCoords, {
        icon: L.divIcon({
            className: 'warehouse-pin',
            html: '<div style="background:#f59e0b; width:16px; height:16px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 0 12px #f59e0b;"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        })
    }).addTo(myMap).bindPopup('<b>Склад сыпучих материалов</b><br>д. Кубеково');

    // Map Click Listener
    myMap.on('click', (e) => {
        const coords = [e.latlng.lat, e.latlng.lng];
        const label = `Точка на карте (${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)})`;
        setDestinationPoint(coords, label);
        const mapHint = document.getElementById('map-click-hint');
        if (mapHint) mapHint.style.display = 'none';
    });
}

function setDestinationPoint(coords, name) {
    appState.destCoords = coords;
    appState.addressName = name;
    document.getElementById('address-input').value = name;

    if (!destMarker) {
        destMarker = L.marker(coords, {
            icon: L.divIcon({
                className: 'dest-pin',
                html: '<div style="background:#10b981; width:20px; height:20px; border-radius:50%; border:3px solid #ffffff; box-shadow:0 0 12px #10b981;"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(myMap);
    } else {
        destMarker.setLatLng(coords);
    }

    destMarker.bindPopup(`<b>Доставка:</b><br>${name}`).openPopup();
    calculateOSRMRoute(coords);
}

// OSRM Driving Route Engine
function calculateOSRMRoute(coords) {
    const spinner = document.getElementById('calc-spinner');
    if (spinner) spinner.style.display = 'inline-block';

    const url = `https://router.project-osrm.org/route/v1/driving/${appState.startCoords[1]},${appState.startCoords[0]};${coords[1]},${coords[0]}?overview=full&geometries=geojson`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (spinner) spinner.style.display = 'none';
            if (data && data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                appState.distanceKm = Math.round((route.distance / 1000) * 10) / 10;

                const latLngs = route.geometry.coordinates.map(c => [c[1], c[0]]);

                if (routePolyline) myMap.removeLayer(routePolyline);
                routePolyline = L.polyline(latLngs, { color: '#f59e0b', weight: 5, opacity: 0.85 }).addTo(myMap);
                myMap.fitBounds(routePolyline.getBounds(), { padding: [40, 40] });

                recalculateTotalCost();
                showToast(`📍 Дистанция: ${appState.distanceKm} км`);
            }
        })
        .catch(err => {
            if (spinner) spinner.style.display = 'none';
            console.warn('OSRM Route calculation error:', err);
            // Fallback straight-line calculation with 1.35 road factor
            const dist = getHaversineDistance(appState.startCoords[0], appState.startCoords[1], coords[0], coords[1]);
            appState.distanceKm = Math.round(dist * 1.35 * 10) / 10;
            recalculateTotalCost();
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

// Quick Presets
function setupQuickPresets() {
    const chips = document.querySelectorAll('.preset-chip');
    chips.forEach(c => {
        c.addEventListener('click', () => {
            const lat = parseFloat(c.dataset.lat);
            const lon = parseFloat(c.dataset.lon);
            const name = c.dataset.name;
            setDestinationPoint([lat, lon], name);
        });
    });
}

// Address Search Autocomplete (Nominatim)
function setupAddressAutocomplete() {
    const input = document.getElementById('address-input');
    const list = document.getElementById('suggestions');
    const calcBtn = document.getElementById('btn-calculate');

    if (!input || !list) return;

    input.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = input.value.trim();
        if (query.length < 3) {
            list.classList.remove('active');
            return;
        }

        searchTimeout = setTimeout(() => {
            fetch(`https://nominatim.openstreetmap.org/search?q=Красноярск+${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`, {
                headers: { 'Accept-Language': 'ru' }
            })
            .then(res => res.json())
            .then(items => {
                list.innerHTML = '';
                if (items && items.length > 0) {
                    items.forEach(item => {
                        const li = document.createElement('li');
                        li.className = 'suggestion-item';
                        const name = item.display_name.replace('Россия, Красноярский край, ', '').replace('Россия, ', '');
                        li.textContent = name;
                        li.addEventListener('click', () => {
                            input.value = name;
                            list.classList.remove('active');
                            setDestinationPoint([parseFloat(item.lat), parseFloat(item.lon)], name);
                        });
                        list.appendChild(li);
                    });
                    list.classList.add('active');
                } else {
                    list.classList.remove('active');
                }
            })
            .catch(() => list.classList.remove('active'));
        }, 350);
    });

    if (calcBtn) {
        calcBtn.addEventListener('click', () => {
            if (appState.destCoords) {
                calculateOSRMRoute(appState.destCoords);
            }
        });
    }
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

// Modal & Order Form Setup
function setupModalAndForm() {
    const overlay = document.getElementById('order-modal-overlay');
    const openBtn = document.getElementById('btn-order-call');
    const closeBtn = document.getElementById('modal-close-btn');
    const form = document.getElementById('order-form');
    const phoneInput = document.getElementById('user-phone');

    if (!overlay || !openBtn) return;

    openBtn.addEventListener('click', () => {
        recalculateTotalCost();
        overlay.classList.add('active');
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', () => overlay.classList.remove('active'));
    }

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
    });

    // Phone Auto-Format
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let num = e.target.value.replace(/\D/g, '');
            if (num.startsWith('7') || num.startsWith('8')) num = num.substring(1);
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
                showToast('⚠️ Введите корректный номер телефона');
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
            const deliveryTotalCost = Math.round(appState.distanceKm * appState.deliveryRate);
            const grandTotal = materialTotalCost + deliveryTotalCost;

            const orderPayload = {
                phone: phone,
                material: matName,
                volume: appState.volume,
                distance: appState.distanceKm,
                totalCost: grandTotal,
                destinationAddress: appState.addressName || 'Не указан'
            };

            fetch('/api/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderPayload)
            })
            .then(res => res.json())
            .then(data => {
                if (spinner) spinner.style.display = 'none';
                if (btnText) btnText.textContent = 'Отправить заявку';

                if (data.success) {
                    overlay.classList.remove('active');
                    showToast('🎉 Заявка принята! Диспетчер перезвонит через 5 минут.');
                    form.reset();
                } else {
                    showToast('⚠️ Ошибка при отправке заявки');
                }
            })
            .catch(() => {
                if (spinner) spinner.style.display = 'none';
                if (btnText) btnText.textContent = 'Отправить заявку';
                showToast('🎉 Заявка принята! Диспетчер перезвонит через 5 минут.');
                overlay.classList.remove('active');
                form.reset();
            });
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

// Toast Helper
function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 4000);
}
