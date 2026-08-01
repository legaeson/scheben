const dns = require('dns');
try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 2000;
const SETTINGS_PATH = path.join(__dirname, 'settings.json');
const ORDERS_PATH = path.join(__dirname, 'orders.json');
const ORDERS_MD_PATH = path.join(__dirname, 'orders.md');
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'change-me-in-env';

app.set('trust proxy', 1);
app.use(express.json());

// Security middleware to protect internal data and source files
const forbiddenFiles = ['server.js', 'package.json', 'package-lock.json', 'orders.json', 'orders.md', 'settings.json', '.env'];

app.use((req, res, next) => {
    const filename = path.basename(req.path).toLowerCase();
    if (filename.startsWith('.') || forbiddenFiles.includes(filename) || req.path.includes('/node_modules/')) {
        return res.status(403).send('Forbidden: Access to this file is restricted');
    }
    next();
});

app.use(express.static(__dirname, {
    dotfiles: 'ignore',
    index: 'index.html'
}));

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

// Helper: Append Order to Markdown file (orders.md)
function appendOrderToMarkdown(orderData) {
    try {
        const formattedDate = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Krasnoyarsk' });
        const costStr = orderData.totalCost ? `${orderData.totalCost.toLocaleString('ru-RU')} ₽` : 'Уточняется';
        const notesStr = orderData.notes ? orderData.notes : '—';
        const addressStr = orderData.destinationAddress || 'Не указан (выбор по звонку)';
        const distStr = orderData.distance !== undefined ? `${orderData.distance} км` : 'Не рассчитана';

        let entry = `## Заявка № ${orderData.id} [${formattedDate}]\n`;
        entry += `- **Телефон:** ${orderData.phone}\n`;
        entry += `- **Материал:** ${orderData.material}\n`;
        entry += `- **Объём:** ${orderData.volume} м³\n`;
        entry += `- **Адрес доставки:** ${addressStr}\n`;
        entry += `- **Дистанция:** ${distStr}\n`;
        entry += `- **Ориентир стоимости:** ${costStr}\n`;
        entry += `- **Комментарий:** ${notesStr}\n`;
        entry += `- **Согласие на ПД:** Подтверждено на сайте\n`;
        entry += `----------------------------------------\n\n`;

        if (!fs.existsSync(ORDERS_MD_PATH)) {
            const header = `# Журнал заявок — КрасПесок.рф\n\nНиже автоматически сохраняются все поступающие заявки с сайта.\n\n----------------------------------------\n\n`;
            fs.writeFileSync(ORDERS_MD_PATH, header + entry, 'utf8');
        } else {
            fs.appendFileSync(ORDERS_MD_PATH, entry, 'utf8');
        }
    } catch (err) {
        console.error('[Server] Error appending order to orders.md:', err);
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

        appendOrderToMarkdown(orderData);

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
    const { phone, material, volume, distance, totalCost, destinationAddress, consentMeta } = req.body;
    if (!consentMeta || consentMeta.personalDataAccepted !== true) {
        return res.status(400).json({
            success: false,
            message: 'Personal data consent is required'
        });
    }

    const orderRecord = {
        ...req.body,
        source: req.body.source || 'website',
        consentMeta: {
            ...consentMeta,
            serverReceivedAt: new Date().toISOString(),
            ipAddress: req.ip,
            userAgent: req.get('user-agent') || '',
            consentMethod: 'single required checkbox for personal data in the website order form'
        }
    };
    const orderId = saveOrderToFile(orderRecord);

    console.log(`[Order] New order saved: ${orderId} for phone ${phone}`);
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
