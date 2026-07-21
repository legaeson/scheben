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
            anti_ice: { name: 'Противогололедный материал', price: 1400 },
            crushed_brick: { name: 'Битый кирпич', price: 800 },
            expanded_clay: { name: 'Керамзит', price: 1600 },
            chernozem: { name: 'Чернозём', price: 1000 }
        },
        deliveryRate: 400,
        startCoords: [56.146389, 93.112222]
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

    let msgText = `🚨 *НОВАЯ ЗАЯВКА НА ДОСТАВКУ (${orderId})*\n\n`;
    msgText += `📱 *Телефон:* \`${phone}\`\n`;
    msgText += `📦 *Материал:* ${material}\n`;
    msgText += `🔢 *Объём:* ${volume} м³\n`;
    msgText += `📍 *Адрес:* ${destinationAddress}\n`;
    msgText += `🚗 *Дистанция:* ${distance} км\n`;
    msgText += `💰 *Ориентир стоимости:* *${totalCost.toLocaleString('ru-RU')} ₽*\n`;
    msgText += `⏰ *Время:* ${new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Krasnoyarsk' })}`;

    if (bot && adminChatId) {
        bot.sendMessage(adminChatId, msgText, { parse_mode: 'Markdown' })
            .then(() => {
                res.json({ success: true, orderId, message: 'Notification sent successfully' });
            })
            .catch(err => {
                console.error('[Server] Telegram error:', err);
                res.json({ success: true, orderId, message: 'Order saved, telegram error' });
            });
    } else {
        console.warn('[Server] Bot inactive or admin chat ID missing.');
        res.json({ success: true, orderId, message: 'Order saved' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`[Server] Web application running at http://localhost:${PORT}`);
});

// Telegram Bot Administration Logic
const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
let bot = null;

if (!token) {
    console.warn('⚠️ WARNING: TELEGRAM_BOT_TOKEN is not defined in .env');
} else {
    bot = new TelegramBot(token, { polling: true });
    console.log('[Bot] Telegram Bot is running in polling mode.');

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

    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        if (isAdmin(msg)) {
            bot.sendMessage(chatId, '👋 Привет, Администратор! Добро пожаловать в панель управления *шебень.рф*.', {
                parse_mode: 'Markdown',
                ...getMainMenuKeyboard()
            });
        } else {
            bot.sendMessage(chatId, `👋 Ваш Chat ID: \`${chatId}\`\nУкажите его в .env (TELEGRAM_ADMIN_CHAT_ID).`, {
                parse_mode: 'Markdown'
            });
        }
    });

    bot.on('message', (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text || text.startsWith('/')) return;
        if (!isAdmin(msg)) {
            bot.sendMessage(chatId, '❌ Нет доступа к админ-панели.');
            return;
        }

        const state = userStates[chatId];

        if (state && state.action === 'set_price') {
            const newPrice = parseInt(text, 10);
            if (isNaN(newPrice) || newPrice < 0) {
                bot.sendMessage(chatId, '❌ Введите число.');
                return;
            }
            const settings = getSettings();
            if (settings.materials[state.material]) {
                settings.materials[state.material].price = newPrice;
                saveSettings(settings);
                bot.sendMessage(chatId, `✅ Цена обновлена: *${newPrice} ₽/м³*`, {
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
                bot.sendMessage(chatId, '❌ Введите число.');
                return;
            }
            const settings = getSettings();
            settings.deliveryRate = newRate;
            saveSettings(settings);
            bot.sendMessage(chatId, `✅ Тариф доставки обновлен: *${newRate} ₽/км*`, {
                parse_mode: 'Markdown',
                ...getMainMenuKeyboard()
            });
            delete userStates[chatId];
            return;
        }

        if (state && state.action === 'set_warehouse') {
            const parts = text.split(',').map(p => parseFloat(p.trim()));
            if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
                bot.sendMessage(chatId, '❌ Введите координаты (например: `56.146389, 93.112222`):', { parse_mode: 'Markdown' });
                return;
            }
            const settings = getSettings();
            settings.startCoords = parts;
            saveSettings(settings);
            bot.sendMessage(chatId, `✅ Координаты склада обновлены: *${parts[0]}, ${parts[1]}*`, {
                parse_mode: 'Markdown',
                ...getMainMenuKeyboard()
            });
            delete userStates[chatId];
            return;
        }

        switch (text) {
            case '💰 Цены материалов':
                const settings = getSettings();
                const inlineKeyboard = [];
                for (const key in settings.materials) {
                    inlineKeyboard.push([{
                        text: `${settings.materials[key].name} (${settings.materials[key].price} ₽)`,
                        callback_data: `edit_price_${key}`
                    }]);
                }
                bot.sendMessage(chatId, 'Выберите материал для изменения цены:', {
                    reply_markup: { inline_keyboard: inlineKeyboard }
                });
                break;

            case '🚚 Тариф доставки':
                userStates[chatId] = { action: 'set_delivery' };
                bot.sendMessage(chatId, `Текущий тариф доставки: *${getSettings().deliveryRate} ₽/км*\n\nВведите новый тариф (число):`, {
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                });
                break;

            case '📍 Координаты склада':
                userStates[chatId] = { action: 'set_warehouse' };
                bot.sendMessage(chatId, `Текущие координаты склада: *${getSettings().startCoords.join(', ')}*\n\nВведите новые координаты через запятую:`, {
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                });
                break;

            case '📄 Текущие настройки':
                const current = getSettings();
                let msg = '📄 *Текущие настройки:*\n\n*💰 Цены:*\n';
                for (const k in current.materials) {
                    msg += `• ${current.materials[k].name}: *${current.materials[k].price} ₽/м³*\n`;
                }
                msg += `\n*🚚 Доставка:* *${current.deliveryRate} ₽/км*\n`;
                msg += `*📍 Склад:* \`${current.startCoords.join(', ')}\``;
                bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
                break;

            default:
                bot.sendMessage(chatId, '❓ Выберите действие на клавиатуре.', getMainMenuKeyboard());
                break;
        }
    });

    bot.on('callback_query', (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        if (adminChatId && chatId.toString() !== adminChatId.toString()) {
            bot.answerCallbackQuery(query.id, { text: '❌ Нет доступа.', show_alert: true });
            return;
        }

        if (data.startsWith('edit_price_')) {
            const materialKey = data.replace('edit_price_', '');
            const settings = getSettings();
            const material = settings.materials[materialKey];
            if (material) {
                userStates[chatId] = { action: 'set_price', material: materialKey };
                bot.answerCallbackQuery(query.id);
                bot.sendMessage(chatId, `Текущая цена на *${material.name}*: *${material.price} ₽/м³*\n\nВведите новую цену:`, {
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                });
            }
        }
    });
}
