// OpenStreetMap & Leaflet App Logic for шебень.рф

// Default starting configurations
const defaultStartCoords = [56.146389, 93.112222]; // [lat, lon]

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
let materials = { ...defaultMaterials };
let deliveryRate = defaultDeliveryRate;

let currentMaterial = 'crushed_stone';
let currentVolume = 15;
let currentDistance = 0; // in km
let destinationAddress = '';
let myMap = null;
let currentRoute = null; // Polyline layer
let startMarker = null;
let destMarker = null;
let searchTimeout = null;

// Custom premium SVG icon for start and destination points
const startIcon = L.divIcon({
    html: `<div style="background-color: #d97706; width: 14px; height: 14px; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
    className: 'custom-start-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

const destIcon = L.divIcon({
    html: `<div style="background-color: #10b981; width: 14px; height: 14px; border: 3px solid #fff; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
    className: 'custom-dest-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

function init() {
    initMap();
    setupEventHandlers();
    loadSettingsFromServer();
}

// Initialize Leaflet Map with default coordinates
function initMap() {
    myMap = L.map('map', {
        scrollWheelZoom: false, // Disable scroll zoom for better page scrolling experience
        attributionControl: false // Disable default Leaflet attribution
    }).setView(startCoords, 10); // Krasnoyarsk

    // Add 2GIS (2ГИС) tiles
    L.tileLayer('https://tile{s}.maps.2gis.com/tiles?x={x}&y={y}&z={z}&v=1', {
        maxZoom: 18,
        subdomains: '0123'
    }).addTo(myMap);

    // Create warehouse marker
    startMarker = L.marker(startCoords, { icon: startIcon }).addTo(myMap)
        .bindPopup('<b>Наш склад</b><br>Отсюда отправляется доставка материалов');

    // Click on map to select delivery location
    myMap.on('click', (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        
        // Limit to 200km radius from warehouse / Krasnoyarsk
        const distFromStart = getHaversineDistance(startCoords[0], startCoords[1], lat, lng);
        if (distFromStart > 200) {
            alert('Доставка выполняется только по Красноярску и окрестностям (до 200 км). Пожалуйста, выберите точку ближе к городу.');
            return;
        }

        showLoading(true);
        // Reverse geocoding via Nominatim
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
        fetch(url, {
            headers: {
                'Accept-Language': 'ru',
                'User-Agent': 'scheben-delivery-calculator'
            }
        })
        .then(res => res.json())
        .then(data => {
            let name = 'Точка на карте';
            if (data && data.display_name) {
                name = formatNominatimAddress(data);
            }
            renderRouteAndCalculate([lat, lng], name);
            setSearchButtonState(true);
        })
        .catch(err => {
            console.warn('Reverse geocoding failed:', err);
            renderRouteAndCalculate([lat, lng], `Точка на карте (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
            setSearchButtonState(true);
        });
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
            // Update warehouse marker position dynamically
            if (startMarker) {
                startMarker.setLatLng(startCoords);
                myMap.panTo(startCoords);
            }
        }
        updateUIWithPrices();
        recalculate();
    })
    .catch(err => {
        console.warn('[App] Server connection failed, using client defaults:', err);
        // Fallback to defaults
        materials = { ...defaultMaterials };
        deliveryRate = defaultDeliveryRate;
        startCoords = [...defaultStartCoords];
        updateUIWithPrices();
        recalculate();
    });
}

// Helper to get active price data for a material (considering selected variants)
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
        // Fallback to first variant if select not found
        return {
            name: `${matData.name} (${matData.variants[0].name})`,
            price: matData.variants[0].price
        };
    }
    return { name: matData.name, price: matData.price };
}

// Update DOM elements representing prices
function updateUIWithPrices() {
    // 1. Update prices displayed on material cards dynamically
    document.querySelectorAll('.material-card').forEach(card => {
        const matKey = card.dataset.material;
        const activeData = getActiveMaterialData(matKey);
        
        if (activeData) {
            const priceEl = card.querySelector('.material-price');
            if (priceEl) {
                priceEl.textContent = `от ${activeData.price} ₽/м³`;
            }
        }
    });

    // 2. Update delivery rate label in breakdown list
    const rateEl = document.getElementById('delivery-rate-label');
    if (rateEl) {
        rateEl.textContent = `Доставка (${deliveryRate} ₽/км):`;
    }
}

// Set up UI Event Handlers
function setupEventHandlers() {
    // Material cards selection
    const cards = document.querySelectorAll('.material-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            cards.forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            currentMaterial = card.dataset.material;
            recalculate();
        });
    });

    // Variant Select Dropdowns
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
        // Prevent click on dropdown from double-triggering card click if needed
        sel.addEventListener('click', (e) => e.stopPropagation());
    });

    // Volume Slider
    const slider = document.getElementById('volume-slider');
    const display = document.getElementById('volume-display');
    
    slider.addEventListener('input', (e) => {
        currentVolume = parseInt(e.target.value);
        display.textContent = `${currentVolume} м³`;
        recalculate();
    });

    // Calculate/Search button
    const btnCalc = document.getElementById('btn-calculate');
    const input = document.getElementById('address-input');
    
    btnCalc.addEventListener('click', () => {
        const address = input.value.trim();
        if (address.length > 2) {
            showLoading(true);
            fetchSuggestions(address);
        }
    });

    // Keyboard Enter key inside address input
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const address = input.value.trim();
            if (address.length > 2) {
                showLoading(true);
                fetchSuggestions(address);
            }
        }
    });

    // Reset search button state when user edits address input
    input.addEventListener('input', () => {
        setSearchButtonState(false);
    });

    // Close suggestions dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.address-group')) {
            hideSuggestions();
        }
    });

    // Call button click to send order notification
    const telLink = document.getElementById('btn-order-call');
    if (telLink) {
        telLink.addEventListener('click', () => {
            sendOrderNotification();
        });
    }
}

// Fetch geocoding suggestions from Nominatim API
function fetchSuggestions(query) {
    let searchQuery = query;
    // Prepend Krasnoyarsk only if the user hasn't typed it to keep results local
    if (!query.toLowerCase().includes('красноярск')) {
        searchQuery = 'Красноярск, ' + query;
    }
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`;
    
    fetch(url, {
        headers: {
            'Accept-Language': 'ru',
            'User-Agent': 'scheben-delivery-calculator'
        }
    })
    .then(res => {
        if (!res.ok) throw new Error('Nominatim network response was not ok');
        return res.json();
    })
    .then(data => {
        showLoading(false);
        if (!data || data.length === 0) {
            alert('Указанный адрес не найден. Пожалуйста, уточните запрос.');
            hideSuggestions();
            return;
        }
        // Filter suggestions to within 200km of Krasnoyarsk
        const items = data
            .map(item => {
                const lat = parseFloat(item.lat);
                const lon = parseFloat(item.lon);
                const dist = getHaversineDistance(startCoords[0], startCoords[1], lat, lon);
                return {
                    displayName: formatNominatimAddress(item),
                    value: formatNominatimAddress(item),
                    coords: [lat, lon],
                    dist: dist
                };
            })
            .filter(item => item.dist <= 200);

        if (items.length === 0) {
            alert('Найденные адреса находятся слишком далеко. Доставка осуществляется в пределах 200 км от Красноярска.');
            hideSuggestions();
            return;
        }

        renderSuggestions(items);
    })
    .catch(err => {
        showLoading(false);
        console.error('Nominatim suggest error:', err);
        alert('Не удалось распознать адрес. Пожалуйста, проверьте интернет-соединение или уточните запрос.');
    });
}

// Formats the Nominatim response address details into a clean, short display string
function formatNominatimAddress(item) {
    if (!item.address) return item.display_name;
    const addr = item.address;
    const parts = [];
    
    // 1. Street, square, path etc.
    const street = addr.road || addr.pedestrian || addr.footway || addr.square || addr.highway || addr.path;
    if (street) {
        if (addr.house_number) {
            parts.push(`${street}, ${addr.house_number}`);
        } else {
            parts.push(street);
        }
    } else if (addr.amenity || addr.shop || addr.tourism || addr.office) {
        const poi = addr.amenity || addr.shop || addr.tourism || addr.office;
        parts.push(poi);
    }
    
    // 2. Suburb / Settlement / District
    if (addr.suburb) {
        parts.push(addr.suburb);
    } else if (addr.neighbourhood) {
        parts.push(addr.neighbourhood);
    } else if (addr.quarter) {
        parts.push(addr.quarter);
    } else if (addr.city_district) {
        parts.push(addr.city_district);
    }
    
    // 3. City / Town / Village / Hamlet
    const cityOrTown = addr.city || addr.town || addr.village || addr.hamlet;
    if (cityOrTown && cityOrTown !== 'Красноярск') {
        parts.push(cityOrTown);
    }
    
    if (parts.length > 0) {
        return parts.join(', ');
    }
    
    // Fallback: clean display_name slightly
    let name = item.display_name;
    name = name.replace('Россия, Красноярский край, ', '')
               .replace('Россия, ', '')
               .replace(', городской округ Красноярск', '');
    return name;
}

// Render Suggestions in Dropdown
function renderSuggestions(items) {
    const list = document.getElementById('suggestions');
    list.innerHTML = '';
    
    if (items.length === 0) {
        hideSuggestions();
        return;
    }

    items.forEach(item => {
        let name = item.displayName;
        const li = document.createElement('li');
        li.className = 'suggestion-item';
        li.textContent = name;
        li.addEventListener('click', () => {
            document.getElementById('address-input').value = name;
            hideSuggestions();
            showLoading(true);
            renderRouteAndCalculate(item.coords, name);
            setSearchButtonState(true);
        });
        list.appendChild(li);
    });

    list.style.display = 'block';
}

function hideSuggestions() {
    document.getElementById('suggestions').style.display = 'none';
}

// Render route and calculate distance using OSRM with straight-line fallback
function renderRouteAndCalculate(destCoords, displayName) {
    destinationAddress = displayName;
    document.getElementById('address-input').value = displayName;

    // Clean up previous route and destination marker
    if (currentRoute) {
        myMap.removeLayer(currentRoute);
        currentRoute = null;
    }
    if (destMarker) {
        myMap.removeLayer(destMarker);
        destMarker = null;
    }

    // Try road routing using OSRM (OSRM coordinates format is [lon, lat])
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;

    fetch(url)
    .then(res => {
        if (!res.ok) throw new Error('OSRM routing request failed');
        return res.json();
    })
    .then(data => {
        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            throw new Error('OSRM route not found');
        }

        const route = data.routes[0];
        // OSRM returns distance in meters, convert to km
        currentDistance = Math.round(route.distance / 1000 * 10) / 10;

        // Extract coordinates from geometry and convert [lon, lat] to [lat, lon]
        const coordinates = route.geometry.coordinates;
        const latLngs = coordinates.map(coord => [coord[1], coord[0]]);

        // Draw road route polyline (amber color)
        currentRoute = L.polyline(latLngs, {
            color: '#d97706',
            weight: 5,
            opacity: 0.85
        }).addTo(myMap);

        // Add destination marker
        destMarker = L.marker(destCoords, { icon: destIcon }).addTo(myMap)
            .bindPopup(`<b>Адрес доставки:</b><br>${displayName}`);

        // Zoom map to show both warehouse and destination
        const group = new L.featureGroup([startMarker, destMarker, currentRoute]);
        myMap.fitBounds(group.getBounds().pad(0.1));

        showLoading(false);
        recalculate();
    })
    .catch(err => {
        console.warn('Road routing failed. Falling back to straight-line estimation:', err);

        // Fallback: straight line distance with a road coefficient of 1.35
        const straightLineDist = getHaversineDistance(startCoords[0], startCoords[1], destCoords[0], destCoords[1]);
        currentDistance = Math.round(straightLineDist * 1.35 * 10) / 10;

        // Draw straight dashed line
        currentRoute = L.polyline([startCoords, destCoords], {
            color: '#ef4444',
            weight: 3,
            dashArray: '5, 10',
            opacity: 0.75
        }).addTo(myMap);

        // Add destination marker
        destMarker = L.marker(destCoords, { icon: destIcon }).addTo(myMap)
            .bindPopup(`<b>Адрес доставки (прямая линия):</b><br>${displayName}`);

        // Zoom map to show both markers
        const group = new L.featureGroup([startMarker, destMarker]);
        myMap.fitBounds(group.getBounds().pad(0.1));

        showLoading(false);
        recalculate();
    });
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

// Update Search button appearance when address is selected vs editing
function setSearchButtonState(isFound) {
    const wrapper = document.querySelector('.address-input-wrapper');
    const btnText = document.getElementById('btn-text');
    const btnCalc = document.getElementById('btn-calculate');
    if (!wrapper || !btnText || !btnCalc) return;

    if (isFound) {
        wrapper.classList.add('address-selected');
        btnText.innerHTML = '✓ Выбрано';
        btnCalc.disabled = true;
    } else {
        wrapper.classList.remove('address-selected');
        btnText.innerHTML = 'Найти';
        btnCalc.disabled = false;
    }
}

// Calculate cost breakdowns and update UI
function recalculate() {
    const activeData = getActiveMaterialData(currentMaterial);
    if (!activeData) return;
    
    // Calculate costs
    const materialCost = activeData.price * currentVolume;
    const deliveryCost = currentDistance * deliveryRate;
    const totalCost = materialCost + deliveryCost;

    // Formatting numbers with spaces
    const formatRub = (num) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(num);

    // Update UI elements
    document.getElementById('summary-mat-name').textContent = activeData.name;
    document.getElementById('summary-volume').textContent = currentVolume;
    document.getElementById('distance-val').textContent = `${currentDistance} км`;
    document.getElementById('material-cost-val').textContent = formatRub(materialCost);
    document.getElementById('delivery-cost-val').textContent = formatRub(deliveryCost);
    document.getElementById('total-cost-val').textContent = formatRub(totalCost);

    // Update phone button tel link with selected details
    const telLink = document.getElementById('btn-order-call');
    const msg = `Здравствуйте! Хочу заказать ${activeData.name} в объеме ${currentVolume} м³ с доставкой в ${destinationAddress ? destinationAddress : '(укажите адрес)'}. Посчитало примерно ${formatRub(totalCost)}.`;
    telLink.dataset.msg = msg;
}

// Mathematical calculation for straight-line distance (in km)
function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Send POST request to notify admin of a new order click
function sendOrderNotification() {
    const activeData = getActiveMaterialData(currentMaterial);
    if (!activeData) return;

    const materialCost = activeData.price * currentVolume;
    const deliveryCost = currentDistance * deliveryRate;
    const totalCost = materialCost + deliveryCost;

    const orderData = {
        material: activeData.name,
        volume: currentVolume,
        distance: currentDistance,
        totalCost: totalCost
    };

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
        console.log('[App] Order notification request sent successfully:', data);
    })
    .catch(err => {
        console.error('[App] Failed to send order notification:', err);
    });
}
