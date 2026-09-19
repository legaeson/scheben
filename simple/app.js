// ==========================================================================
// КрасПесок.рф — Супер простая версия сайта
// Легковесный JS: калькулятор, автозаполнение, отправка формы
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Справочные данные по материалам и ценам
    const materials = {
        'crushed_5_20': { name: 'Щебень 5-20 мм (диорит)', price: 750 },
        'crushed_20_40': { name: 'Щебень 20-40 мм (скальный)', price: 750 },
        'sand_washed': { name: 'Песок мытый (строительный)', price: 850 },
        'sand_sifted': { name: 'Песок карьерный (сеяный)', price: 700 },
        'pshs': { name: 'ПЩС (0-20 / 0-40)', price: 750 },
        'gravel': { name: 'Гравий мытый / ПГС', price: 550 },
        'chernozem': { name: 'Чернозём плодородный', price: 1000 },
        'expanded_clay': { name: 'Керамзит (10-20 мм)', price: 1600 }
    };

    // Зоны доставки и цена за 1 рейс самосвала
    const deliveryZones = {
        'city': { name: 'Красноярск (любой район города)', price: 2500 },
        'solontsy': { name: 'п. Солонцы', price: 3000 },
        'drokino': { name: 'п. Дрокино', price: 3500 },
        'berezovka': { name: 'п. Берёзовка', price: 3500 },
        'kuznetsovo': { name: 'п. Кузнецово / Лукино', price: 3500 },
        'emelyanovo': { name: 'п. Емельяново', price: 4000 },
        'minino': { name: 'п. Минино', price: 4000 },
        'zykovo': { name: 'п. Зыково', price: 4000 },
        'divnogorsk': { name: 'г. Дивногорск', price: 5500 },
        'other': { name: 'Другой посёлок / СНТ (до 80 км)', price: 3500 }
    };

    // 2. Элементы калькулятора
    const calcMaterial = document.getElementById('calc-material');
    const calcZone = document.getElementById('calc-zone');
    const calcVolume = document.getElementById('calc-volume');
    const chipBtns = document.querySelectorAll('.chip-btn');
    const calcTotalEl = document.getElementById('calc-total');
    const calcBreakdownEl = document.getElementById('calc-breakdown');
    const btnCalcOrder = document.getElementById('btn-calc-order');

    // Элементы формы заказа
    const orderForm = document.getElementById('order-form');
    const orderPhone = document.getElementById('order-phone');
    const orderMaterial = document.getElementById('order-material');
    const orderAddress = document.getElementById('order-address');
    const orderStatus = document.getElementById('order-status');
    const orderSubmitBtn = document.getElementById('order-submit-btn');

    // 3. Функция пересчёта стоимости
    function updateCalculation() {
        const matKey = calcMaterial.value;
        const zoneKey = calcZone.value;
        const volume = Math.max(1, parseFloat(calcVolume.value) || 1);

        const matData = materials[matKey] || materials['crushed_5_20'];
        const zoneData = deliveryZones[zoneKey] || deliveryZones['city'];

        // Расчёт: стоимость материала + стоимость доставки рейса
        // Если объем больше 8 м³, может потребоваться 2-й рейс или тяжелый 20м³ самосвал
        let trips = Math.ceil(volume / 8);
        if (volume > 8 && volume <= 20) {
            // Один рейс большого 20м3 самосвала (коэффициент 1.6 к базовой доставке)
            trips = 1;
            var deliveryCost = Math.round(zoneData.price * 1.6);
        } else {
            var deliveryCost = zoneData.price * trips;
        }

        const materialCost = matData.price * volume;
        const total = materialCost + deliveryCost;

        if (calcTotalEl) {
            calcTotalEl.textContent = total.toLocaleString('ru-RU') + ' ₽';
        }
        if (calcBreakdownEl) {
            calcBreakdownEl.textContent = `Материал: ${materialCost.toLocaleString('ru-RU')} ₽ (${volume} м³) + Доставка: ${deliveryCost.toLocaleString('ru-RU')} ₽`;
        }

        // Синхронизируем выпадающий список в форме заявки
        if (orderMaterial && orderMaterial.value !== matKey) {
            orderMaterial.value = matKey;
        }
    }

    // Слушатели событий калькулятора
    if (calcMaterial) calcMaterial.addEventListener('change', updateCalculation);
    if (calcZone) calcZone.addEventListener('change', updateCalculation);
    if (calcVolume) calcVolume.addEventListener('input', () => {
        // Снимаем активность с чипов, если ввели вручную нестандартное число
        chipBtns.forEach(btn => {
            if (btn.dataset.vol == calcVolume.value) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        updateCalculation();
    });

    // Обработка кликов по чипам объема
    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chipBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            calcVolume.value = btn.dataset.vol;
            updateCalculation();
        });
    });

    // Кнопка "Заказать по этой цене" из калькулятора
    if (btnCalcOrder) {
        btnCalcOrder.addEventListener('click', () => {
            const matKey = calcMaterial.value;
            const volume = calcVolume.value;
            const zoneText = calcZone.options[calcZone.selectedIndex].text;

            if (orderMaterial) orderMaterial.value = matKey;
            if (orderAddress && !orderAddress.value) {
                orderAddress.value = zoneText;
            }

            const targetSection = document.getElementById('order-section');
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
                if (orderPhone) orderPhone.focus();
            }
        });
    }

    // 4. Кнопки "Заказать" в карточках каталога
    document.querySelectorAll('.btn-card-order').forEach(btn => {
        btn.addEventListener('click', () => {
            const matKey = btn.dataset.material;
            if (matKey && materials[matKey]) {
                if (calcMaterial) calcMaterial.value = matKey;
                if (orderMaterial) orderMaterial.value = matKey;
                updateCalculation();
            }
            const target = document.getElementById('order-section');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
                if (orderPhone) orderPhone.focus();
            }
        });
    });

    // 5. Простая маска для номера телефона (+7 ...)
    if (orderPhone) {
        orderPhone.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            if (!val) {
                e.target.value = '';
                return;
            }
            if (val[0] === '8' || val[0] === '7') {
                val = val.substring(1);
            }
            let formatted = '+7 ';
            if (val.length > 0) formatted += '(' + val.substring(0, 3);
            if (val.length >= 3) formatted += ') ' + val.substring(3, 6);
            if (val.length >= 6) formatted += '-' + val.substring(6, 8);
            if (val.length >= 8) formatted += '-' + val.substring(8, 10);
            e.target.value = formatted;
        });
    }

    // 6. Отправка формы заявки
    if (orderForm) {
        orderForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const rawPhone = orderPhone ? orderPhone.value.trim() : '';
            const digits = rawPhone.replace(/\D/g, '');
            if (digits.length < 10) {
                showFormStatus('Пожалуйста, введите корректный номер телефона для связи', 'error');
                if (orderPhone) orderPhone.focus();
                return;
            }

            const matKey = orderMaterial ? orderMaterial.value : (calcMaterial ? calcMaterial.value : 'crushed_5_20');
            const matName = materials[matKey] ? materials[matKey].name : 'Материал';
            const volume = calcVolume ? calcVolume.value : '7';
            const address = orderAddress ? orderAddress.value.trim() : '';

            const payload = {
                phone: rawPhone,
                material: `${matName} (${volume} м³)`,
                destinationAddress: address || 'Красноярск / Пригород',
                notes: `Заявка с супер-простой версии сайта. Расчётная сумма: ${calcTotalEl ? calcTotalEl.textContent : 'уточняется'}`
            };

            // Блокируем кнопку на время отправки
            if (orderSubmitBtn) {
                orderSubmitBtn.disabled = true;
                orderSubmitBtn.textContent = 'Отправка заявки...';
            }

            try {
                // Пробуем отправить на order.php или /api/order
                let response = null;
                try {
                    response = await fetch('../order.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                } catch (err1) {
                    // Fallback на node api если php недоступен
                    response = await fetch('/api/order', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }

                if (response && response.ok) {
                    showFormStatus('✅ Заявка принята! Диспетчер свяжется с вами в течение 5 минут для подтверждения времени доставки.', 'success');
                    orderForm.reset();
                } else {
                    throw new Error('Сервер временно недоступен');
                }
            } catch (err) {
                console.warn('Order submission error:', err);
                // Если отправка не удалась (например, открыто локально через file://), даем мгновенный звонок
                showFormStatus(`Заявка сформирована. Пожалуйста, подтвердите звонком по номеру <a href="tel:+79950758414" style="color:inherit;font-weight:bold;text-decoration:underline;">+7 (995) 075-84-14</a> или напишите в WhatsApp.`, 'success');
            } finally {
                if (orderSubmitBtn) {
                    orderSubmitBtn.disabled = false;
                    orderSubmitBtn.textContent = 'Отправить заявку';
                }
            }
        });
    }

    function showFormStatus(msg, type) {
        if (!orderStatus) return;
        orderStatus.innerHTML = msg;
        orderStatus.className = `form-status ${type}`;
        orderStatus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // Первоначальный расчёт при загрузке
    updateCalculation();
});
