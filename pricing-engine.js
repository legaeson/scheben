// =============================================================================
// КрасПесок.рф — Ценовой движок (бизнес-логика)
// pricing-engine.js v1.0
//
// Все формулы расчёта стоимости, прибыли, рентабельности и геокодинга.
// Этот файл НЕ касается DOM — только математика и API запросы.
// =============================================================================

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // КОНСТАНТЫ
  // ---------------------------------------------------------------------------
  const NOMINATIM_URL  = 'https://nominatim.openstreetmap.org/search';
  const OSRM_URL       = 'https://router.project-osrm.org/route/v1/driving';
  const NOMINATIM_UA   = 'KraspesokRF/1.0 (contact: info@kraspesok.rf)'; // pure ASCII for HTTP headers

  // Порог рентабельности:
  // 'profitable'   → маржа > MIN_MARGIN_PERCENT И прибыль > MIN_ORDER_PROFIT
  // 'borderline'   → маржа 0..MIN_MARGIN_PERCENT ИЛИ прибыль 0..MIN_ORDER_PROFIT
  // 'loss'         → маржа < 0 ИЛИ прибыль < 0
  const STATUS = {
    PROFITABLE: 'profitable',
    BORDERLINE: 'borderline',
    LOSS:       'loss',
  };

  // ---------------------------------------------------------------------------
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ---------------------------------------------------------------------------

  /** Округление в большую сторону до step (для минимального объёма) */
  function ceilToStep(value, step) {
    if (!step || step <= 0) return Math.ceil(value);
    return Math.ceil(value / step) * step;
  }

  /** Форматирование ₽ */
  function fmt(val) {
    return Math.round(val).toLocaleString('ru-RU') + ' ₽';
  }

  // ---------------------------------------------------------------------------
  // ОСНОВНОЙ ДВИЖОК
  // ---------------------------------------------------------------------------
  const KPEngine = {

    // ── 1. Стоимость 1 км (собственный автомобиль) ───────────────────────────
    /**
     * Вычисляет полную стоимость 1 км пробега (туда).
     * Топливо берётся как среднее гружёного и порожнего.
     *
     * @param {Object} s  - settings из config
     * @param {Object} v  - vehicle из config
     * @returns {number}  ₽/км
     */
    calcKmCost(s, v) {
      const fuelAvg = (v.fuelLoaded + v.fuelEmpty) / 2; // л/100 км среднее
      const fuelRub = (fuelAvg / 100) * s.DIESEL_PRICE;  // ₽/км на топливо
      return (
        fuelRub +
        s.MAINTENANCE_COST_KM +
        s.TIRE_COST_KM +
        s.DEPRECIATION_KM +
        s.OTHER_COSTS_KM
      );
    },

    // ── 2. Себестоимость 1 рейса ──────────────────────────────────────────────
    /**
     * Полная себестоимость 1 рейса.
     * distanceKm — расстояние в одну сторону (от базы до клиента).
     *
     * @returns {number} ₽
     */
    calcTripCost(s, v, distanceKm) {
      const roundTripKm = distanceKm * 2;
      const kmCost      = this.calcKmCost(s, v);
      return roundTripKm * kmCost + s.DRIVER_SALARY_PER_TRIP;
    },

    // ── 3. Максимальный объём на 1 машину ─────────────────────────────────────
    /**
     * Физически допустимый объём на 1 рейс.
     * Ограничен МЕНЬШИМ из: объёма кузова и грузоподъёмности / плотности.
     *
     * @param {Object} p  - product из config
     * @param {Object} v  - vehicle из config
     * @returns {{ maxVol, limitBy }} maxVol в м³, limitBy: 'weight'|'volume'
     */
    calcMaxVolumePerTrip(p, v) {
      const byWeight = v.capacity / p.density;           // м³ — лимит по массе
      const byVolume = v.bodyVolume;                     // м³ — лимит по кузову
      const maxVol   = Math.min(byWeight, byVolume);
      const limitBy  = byWeight <= byVolume ? 'weight' : 'volume';
      return { maxVol: parseFloat(maxVol.toFixed(2)), limitBy };
    },

    // ── 4. Количество рейсов ──────────────────────────────────────────────────
    /**
     * @param {number} volume   заказанный объём, м³
     * @param {Object} p        product
     * @param {Object} v        vehicle
     * @returns {{ trips, maxVol, limitBy }}
     */
    calcTrips(volume, p, v) {
      const { maxVol, limitBy } = this.calcMaxVolumePerTrip(p, v);
      const trips = Math.ceil(volume / maxVol);
      return { trips: Math.max(1, trips), maxVol, limitBy };
    },

    // ── 5. Цена доставки для клиента ──────────────────────────────────────────
    /**
     * Итоговая цена доставки (уже с маржой и за все рейсы).
     * Модель full_cost: MAX(минимум, себестоимость × коэффициент) × рейсы
     * Модель zones: цена зоны × рейсы
     * Модель per_km: базовая + (лишние км × цена_км) × рейсы
     *
     * @param {Object} s        settings
     * @param {Object} v        vehicle
     * @param {number} distKm   расстояние в 1 сторону
     * @param {number} trips    количество рейсов
     * @param {number|null} zonePriceOverride  если задана — используется зональная цена
     * @returns {number} ₽ — итоговая цена доставки для клиента
     */
    calcDeliveryPrice(s, v, distKm, trips, zonePriceOverride) {
      let pricePerTrip;

      if (s.TARIFF_MODEL === 'zones' && zonePriceOverride !== null && zonePriceOverride !== undefined) {
        pricePerTrip = zonePriceOverride;

      } else if (s.TARIFF_MODEL === 'per_km') {
        const extraKm  = Math.max(0, distKm - s.BASE_KM_INCLUDED);
        const baseP    = s.BASE_DELIVERY_PRICE_PER_KM;
        const tripCost = this.calcTripCost(s, v, distKm);
        // per_km: берём большее из: базовой цены+км OR себестоимости×коэфф.
        pricePerTrip = Math.max(
          baseP + extraKm * s.EXTRA_KM_PRICE,
          tripCost * s.PROFIT_COEFFICIENT
        );

      } else {
        // full_cost (рекомендуемая)
        const tripCost = this.calcTripCost(s, v, distKm);
        pricePerTrip   = Math.max(s.MIN_DELIVERY_PRICE, tripCost * s.PROFIT_COEFFICIENT);
      }

      return Math.round(pricePerTrip) * trips;
    },

    // ── 6. Полный расчёт заказа ───────────────────────────────────────────────
    /**
     * Главная функция. Считает всё: клиентские цены + внутренняя экономика.
     *
     * @param {Object} config          полный конфиг из KPCONFIG.getConfig()
     * @param {string|Object} product  id товара или объект product
     * @param {string|Object} vehicle  id автомобиля или объект vehicle (null = основной)
     * @param {number} volume          заказанный объём в м³
     * @param {number} distanceKm      расстояние до клиента в 1 сторону, км
     * @param {number|null} manualDeliveryOverride  ручная корректировка цены доставки
     * @param {number|null} zonePriceOverride       цена зоны (при зональной модели)
     *
     * @returns {Object} полный результат расчёта
     */
    calcOrder(config, product, vehicle, volume, distanceKm, manualDeliveryOverride, zonePriceOverride) {
      const s = config.settings;

      // Разрешаем product и vehicle
      const p = typeof product === 'string' ? config.products[product] : product;
      const v = typeof vehicle === 'string'
        ? config.vehicles[vehicle]
        : (vehicle || Object.values(config.vehicles).find(x => x.isDefault && x.active) || Object.values(config.vehicles)[0]);

      if (!p || !v) {
        return { error: 'Товар или автомобиль не найден' };
      }

      // ── Физика ─────────────────────────────────────────────────────────────
      const { trips, maxVol, limitBy } = this.calcTrips(volume, p, v);
      const weightTons = parseFloat((volume * p.density).toFixed(2));
      const weightPerTrip = parseFloat((Math.min(volume, maxVol) * p.density).toFixed(2));

      // ── Минимальный заказ ─────────────────────────────────────────────────
      const configMinOrder = p.minOrder; // null = автоматически
      const autoMinOrder   = this.calcMinVolume(config, p, v, distanceKm);
      const effectiveMin   = configMinOrder !== null
        ? Math.max(configMinOrder, p.step || 1)
        : ceilToStep(autoMinOrder, p.step || 1);

      // ── Себестоимость рейса ────────────────────────────────────────────────
      const tripCostOne  = this.calcTripCost(s, v, distanceKm);
      const tripCostAll  = tripCostOne * trips;

      // ── Цена доставки клиенту ─────────────────────────────────────────────
      const autoDeliveryPrice = this.calcDeliveryPrice(s, v, distanceKm, trips, zonePriceOverride);
      const deliveryPrice     = manualDeliveryOverride !== null && manualDeliveryOverride !== undefined
        ? Number(manualDeliveryOverride)
        : autoDeliveryPrice;

      // ── Выручка ────────────────────────────────────────────────────────────
      const materialRevenue = Math.round(volume * p.salePrice);
      const totalRevenue    = materialRevenue + deliveryPrice;

      // ── Затраты ────────────────────────────────────────────────────────────
      const purchaseCost    = Math.round(volume * p.purchasePrice);
      const taxAmount       = Math.round(totalRevenue * s.TAX_RATE);       // УСН 6% от выручки
      const acquiringAmount = Math.round(totalRevenue * s.ACQUIRING_RATE); // 2% эквайринг

      // ── Прибыль ────────────────────────────────────────────────────────────
      const grossProfit = totalRevenue - purchaseCost - tripCostAll - taxAmount - acquiringAmount;
      const margin      = totalRevenue > 0 ? (grossProfit / totalRevenue * 100) : 0;

      // ── Статус рентабельности ─────────────────────────────────────────────
      let status;
      if (grossProfit < 0 || margin < 0) {
        status = STATUS.LOSS;
      } else if (grossProfit < s.MIN_ORDER_PROFIT || margin < s.MIN_MARGIN_PERCENT) {
        status = STATUS.BORDERLINE;
      } else {
        status = STATUS.PROFITABLE;
      }

      // ── Превышение минимума ───────────────────────────────────────────────
      const belowMinOrder   = volume < effectiveMin;
      const belowMinProfit  = grossProfit < (p.minProfit || s.MIN_ORDER_PROFIT);

      // ── Ручная корректировка ───────────────────────────────────────────────
      let manualDiff = null;
      let manualProfit = null;
      if (manualDeliveryOverride !== null && manualDeliveryOverride !== undefined) {
        manualDiff   = deliveryPrice - autoDeliveryPrice;
        manualProfit = grossProfit; // уже рассчитано с manual override
      }

      return {
        // PUBLIC (видит клиент)
        materialCost:       materialRevenue,
        deliveryPrice:      deliveryPrice,
        totalPrice:         totalRevenue,
        trips:              trips,
        maxVolPerTrip:      maxVol,
        limitBy:            limitBy,         // 'weight' | 'volume'
        weightTons:         weightTons,
        weightPerTrip:      weightPerTrip,
        vehicle:            v,
        product:            p,

        // INTERNAL (только в adminhtml)
        purchaseCost:       purchaseCost,
        tripCostOne:        Math.round(tripCostOne),
        tripCostAll:        Math.round(tripCostAll),
        taxAmount:          taxAmount,
        acquiringAmount:    acquiringAmount,
        grossProfit:        Math.round(grossProfit),
        margin:             parseFloat(margin.toFixed(1)),
        status:             status,

        // Минимумы
        autoMinOrder:       parseFloat(autoMinOrder.toFixed(1)),
        effectiveMinOrder:  effectiveMin,
        belowMinOrder:      belowMinOrder,
        belowMinProfit:     belowMinProfit,

        // Автоматическая цена (до ручной корректировки)
        autoDeliveryPrice:  autoDeliveryPrice,
        manualDeliveryOverride: manualDeliveryOverride,
        manualDiff:         manualDiff,

        // Вспомогательно
        distanceKm:         distanceKm,
        volume:             volume,
        kmCostPerKm:        parseFloat(this.calcKmCost(s, v).toFixed(2)),
        roundTripKm:        distanceKm * 2,
      };
    },

    // ── 7. Автоматический минимальный объём ───────────────────────────────────
    /**
     * Вычисляет минимальный объём, при котором заказ прибыльный.
     * Итеративный перебор (1 → 50 м³ с шагом 0.5).
     *
     * @returns {number} м³
     */
    calcMinVolume(config, p, v, distanceKm) {
      const s    = config.settings;
      const minP = p.minProfit || s.MIN_ORDER_PROFIT;

      // Себестоимость 1 рейса (без объёма)
      const tripCostOne = this.calcTripCost(s, v, distanceKm);

      // Проверяем объёмы от 0.5 до 50 с шагом 0.5
      for (let vol = 0.5; vol <= 50; vol += 0.5) {
        const { trips } = this.calcTrips(vol, p, v);
        const tripCostAll    = tripCostOne * trips;
        const delivPrice     = this.calcDeliveryPrice(s, v, distanceKm, trips, null);
        const totalRev       = vol * p.salePrice + delivPrice;
        const purchase       = vol * p.purchasePrice;
        const tax            = totalRev * s.TAX_RATE;
        const acquiring      = totalRev * s.ACQUIRING_RATE;
        const profit         = totalRev - purchase - tripCostAll - tax - acquiring;
        const margin         = totalRev > 0 ? profit / totalRev * 100 : 0;

        if (profit >= minP && margin >= s.MIN_MARGIN_PERCENT) {
          return vol;
        }
      }
      return 50; // если при 50 м³ всё равно невыгодно — нужен ручной разбор
    },

    // ── 8. Геокодирование адреса через Nominatim (OSM) ────────────────────────
    /**
     * Преобразует текстовый адрес в координаты.
     * Автоматически добавляет "Красноярск" к запросу.
     *
     * @param {string} address   адрес, введённый пользователем
     * @returns {Promise<{lat, lng, display}>}  или null при ошибке
     */
    async geocodeAddress(address) {
      if (!address || address.trim().length < 3) return null;

      // Добавляем Красноярск к запросу, если его нет
      const query = address.toLowerCase().includes('красноярск')
        ? address.trim()
        : `${address.trim()}, Красноярск`;

      const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ru&accept-language=ru`;

      try {
        const resp = await fetch(url, {
          headers: { 'User-Agent': NOMINATIM_UA },
        });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data || data.length === 0) return null;
        return {
          lat:     parseFloat(data[0].lat),
          lng:     parseFloat(data[0].lon),
          display: data[0].display_name,
        };
      } catch (e) {
        console.warn('[KPEngine] Nominatim error:', e);
        return null;
      }
    },

    // ── 9. Расчёт расстояния по дорогам через OSRM ───────────────────────────
    /**
     * Расстояние по дорогам между двумя точками.
     *
     * @param {number} lat1  шир. начала (база)
     * @param {number} lng1  долг. начала
     * @param {number} lat2  шир. конца (клиент)
     * @param {number} lng2  долг. конца
     * @returns {Promise<{distanceKm, durationMin}>} или null
     */
    async getRouteDistance(lat1, lng1, lat2, lng2) {
      const url = `${OSRM_URL}/${lng1},${lat1};${lng2},${lat2}?overview=false&alternatives=false`;

      try {
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data.code !== 'Ok' || !data.routes || !data.routes[0]) return null;
        const route = data.routes[0];
        return {
          distanceKm:  parseFloat((route.distance / 1000).toFixed(1)),
          durationMin: Math.round(route.duration / 60),
        };
      } catch (e) {
        console.warn('[KPEngine] OSRM error:', e);
        return null;
      }
    },

    // ── 10. Полный расчёт по адресу (геокодинг + маршрут + цена) ─────────────
    /**
     * Высокоуровневая функция для калькулятора:
     * адрес → координаты → расстояние → полный расчёт.
     *
     * @param {Object} config  конфиг из KPCONFIG.getConfig()
     * @param {string} productId
     * @param {string|null} vehicleId  null = основной
     * @param {number} volume
     * @param {string} address  адрес клиента
     * @returns {Promise<{result, geocoded, routeInfo, error?}>}
     */
    async calcOrderByAddress(config, productId, vehicleId, volume, address) {
      const s = config.settings;

      // 1. Геокодируем адрес клиента
      const geocoded = await this.geocodeAddress(address);
      if (!geocoded) {
        return { error: 'Не удалось определить адрес. Уточните или введите другой.' };
      }

      // 2. Получаем маршрут по дорогам
      const routeInfo = await this.getRouteDistance(
        s.BASE_LAT, s.BASE_LNG,
        geocoded.lat, geocoded.lng
      );
      if (!routeInfo) {
        // Fallback: евклидово расстояние × 1.3 (поправка на дороги)
        const dLat = geocoded.lat - s.BASE_LAT;
        const dLng = geocoded.lng - s.BASE_LNG;
        const straightKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111.1;
        const distanceKm = parseFloat((straightKm * 1.3).toFixed(1));
        const result = this.calcOrder(config, productId, vehicleId, volume, distanceKm, null, null);
        return { result, geocoded, routeInfo: { distanceKm, durationMin: null, isFallback: true } };
      }

      // 3. Полный расчёт
      const result = this.calcOrder(config, productId, vehicleId, volume, routeInfo.distanceKm, null, null);
      return { result, geocoded, routeInfo };
    },

    // ── 11. Вспомогательные форматтеры ───────────────────────────────────────
    formatRub: fmt,

    formatStatus(status) {
      switch (status) {
        case STATUS.PROFITABLE: return { label: 'Выгодный заказ',             color: '#22c55e', icon: '●' };
        case STATUS.BORDERLINE: return { label: 'На границе рентабельности',  color: '#f59e0b', icon: '◐' };
        case STATUS.LOSS:       return { label: 'Убыточный заказ',            color: '#ef4444', icon: '●' };
        default: return { label: 'Неизвестно', color: '#6b7280', icon: '○' };
      }
    },

    STATUS,
  };

  window.KPEngine = KPEngine;

})();
