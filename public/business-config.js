// =============================================================================
// КрасПесок.рф — Единый источник данных бизнеса
// business-config.js v1.0
// Все цены, параметры автомобилей и настройки хранятся здесь.
// Администратор изменяет через /admin.html → сохраняется в localStorage.
// Никаких цифр нельзя зашивать в index_full.html или app.js!
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // КОНФИГУРАЦИЯ ПО УМОЛЧАНИЮ
  // Изменяется только администратором через adminhtml.
  // ---------------------------------------------------------------------------
  const DEFAULT_CONFIG = {

    // ── Настройки бизнеса ────────────────────────────────────────────────────
    settings: {
      BASE_NAME: 'КрасПесок.рф',
      BASE_ADDRESS: 'Красноярск, правый берег',
      BASE_LAT: 56.015283,   // шир. базы (правый берег Красноярска)
      BASE_LNG: 92.893248,   // долг. базы

      // Топливо
      DIESEL_PRICE: 87,      // ₽/л — менять при изменении цен на заправке

      // Параметры собственного автомобиля Shacman F3000 20т
      // (используются для расчёта себестоимости рейса, Вариант А)
      VEHICLE_FUEL_LOADED:   37,    // л/100 км (гружёный)
      VEHICLE_FUEL_EMPTY:    27,    // л/100 км (порожний)
      MAINTENANCE_COST_KM:    5.0,  // ₽/км  ТО + ремонт
      TIRE_COST_KM:           2.5,  // ₽/км  шины (10 шт., 22 000 ₽, ресурс 88 000 км)
      DEPRECIATION_KM:       11.25, // ₽/км  амортизация (4 500 000 ₽ / 10 лет / 40 000 км)
      OTHER_COSTS_KM:         1.0,  // ₽/км  масло, фильтры, прочее
      DRIVER_SALARY_PER_TRIP: 1200, // ₽/рейс — зарплата водителя за 1 рейс

      // Цена доставки клиенту
      MIN_DELIVERY_PRICE:  3000,  // ₽ — минимальная цена рейса для клиента
      PROFIT_COEFFICIENT:  1.45,  // коэффициент маржи на доставку (45% сверх себестоимости)

      // Простой
      FREE_WAIT_MINUTES:      60,   // мин — бесплатное ожидание
      WAIT_PRICE_PER_HOUR:  1000,   // ₽/час — сверх бесплатного времени

      // Финансы
      TAX_RATE:          0.06,  // УСН 6% от доходов
      ACQUIRING_RATE:    0.02,  // 2% эквайринг при оплате картой
      MIN_ORDER_PROFIT:   800,  // ₽ — мин. прибыль с заказа, ниже — отказываем
      MIN_MARGIN_PERCENT:  15,  // % — мин. допустимая маржа

      // Тарифная модель: 'full_cost' | 'zones' | 'per_km'
      // full_cost — расчёт через себестоимость (рекомендуется)
      // zones     — фиксированные цены по зонам
      // per_km    — минимум + доплата за километр
      TARIFF_MODEL: 'full_cost',

      // Параметры тарифной модели per_km (если выбрана)
      BASE_DELIVERY_PRICE_PER_KM: 3000, // ₽ — базовая цена (включает первые X км)
      BASE_KM_INCLUDED:             20, // км — сколько км входит в базу
      EXTRA_KM_PRICE:               55, // ₽/км — каждый лишний км
    },

    // ── Товары ───────────────────────────────────────────────────────────────
    // salePrice    — розничная цена (видна клиентам)
    // purchasePrice — закупочная цена (только в adminhtml)
    // density      — насыпная плотность т/м³ (1 м³ = density т)
    // step         — шаг выбора объёма (м³)
    // minOrder     — null = автоматический расчёт по экономике
    // minProfit    — ₽ мин. прибыль для этого товара (переопределяет глобальный)
    products: {

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
        salePrice: 850,       // ₽/м³ — РЕАЛЬНАЯ цена (подтверждена)
        purchasePrice: 570,   // ₽/м³ — закупочная (уточнить у поставщика!)
        density: 1.5,
        unit: 'm3',
        step: 1,
        minOrder: null,
        minProfit: 800,
        active: true,
        deliveryAvailable: true,
        origin: 'Карьер Песчанка / Есауловский',
        useCase: 'Для бетона, стяжки пола, кладки и штукатурки',
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
        salePrice: 700,
        purchasePrice: 470,
        density: 1.45,
        unit: 'm3',
        step: 1,
        minOrder: null,
        minProfit: 800,
        active: true,
        deliveryAvailable: true,
        origin: 'Карьер Дорожник / Зыково',
        useCase: 'Для подушек под брусчатку, засыпки траншей и кабелей',
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
        salePrice: 750,
        purchasePrice: 500,
        density: 1.4,
        unit: 'm3',
        step: 1,
        minOrder: null,
        minProfit: 800,
        active: true,
        deliveryAvailable: true,
        origin: 'Карьер Дорожник / Кузнецовское плато',
        useCase: 'Идеален для фундамента дома, монолитных плит и товарного бетона',
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
        salePrice: 750,
        purchasePrice: 500,
        density: 1.38,
        unit: 'm3',
        step: 1,
        minOrder: null,
        minProfit: 800,
        active: true,
        deliveryAvailable: true,
        origin: 'Карьер Дорожник / Зыково',
        useCase: 'Для подушек фундаментов, отсыпки дорог, въездов и парковок',
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
        salePrice: 700,
        purchasePrice: 470,
        density: 1.35,
        unit: 'm3',
        step: 1,
        minOrder: 6,       // фиксированный минимум 6 м³
        minProfit: 800,
        active: true,
        deliveryAvailable: true,
        origin: 'Карьер Дорожник',
        useCase: 'Для тяжелых дорожных оснований, габионов и глубокого дренажа',
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
        salePrice: 750,
        purchasePrice: 500,
        density: 1.6,
        unit: 'm3',
        step: 1,
        minOrder: null,
        minProfit: 800,
        active: true,
        deliveryAvailable: true,
        origin: 'Карьер Дорожник / Песчанка',
        useCase: 'Для дорог, отсыпки стоянок, заездов на участок и расклинцовки',
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
        salePrice: 550,
        purchasePrice: 370,
        density: 1.45,
        unit: 'm3',
        step: 1,
        minOrder: null,
        minProfit: 800,
        active: true,
        deliveryAvailable: true,
        origin: 'Енисейский бассейн / Песчанка',
        useCase: 'Для дренажных систем, фильтрации септиков и бетонирования',
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
        salePrice: 1000,
        purchasePrice: 670,
        density: 1.1,
        unit: 'm3',
        step: 1,
        minOrder: null,
        minProfit: 800,
        active: true,
        deliveryAvailable: true,
        origin: 'Емельяновский / Березовский район',
        useCase: 'Для газонов, теплиц, посадок и благоустройства участков',
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
        salePrice: 1600,
        purchasePrice: 1070,
        density: 0.4,
        unit: 'm3',
        step: 0.5,
        minOrder: null,
        minProfit: 1200,   // керамзит дороже — минимальная прибыль выше
        active: true,
        deliveryAvailable: true,
        origin: 'Заводской керамзит',
        useCase: 'Для утепления полов, межэтажных перекрытий и дренажа',
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
        salePrice: 450,      // скорректировано по рынку (бывшая 800 ₽ была неверной)
        purchasePrice: 150,
        density: 1.3,
        unit: 'm3',
        step: 1,
        minOrder: 6,
        minProfit: 800,
        active: true,
        deliveryAvailable: true,
        origin: 'Сортировочная база Красноярск',
        useCase: 'Для засыпки ям, болотных грунтов и временных дорог',
      },
    },

    // ── Автомобили ────────────────────────────────────────────────────────────
    vehicles: {
      shacman_20t: {
        id: 'shacman_20t',
        name: 'Shacman F3000 — 20 тонн (основной)',
        shortName: 'Shacman 20 т',
        capacity: 20,         // т грузоподъёмность
        bodyVolume: 14,       // м³ объём кузова
        fuelLoaded: 37,       // л/100 км гружёный
        fuelEmpty: 27,        // л/100 км порожний
        clearanceWidth: '2.55 м',
        clearanceHeight: '3.2 м',
        active: true,
        isDefault: true,
        bestFor: 'Основной рабочий самосвал. Крупные заказы, промышленные объекты, дороги',
      },
      // При необходимости добавьте другие автомобили через adminhtml
    },

    // ── Зоны доставки (используются при TARIFF_MODEL = 'zones') ─────────────
    // При TARIFF_MODEL = 'full_cost' — только для справки и сравнения
    zones: [
      { id: 'zone1', name: 'Зона 1 — Красноярск (в черте города)', minKm:  0, maxKm: 15, price: 3000 },
      { id: 'zone2', name: 'Зона 2 — Ближний пригород (15-30 км)', minKm: 15, maxKm: 30, price: 4500 },
      { id: 'zone3', name: 'Зона 3 — Дальний пригород (30-50 км)', minKm: 30, maxKm: 50, price: 6200 },
      { id: 'zone4', name: 'Зона 4 — За городом (50-80 км)',        minKm: 50, maxKm: 80, price: 9000 },
      { id: 'zone5', name: 'Дальняя зона (80+ км)',                  minKm: 80, maxKm: 999, price: null }, // индивидуально
    ],

    // ── Карта районов → расстояние (для экспресс-калькулятора без геокодинга) ─
    districtMap: {
      sovetskiy:        { name: 'Советский район',         km: 8 },
      oktyabrskiy:      { name: 'Октябрьский район',       km: 10 },
      sverdlovskiy:     { name: 'Свердловский район',      km: 8 },
      zheleznodorozhniy:{ name: 'Железнодорожный район',   km: 9 },
      kirovskiy:        { name: 'Кировский район',         km: 11 },
      leninskiy:        { name: 'Ленинский район',         km: 7 },
      tsentralniy:      { name: 'Центральный район',       km: 10 },
      solontsy:         { name: 'п. Солонцы',              km: 14 },
      drokino:          { name: 'п. Дрокино',              km: 18 },
      berezovka:        { name: 'п. Берёзовка',            km: 20 },
      emelyanovo:       { name: 'п. Емельяново',           km: 24 },
      minino:           { name: 'п. Минино',               km: 22 },
      kuznetsovo:       { name: 'п. Кузнецово / Лукино',  km: 17 },
      zykovo:           { name: 'п. Зыково',               km: 19 },
      divnogorsk:       { name: 'г. Дивногорск',           km: 35 },
      sosnovoborsk:     { name: 'г. Сосновоборск',        km: 30 },
      kedroviy:         { name: 'п. Кедровый',             km: 42 },
      sukhobuzimskoe:   { name: 'Сухобузимский район',    km: 55 },
    },
  };

  // ---------------------------------------------------------------------------
  // PUBLIC API
  // ---------------------------------------------------------------------------
  const STORAGE_KEY = 'kraspecok_admin_config';

  const KPCONFIG = {
    /**
     * Возвращает активную конфигурацию:
     * если администратор сохранял изменения — из localStorage,
     * иначе — DEFAULT_CONFIG.
     */
    getConfig() {
      try {
        if (typeof localStorage !== 'undefined') {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            // Глубокое слияние: если в дефолтах появились новые поля — они тоже попадут
            return deepMerge(DEFAULT_CONFIG, parsed);
          }
        }
      } catch (e) {
        console.warn('[KPCONFIG] Не удалось прочитать конфиг из localStorage:', e);
      }
      return deepClone(DEFAULT_CONFIG);
    },

    /** Сохраняет конфигурацию в localStorage */
    saveConfig(config) {
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
          return true;
        }
        return false;
      } catch (e) {
        console.error('[KPCONFIG] Ошибка сохранения конфига:', e);
        return false;
      }
    },

    /** Сбрасывает к заводским настройкам */
    reset() {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      return deepClone(DEFAULT_CONFIG);
    },

    /** Возвращает конфиг в виде JSON-строки для экспорта */
    exportJSON() {
      return JSON.stringify(this.getConfig(), null, 2);
    },

    /** Импортирует конфиг из JSON-строки, сохраняет */
    importJSON(jsonStr) {
      try {
        const parsed = JSON.parse(jsonStr);
        this.saveConfig(parsed);
        return { ok: true };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    },

    /** Вспомогательная: данные товаров в формате, совместимом со старым app.js */
    getMaterialsForUI() {
      const cfg = this.getConfig();
      const result = {};
      Object.values(cfg.products).forEach(p => {
        if (!p.active) return;
        result[p.id] = {
          id: p.id,
          name: p.name,
          category: p.category,
          tags: p.tags || [],
          img: p.img,
          webp: p.webp,
          webp2x: p.webp2x,
          badge: p.badge,
          spec: p.spec,
          priceM3: p.salePrice,           // совместимость со старым кодом
          density: p.density,
          minOrder: p.minOrder ? `от ${p.minOrder} м³` : 'от 3 м³',
          minOrderNum: p.minOrder || null, // числовое значение для движка
          origin: p.origin,
          useCase: p.useCase,
          step: p.step || 1,
        };
      });
      return result;
    },

    /** Вспомогательная: получить основной (isDefault) автомобиль */
    getDefaultVehicle() {
      const cfg = this.getConfig();
      const vehicles = Object.values(cfg.vehicles).filter(v => v.active);
      return vehicles.find(v => v.isDefault) || vehicles[0] || null;
    },

    /** Вспомогательная: данные зон для совместимости со старым app.js */
    getZonesForUI() {
      const cfg = this.getConfig();
      const result = {};
      cfg.zones.forEach(z => {
        result[z.id] = { name: z.name, zone: z.id, price: z.price, minKm: z.minKm, maxKm: z.maxKm };
      });
      // Добавляем карту районов как зоны
      Object.entries(cfg.districtMap).forEach(([key, d]) => {
        result[key] = { name: d.name, zone: 'district', km: d.km };
      });
      return result;
    },

    DEFAULT_CONFIG, // доступен для чтения (не для изменения)
  };

  // ---------------------------------------------------------------------------
  // Вспомогательные функции
  // ---------------------------------------------------------------------------
  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function deepMerge(base, override) {
    const result = deepClone(base);
    if (!override || typeof override !== 'object') return result;
    Object.keys(override).forEach(key => {
      if (
        override[key] !== null &&
        typeof override[key] === 'object' &&
        !Array.isArray(override[key]) &&
        result[key] !== null &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = deepMerge(result[key], override[key]);
      } else {
        result[key] = deepClone(override[key]);
      }
    });
    return result;
  }

  // Экспортируем в глобальное пространство
  window.KPCONFIG = KPCONFIG;

})();
