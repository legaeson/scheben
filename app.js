// OpenStreetMap App Logic for шебень.рф using Leaflet, Nominatim & OSRM

// Default starting configurations
const defaultStartCoords = [56.146389, 93.112222]; // Warehouse [lat, lon] (Kubekovo)

const defaultMaterials = {
    crushed_stone: {
        name: 'Щебень',
        variants: [
            { id: 'frac_4_10', name: '4-8 ; 5-10', price: 750 },
            { id: 'frac_8_20', name: '8-16 ; 5-20 ; 10-20', price: 1000 }
        ]
    },
    sand: {
        name: 'Песок',
        variants: [
            { id: 'sand_0_5', name: 'Из отсева дробления 0-5', price: 850 },
            { id: 'sand_washed', name: '2 кл (мытый)', price: 1400 }
        ]
    },
    pshs: {
        name: 'ПЩС',
        variants: [
            { id: 'pshs_0_10', name: '0-10', price: 750 },
            { id: 'pshs_0_8', name: '0-8', price: 800 },
            { id: 'pshs_0_20', name: '0-20', price: 1000 },
            { id: 'pshs_0_40', name: '0-40', price: 1000 }
        ]
    },
    gps_gravel: {
        name: 'ГПС / Гравий',
        variants: [
            { id: 'gps_0_20', name: 'ГПС 0-20 ; Гравий 5-20', price: 550 }
        ]
    },
    anti_ice: { name: 'Противогололедный материал', price: 1400 },
    crushed_brick: { name: 'Битый кирпич', price: 800 },
    expanded_clay: { name: 'Керамзит', price: 1600 },
    chernozem: { name: 'Чернозём', price: 1000 }
};

const defaultDeliveryRate = 400;

// State variables
let startCoords = [...defaultStartCoords];
let materials = JSON.parse(JSON.stringify(defaultMaterials));
let deliveryRate = defaultDeliveryRate;

let currentMaterial = 'crushed_stone';
let currentVolume = 15;
let currentDistance = 0; // in km
let destinationAddress = '';

let myMap = null;
let destMarker = null;
let routePolyline = null;

let pendingCoords = null;
let pendingAddressName = '';

// Custom Leaflet Green Pin Marker Icon
function getGreenIcon() {
    return L.divIcon({
        className: 'custom-leaflet-pin',
        html: `<div style="background-color: #10b981; width: 18px; height: 18px; border-radius: 50%; border: 3px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.4);"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
}

// Initialize app when DOM and Leaflet script are loaded
function checkAndInitMap() {
    if (typeof L !== 'undefined') {
        init();
    } else {
        setTimeout(checkAndInitMap, 100);
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    checkAndInitMap();
} else {
    document.addEventListener('DOMContentLoaded', checkAndInitMap);
}

function init() {
    initMap();
    setupEventHandlers();
    initCustomSelects();
    loadSettingsFromServer();
}

// Set destination point marker on Leaflet map
function setDestinationMarker(coords, addressName) {
    if (!myMap) return;
    const iconToUse = getGreenIcon();

    if (destMarker) {
        destMarker.setLatLng(coords);
        destMarker.bindPopup(`<b>Адрес доставки:</b><br>${addressName || 'Точка на карте'}`);
    } else {
        destMarker = L.marker(coords, { icon: iconToUse }).addTo(myMap);
        destMarker.bindPopup(`<b>Адрес доставки:</b><br>${addressName || 'Точка на карте'}`);
    }
}

// Initialize Leaflet Map
function initMap() {
    // Restrain bounds to Krasnoyarsk delivery area (200km radius)
    const krasnoyarskBounds = L.latLngBounds(
        L.latLng(54.0, 90.0),
        L.latLng(58.0, 96.0)
    );

    myMap = L.map('map', {
        center: startCoords,
        zoom: 10,
        minZoom: 8,
        maxZoom: 19,
        maxBounds: krasnoyarskBounds,
        maxBoundsViscosity: 0.8,
        zoomControl: true,
        attributionControl: false
    });

    // Standard OpenStreetMap tiles with regional zoom restriction & hidden attribution
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        minZoom: 8
    }).addTo(myMap);

    // Warehouse marker at Kubekovo
    L.marker(startCoords, {
        icon: L.divIcon({
            className: 'warehouse-marker',
            html: '<div style="background-color: #1e3a5f; width: 14px; height: 14px; border-radius: 50%; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.35);"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7]
        })
    }).addTo(myMap).bindPopup('Склад (д. Кубеково)');

    // Delivery zone circle (200km radius)
    L.circle(startCoords, { radius: 200000, color: '#d97706', fillColor: '#fef3c7', fillOpacity: 0.08, weight: 1, dashArray: '8,6', interactive: false }).addTo(myMap);


    // Click on map to place point marker instantly and defer reverse geocoding + route calculation to clicking "Рассчитать"
    myMap.on('click', function (e) {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;

        // Limit to 200km radius from warehouse
        const distFromStart = getHaversineDistance(startCoords[0], startCoords[1], lat, lon);
        if (distFromStart > 200) {
            alert('Доставка выполняется только по Красноярску и окрестностям (до 200 км). Пожалуйста, выберите точку ближе к городу.');
            return;
        }

        const mapHint = document.getElementById('map-click-hint');
        if (mapHint) mapHint.style.display = 'none';

        if (routePolyline) {
            myMap.removeLayer(routePolyline);
            routePolyline = null;
        }

        const coords = [lat, lon];
        const pointLabel = `Точка на карте (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
        setDestinationMarker(coords, pointLabel);
        document.getElementById('address-input').value = pointLabel;

        pendingCoords = coords;
        pendingAddressName = pointLabel;
        setSearchButtonState(false);
    });
}

// Reverse geocode point to nearest street/house using Nominatim and calculate driving route via OSRM
function resolvePointAndCalculateRoute(coords) {
    showLoading(true);
    const lat = coords[0];
    const lon = coords[1];
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;

    fetch(url, { headers: { 'Accept-Language': 'ru' } })
    .then(res => res.json())
    .then(data => {
        let addressName = `Точка на карте (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
        let targetCoords = coords;

        if (data) {
            if (data.address) {
                const addr = data.address;
                const road = addr.road || addr.street || addr.pedestrian || addr.footway || addr.suburb || addr.city_district;
                const house = addr.house_number || addr.building;
                if (road) {
                    addressName = house ? `${road}, ${house}` : road;
                } else if (data.display_name) {
                    addressName = data.display_name.replace('Россия, Красноярский край, ', '').replace('Россия, ', '');
                }
            } else if (data.display_name) {
                addressName = data.display_name.replace('Россия, Красноярский край, ', '').replace('Россия, ', '');
            }

            if (data.lat && data.lon) {
                targetCoords = [parseFloat(data.lat), parseFloat(data.lon)];
            }
        }

        document.getElementById('address-input').value = addressName;
        pendingCoords = targetCoords;
        pendingAddressName = addressName;
        setDestinationMarker(targetCoords, addressName);
        calculateRoute(targetCoords, addressName);
    })
    .catch(err => {
        console.warn('Nominatim reverse geocoding failed:', err);
        const fallbackName = `Точка на карте (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
        document.getElementById('address-input').value = fallbackName;
        calculateRoute(coords, fallbackName);
    });
}

// Calculate driving route using OSRM API (Open Source Routing Machine)
function calculateRoute(destCoords, displayName) {
    destinationAddress = displayName;
    setDestinationMarker(destCoords, displayName);
    showLoading(true);

    if (routePolyline) {
        myMap.removeLayer(routePolyline);
        routePolyline = null;
    }

    // OSRM Driving Route URL from startCoords (Kubekovo) to destCoords
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;

    fetch(osrmUrl)
    .then(res => res.json())
    .then(data => {
        showLoading(false);
        if (data && data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const distanceMeters = route.distance;
            currentDistance = Math.round(distanceMeters / 1000 * 10) / 10;

            const coordsGeoJSON = route.geometry.coordinates; // [[lon, lat], ...]
            const routeLatLngs = coordsGeoJSON.map(c => [c[1], c[0]]);

            routePolyline = L.polyline(routeLatLngs, {
                color: '#ff6600',
                weight: 5,
                opacity: 0.9,
                lineJoin: 'round'
            }).addTo(myMap);

            myMap.fitBounds(routePolyline.getBounds(), { padding: [30, 30] });
        } else {
            const straightDist = getHaversineDistance(startCoords[0], startCoords[1], destCoords[0], destCoords[1]);
            currentDistance = Math.round(straightDist * 1.35 * 10) / 10;
        }
        recalculate();
        setSearchButtonState(true);
    })
    .catch(err => {
        console.warn('OSRM routing failed, fallback to Haversine:', err);
        showLoading(false);
        const straightDist = getHaversineDistance(startCoords[0], startCoords[1], destCoords[0], destCoords[1]);
        currentDistance = Math.round(straightDist * 1.35 * 10) / 10;
        recalculate();
        setSearchButtonState(true);
    });
}

// Calculate address by text query with Nominatim API
function calculateAddress(query) {
    let searchQuery = query.trim();
    if (!searchQuery) return;

    if (!searchQuery.toLowerCase().includes('красноярск')) {
        searchQuery = 'Красноярск, ' + searchQuery;
    }

    showLoading(true);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&addressdetails=1`;

    fetch(url, { headers: { 'Accept-Language': 'ru' } })
    .then(res => res.json())
    .then(data => {
        if (!data || data.length === 0) {
            showLoading(false);
            alert('Указанный адрес не найден. Пожалуйста, уточните запрос.');
            return;
        }
        const item = data[0];
        const coords = [parseFloat(item.lat), parseFloat(item.lon)];
        
        const distFromStart = getHaversineDistance(startCoords[0], startCoords[1], coords[0], coords[1]);
        if (distFromStart > 200) {
            showLoading(false);
            alert('Найденный адрес находится слишком далеко. Доставка осуществляется в пределах 200 км от Красноярска.');
            return;
        }

        let addressName = item.display_name.replace('Россия, Красноярский край, ', '').replace('Россия, ', '');
        if (item.address) {
            const addr = item.address;
            const road = addr.road || addr.street || addr.pedestrian || addr.suburb;
            const house = addr.house_number || addr.building;
            if (road) {
                addressName = house ? `${road}, ${house}` : road;
            }
        }

        document.getElementById('address-input').value = addressName;
        pendingCoords = coords;
        pendingAddressName = addressName;
        setDestinationMarker(coords, addressName);
        calculateRoute(coords, addressName);
    })
    .catch(err => {
        showLoading(false);
        console.warn('Address search failed:', err);
        alert('Не удалось определить координаты адреса. Проверьте запрос.');
    });
}

// Load settings from backend server
function loadSettingsFromServer() {
    fetch('/api/settings')
    .then(res => {
        if (!res.ok) throw new Error('Failed to load settings from server');
        return res.json();
    })
    .then(data => {
        console.log('[App] Loaded settings from server:', data);
        if (data.materials) {
            materials = data.materials;
        }
        if (data.deliveryRate !== undefined) {
            deliveryRate = data.deliveryRate;
        }
        if (data.startCoords && Array.isArray(data.startCoords) && data.startCoords.length === 2) {
            startCoords = data.startCoords;
        }
        updateUIWithPrices();
        recalculate();
    })
    .catch(err => {
        console.warn('[App] Server connection failed, using defaults:', err);
        materials = JSON.parse(JSON.stringify(defaultMaterials));
        deliveryRate = defaultDeliveryRate;
        startCoords = [...defaultStartCoords];
        updateUIWithPrices();
        recalculate();
    });
}

// Helper to get active price data for a material
function getActiveMaterialData(matKey) {
    const matData = materials[matKey];
    if (!matData) return null;
    
    if (matData.variants && matData.variants.length > 0) {
        const selectEl = document.querySelector(`.variant-select[data-mat="${matKey}"]`);
        if (selectEl) {
            const variantId = selectEl.value;
            const variant = matData.variants.find(v => v.id === variantId);
            if (variant) {
                return {
                    name: `${matData.name} (${variant.name})`,
                    price: variant.price
                };
            }
        }
        return {
            name: `${matData.name} (${matData.variants[0].name})`,
            price: matData.variants[0].price
        };
    }
    return { name: matData.name, price: matData.price };
}

// Update DOM elements representing prices
function updateUIWithPrices() {
    document.querySelectorAll('.material-card').forEach(card => {
        const matKey = card.dataset.material;
        const activeData = getActiveMaterialData(matKey);
        
        if (activeData) {
            const priceEl = card.querySelector('.material-price');
            if (priceEl) {
                const matData = materials[matKey];
                if (matData && matData.variants && matData.variants.length > 0) {
                    const minPrice = Math.min(...matData.variants.map(v => v.price));
                    if (activeData.price === minPrice) {
                        priceEl.textContent = `от ${activeData.price} ₽/м³`;
                    } else {
                        priceEl.textContent = `${activeData.price} ₽/м³`;
                    }
                } else {
                    priceEl.textContent = `от ${activeData.price} ₽/м³`;
                }
            }
        }
    });

    const rateEl = document.getElementById('delivery-rate-label');
    if (rateEl) {
        rateEl.textContent = `Доставка (${deliveryRate} ₽/км):`;
    }
}

// Set up UI Event Handlers
function setupEventHandlers() {
    const cards = document.querySelectorAll('.material-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            currentMaterial = card.dataset.material;
            recalculate();
        });
    });

    const selects = document.querySelectorAll('.variant-select');
    selects.forEach(sel => {
        sel.addEventListener('change', (e) => {
            const matKey = e.target.dataset.mat;
            const card = document.querySelector(`.material-card[data-material="${matKey}"]`);
            if (card) {
                cards.forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                currentMaterial = matKey;
            }
            updateUIWithPrices();
            recalculate();
        });
        sel.addEventListener('click', (e) => e.stopPropagation());
    });

    const slider = document.getElementById('volume-slider');
    const display = document.getElementById('volume-display');
    
    slider.addEventListener('input', (e) => {
        currentVolume = parseInt(e.target.value);
        display.textContent = `${currentVolume} м³`;
        recalculate();
    });

    const btnCalc = document.getElementById('btn-calculate');
    const input = document.getElementById('address-input');
    
    const triggerCalculation = () => {
        const address = input.value.trim();
        if (!address) return;

        if (pendingCoords) {
            resolvePointAndCalculateRoute(pendingCoords);
        } else if (address.length > 2) {
            calculateAddress(address);
        }
    };

    btnCalc.addEventListener('click', triggerCalculation);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            triggerCalculation();
        }
    });

    let searchTimeout = null;
    input.addEventListener('input', () => {
        setSearchButtonState(false);
        pendingCoords = null; // User typing text manually resets pending map click coords
        const query = input.value.trim();
        if (query.length > 2) {
            if (searchTimeout) clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => fetchSuggestions(query), 300);
        } else {
            hideSuggestions();
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.address-group')) {
            hideSuggestions();
        }
    });

    const telLink = document.getElementById('btn-order-call');
    const modalOverlay = document.getElementById('order-modal-overlay');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const orderForm = document.getElementById('order-form');

    if (telLink) {
        telLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (modalOverlay) modalOverlay.classList.add('active');
        });
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            if (modalOverlay) modalOverlay.classList.remove('active');
        });
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.classList.remove('active');
            }
        });
    }

    if (orderForm) {
        orderForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitOrderRequest();
        });
    }
}

// Fetch suggestions for address search
function fetchSuggestions(query) {
    let searchQuery = query;
    if (!query.toLowerCase().includes('красноярск')) {
        searchQuery = 'Красноярск, ' + query;
    }
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`;
    
    fetch(url, { headers: { 'Accept-Language': 'ru' } })
    .then(res => res.json())
    .then(data => {
        if (!data || data.length === 0) {
            hideSuggestions();
            return;
        }
        const items = data.map(item => {
            let name = item.display_name.replace('Россия, Красноярский край, ', '').replace('Россия, ', '');
            if (item.address) {
                const addr = item.address;
                const road = addr.road || addr.street || addr.pedestrian || addr.suburb;
                const house = addr.house_number || addr.building;
                if (road) {
                    name = house ? `${road}, ${house}` : road;
                }
            }
            return { name, coords: [parseFloat(item.lat), parseFloat(item.lon)] };
        });
        renderSuggestions(items);
    })
    .catch(err => {
        console.warn('Suggest error:', err);
        hideSuggestions();
    });
}

function renderSuggestions(items) {
    const list = document.getElementById('suggestions');
    if (!list) return;
    list.innerHTML = '';

    items.forEach(item => {
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        li.textContent = item.name;
        li.addEventListener('click', () => {
            document.getElementById('address-input').value = item.name;
            hideSuggestions();
            pendingCoords = item.coords;
            pendingAddressName = item.name;
            setDestinationMarker(item.coords, item.name);
            setSearchButtonState(false);
            if (routePolyline) {
                myMap.removeLayer(routePolyline);
                routePolyline = null;
            }
        });
        list.appendChild(li);
    });

    list.style.display = 'block';
}

function hideSuggestions() {
    const list = document.getElementById('suggestions');
    if (list) list.style.display = 'none';
}

// Toggle search button state
function setSearchButtonState(isCalculated) {
    const btnText = document.getElementById('btn-text');
    const btn = document.getElementById('btn-calculate');
    if (!btnText || !btn) return;

    if (isCalculated) {
        btnText.textContent = 'Рассчитано';
        btn.classList.add('calculated');
    } else {
        btnText.textContent = 'Рассчитать';
        btn.classList.remove('calculated');
    }
}

// Toggle loading state on button
function showLoading(isLoading) {
    const spinner = document.getElementById('calc-spinner');
    const text = document.getElementById('btn-text');
    const btn = document.getElementById('btn-calculate');
    
    if (isLoading) {
        spinner.style.display = 'inline-block';
        text.style.display = 'none';
        btn.disabled = true;
    } else {
        spinner.style.display = 'none';
        text.style.display = 'inline-block';
        btn.disabled = false;
    }
}

// Recalculate costs
function recalculate() {
    const activeData = getActiveMaterialData(currentMaterial);
    if (!activeData) return;
    
    const materialCost = activeData.price * currentVolume;
    const deliveryCost = currentDistance * deliveryRate;
    const totalCost = materialCost + deliveryCost;

    const formatRub = (num) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(num);

    document.getElementById('summary-mat-name').textContent = activeData.name;
    document.getElementById('summary-volume').textContent = currentVolume;
    document.getElementById('distance-val').textContent = `${currentDistance} км`;
    document.getElementById('material-cost-val').textContent = formatRub(materialCost);
    document.getElementById('delivery-cost-val').textContent = formatRub(deliveryCost);
    document.getElementById('total-cost-val').textContent = formatRub(totalCost);

    const telLink = document.getElementById('btn-order-call');
    const msg = `Здравствуйте! Хочу заказать ${activeData.name} в объеме ${currentVolume} м³ с доставкой в ${destinationAddress ? destinationAddress : '(укажите адрес)'}. Посчитало примерно ${formatRub(totalCost)}.`;
    if (telLink) telLink.dataset.msg = msg;
}

// Mathematical Haversine distance helper (in km)
function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Send POST request to notify admin and save order
function submitOrderRequest() {
    const activeData = getActiveMaterialData(currentMaterial);
    if (!activeData) return;

    const phoneInput = document.getElementById('user-phone');
    const phone = phoneInput ? phoneInput.value.trim() : '';
    if (!phone) return;

    const materialCost = activeData.price * currentVolume;
    const deliveryCost = currentDistance * deliveryRate;
    const totalCost = materialCost + deliveryCost;

    const orderData = {
        phone: phone,
        material: activeData.name,
        volume: currentVolume,
        distance: currentDistance,
        totalCost: totalCost,
        destinationAddress: destinationAddress || 'Не указан'
    };

    const submitBtn = document.querySelector('#order-form .btn-calc');
    const spinner = document.getElementById('modal-spinner');
    const btnText = document.getElementById('modal-btn-text');

    if (submitBtn) submitBtn.disabled = true;
    if (spinner) spinner.style.display = 'inline-block';
    if (btnText) btnText.style.display = 'none';

    fetch('/api/order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    })
    .then(res => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
    })
    .then(data => {
        console.log('[App] Order request sent successfully:', data);
        alert('Запрос успешно отправлен! Мы перезвоним вам в ближайшее время.');
        const modalOverlay = document.getElementById('order-modal-overlay');
        if (modalOverlay) modalOverlay.classList.remove('active');
        if (phoneInput) phoneInput.value = '';
    })
    .catch(err => {
        console.error('[App] Failed to send order request:', err);
        alert('Произошла ошибка при отправке. Пожалуйста, попробуйте позвонить нам.');
    })
    .finally(() => {
        if (submitBtn) submitBtn.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (btnText) btnText.style.display = 'inline-block';
    });
}

// Custom Select UI Initialization
function initCustomSelects() {
    const selects = document.querySelectorAll('.variant-select');
    selects.forEach(select => {
        if (select.nextElementSibling && select.nextElementSibling.classList.contains('custom-select-wrapper')) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'custom-select-wrapper';
        select.parentNode.insertBefore(wrapper, select.nextSibling);
        wrapper.appendChild(select);
        select.style.display = 'none';

        const trigger = document.createElement('div');
        trigger.className = 'custom-select-trigger';
        
        const triggerText = document.createElement('span');
        triggerText.textContent = select.options[select.selectedIndex].text;
        trigger.appendChild(triggerText);

        const arrow = document.createElement('div');
        arrow.className = 'custom-select-arrow';
        arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
        trigger.appendChild(arrow);
        
        wrapper.appendChild(trigger);

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'custom-select-options';

        Array.from(select.options).forEach(option => {
            const optDiv = document.createElement('div');
            optDiv.className = 'custom-option';
            if (option.selected) optDiv.classList.add('selected');
            optDiv.textContent = option.text;
            optDiv.dataset.value = option.value;
            
            optDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                select.value = option.value;
                triggerText.textContent = option.text;
                
                optionsDiv.querySelectorAll('.custom-option').forEach(el => el.classList.remove('selected'));
                optDiv.classList.add('selected');
                wrapper.classList.remove('open');
                
                const card = wrapper.closest('.material-card');
                if (card) card.style.zIndex = '';
                
                select.dispatchEvent(new Event('change'));
            });
            optionsDiv.appendChild(optDiv);
        });

        wrapper.appendChild(optionsDiv);

        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.custom-select-wrapper').forEach(el => {
                if (el !== wrapper) {
                    el.classList.remove('open');
                    const c = el.closest('.material-card');
                    if (c) c.style.zIndex = '';
                }
            });
            const isOpen = wrapper.classList.toggle('open');
            const card = wrapper.closest('.material-card');
            if (card) {
                card.style.zIndex = isOpen ? '10' : '';
            }
        });
        
        wrapper.addEventListener('click', (e) => e.stopPropagation());
    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-select-wrapper').forEach(el => {
            el.classList.remove('open');
        });
        document.querySelectorAll('.material-card').forEach(el => {
            el.style.zIndex = '';
        });
    });
}
