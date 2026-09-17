// ==========================================================================
// КрасПесок.рф — Каталог материалов и быстрая связь с диспетчером
// ==========================================================================

const materialsData = {
    your_situation: {
        id: 'your_situation',
        name: 'Ваша ситуация (Аренда грузовика / Свой вариант)',
        category: 'custom',
        img: 'images/truck_rental.jpg',
        webp: 'images/truck_rental.webp',
        webp2x: 'images/truck_rental@2x.webp',
        badge: '🚚 Решим любую задачу',
        price: 'Договорная',
        unit: 'рейс / услуга',
        desc: 'Не нашли нужный товар или нужна аренда самосвала? Напишите или позвоните нам — всё доставим и подберём лучшее решение!'
    },
    crushed_brick: {
        id: 'crushed_brick',
        name: 'Бой кирпича (Вторичный)',
        category: 'secondary',
        img: 'images/crushed_brick.jpg',
        webp: 'images/crushed_brick.webp',
        webp2x: 'images/crushed_brick@2x.webp',
        badge: 'Вторичный рециклинг',
        price: 800,
        unit: 'м³',
        desc: 'Дробленый кирпичный бой для временных дорог, укрепления грунта и засыпки котлованов (Вторичный рециклинг).'
    },
    sand: {
        id: 'sand',
        name: 'Песок строительный (отсев / мытый)',
        category: 'sand_pgs',
        img: 'images/sand.jpg',
        webp: 'images/sand.webp',
        webp2x: 'images/sand@2x.webp',
        badge: 'ГОСТ 8736-2014',
        price: 850,
        unit: 'м³',
        desc: 'Чистый сеяный и мытый песок 0-5 мм без глины. Для кладки, штукатурки и стяжки пола (ГОСТ 8736-2014).'
    },
    crushed_stone: {
        id: 'crushed_stone',
        name: 'Щебень (гранитный / диоритовый)',
        category: 'crushed',
        img: 'images/crushed_stone.jpg',
        webp: 'images/crushed_stone.webp',
        webp2x: 'images/crushed_stone@2x.webp',
        badge: 'ГОСТ 8267-93',
        price: 750,
        unit: 'м³',
        desc: 'Фракции: 4-8, 5-20, 20-40, 40-70 мм. Высокая прочность М1200. Подходит для бетона и фундаментов (ГОСТ 8267-93).'
    },
    pshs: {
        id: 'pshs',
        name: 'ПЩС (Песчано-щебёночная смесь)',
        category: 'sand_pgs',
        img: 'images/pgs.jpg',
        webp: 'images/pgs.webp',
        webp2x: 'images/pgs@2x.webp',
        badge: 'ГОСТ 25607-2009',
        price: 750,
        unit: 'м³',
        desc: 'Фракции 0-20, 0-40 мм. Идеальное решение для отсыпки дорог, парковок и подушек под фундамент (ГОСТ 25607-2009).'
    },
    gps_gravel: {
        id: 'gps_gravel',
        name: 'Гравий и ГПС',
        category: 'gravel',
        img: 'images/gravel.jpg',
        webp: 'images/gravel.webp',
        webp2x: 'images/gravel@2x.webp',
        badge: 'ГОСТ 23735-2014',
        price: 550,
        unit: 'м³',
        desc: 'Речной промытый гравий фракций 5-20 мм и ГПС. Для дренажа, бетонирования и ландшафта (ГОСТ 23735-2014 / ГОСТ 8267-93).'
    },
    expanded_clay: {
        id: 'expanded_clay',
        name: 'Керамзит (все фракции)',
        category: 'secondary',
        img: 'images/expanded_clay.jpg',
        webp: 'images/expanded_clay.webp',
        webp2x: 'images/expanded_clay@2x.webp',
        badge: 'ГОСТ 32496-2013',
        price: 1600,
        unit: 'м³',
        desc: 'Фракции 10-20, 20-40 мм. Легкий пористый материал для теплоизоляции полов и перекрытий (ГОСТ 32496-2013).'
    },
    chernozem: {
        id: 'chernozem',
        name: 'Чернозём плодородный',
        category: 'secondary',
        img: 'images/chernozem.jpg',
        webp: 'images/chernozem.webp',
        webp2x: 'images/chernozem@2x.webp',
        badge: 'ГОСТ Р 53380-2009',
        price: 1000,
        unit: 'м³',
        desc: 'Верховой сеяный чернозем без сорняков и камней. Для газонов, теплиц и огородов (ГОСТ Р 53380-2009).'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderMaterialCards('all');
    setupCategoryTabs();
    setupMobileNav();
    setupOrderForm();
    setupFaqAccordion();
    setupScrollSpyAndBackToTop();
    setupPhoneMask();
    setupMobileStickyCtaBehavior();
}

// Format currency
function formatCurrency(val) {
    return `от ${Math.round(val).toLocaleString('ru-RU')} ₽`;
}

// Render Avito-Style Material Catalog with Ultra-Fast WebP & Adaptive Srcset
function renderMaterialCards(categoryFilter) {
    const grid = document.getElementById('material-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let cardIndex = 0;
    Object.values(materialsData).forEach(mat => {
        if (categoryFilter !== 'all' && mat.category !== categoryFilter && mat.id !== 'your_situation') return;

        const isAboveTheFold = cardIndex < 2;
        cardIndex++;

        const card = document.createElement('div');
        card.className = 'material-card avito-card';

        const priceDisplay = typeof mat.price === 'number' 
            ? `${formatCurrency(mat.price)} <span class="unit">/ ${mat.unit}</span>`
            : `${mat.price} <span class="unit">/ ${mat.unit}</span>`;

        const priorityAttrs = isAboveTheFold 
            ? 'fetchpriority="high"' 
            : 'loading="lazy"';

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
                ${mat.badge ? `<span class="material-badge">${mat.badge}</span>` : ''}
            </div>
            <div class="material-content">
                <h3 class="material-name">${mat.name}</h3>
                <div class="material-price-tag">${priceDisplay}</div>
                <p class="material-desc-short">${mat.desc}</p>
                
                <div class="card-actions">
                    <a href="tel:+79950758414" class="btn-card-call" aria-label="Позвонить диспетчеру для заказа ${mat.name}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        <span>Позвонить</span>
                    </a>
                    <button type="button" class="btn-card-order" data-material="${mat.name}" aria-label="Быстрый заказ ${mat.name}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                        <span>Заказать</span>
                    </button>
                </div>
            </div>
        `;

        const imgEl = card.querySelector('.material-img');
        if (imgEl && imgEl.complete) {
            imgEl.classList.add('loaded');
        }

        // Card button handler -> select material and scroll to quick order form
        const orderBtn = card.querySelector('.btn-card-order');
        if (orderBtn) {
            orderBtn.addEventListener('click', () => {
                selectMaterial(mat.name);
                const formSection = document.getElementById('quick-order-section');
                if (formSection) {
                    formSection.scrollIntoView({ behavior: 'smooth' });
                }
                const phoneInput = document.getElementById('order-phone');
                if (phoneInput) {
                    setTimeout(() => phoneInput.focus(), 400);
                }
            });
        }

        grid.appendChild(card);
    });
}

// Helper: Select material from card
function selectMaterial(name) {
    const box = document.getElementById('selected-material-box');
    const textEl = document.getElementById('selected-material-text');
    const inputEl = document.getElementById('order-material');
    if (box && textEl && inputEl) {
        textEl.innerText = `Выбран материал: ${name}`;
        inputEl.value = name;
        box.style.display = 'flex';
    }
}

// Helper: Clear selected material
function clearSelectedMaterial() {
    const box = document.getElementById('selected-material-box');
    const inputEl = document.getElementById('order-material');
    if (box && inputEl) {
        box.style.display = 'none';
        inputEl.value = 'Запрос звонка диспетчера';
    }
}

// Category Tabs
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

// Mobile Menu Drawer
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

// Phone Input Formatting
function setupPhoneMask() {
    const phoneInput = document.getElementById('order-phone');
    if (!phoneInput) return;

    phoneInput.addEventListener('input', (e) => {
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
    });
}

// Fast Order Form Handler (POST to /api/order -> Instant Email notification)
function setupOrderForm() {
    const form = document.getElementById('quick-order-form');
    if (!form) return;

    const phoneInput = document.getElementById('order-phone');
    const materialInput = document.getElementById('order-material');
    const clearBtn = document.getElementById('clear-material-btn');

    if (clearBtn) {
        clearBtn.addEventListener('click', clearSelectedMaterial);
    }

    if (phoneInput) {
        phoneInput.addEventListener('input', () => {
            phoneInput.classList.remove('input-error');
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');

        const phoneDigits = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
        if (!phoneInput || !phoneInput.value.trim() || phoneDigits.length < 11) {
            if (phoneInput) {
                phoneInput.classList.remove('input-error');
                void phoneInput.offsetWidth; // Trigger reflow for animation
                phoneInput.classList.add('input-error');
                phoneInput.focus();
            }
            showToast('Укажите корректный номер телефона (11 цифр)', 'error');
            return;
        }

        const originalBtnText = submitBtn ? submitBtn.innerText : 'Заказать звонок диспетчера';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerText = 'Отправка...';
        }

        const payload = {
            phone: phoneInput.value.trim(),
            material: materialInput ? materialInput.value : 'Запрос звонка диспетчера',
            source: 'website'
        };

        let isSuccess = false;
        let responseMessage = '';

        // Список поддерживаемых бекенд-эндпоинтов (PHP на виртуальном хостинге + Express на Node.js)
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
                        responseMessage = data.message || 'Спасибо! Номер передан диспетчеру. Мы перезвоним в течение 3 минут.';
                        break;
                    } else if (data && data.message) {
                        responseMessage = data.message;
                    }
                }
            } catch (endpointErr) {
                console.warn(`[Submit] Эндпоинт ${endpoint} недоступен, пробуем следующий...`, endpointErr);
            }
        }

        try {
            if (isSuccess) {
                showToast(responseMessage || 'Спасибо! Номер передан диспетчеру. Мы перезвоним в течение 3 минут.', 'success');
                form.reset();
                clearSelectedMaterial();
            } else {
                showToast(responseMessage || 'Ошибка соединения с сервером. Пожалуйста, позвоните диспетчеру: +7 (995) 075-84-14', 'error');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerText = originalBtnText;
            }
        }
    });
}

// FAQ Accordion Handler
function setupFaqAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (!question) return;

        question.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const isCurrentlyActive = item.classList.contains('active');

            // Close all items
            faqItems.forEach(i => i.classList.remove('active'));

            // Toggle clicked item
            if (!isCurrentlyActive) {
                item.classList.add('active');
            }
        };
    });
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 4500);
}

// ScrollSpy & Back To Top
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

// Mobile Sticky CTA Smart Hiding (hides when form is visible or field focused)
function setupMobileStickyCtaBehavior() {
    const stickyCta = document.querySelector('.mobile-sticky-cta');
    const orderSection = document.getElementById('quick-order-section');
    if (!stickyCta) return;

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
    };

    window.addEventListener('scroll', updateVisibility, { passive: true });
    window.addEventListener('resize', updateVisibility);
    document.addEventListener('focusin', updateVisibility);
    document.addEventListener('focusout', () => setTimeout(updateVisibility, 100));
    updateVisibility();
}
