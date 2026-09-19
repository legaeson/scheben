// ==========================================================================
// КрасПесок.рф — Интеллектуальный логистический сервис нерудных материалов
// Версия 15.0 (2026) — Экономический движок + прямые поставки с карьеров
// ==========================================================================
// ВСЕ ЦЕНЫ БЕРУТСЯ ИЗ business-config.js → KPCONFIG
// Изменять цены только через /admin.html
// ==========================================================================

// Загружаем конфиг — берём из KPCONFIG или падаем на defaults
const _kpcfg = (typeof KPCONFIG !== 'undefined') ? KPCONFIG.getConfig()        : null;
const _kpmat = _kpcfg                             ? KPCONFIG.getMaterialsForUI() : null;
const _kpveh = _kpcfg                             ? KPCONFIG.getDefaultVehicle() : null;

// ─── materialsData ─────────────────────────────────────────────────────────────
const materialsData = _kpmat || {
    sand_washed: {
        id: 'sand_washed',
        name: 'Песок строительный мытый (0-5 мм)',
        category: 'sand_pgs',
        tags: ['concrete', 'foundation', 'leveling'],
        img: 'images/sand.jpg',
        webp: 'images/sand.webp',
        webp2x: 'images/sand@2x.webp',
        badge: 'ГОСТ 8736-2014',
        spec: 'Мытый, модуль 2.0-2.5 мм, без глины',
        priceM3: 850,
        density: 1.5, // 1 м³ = 1.5 тонны
        minOrder: 'от 3 м³',
        origin: 'Карьер Песчанка / Есауловский',
        useCase: 'Для бетона, стяжки пола, кладки и штукатурки'
    },
    sand_sifted: {
        id: 'sand_sifted',
        name: 'Песок карьерный сеяный (отсев 0-3 мм)',
        category: 'sand_pgs',
        tags: ['leveling', 'garden', 'road'],
        img: 'images/sand.jpg',
        webp: 'images/sand.webp',
        webp2x: 'images/sand@2x.webp',
        badge: 'ГОСТ 8736-2014',
        spec: 'Сеяный отсев, модуль 1.5-2.0 мм',
        priceM3: 700,
        density: 1.45,
        minOrder: 'от 3 м³',
        origin: 'Карьер Дорожник / Зыково',
        useCase: 'Для подушек под брусчатку, засыпки траншей и кабелей'
    },
    crushed_stone_5_20: {
        id: 'crushed_stone_5_20',
        name: 'Щебень диоритовый фр. 5-20 мм',
        category: 'crushed',
        tags: ['concrete', 'foundation'],
        img: 'images/crushed_stone.jpg',
        webp: 'images/crushed_stone.webp',
        webp2x: 'images/crushed_stone@2x.webp',
        badge: 'ГОСТ 8267-93 (М1200)',
        spec: 'Высокопрочный диорит, лещадность до 12%',
        priceM3: 750,
        density: 1.4, // 1 м³ = 1.4 тонны
        minOrder: 'от 3 м³',
        origin: 'Карьер Дорожник / Кузнецовское плато',
        useCase: 'Идеален для фундамента дома, монолитных плит и товарного бетона'
    },
    crushed_stone_20_40: {
        id: 'crushed_stone_20_40',
        name: 'Щебень скальный фр. 20-40 мм',
        category: 'crushed',
        tags: ['road', 'foundation', 'drainage'],
        img: 'images/crushed_stone.jpg',
        webp: 'images/crushed_stone.webp',
        webp2x: 'images/crushed_stone@2x.webp',
        badge: 'ГОСТ 8267-93 (М1200)',
        spec: 'Фракция 20-40 мм, морозостойкость F300',
        priceM3: 750,
        density: 1.38,
        minOrder: 'от 3 м³',
        origin: 'Карьер Дорожник / Зыково',
        useCase: 'Для подушек фундаментов, отсыпки дорог, въездов и парковок'
    },
    crushed_stone_40_70: {
        id: 'crushed_stone_40_70',
        name: 'Щебень крупный фр. 40-70 мм',
        category: 'crushed',
        tags: ['road', 'drainage'],
        img: 'images/crushed_stone.jpg',
        webp: 'images/crushed_stone.webp',
        webp2x: 'images/crushed_stone@2x.webp',
        badge: 'ГОСТ 8267-93 (М1200)',
        spec: 'Крупный скальный камень для оснований',
        priceM3: 700,
        density: 1.35,
        minOrder: 'от 6 м³',
        origin: 'Карьер Дорожник',
        useCase: 'Для тяжелых дорожных оснований, габионов и глубокого дренажа'
    },
    pshs: {
        id: 'pshs',
        name: 'ПЩС (Песчано-щебёночная смесь 0-20 / 0-40)',
        category: 'sand_pgs',
        tags: ['road', 'leveling', 'foundation'],
        img: 'images/pgs.jpg',
        webp: 'images/pgs.webp',
        webp2x: 'images/pgs@2x.webp',
        badge: 'ГОСТ 25607-2009',
        spec: 'Оптимальный состав с уплотнением до 98%',
        priceM3: 750,
        density: 1.6,
        minOrder: 'от 3 м³',
        origin: 'Карьер Дорожник / Песчанка',
        useCase: 'Для дорог, отсыпки стоянок, заездов на участок и расклинцовки'
    },
    gps_gravel: {
        id: 'gps_gravel',
        name: 'Гравий речной мытый фр. 5-20 мм и ГПС',
        category: 'gravel',
        tags: ['drainage', 'concrete', 'road'],
        img: 'images/gravel.jpg',
        webp: 'images/gravel.webp',
        webp2x: 'images/gravel@2x.webp',
        badge: 'ГОСТ 23735-2014',
        spec: 'Промытый округлый галечник 5-20 мм',
        priceM3: 550,
        density: 1.45,
        minOrder: 'от 3 м³',
        origin: 'Енисейский бассейн / Песчанка',
        useCase: 'Для дренажных систем, фильтрации септиков и бетонирования'
    },
    chernozem: {
        id: 'chernozem',
        name: 'Чернозём плодородный сеяный (Полевой)',
        category: 'secondary',
        tags: ['garden'],
        img: 'images/chernozem.jpg',
        webp: 'images/chernozem.webp',
        webp2x: 'images/chernozem@2x.webp',
        badge: 'ГОСТ Р 53380-2009',
        spec: 'Верховой сеяный грунт, гумус 7-9%',
        priceM3: 1000,
        density: 1.1,
        minOrder: 'от 3 м³',
        origin: 'Емельяновский / Березовский район',
        useCase: 'Для газонов, теплиц, посадок и благоустройства участков'
    },
    expanded_clay: {
        id: 'expanded_clay',
        name: 'Керамзит теплоизоляционный (10-20 мм)',
        category: 'secondary',
        tags: ['foundation', 'drainage'],
        img: 'images/expanded_clay.jpg',
        webp: 'images/expanded_clay.webp',
        webp2x: 'images/expanded_clay@2x.webp',
        badge: 'ГОСТ 32496-2013',
        spec: 'Фракция 10-20 мм, насыпная масса М400',
        priceM3: 1600,
        density: 0.4,
        minOrder: 'от 3 м³',
        origin: 'Заводской керамзит',
        useCase: 'Для утепления полов, межэтажных перекрытий и дренажа'
    },
    crushed_brick: {
        id: 'crushed_brick',
        name: 'Бой кирпича и бетона вторичный',
        category: 'secondary',
        tags: ['road', 'leveling'],
        img: 'images/crushed_brick.jpg',
        webp: 'images/crushed_brick.webp',
        webp2x: 'images/crushed_brick@2x.webp',
        badge: 'Вторичный рециклинг',
        spec: 'Дробленый кирпич/бетон фр. 20-70 мм',
        priceM3: 450,
        density: 1.3,
        minOrder: 'от 6 м³',
        origin: 'Сортировочная база Красноярск',
        useCase: 'Для засыпки ям, болотных грунтов и временных дорог'
    }
};

// ─── Функция расчёта цены доставки по расстоянию ────────────────────────────
function calcDeliveryFromKm(distanceKm, numTrips) {
    if (typeof KPEngine !== 'undefined' && typeof KPCONFIG !== 'undefined') {
        const cfg = KPCONFIG.getConfig();
        const veh = KPCONFIG.getDefaultVehicle();
        if (cfg && veh) {
            return KPEngine.calcDeliveryPrice(cfg.settings, veh, distanceKm, numTrips || 1, null);
        }
    }
    // Fallback: Shacman 20т без движка
    const MIN_DELIVERY = 3000;
    const COEFF = 1.45;
    const KM_COST = 48;   // ₽/км
    const DRIVER  = 1200; // ₽/рейс
    const tripCost = distanceKm * 2 * KM_COST + DRIVER;
    return Math.round(Math.max(MIN_DELIVERY, tripCost * COEFF)) * (numTrips || 1);
}

// ─── Карта районов ──────────────────────────────────────────────────────────
const _districtMap = (_kpcfg && _kpcfg.districtMap) ? _kpcfg.districtMap : {
    sovetskiy:         { name: 'Советский район (Красноярск)',    km: 8  },
    oktyabrskiy:       { name: 'Октябрьский район (Красноярск)', km: 10 },
    sverdlovskiy:      { name: 'Свердловский район',             km: 8  },
    zheleznodorozhniy: { name: 'Железнодорожный район',          km: 9  },
    kirovskiy:         { name: 'Кировский район',                km: 11 },
    leninskiy:         { name: 'Ленинский район',                km: 7  },
    tsentralniy:       { name: 'Центральный район',              km: 10 },
    solontsy:          { name: 'п. Солонцы',                     km: 14 },
    drokino:           { name: 'п. Дрокино',                     km: 18 },
    berezovka:         { name: 'п. Берёзовка',                   km: 20 },
    emelyanovo:        { name: 'п. Емельяново',                  km: 24 },
    minino:            { name: 'п. Минино',                      km: 22 },
    kuznetsovo:        { name: 'п. Кузнецово / Лукино',          km: 17 },
    zykovo:            { name: 'п. Зыково',                      km: 19 },
    divnogorsk:        { name: 'г. Дивногорск',                  km: 35 },
    sosnovoborsk:      { name: 'г. Сосновоборск',                km: 30 },
    kedroviy:          { name: 'п. Кедровый',                    km: 42 },
    sukhobuzimskoe:    { name: 'Сухобузимский район',            km: 55 },
    other_suburb:      { name: 'Другой посёлок / СНТ',           km: 30 },
};

// ─── deliveryZones — динамические цены на основе реальной себестоимости ──────
const deliveryZones = {};
Object.entries(_districtMap).forEach(([key, d]) => {
    deliveryZones[key] = {
        name:  d.name,
        zone:  'dynamic',
        price: calcDeliveryFromKm(d.km, 1),
        km:    d.km,
        eta:   d.km <= 15 ? '1.5-2 ч' : d.km <= 30 ? '2-3 ч' : d.km <= 50 ? '3-4 ч' : '4-6 ч',
    };
});

// ─── fleetData — автопарк для отображения и подбора ──────────────────────────
const fleetData = {
    mini: {
        id: 'mini',
        name: 'Мини-самосвал (Японец / ГАЗель)',
        capacityTons: 4,
        capacityM3: 4,
        clearanceWidth: '2.1 м',
        clearanceHeight: '2.4 м',
        bestFor: 'Узкие улицы СНТ, дачные участки, заезд под низкие навесы и газовые трубы'
    },
    kamaz: {
        id: 'kamaz',
        name: 'Самосвал КамАЗ 65115 (10-14 т)',
        capacityTons: 12,
        capacityM3: 8,
        clearanceWidth: '2.6 м',
        clearanceHeight: '2.9 м',
        bestFor: 'Оптимальный выбор для коттеджей, заливки фундамента, засыпки дорожек'
    },
    heavy: {
        id: 'heavy',
        name: _kpveh ? _kpveh.name : 'Тяжёлый самосвал 20 тонн (Shacman)',
        capacityTons: _kpveh ? _kpveh.capacity   : 20,
        capacityM3:   _kpveh ? _kpveh.bodyVolume : 14,
        clearanceWidth: '2.8 м',
        clearanceHeight: '3.2 м',
        bestFor: 'Основной рабочий самосвал. Крупные заказы, промышленные объекты, дороги'
    }
};

// ==========================================================================
// Инициализация приложения
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderMaterialCards('all', 'all');
    setupCategoryTabs();
    setupTaskChips();
    setupHeroExpressCalc();
    setupMainCalculator();
    setupFleetInteractions();
    setupDeliveryZonesSelector();
    setupOrderModal();
    setupQuickOrderSectionForm();
    setupFaqAccordion();
    setupScrollSpyAndBackToTop();
    setupPhoneMasks();
    setupMobileStickyCtaBehavior();
    setupMobileNav();
}

// Форматирование валюты
function formatRub(val) {
    return `${Math.round(val).toLocaleString('ru-RU')} ₽`;
}

// ==========================================================================
// 1. Каталог товаров с двойной ценой (м³ и тонна)
// ==========================================================================
let currentCategory = 'all';
let currentTask = 'all';

function renderMaterialCards(catFilter = 'all', taskFilter = 'all') {
    const grid = document.getElementById('material-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let cardIndex = 0;
    const items = Object.values(materialsData);

    const filtered = items.filter(mat => {
        const matchesCat = (catFilter === 'all' || mat.category === catFilter);
        const matchesTask = (taskFilter === 'all' || mat.tags.includes(taskFilter));
        return matchesCat && matchesTask;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-catalog-msg" style="grid-column: 1/-1; text-align: center; padding: 3rem; background: #fff; border-radius: 14px; border: 1px dashed var(--slate-300);">
                <p style="font-size: 1.1rem; color: var(--slate-600); margin-bottom: 1rem;">По выбранным фильтрам материалы не найдены.</p>
                <button type="button" class="btn-primary" onclick="resetFilters()">Показать все материалы каталога</button>
            </div>
        `;
        return;
    }

    filtered.forEach(mat => {
        const isAboveTheFold = cardIndex < 2;
        cardIndex++;

        const pricePerTon = Math.round(mat.priceM3 / mat.density);
        const tripEstimate = mat.priceM3 * 7 + 2500; // 7 м³ в КамАЗ + 2500 доставка по городу

        const card = document.createElement('div');
        card.className = 'material-card modern-card';

        const priorityAttrs = isAboveTheFold ? 'fetchpriority="high"' : 'loading="lazy"';

        card.innerHTML = `
            <div class="material-img-wrapper">
                <picture>
                    <source type="image/webp" srcset="${mat.webp} 1x, ${mat.webp2x} 2x">
                    <img src="${mat.img}" 
                         alt="${mat.name}" 
                         class="material-img" 
                         width="360" 
                         height="225" 
                         ${priorityAttrs} 
                         decoding="async"
                         onload="this.classList.add('loaded')"
                         onerror="this.classList.add('loaded')">
                </picture>
                <div class="card-top-badges">
                    <span class="material-badge badge-gost">${mat.badge}</span>
                </div>
            </div>
            <div class="material-content">
                <div class="material-header-row">
                    <h3 class="material-name">${mat.name}</h3>
                </div>
                
                <div class="price-box">
                    <div class="price-primary">
                        <span class="price-val">${formatRub(mat.priceM3)}</span>
                        <span class="price-unit">/ м³</span>
                    </div>
                    <div class="price-secondary">
                        ≈ ${formatRub(pricePerTon)} / тонна
                    </div>
                </div>

                <div class="material-usecase">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span>${mat.useCase}</span>
                </div>

                <div class="material-specs-grid">
                    <div class="spec-item">
                        <span class="spec-label">Плотность:</span>
                        <span class="spec-value">${mat.density} т/м³</span>
                    </div>
                    <div class="spec-item">
                        <span class="spec-label">Заказ:</span>
                        <span class="spec-value">${mat.minOrder}</span>
                    </div>
                </div>

                <div class="trip-preview-banner">
                    Рейс самосвала 10 т (7 м³) с доставкой — <strong>от ${formatRub(tripEstimate)}</strong>
                </div>

                <div class="card-actions-grid">
                    <button type="button" class="btn-card-calc" data-mat-id="${mat.id}" aria-label="Рассчитать доставку ${mat.name}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="18"/></svg>
                        <span>В расчёт</span>
                    </button>
                    <button type="button" class="btn-card-order" data-mat-id="${mat.id}" data-mat-name="${mat.name}" aria-label="Быстрый заказ ${mat.name}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                        <span>Заказать рейс</span>
                    </button>
                </div>
            </div>
        `;

        // Card button handlers
        const calcBtn = card.querySelector('.btn-card-calc');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => {
                transferToCalculator(mat.id);
            });
        }

        const orderBtn = card.querySelector('.btn-card-order');
        if (orderBtn) {
            orderBtn.addEventListener('click', () => {
                openOrderModal({
                    materialId: mat.id,
                    materialName: mat.name,
                    volume: 7,
                    district: 'sovetskiy'
                });
            });
        }

        grid.appendChild(card);
    });

    // Добавляем сервисный баннер аренды в конец каталога
    appendCustomRentalBanner(grid);
}

function resetFilters() {
    currentCategory = 'all';
    currentTask = 'all';
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.category === 'all');
        b.setAttribute('aria-selected', b.dataset.category === 'all' ? 'true' : 'false');
    });
    document.querySelectorAll('.task-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.task === 'all');
        c.setAttribute('aria-selected', c.dataset.task === 'all' ? 'true' : 'false');
    });
    renderMaterialCards('all', 'all');
}

function appendCustomRentalBanner(grid) {
    const banner = document.createElement('div');
    banner.className = 'rental-cta-card';
    banner.innerHTML = `
        <div class="rental-cta-content">
            <div class="rental-badge">🚚 Индивидуальные рейсы и аренда техники</div>
            <h3 class="rental-title">Нужен другой материал, аренда самосвала на смену или вывоз грунта?</h3>
            <p class="rental-desc">Предоставляем самосвалы 4т, 10т и 20м³ с опытными водителями по Красноярску и пригороду. Погрузка на любых сертифицированных карьерах.</p>
            <div class="rental-actions">
                <button type="button" class="btn-primary" onclick="openOrderModal({ materialName: 'Аренда самосвала / Индивидуальный рейс' })">
                    Заказать консультацию диспетчера
                </button>
                <a href="tel:+79950758414" class="btn-secondary">
                    Позвонить: +7 (995) 075-84-14
                </a>
            </div>
        </div>
    `;
    grid.appendChild(banner);
}

// Category Tabs
function setupCategoryTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            currentCategory = tab.dataset.category;
            renderMaterialCards(currentCategory, currentTask);
        });
    });
}

// Task Chips
function setupTaskChips() {
    const chips = document.querySelectorAll('.task-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => {
                c.classList.remove('active');
                c.setAttribute('aria-selected', 'false');
            });
            chip.classList.add('active');
            chip.setAttribute('aria-selected', 'true');
            currentTask = chip.dataset.task;
            renderMaterialCards(currentCategory, currentTask);
        });
    });
}

function transferToCalculator(matId) {
    const calcSection = document.getElementById('calc-section');
    const heroMaterialSelect = document.getElementById('hero-calc-material');
    const mainMaterialSelect = document.getElementById('main-calc-material');

    if (heroMaterialSelect) heroMaterialSelect.value = matId;
    if (mainMaterialSelect) mainMaterialSelect.value = matId;

    recalcHeroWidget();
    recalcMainCalculator();

    if (calcSection) {
        calcSection.scrollIntoView({ behavior: 'smooth' });
    }
}

// ==========================================================================
// 2. Экспресс-калькулятор в Hero-блоке
// ==========================================================================
function setupHeroExpressCalc() {
    const matSelect = document.getElementById('hero-calc-material');
    const zoneSelect = document.getElementById('hero-calc-zone');
    const customVolInput = document.getElementById('hero-custom-vol');
    const chips = document.querySelectorAll('.hero-vol-chip');
    const submitBtn = document.getElementById('hero-calc-submit');
    const altLink = document.querySelector('.link-switch-to-dimensions');

    if (!matSelect || !zoneSelect) return;

    // Заполнение материалов
    matSelect.innerHTML = '';
    Object.values(materialsData).forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.text = `${m.name} — от ${m.priceM3} ₽/м³`;
        matSelect.appendChild(opt);
    });

    // Заполнение районов
    zoneSelect.innerHTML = '';
    Object.entries(deliveryZones).forEach(([key, z]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.text = `${z.name} (от ${formatRub(z.price)})`;
        zoneSelect.appendChild(opt);
    });

    // Выбор чипов объема
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const vol = parseFloat(chip.dataset.vol);
            if (customVolInput) customVolInput.value = vol;
            recalcHeroWidget();
        });
    });

    if (customVolInput) {
        customVolInput.addEventListener('input', () => {
            chips.forEach(c => c.classList.remove('active'));
            recalcHeroWidget();
        });
    }

    matSelect.addEventListener('change', () => {
        const mainMat = document.getElementById('main-calc-material');
        if (mainMat) mainMat.value = matSelect.value;
        recalcHeroWidget();
        recalcMainCalculator();
    });

    zoneSelect.addEventListener('change', () => {
        const mainZone = document.getElementById('main-calc-zone');
        if (mainZone) mainZone.value = zoneSelect.value;
        recalcHeroWidget();
        recalcMainCalculator();
    });

    if (altLink) {
        altLink.addEventListener('click', (e) => {
            e.preventDefault();
            const mainMat = document.getElementById('main-calc-material');
            const mainZone = document.getElementById('main-calc-zone');
            if (mainMat) mainMat.value = matSelect.value;
            if (mainZone) mainZone.value = zoneSelect.value;
            const dimModeBtn = document.querySelector('.calc-mode-btn[data-mode="dimensions"]');
            if (dimModeBtn) dimModeBtn.click();
            const calcSec = document.getElementById('calc-section');
            if (calcSec) calcSec.scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            const mat = materialsData[matSelect.value] || materialsData.sand_washed;
            const zone = deliveryZones[zoneSelect.value] || deliveryZones.sovetskiy;
            const vol = parseFloat(customVolInput ? customVolInput.value : 7) || 7;
            const matCost = mat.priceM3 * vol;
            const deliveryCost = zone.price;
            const total = matCost + deliveryCost;

            openOrderModal({
                materialId: mat.id,
                materialName: mat.name,
                volume: vol,
                districtKey: zoneSelect.value,
                districtName: zone.name,
                totalPrice: total
            });
        });
    }

    recalcHeroWidget();
}

function recalcHeroWidget() {
    const matSelect = document.getElementById('hero-calc-material');
    const zoneSelect = document.getElementById('hero-calc-zone');
    const customVolInput = document.getElementById('hero-custom-vol');
    const totalDisplay = document.getElementById('hero-calc-total');
    const breakdownDisplay = document.getElementById('hero-calc-breakdown');

    if (!matSelect || !zoneSelect || !totalDisplay) return;

    const mat = materialsData[matSelect.value] || materialsData.sand_washed;
    const zone = deliveryZones[zoneSelect.value] || deliveryZones.sovetskiy;
    const vol = parseFloat(customVolInput ? customVolInput.value : 7) || 7;

    const matCost = mat.priceM3 * vol;
    const deliveryCost = zone.price;
    const total = matCost + deliveryCost;
    const totalTons = (vol * mat.density).toFixed(1);

    totalDisplay.innerText = formatRub(total);
    if (breakdownDisplay) {
        breakdownDisplay.innerText = `Материал: ${formatRub(matCost)} (${vol} м³ / ≈${totalTons} т) + Доставка: ${formatRub(deliveryCost)}`;
    }
}

// ==========================================================================
// 3. Главный инженерный калькулятор (объем по габаритам или прямой ввод)
// ==========================================================================
function setupMainCalculator() {
    const matSelect = document.getElementById('main-calc-material');
    const zoneSelect = document.getElementById('main-calc-zone');
    const modeTabs = document.querySelectorAll('.calc-mode-btn');
    const directInputsBox = document.getElementById('calc-direct-inputs');
    const dimensionsInputsBox = document.getElementById('calc-dimensions-inputs');

    if (!matSelect || !zoneSelect) return;

    // Заполнение селекторов
    matSelect.innerHTML = '';
    Object.values(materialsData).forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.text = `${m.name} (${m.priceM3} ₽/м³) — ${m.density} т/м³`;
        matSelect.appendChild(opt);
    });

    zoneSelect.innerHTML = '';
    Object.entries(deliveryZones).forEach(([key, z]) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.text = `${z.name} (тариф рейса: ${formatRub(z.price)})`;
        zoneSelect.appendChild(opt);
    });

    // Переключение режимов
    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modeTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            const mode = tab.dataset.mode;
            if (mode === 'dimensions') {
                if (directInputsBox) directInputsBox.style.display = 'none';
                if (dimensionsInputsBox) dimensionsInputsBox.style.display = 'block';
            } else {
                if (directInputsBox) directInputsBox.style.display = 'block';
                if (dimensionsInputsBox) dimensionsInputsBox.style.display = 'none';
            }
            recalcMainCalculator();
        });
    });

    // Синхронизация обратно в hero
    matSelect.addEventListener('change', () => {
        const heroMat = document.getElementById('hero-calc-material');
        if (heroMat) heroMat.value = matSelect.value;
        recalcHeroWidget();
        recalcMainCalculator();
    });

    zoneSelect.addEventListener('change', () => {
        const heroZone = document.getElementById('hero-calc-zone');
        if (heroZone) heroZone.value = zoneSelect.value;
        recalcHeroWidget();
        recalcMainCalculator();
    });

    // Слушатели инпутов
    const calcInputs = document.querySelectorAll('.calc-field-input');
    calcInputs.forEach(input => {
        input.addEventListener('input', recalcMainCalculator);
        input.addEventListener('change', recalcMainCalculator);
    });

    // Пресеты объема в главном калькуляторе
    const mainVolChips = document.querySelectorAll('.main-vol-chip');
    mainVolChips.forEach(chip => {
        chip.addEventListener('click', () => {
            mainVolChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            const directVolInput = document.getElementById('main-calc-vol');
            if (directVolInput) directVolInput.value = chip.dataset.vol;
            recalcMainCalculator();
        });
    });

    // Кнопка отправки расчета
    const mainOrderBtn = document.getElementById('main-calc-order-btn');
    if (mainOrderBtn) {
        mainOrderBtn.addEventListener('click', () => {
            const state = calculateCurrentState();
            openOrderModal({
                materialId: state.mat.id,
                materialName: state.mat.name,
                volume: state.finalVolume,
                districtKey: state.zoneKey,
                districtName: state.zone.name,
                totalPrice: state.totalPrice,
                truckName: state.recommendedTruck.name,
                weightTons: state.totalTons
            });
        });
    }

    // Кнопка отправки в WhatsApp
    const mainWaBtn = document.getElementById('main-calc-whatsapp-btn');
    if (mainWaBtn) {
        mainWaBtn.addEventListener('click', () => {
            const state = calculateCurrentState();
            const text = encodeURIComponent(
                `Здравствуйте! Хочу заказать доставку на КрасПесок.рф:\n` +
                `• Материал: ${state.mat.name}\n` +
                `• Объём с запасом: ${state.finalVolume} м³ (≈ ${state.totalTons} т)\n` +
                `• Район доставки: ${state.zone.name}\n` +
                `• Рекомендуемая машина: ${state.recommendedTruck.name}\n` +
                `• Расчётная цена: ${formatRub(state.totalPrice)} с доставкой.\n` +
                `Подскажите, когда ближайший свободный рейс?`
            );
            window.open(`https://wa.me/79950758414?text=${text}`, '_blank');
        });
    }

    recalcMainCalculator();
}

function calculateCurrentState() {
    const matSelect = document.getElementById('main-calc-material');
    const zoneSelect = document.getElementById('main-calc-zone');
    const activeModeTab = document.querySelector('.calc-mode-btn.active');
    const mode = activeModeTab ? activeModeTab.dataset.mode : 'dimensions';

    const mat = materialsData[matSelect ? matSelect.value : 'sand_washed'] || materialsData.sand_washed;
    const zoneKey = zoneSelect ? zoneSelect.value : 'sovetskiy';
    const zone = deliveryZones[zoneKey] || deliveryZones.sovetskiy;

    let volumeM3 = 7;
    let compactionFactor = 1.15;

    if (mode === 'dimensions') {
        const length = parseFloat(document.getElementById('dim-length')?.value) || 10;
        const width = parseFloat(document.getElementById('dim-width')?.value) || 4;
        const depthCm = parseFloat(document.getElementById('dim-depth')?.value) || 15;
        const depthM = depthCm / 100;

        // Коэффициент уплотнения при трамбовке (СНиП)
        compactionFactor = (mat.category === 'crushed' || mat.category === 'gravel') ? 1.15 : (mat.category === 'sand_pgs' ? 1.20 : 1.15);
        const rawVolume = length * width * depthM;
        volumeM3 = parseFloat((rawVolume * compactionFactor).toFixed(1));
    } else {
        volumeM3 = parseFloat(document.getElementById('main-calc-vol')?.value) || 7;
    }

    if (volumeM3 < 1) volumeM3 = 1;

    const totalTons = parseFloat((volumeM3 * mat.density).toFixed(1));
    const distKm = zone.km || 10;

    // Подбор подходящей машины с учётом объёма и габаритов
    let recommendedTruck = fleetData.kamaz;
    let numTrips = 1;

    if (volumeM3 <= 4 && totalTons <= 4.5) {
        recommendedTruck = fleetData.mini;
        numTrips = 1;
    } else if (volumeM3 <= 10 && totalTons <= 14) {
        recommendedTruck = fleetData.kamaz;
        numTrips = 1;
    } else {
        recommendedTruck = fleetData.heavy;
        const maxPerTrip = Math.min(14, 20 / mat.density);
        numTrips = Math.ceil(volumeM3 / maxPerTrip);
    }

    const materialCost = Math.round(volumeM3 * mat.priceM3);
    const deliveryCost = calcDeliveryFromKm(distKm, numTrips);
    const totalPrice = materialCost + deliveryCost;

    return {
        mat,
        zone,
        zoneKey,
        finalVolume: volumeM3,
        totalTons,
        compactionFactor,
        recommendedTruck,
        numTrips,
        materialCost,
        deliveryCost,
        totalPrice
    };
}

function recalcMainCalculator() {
    const state = calculateCurrentState();

    const volResultEl = document.getElementById('calc-res-vol');
    const tonsResultEl = document.getElementById('calc-res-tons');
    const truckResultEl = document.getElementById('calc-res-truck');
    const matCostEl = document.getElementById('calc-res-mat-cost');
    const delCostEl = document.getElementById('calc-res-del-cost');
    const totalCostEl = document.getElementById('calc-res-total-cost');
    const truckNoteEl = document.getElementById('calc-res-truck-note');

    if (volResultEl) volResultEl.innerText = `${state.finalVolume} м³`;
    if (tonsResultEl) tonsResultEl.innerText = `≈ ${state.totalTons} т`;
    if (truckResultEl) {
        truckResultEl.innerText = state.numTrips > 1 
            ? `${state.recommendedTruck.name} (${state.numTrips} рейса)`
            : state.recommendedTruck.name;
    }
    if (matCostEl) matCostEl.innerText = formatRub(state.materialCost);
    if (delCostEl) delCostEl.innerText = formatRub(state.deliveryCost);
    if (totalCostEl) totalCostEl.innerText = formatRub(state.totalPrice);

    if (truckNoteEl) {
        truckNoteEl.innerText = `Габариты въезда: ширина от ${state.recommendedTruck.clearanceWidth}, высота ${state.recommendedTruck.clearanceHeight}`;
    }
}

// ==========================================================================
// 4. Блок автопарка (Выбор машины переносит в калькулятор)
// ==========================================================================
function setupFleetInteractions() {
    const fleetButtons = document.querySelectorAll('.btn-select-fleet');
    fleetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const truckType = btn.dataset.truck;
            const calcSection = document.getElementById('calc-section');
            const directModeBtn = document.querySelector('.calc-mode-btn[data-mode="direct"]');

            if (directModeBtn) directModeBtn.click();

            const volInput = document.getElementById('main-calc-vol');
            if (volInput) {
                if (truckType === 'mini') volInput.value = 4;
                else if (truckType === 'kamaz') volInput.value = 8;
                else if (truckType === 'heavy') volInput.value = 20;
            }

            recalcMainCalculator();

            if (calcSection) {
                calcSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ==========================================================================
// 5. Интерактивные зоны доставки
// ==========================================================================
function setupDeliveryZonesSelector() {
    const zonePills = document.querySelectorAll('.zone-pill-interactive');
    zonePills.forEach(pill => {
        pill.addEventListener('click', () => {
            zonePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            const zoneKey = pill.dataset.zoneKey;
            const zoneInfo = deliveryZones[zoneKey];
            if (!zoneInfo) return;

            const nameEl = document.getElementById('zone-preview-name');
            const priceEl = document.getElementById('zone-preview-price');
            const etaEl = document.getElementById('zone-preview-eta');
            const zoneTagEl = document.getElementById('zone-preview-tag');

            if (nameEl) nameEl.innerText = zoneInfo.name;
            if (priceEl) priceEl.innerText = `от ${formatRub(zoneInfo.price)} за рейс`;
            if (etaEl) etaEl.innerText = `Подача машины: ${zoneInfo.eta}`;
            if (zoneTagEl) zoneTagEl.innerText = zoneInfo.km <= 15 ? 'Городской тариф' : 'Пригородный тариф';

            // Синхронизация с калькулятором
            const mainZoneSelect = document.getElementById('main-calc-zone');
            if (mainZoneSelect) {
                mainZoneSelect.value = zoneKey;
                recalcMainCalculator();
            }

            const heroZoneSelect = document.getElementById('hero-calc-zone');
            if (heroZoneSelect) {
                heroZoneSelect.value = zoneKey;
                recalcHeroWidget();
            }
        });
    });
}

// ==========================================================================
// 6. Модальное окно быстрого заказа (1 клик)
// ==========================================================================
function setupOrderModal() {
    const modal = document.getElementById('order-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const form = document.getElementById('modal-order-form');

    if (!modal) return;

    const closeModal = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleOrderSubmit(form, 'modal');
        });
    }
}

function openOrderModal(data = {}) {
    const modal = document.getElementById('order-modal');
    if (!modal) return;

    const titleEl = document.getElementById('modal-material-name');
    const detailsEl = document.getElementById('modal-order-details');
    const hiddenMatInput = document.getElementById('modal-hidden-material');
    const hiddenDetailsInput = document.getElementById('modal-hidden-details');
    const phoneInput = document.getElementById('modal-phone');

    const matName = data.materialName || 'Сыпучие строительные материалы';
    const volume = data.volume ? `${data.volume} м³` : 'объем уточняется';
    const district = data.districtName || 'Красноярск / пригород';
    const priceText = data.totalPrice ? ` • Расчетная стоимость: ${formatRub(data.totalPrice)}` : '';
    const truckText = data.truckName ? ` • ${data.truckName}` : '';

    if (titleEl) titleEl.innerText = matName;
    if (detailsEl) detailsEl.innerText = `Параметры: ${volume} • ${district}${priceText}${truckText}`;
    if (hiddenMatInput) hiddenMatInput.value = matName;
    if (hiddenDetailsInput) hiddenDetailsInput.value = `Объем: ${volume}, Район: ${district}, Цена: ${data.totalPrice || 'расчет диспетчером'}`;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (phoneInput) {
        setTimeout(() => phoneInput.focus(), 300);
    }
}

// ==========================================================================
// 7. Форма заказа внизу страницы (Quick Order Section)
// ==========================================================================
function setupQuickOrderSectionForm() {
    const form = document.getElementById('quick-order-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleOrderSubmit(form, 'section');
    });
}

// Универсальный обработчик отправки лидов
async function handleOrderSubmit(formEl, formType) {
    const phoneInput = formEl.querySelector('input[type="tel"]');
    const materialInput = formEl.querySelector('input[name="material"]') || formEl.querySelector('#order-material');
    const detailsInput = formEl.querySelector('input[name="details"]');
    const channelSelect = formEl.querySelector('select[name="channel"]');
    const submitBtn = formEl.querySelector('button[type="submit"]');

    const phoneDigits = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
    if (!phoneInput || !phoneInput.value.trim() || phoneDigits.length < 11) {
        if (phoneInput) {
            phoneInput.classList.remove('input-error');
            void phoneInput.offsetWidth;
            phoneInput.classList.add('input-error');
            phoneInput.focus();
        }
        showToast('Пожалуйста, укажите полный номер телефона (11 цифр)', 'error');
        return;
    }

    const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Отправить';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Отправка заявки...';
    }

    const payload = {
        phone: phoneInput.value.trim(),
        material: materialInput ? materialInput.value : 'Запрос звонка диспетчера',
        details: detailsInput ? detailsInput.value : '',
        preferredChannel: channelSelect ? channelSelect.value : 'phone',
        source: `website_${formType}`
    };

    let isSuccess = false;
    let responseMessage = '';
    const endpoints = ['order.php', '/api/order', '/api/order.php'];

    for (const endpoint of endpoints) {
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                if (data && data.success) {
                    isSuccess = true;
                    responseMessage = data.message || 'Спасибо! Заявка передана диспетчеру. Мы перезвоним в течение 3 минут.';
                    break;
                } else if (data && data.message) {
                    responseMessage = data.message;
                }
            }
        } catch (endpointErr) {
            console.warn(`[Submit] Эндпоинт ${endpoint} недоступен, пробуем запасной...`, endpointErr);
        }
    }

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }

    if (isSuccess) {
        showToast(responseMessage, 'success');
        formEl.reset();
        const modal = document.getElementById('order-modal');
        if (modal && modal.classList.contains('active')) {
            setTimeout(() => {
                modal.classList.remove('active');
                document.body.style.overflow = '';
            }, 1200);
        }
    } else {
        showToast(responseMessage || 'Ошибка соединения с сервером. Пожалуйста, позвоните диспетчеру напрямую: +7 (995) 075-84-14', 'error');
    }
}

// ==========================================================================
// 8. Маска телефона для всех полей ввода
// ==========================================================================
function setupPhoneMasks() {
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    phoneInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            if (val.length === 0) {
                e.target.value = '';
                return;
            }
            if (val.startsWith('7') || val.startsWith('8')) {
                val = val.substring(1);
            }
            let formatted = '+7 ';
            if (val.length > 0) formatted += '(' + val.substring(0, 3);
            if (val.length >= 3) formatted += ') ' + val.substring(3, 6);
            if (val.length >= 6) formatted += '-' + val.substring(6, 8);
            if (val.length >= 8) formatted += '-' + val.substring(8, 10);
            e.target.value = formatted;
            input.classList.remove('input-error');
        });
    });
}

// ==========================================================================
// 9. FAQ Аккордеон
// ==========================================================================
function setupFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (!question) return;

        question.addEventListener('click', (e) => {
            e.preventDefault();
            const isActive = item.classList.contains('active');
            faqItems.forEach(i => {
                i.classList.remove('active');
                const btn = i.querySelector('.faq-question');
                if (btn) btn.setAttribute('aria-expanded', 'false');
            });
            if (!isActive) {
                item.classList.add('active');
                question.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

// ==========================================================================
// 10. Плавающий мобильный Sticky Bar и ScrollSpy (с requestAnimationFrame)
// ==========================================================================
function setupMobileStickyCtaBehavior() {
    const stickyCta = document.querySelector('.mobile-sticky-cta');
    const orderSection = document.getElementById('quick-order-section');
    if (!stickyCta) return;

    let isTicking = false;

    const updateVisibility = () => {
        if (window.innerWidth > 768) return;

        const activeEl = document.activeElement;
        const isInputFocused = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA');

        let inFormSection = false;
        if (orderSection) {
            const rect = orderSection.getBoundingClientRect();
            inFormSection = rect.top <= window.innerHeight * 0.75 && rect.bottom >= 50;
        }

        if (isInputFocused || inFormSection) {
            stickyCta.style.opacity = '0';
            stickyCta.style.pointerEvents = 'none';
            stickyCta.style.transform = 'translateY(100%)';
        } else {
            stickyCta.style.opacity = '1';
            stickyCta.style.pointerEvents = 'auto';
            stickyCta.style.transform = 'translateY(0)';
        }
        isTicking = false;
    };

    window.addEventListener('scroll', () => {
        if (!isTicking) {
            window.requestAnimationFrame(updateVisibility);
            isTicking = true;
        }
    }, { passive: true });

    window.addEventListener('resize', updateVisibility);
    document.addEventListener('focusin', updateVisibility);
    document.addEventListener('focusout', () => setTimeout(updateVisibility, 100));
    updateVisibility();
}

function setupScrollSpyAndBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    const sections = document.querySelectorAll('section[id], main[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    let isTicking = false;

    const handleScroll = () => {
        if (backToTopBtn) {
            backToTopBtn.classList.toggle('active', window.scrollY > 400);
        }

        let currentSectionId = '';
        sections.forEach(sec => {
            const secTop = sec.offsetTop - 140;
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
        isTicking = false;
    };

    window.addEventListener('scroll', () => {
        if (!isTicking) {
            window.requestAnimationFrame(handleScroll);
            isTicking = true;
        }
    }, { passive: true });

    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

// Мобильное меню (Drawer)
function setupMobileNav() {
    const toggleBtn = document.getElementById('mobile-toggle');
    const drawer = document.getElementById('mobile-nav-drawer');

    if (!toggleBtn || !drawer) return;

    toggleBtn.addEventListener('click', () => {
        const isActive = drawer.classList.contains('active');
        drawer.classList.toggle('active');
        toggleBtn.setAttribute('aria-expanded', !isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
        link.addEventListener('click', () => {
            drawer.classList.remove('active');
            toggleBtn.setAttribute('aria-expanded', 'false');
        });
    });

    document.addEventListener('click', (e) => {
        if (drawer.classList.contains('active') && !drawer.contains(e.target) && !toggleBtn.contains(e.target)) {
            drawer.classList.remove('active');
            toggleBtn.setAttribute('aria-expanded', 'false');
        }
    });
}

// Уведомления (Toast)
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            ${type === 'success' ? '✔' : type === 'error' ? '✖' : 'ℹ'}
        </div>
        <div class="toast-msg">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}
