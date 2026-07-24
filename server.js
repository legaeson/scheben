const dns = require('dns');
try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const origLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    if (hostname === 'api.telegram.org') {
        if (options && options.all) {
            return callback(null, [{ address: '149.154.167.220', family: 4 }]);
        }
        return callback(null, '149.154.167.220', 4);
    }
    return origLookup.call(this, hostname, options, callback);
};

const express = require('express');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 2000;
const SETTINGS_PATH = path.join(__dirname, 'settings.json');
const ORDERS_PATH = path.join(__dirname, 'orders.json');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'change-me-in-env';

app.use(express.json());
app.use(express.static(__dirname));

// Load Settings Helper
function getSettings() {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const data = fs.readFileSync(SETTINGS_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error reading settings.json:', e);
    }
    return {
        materials: {
            crushed_stone: { name: 'Щебень', price: 750 },
            sand: { name: 'Песок', price: 850 },
            pshs: { name: 'ПЩС', price: 750 },
            gps_gravel: { name: 'ГПС / Гравий', price: 550 },
            crushed_brick: { name: 'Битый кирпич', price: 800 },
            expanded_clay: { name: 'Керамзит', price: 1600 },
            chernozem: { name: 'Чернозём', price: 1000 }
        },
        deliveryRate: 400,
        startCoords: [56.0355, 93.0085]
    };
}

// Save Settings Helper
function saveSettings(settings) {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error writing settings.json:', e);
        return false;
    }
}

// Save Order Helper
function saveOrderToFile(orderData) {
    try {
        let orders = [];
        if (fs.existsSync(ORDERS_PATH)) {
            const data = fs.readFileSync(ORDERS_PATH, 'utf8');
            if (data) {
                orders = JSON.parse(data);
            }
        }
        orderData.id = orderData.id || `SCH-${Math.floor(1000 + Math.random() * 9000)}`;
        orderData.timestamp = new Date().toISOString();
        orders.push(orderData);
        fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2), 'utf8');
        return orderData.id;
    } catch (err) {
        console.error('[Server] Error saving order:', err);
        return `SCH-${Math.floor(1000 + Math.random() * 9000)}`;
    }
}

// Telegram Admin Notification Helper
const adminToken = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
let adminBot = null;

if (adminToken) {
    adminBot = new TelegramBot(adminToken, { polling: true });
    console.log('[AdminBot] Telegram Admin Bot is running in polling mode.');
    adminBot.on('polling_error', (err) => {
        console.error('[AdminBot Polling Error]:', err.code, err.message);
    });
} else {
    console.warn('⚠️ WARNING: TELEGRAM_BOT_TOKEN is not defined in .env');
}

function sendAdminNotification(messageText) {
    if (adminBot && adminChatId) {
        return adminBot.sendMessage(adminChatId, messageText, { parse_mode: 'Markdown' })
            .catch(err => console.error('[AdminBot] Error sending notification to admin:', err));
    } else {
        console.warn('[AdminBot] Admin bot or chat ID missing.');
        return Promise.resolve();
    }
}

// API Routes
app.get('/api/settings', (req, res) => {
    res.json(getSettings());
});

app.post('/api/settings', (req, res) => {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== ADMIN_API_KEY) {
        return res.status(403).json({ success: false, message: 'Forbidden: Invalid API key' });
    }
    const success = saveSettings(req.body);
    if (success) {
        res.json({ success: true, message: 'Settings saved successfully' });
    } else {
        res.status(500).json({ success: false, message: 'Failed to save settings' });
    }
});

app.post('/api/order', (req, res) => {
    const { phone, material, volume, distance, totalCost, destinationAddress } = req.body;
    const orderId = saveOrderToFile(req.body);

    let msgText = `🚨 *НОВАЯ ЗАЯВКА С САЙТА (${orderId})*\n\n`;
    msgText += `📱 *Телефон:* \`${phone}\`\n`;
    msgText += `📦 *Материал:* ${material}\n`;
    msgText += `🔢 *Объём:* ${volume} м³\n`;
    msgText += `📍 *Адрес:* ${destinationAddress}\n`;
    msgText += `🚗 *Дистанция:* ${distance} км\n`;
    msgText += `💰 *Ориентир стоимости:* *${totalCost ? totalCost.toLocaleString('ru-RU') + ' ₽' : 'Уточняется'}*\n`;
    msgText += `⏰ *Время:* ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Krasnoyarsk' })}`;

    sendAdminNotification(msgText);
    res.json({ success: true, orderId, message: 'Order submitted successfully' });
});

// Start Express Server with EADDRINUSE safety
const server = app.listen(PORT, () => {
    console.log(`[Server] Web application running at http://localhost:${PORT}`);
});
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.warn(`[Server] Port ${PORT} is already in use. Web server is already active or running on another process.`);
    } else {
        console.error('[Server] Express error:', err);
    }
});

// Admin Bot Command & Callback Handlers
if (adminBot) {
    const userStates = {};

    const getMainMenuKeyboard = () => ({
        reply_markup: {
            keyboard: [
                [{ text: '💰 Цены материалов' }, { text: '🚚 Тариф доставки' }],
                [{ text: '📍 Координаты склада' }, { text: '📄 Текущие настройки' }]
            ],
            resize_keyboard: true
        }
    });

    const isAdmin = (msg) => {
        if (!adminChatId) return false;
        return msg.chat.id.toString() === adminChatId.toString();
    };

    adminBot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        if (isAdmin(msg)) {
            adminBot.sendMessage(chatId, '👋 Привет, Администратор! Добро пожаловать в панель управления *КрасПесок.рф*.', {
                parse_mode: 'Markdown',
                ...getMainMenuKeyboard()
            });
        } else {
            adminBot.sendMessage(chatId, `👋 Ваш Chat ID: \`${chatId}\`\nУкажите его в .env (TELEGRAM_ADMIN_CHAT_ID).`, {
                parse_mode: 'Markdown'
            });
        }
    });

    adminBot.on('message', (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text || text.startsWith('/')) return;
        if (!isAdmin(msg)) return;

        const state = userStates[chatId];

        if (state && state.action === 'set_price') {
            const newPrice = parseInt(text, 10);
            if (isNaN(newPrice) || newPrice < 0) {
                adminBot.sendMessage(chatId, '❌ Введите число.');
                return;
            }
            const settings = getSettings();
            if (settings.materials[state.material]) {
                settings.materials[state.material].price = newPrice;
                saveSettings(settings);
                adminBot.sendMessage(chatId, `✅ Цена обновлена: *${newPrice} ₽/м³*`, {
                    parse_mode: 'Markdown',
                    ...getMainMenuKeyboard()
                });
            }
            delete userStates[chatId];
            return;
        }

        if (state && state.action === 'set_delivery') {
            const newRate = parseInt(text, 10);
            if (isNaN(newRate) || newRate < 0) {
                adminBot.sendMessage(chatId, '❌ Введите число.');
                return;
            }
            const settings = getSettings();
            settings.deliveryRate = newRate;
            saveSettings(settings);
            adminBot.sendMessage(chatId, `✅ Тариф доставки обновлен: *${newRate} ₽/км*`, {
                parse_mode: 'Markdown',
                ...getMainMenuKeyboard()
            });
            delete userStates[chatId];
            return;
        }

        if (state && state.action === 'set_warehouse') {
            const parts = text.split(',').map(p => parseFloat(p.trim()));
            if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
                adminBot.sendMessage(chatId, '❌ Введите координаты (например: `56.0355, 93.0085`):', { parse_mode: 'Markdown' });
                return;
            }
            const settings = getSettings();
            settings.startCoords = parts;
            saveSettings(settings);
            adminBot.sendMessage(chatId, `✅ Координаты склада обновлены: *${parts[0]}, ${parts[1]}*`, {
                parse_mode: 'Markdown',
                ...getMainMenuKeyboard()
            });
            delete userStates[chatId];
            return;
        }

        switch (text) {
            case '💰 Цены материалов': {
                const settings = getSettings();
                const inlineKeyboard = [];
                for (const key in settings.materials) {
                    inlineKeyboard.push([{
                        text: `${settings.materials[key].name} (${settings.materials[key].price} ₽)`,
                        callback_data: `edit_price_${key}`
                    }]);
                }
                adminBot.sendMessage(chatId, 'Выберите материал для изменения цены:', {
                    reply_markup: { inline_keyboard: inlineKeyboard }
                });
                break;
            }
            case '🚚 Тариф доставки':
                userStates[chatId] = { action: 'set_delivery' };
                adminBot.sendMessage(chatId, `Текущий тариф доставки: *${getSettings().deliveryRate} ₽/км*\n\nВведите новый тариф (число):`, {
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                });
                break;

            case '📍 Координаты склада':
                userStates[chatId] = { action: 'set_warehouse' };
                adminBot.sendMessage(chatId, `Текущие координаты склада: *${getSettings().startCoords.join(', ')}*\n\nВведите новые координаты через запятую:`, {
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                });
                break;

            case '📄 Текущие настройки': {
                const current = getSettings();
                let msgText = '📄 *Текущие настройки:*\n\n*💰 Цены:*\n';
                for (const k in current.materials) {
                    msgText += `• ${current.materials[k].name}: *${current.materials[k].price} ₽/м³*\n`;
                }
                msgText += `\n*🚚 Доставка:* *${current.deliveryRate} ₽/км*\n`;
                msgText += `*📍 Склад:* \`${current.startCoords.join(', ')}\``;
                adminBot.sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
                break;
            }
            default:
                adminBot.sendMessage(chatId, '❓ Выберите действие на клавиатуре.', getMainMenuKeyboard());
                break;
        }
    });

    adminBot.on('callback_query', (query) => {
        const chatId = query.message ? query.message.chat.id : query.from.id;
        const data = query.data;

        if (adminChatId && chatId.toString() !== adminChatId.toString()) {
            adminBot.answerCallbackQuery(query.id, { text: '❌ Нет доступа.', show_alert: true }).catch(() => {});
            return;
        }

        if (data && data.startsWith('edit_price_')) {
            const materialKey = data.replace('edit_price_', '');
            const settings = getSettings();
            const material = settings.materials[materialKey];
            if (material) {
                userStates[chatId] = { action: 'set_price', material: materialKey };
                adminBot.answerCallbackQuery(query.id).catch(() => {});
                adminBot.sendMessage(chatId, `Текущая цена на *${material.name}*: *${material.price} ₽/м³*\n\nВведите новую цену:`, {
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                });
            }
        }
    });
}

// Client Bot Logic (@kraspesokbot)
const clientToken = process.env.CLIENT_TG_BOT_TOKEN;
let clientBot = null;

if (clientToken) {
    clientBot = new TelegramBot(clientToken, { polling: true });
    console.log('[ClientBot] Client Telegram Bot (@kraspesokbot) is running in polling mode.');

    clientBot.on('polling_error', (err) => {
        console.error('[ClientBot Polling Error]:', err.code, err.message);
    });

    const orderSessions = {};

    const getClientMenuKeyboard = () => ({
        reply_markup: {
            keyboard: [
                [{ text: '🛒 Сделать заказ' }, { text: '💰 Цены на материалы' }],
                [{ text: '📞 Позвонить диспетчеру' }]
            ],
            resize_keyboard: true
        }
    });

    const getMaterialsReplyKeyboard = () => ({
        reply_markup: {
            keyboard: [
                [{ text: 'Песок (850 ₽/м³)' }, { text: 'Щебень (750 ₽/м³)' }],
                [{ text: 'ПЩС (750 ₽/м³)' }, { text: 'Гравий / ГПС (550 ₽/м³)' }],
                [{ text: 'Битый кирпич (800 ₽/м³)' }, { text: 'Керамзит (1600 ₽/м³)' }],
                [{ text: 'Чернозём (1000 ₽/м³)' }],
                [{ text: '❌ Отмена' }]
            ],
            resize_keyboard: true
        }
    });

    const getVolumeReplyKeyboard = () => ({
        reply_markup: {
            keyboard: [
                [{ text: '5 м³' }, { text: '10 м³' }, { text: '15 м³' }],
                [{ text: '20 м³ (1 КАМАЗ)' }, { text: '25 м³' }],
                [{ text: '30 м³ (2 КАМАЗа)' }, { text: '40 м³' }],
                [{ text: '❌ Отмена' }]
            ],
            resize_keyboard: true
        }
    });

    clientBot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        delete orderSessions[chatId];
        const greeting = `👋 *Здравствуйте! Вас приветствует служба доставки сыпучих материалов КрасПесок.рф в Красноярске!*\n\n` +
                         `Мы доставляем песок, щебень, ПЩС и гравий напрямую с карьеров на собственных самосвалах (20 м³).\n\n` +
                         `Выберите нужное действие в меню ниже:`;
        clientBot.sendMessage(chatId, greeting, { parse_mode: 'Markdown', ...getClientMenuKeyboard() })
            .catch(err => console.error('[ClientBot /start Error]', err));
    });

    const parseMaterialName = (str) => {
        if (!str) return null;
        const lower = str.toLowerCase();
        if (lower.includes('песок')) return 'Песок';
        if (lower.includes('щебень')) return 'Щебень';
        if (lower.includes('пщс')) return 'ПЩС';
        if (lower.includes('гравий') || lower.includes('гпс')) return 'Гравий / ГПС';
        if (lower.includes('кирпич')) return 'Битый кирпич';
        if (lower.includes('керамзит')) return 'Керамзит';
        if (lower.includes('чернозём') || lower.includes('чернозем')) return 'Чернозём';
        return null;
    };

    const handleMaterialSelection = (chatId, materialName) => {
        const session = orderSessions[chatId] || {};
        session.materialName = materialName;
        session.step = 'select_volume';
        orderSessions[chatId] = session;

        clientBot.sendMessage(chatId, `Вы выбрали: *${materialName}*\n\n🔢 *Шаг 2 из 4:* Выберите нужный объём (в м³):`, {
            parse_mode: 'Markdown',
            ...getVolumeReplyKeyboard()
        }).catch(err => console.error('[ClientBot handleMaterial error]', err));
    };

    const handleVolumeSelection = (chatId, volumeNum) => {
        const session = orderSessions[chatId] || {};
        session.volume = volumeNum;
        session.step = 'enter_address';
        orderSessions[chatId] = session;

        clientBot.sendMessage(chatId, `Объём: *${volumeNum} м³*\n\n📍 *Шаг 3 из 4:* Напишите адрес или район доставки в Красноярске (или отправьте геолокацию):`, {
            parse_mode: 'Markdown',
            reply_markup: { remove_keyboard: true }
        }).catch(err => console.error('[ClientBot handleVolume error]', err));
    };

    clientBot.on('message', (msg) => {
        try {
            const chatId = msg.chat.id;
            const text = msg.text ? msg.text.trim() : '';

            if (text === '❌ Отмена') {
                delete orderSessions[chatId];
                clientBot.sendMessage(chatId, 'Заказ отменён.', getClientMenuKeyboard());
                return;
            }

            if (text === '🛒 Сделать заказ') {
                orderSessions[chatId] = { step: 'select_material' };
                clientBot.sendMessage(chatId, '📦 *Шаг 1 из 4:* Выберите строительный материал на клавиатуре:', {
                    parse_mode: 'Markdown',
                    ...getMaterialsReplyKeyboard()
                });
                return;
            }

            if (text === '💰 Цены на материалы') {
                const settings = getSettings();
                let pricesMsg = '📋 *Прайс-лист на материалы (Красноярск):*\n\n';
                for (const key in settings.materials) {
                    pricesMsg += `• *${settings.materials[key].name}:* ${settings.materials[key].price} ₽/м³\n`;
                }
                pricesMsg += '\n🚚 *Доставка:* По городу в среднем 15 000 – 16 000 ₽ за рейс самосвала (20 м³).';
                clientBot.sendMessage(chatId, pricesMsg, { parse_mode: 'Markdown', ...getClientMenuKeyboard() });
                return;
            }

            if (text === '📞 Позвонить диспетчеру') {
                clientBot.sendMessage(chatId, '📞 *Телефон диспетчера:* `+7 (906) 971-33-77`\n\nПриём заявок и доставка — круглосуточно!', {
                    parse_mode: 'Markdown',
                    ...getClientMenuKeyboard()
                });
                return;
            }

            const session = orderSessions[chatId];

            // Direct Material Text matching
            const detectedMat = parseMaterialName(text);
            if (detectedMat && (!session || session.step === 'select_material')) {
                handleMaterialSelection(chatId, detectedMat);
                return;
            }

            if (session && session.step === 'select_volume') {
                const matchVol = text.match(/\d+/);
                if (matchVol) {
                    const volNum = parseInt(matchVol[0], 10);
                    handleVolumeSelection(chatId, volNum);
                    return;
                }
            }

            if (session && session.step === 'enter_address') {
                let addressText = text;
                if (msg.location) {
                    addressText = `Геолокация: lat ${msg.location.latitude}, lon ${msg.location.longitude}`;
                }

                if (!addressText || addressText.length < 2) {
                    clientBot.sendMessage(chatId, '❌ Пожалуйста, напишите адрес или район доставки:');
                    return;
                }

                session.address = addressText;
                session.step = 'enter_phone';

                clientBot.sendMessage(chatId, '📱 *Шаг 4 из 4:* Нажмите кнопку ниже, чтобы поделиться номером телефона, или напишите его вручную:', {
                    parse_mode: 'Markdown',
                    reply_markup: {
                        keyboard: [
                            [{ text: '📱 Поделиться контактом', request_contact: true }],
                            [{ text: '❌ Отмена' }]
                        ],
                        resize_keyboard: true,
                        one_time_keyboard: true
                    }
                });
                return;
            }

            if (session && session.step === 'enter_phone') {
                let phoneVal = text;
                if (msg.contact && msg.contact.phone_number) {
                    phoneVal = msg.contact.phone_number;
                }

                if (!phoneVal || phoneVal.length < 5) {
                    clientBot.sendMessage(chatId, '❌ Пожалуйста, введите корректный номер телефона:');
                    return;
                }

                session.phone = phoneVal;

                const orderId = `TG-${Math.floor(1000 + Math.random() * 9000)}`;
                const username = msg.from.username ? `@${msg.from.username}` : (msg.from.first_name || 'Клиент');

                const orderData = {
                    id: orderId,
                    phone: session.phone,
                    material: session.materialName,
                    volume: session.volume,
                    destinationAddress: session.address,
                    source: 'telegram_bot'
                };
                saveOrderToFile(orderData);

                // Send notification to Admin chat via Admin Bot
                let adminMsg = `🚨 *НОВАЯ ЗАЯВКА ИЗ TELEGRAM-БОТА (@kraspesokbot)* (${orderId})\n\n`;
                adminMsg += `📱 *Телефон:* \`${session.phone}\`\n`;
                adminMsg += `👤 *Заказчик:* ${username} (ID: \`${chatId}\`)\n`;
                adminMsg += `📦 *Материал:* ${session.materialName}\n`;
                adminMsg += `🔢 *Объём:* ${session.volume} м³ (${Math.ceil(session.volume / 20)} Самосвал)\n`;
                adminMsg += `📍 *Адрес:* ${session.address}\n`;
                adminMsg += `⏰ *Время:* ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Krasnoyarsk' })}`;

                sendAdminNotification(adminMsg);

                // Send confirmation to Client
                let clientConfirmMsg = `✅ *Ваш заказ успешно принят!* (Номер заявки: *#${orderId}*)\n\n`;
                clientConfirmMsg += `📦 *Материал:* ${session.materialName}\n`;
                clientConfirmMsg += `🔢 *Объём:* ${session.volume} м³\n`;
                clientConfirmMsg += `📍 *Адрес:* ${session.address}\n`;
                clientConfirmMsg += `📱 *Телефон:* ${session.phone}\n\n`;
                clientConfirmMsg += `Диспетчер свяжется с вами в ближайшее время для подтверждения заказа!`;

                clientBot.sendMessage(chatId, clientConfirmMsg, { parse_mode: 'Markdown', ...getClientMenuKeyboard() });
                delete orderSessions[chatId];
            }
        } catch (err) {
            console.error('[ClientBot message handler error]:', err);
        }
    });

    clientBot.on('callback_query', (query) => {
        try {
            const chatId = query.message ? query.message.chat.id : query.from.id;
            const data = query.data;
            clientBot.answerCallbackQuery(query.id).catch(() => {});

            if (!data) return;

            if (data.startsWith('mat_')) {
                const matKey = data.replace('mat_', '');
                const matNames = {
                    sand: 'Песок',
                    crushed: 'Щебень',
                    pshs: 'ПЩС',
                    gps: 'Гравий / ГПС',
                    brick: 'Битый кирпич',
                    clay: 'Керамзит',
                    chernozem: 'Чернозём'
                };
                const matName = matNames[matKey] || 'Материал';
                handleMaterialSelection(chatId, matName);
                return;
            }

            if (data.startsWith('vol_')) {
                const vol = parseInt(data.replace('vol_', ''), 10);
                handleVolumeSelection(chatId, vol);
            }
        } catch (err) {
            console.error('[ClientBot callback_query error]:', err);
        }
    });
}
