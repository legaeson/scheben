const express = require('express');
const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 2000;
const SETTINGS_PATH = path.join(__dirname, 'settings.json');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'change-me-in-env';

app.use(express.json());
// Serve static website files
app.use(express.static(__dirname));

// Load settings helper
function getSettings() {
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            const data = fs.readFileSync(SETTINGS_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error reading settings.json:', e);
    }
    // Default fallback
    return {
        materials: {
            crushed_stone: {
                name: 'Щебень',
                variants: [
                    { id: 'frac_4_8', name: '4-8', price: 750 },
                    { id: 'frac_5_10', name: '5-10', price: 750 },
                    { id: 'frac_8_16', name: '8-16', price: 1000 },
                    { id: 'frac_5_20', name: '5-20', price: 1000 },
                    { id: 'frac_10_20', name: '10-20', price: 1000 }
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
                    { id: 'gps_0_20', name: 'ГПС 0-20', price: 550 },
                    { id: 'gravel_5_20', name: 'Гравий 5-20', price: 550 }
                ]
            },
            anti_ice: { name: 'Противогололедный материал', price: 1400 },
            crushed_brick: { name: 'Битый кирпич', price: 800 },
            expanded_clay: { name: 'Керамзит', price: 1600 },
            chernozem: { name: 'Чернозём', price: 1000 }
        },
        deliveryRate: 400,
        startCoords: [56.146389, 93.112222]
    };
}

// Save settings helper
function saveSettings(settings) {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error writing settings.json:', e);
        return false;
    }
}

// API endpoint to fetch current settings
app.get('/api/settings', (req, res) => {
    res.json(getSettings());
});

// API endpoint to save settings (optional)
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

const ORDERS_PATH = path.join(__dirname, 'orders.json');

// Helper to save order to JSON file
function saveOrderToFile(orderData) {
    try {
        let orders = [];
        if (fs.existsSync(ORDERS_PATH)) {
            const data = fs.readFileSync(ORDERS_PATH, 'utf8');
            if (data) {
                orders = JSON.parse(data);
            }
        }
        orderData.timestamp = new Date().toISOString();
        orders.push(orderData);
        fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2), 'utf8');
    } catch (err) {
        console.error('[Server] Error saving order to file:', err);
    }
}

// API endpoint to handle order request
app.post('/api/order', (req, res) => {
    const { phone, material, volume, distance, totalCost, destinationAddress } = req.body;
    
    // Save to local file
    saveOrderToFile(req.body);

    // Construct a nice notification message
    let msgText = `🔔 *Новый запрос с сайта!*\n\n`;
    msgText += `📱 *Телефон:* ${phone}\n`;
    msgText += `📍 *Адрес:* ${destinationAddress}\n`;
    msgText += `📦 *Материал:* ${material}\n`;
    msgText += `🔢 *Объем:* ${volume} м³\n`;
    msgText += `🚗 *Дистанция:* ${distance} км\n`;
    msgText += `💰 *Ориентировочная стоимость:* ${totalCost} ₽\n`;

    if (bot && adminChatId) {
        bot.sendMessage(adminChatId, msgText, { parse_mode: 'Markdown' })
        .then(() => {
            res.json({ success: true, message: 'Telegram notification sent successfully' });
        })
        .catch(err => {
            console.error('[Server] Failed to send Telegram order notification:', err);
            res.status(500).json({ success: false, message: 'Failed to send Telegram notification' });
        });
    } else {
        console.warn('[Server] Telegram bot not active or admin ID not set. Cannot send order notification.');
        res.json({ success: true, message: 'Order saved, Telegram notification skipped' });
    }
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`[Server] Web application running at http://localhost:${PORT}`);
});

// --- Telegram Bot Admin Logic ---
const token = process.env.TELEGRAM_BOT_TOKEN;
const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
let bot = null;

if (!token) {
    console.warn('\n================================================================');
    console.warn('⚠️ WARNING: TELEGRAM_BOT_TOKEN is not defined in the .env file.');
    console.warn('Telegram Bot Admin Panel is currently DISABLED.');
    console.warn('Please create a .env file with your token to enable it.');
    console.warn('================================================================\n');
} else {
    // Initialize Telegram Bot with polling
    bot = new TelegramBot(token, { polling: true });
    console.log('[Bot] Telegram Bot is running in polling mode.');

    // Track active user conversations and states
    const userStates = {};

    // Helper to generate Main Menu keyboard
    const getMainMenuKeyboard = () => {
        return {
            reply_markup: {
                keyboard: [
                    [{ text: '💰 Цены материалов' }, { text: '🚚 Тариф доставки' }],
                    [{ text: '📍 Координаты склада' }, { text: '📄 Текущие настройки' }]
                ],
                resize_keyboard: true
            }
        };
    };

    // Helper to check if sender is admin
    const isAdmin = (msg) => {
        if (!adminChatId) return false;
        return msg.chat.id.toString() === adminChatId.toString();
    };

    // Listen for commands
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;

        if (adminChatId && chatId.toString() === adminChatId.toString()) {
            bot.sendMessage(chatId, '👋 Привет, Администратор! Добро пожаловать в панель управления сайтом *шебень.рф*. Выберите действие на клавиатуре:', {
                parse_mode: 'Markdown',
                ...getMainMenuKeyboard()
            });
        } else {
            bot.sendMessage(chatId, `👋 Привет!\n\nТвой Chat ID: \`${chatId}\`\n\nЧтобы управлять сайтом через этого бота, укажи этот ID в файле \`.env\` в поле \`TELEGRAM_ADMIN_CHAT_ID\` и перезапусти сервер.`, {
                parse_mode: 'Markdown'
            });
        }
    });

    // Handle text messages
    bot.on('message', (msg) => {
        const chatId = msg.chat.id;
        const text = msg.text;

        if (!text || text.startsWith('/')) return;

        // Verify admin permissions
        if (!isAdmin(msg)) {
            bot.sendMessage(chatId, '❌ У вас нет доступа к административным функциям.');
            return;
        }

        const state = userStates[chatId];

        // 1. Handle price changes
        if (state && state.action === 'set_price') {
            const newPrice = parseInt(text, 10);
            if (isNaN(newPrice) || newPrice < 0) {
                bot.sendMessage(chatId, '❌ Пожалуйста, введите корректное положительное число.');
                return;
            }

            const settings = getSettings();
            const material = settings.materials[state.material];
            if (material) {
                material.price = newPrice;
                saveSettings(settings);
                bot.sendMessage(chatId, `✅ Цена на *${material.name}* успешно обновлена до *${newPrice} ₽/м³*!`, {
                    parse_mode: 'Markdown',
                    ...getMainMenuKeyboard()
                });
            } else {
                bot.sendMessage(chatId, '❌ Произошла ошибка. Материал не найден.', getMainMenuKeyboard());
            }
            delete userStates[chatId];
            return;
        }

        // 2. Handle delivery rate changes
        if (state && state.action === 'set_delivery') {
            const newRate = parseInt(text, 10);
            if (isNaN(newRate) || newRate < 0) {
                bot.sendMessage(chatId, '❌ Пожалуйста, введите корректное положительное число.');
                return;
            }

            const settings = getSettings();
            settings.deliveryRate = newRate;
            saveSettings(settings);
            bot.sendMessage(chatId, `✅ Тариф доставки успешно изменен на *${newRate} ₽/км*!`, {
                parse_mode: 'Markdown',
                ...getMainMenuKeyboard()
            });
            delete userStates[chatId];
            return;
        }

        // 3. Handle warehouse coordinates changes
        if (state && state.action === 'set_warehouse') {
            const parts = text.split(',').map(p => parseFloat(p.trim()));
            if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
                bot.sendMessage(chatId, '❌ Некорректный формат. Пожалуйста, введите две координаты через запятую (например: `56.146389, 93.112222`):', {
                    parse_mode: 'Markdown'
                });
                return;
            }

            const settings = getSettings();
            settings.startCoords = parts;
            saveSettings(settings);
            bot.sendMessage(chatId, `✅ Координаты склада успешно обновлены на *${parts[0]}, ${parts[1]}*!`, {
                parse_mode: 'Markdown',
                ...getMainMenuKeyboard()
            });
            delete userStates[chatId];
            return;
        }

        // 4. Handle menu clicks
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
                const currentSettings = getSettings();
                userStates[chatId] = { action: 'set_delivery' };
                bot.sendMessage(chatId, `Текущий тариф доставки: *${currentSettings.deliveryRate} ₽/км*\n\nВведите новый тариф доставки (число):`, {
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                });
                break;

            case '📍 Координаты склада':
                const currentSettingsCoords = getSettings();
                userStates[chatId] = { action: 'set_warehouse' };
                bot.sendMessage(chatId, `Текущие координаты склада: *${currentSettingsCoords.startCoords[0]}, ${currentSettingsCoords.startCoords[1]}*\n\nВведите новые координаты склада через запятую (например, \`56.146389, 93.112222\`):`, {
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                });
                break;

            case '📄 Текущие настройки':
                const current = getSettings();
                let msgText = '📄 *Текущие настройки сайта:*\n\n';
                msgText += '*💰 Цены материалов:*\n';
                for (const key in current.materials) {
                    msgText += `• ${current.materials[key].name}: *${current.materials[key].price} ₽/м³*\n`;
                }
                msgText += `\n*🚚 Доставка:* *${current.deliveryRate} ₽/км*\n`;
                msgText += `*📍 Склад:* \`${current.startCoords[0]}, ${current.startCoords[1]}\``;
                
                bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown' });
                break;

            default:
                bot.sendMessage(chatId, '❓ Команда не распознана. Используйте клавиатуру меню.', getMainMenuKeyboard());
                break;
        }
    });

    // Handle inline callback buttons (materials selection)
    bot.on('callback_query', (query) => {
        const chatId = query.message.chat.id;
        const data = query.data;

        // Verify admin permissions
        if (adminChatId && chatId.toString() !== adminChatId.toString()) {
            bot.answerCallbackQuery(query.id, { text: '❌ Доступ ограничен.', show_alert: true });
            return;
        }

        if (data.startsWith('edit_price_')) {
            const materialKey = data.replace('edit_price_', '');
            const settings = getSettings();
            const material = settings.materials[materialKey];

            if (material) {
                userStates[chatId] = { action: 'set_price', material: materialKey };
                bot.answerCallbackQuery(query.id);
                bot.sendMessage(chatId, `Текущая цена на *${material.name}*: *${material.price} ₽/м³*\n\nВведите новую цену (число):`, {
                    parse_mode: 'Markdown',
                    reply_markup: { remove_keyboard: true }
                });
            } else {
                bot.answerCallbackQuery(query.id, { text: 'Ошибка: материал не найден.', show_alert: true });
            }
        }
    });
}
