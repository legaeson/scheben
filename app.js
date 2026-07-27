// ==========================================================================
// КрасПесок.рф — Калькулятор материалов и доставки
// ==========================================================================

const materialsData = {
    crushed_brick: {
        id: 'crushed_brick',
        name: 'Битый кирпич',
        category: 'secondary',
        img: 'images/crushed_brick.jpg',
        badge: '🔥 АКЦИЯ! 20т от 16 000 ₽ с доставкой',
        price: 800
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
    selectedMaterialId: 'crushed_brick',
    selectedVariantId: null,
    volume: 20,
    deliveryZone: 'city' // 'city' (13000 ₽) or 'suburb' (15000 ₽)
};

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderMaterialCards('all');
    setupCategoryTabs();
    setupVolumeControls();
    setupDeliveryZoneControls();
    setupFAQAccordion();
    setupMobileNav();
    setupScrollSpyAndBackToTop();
    recalculateTotalCost();
}

// Utility: Currency formatter (always includes 'от' for approximate benchmark prices)
function formatCurrency(val) {
    return `от ${Math.round(val).toLocaleString('ru-RU')} ₽`;
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

// Delivery Zone Controls
function setupDeliveryZoneControls() {
    const zoneBtns = document.querySelectorAll('.zone-card-btn');
    zoneBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            zoneBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            appState.deliveryZone = btn.dataset.zone || 'city';
            recalculateTotalCost();
        });
    });
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

    const isBrick = appState.selectedMaterialId === 'crushed_brick';
    const isSuburb = appState.deliveryZone === 'suburb';

    const truckCount = Math.ceil(appState.volume / 20);
    let materialTotalCost = 0;
    let deliveryTotalCost = 0;
    let grandTotal = 0;

    if (isBrick) {
        // Brick Promo Package: 20 tons (1 truck) = 16 000 ₽ (city) or 18 000 ₽ (suburb) including delivery!
        const packageRatePerTruck = isSuburb ? 18000 : 16000;
        grandTotal = truckCount * packageRatePerTruck;
        deliveryTotalCost = (isSuburb ? 15000 : 13000) * truckCount;
        materialTotalCost = Math.max(0, grandTotal - deliveryTotalCost);
    } else {
        materialTotalCost = unitPrice * appState.volume;
        const ratePerTrip = isSuburb ? 15000 : 13000;
        deliveryTotalCost = ratePerTrip * truckCount;
        grandTotal = materialTotalCost + deliveryTotalCost;
    }

    // Update UI elements
    const summaryZoneName = document.getElementById('summary-zone-name');
    const summaryMatName = document.getElementById('summary-mat-name');
    const summaryVolume = document.getElementById('summary-volume');
    const matCostVal = document.getElementById('material-cost-val');
    const deliveryRateLabel = document.getElementById('delivery-rate-label');
    const deliveryCostVal = document.getElementById('delivery-cost-val');
    const totalCostVal = document.getElementById('total-cost-val');

    if (summaryZoneName) {
        summaryZoneName.textContent = isSuburb ? 
            `За город (${formatCurrency(15000)} / рейс)` : 
            `По городу (${formatCurrency(13000)} / рейс)`;
    }

    if (summaryMatName) summaryMatName.textContent = isBrick ? `${selectedName} (Спецакция 🔥)` : selectedName;
    if (summaryVolume) summaryVolume.textContent = appState.volume;
    if (matCostVal) matCostVal.textContent = isBrick ? `${formatCurrency(materialTotalCost)} (акция)` : formatCurrency(materialTotalCost);

    if (deliveryRateLabel) {
        deliveryRateLabel.textContent = truckCount > 1 ? 
            `${truckCount} рейса самосвала` : 
            `1 рейс самосвала`;
    }

    if (deliveryCostVal) deliveryCostVal.textContent = formatCurrency(deliveryTotalCost);
    if (totalCostVal) totalCostVal.textContent = formatCurrency(grandTotal);
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
