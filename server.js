const dns = require('dns');
try {
    dns.setDefaultResultOrder('ipv4first');
} catch (e) {}

const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 2000;
const ORDERS_PATH = path.join(__dirname, 'orders.json');
const ORDERS_MD_PATH = path.join(__dirname, 'orders.md');
const PUBLIC_DIR = path.join(__dirname, 'public');
const EMAIL_TO = process.env.EMAIL_TO || 'isthismytea@gmail.com';

// Trust only loopback proxy (Nginx on same server)
app.set('trust proxy', 'loopback');

// Body parser with strict size limit to prevent memory exhaustion DoS
app.use(express.json({ limit: '10kb' }));

app.disable('x-powered-by');
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc:     ["'self'", "data:"],
            scriptSrc:  ["'self'"],
            styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc:    ["'self'", "https://fonts.gstatic.com", "data:"],
            // OpenStreetMap: Nominatim (геокодинг) + OSRM (маршруты)
            connectSrc: [
                "'self'",
                "https://nominatim.openstreetmap.org",
                "https://router.project-osrm.org",
            ],
        }
    },
    frameguard: { action: 'deny' }
}));

// Strictly serve only public directory with optimized caching headers
app.use(express.static(PUBLIC_DIR, {
    dotfiles: 'ignore',
    index: 'index.html',
    maxAge: '7d',
    setHeaders: (res, filePath) => {
        if (/\.(webp|avif|jpg|jpeg|png|svg|ico)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (/\.(css|js)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
        } else if (/\.html$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
    }
}));

// Rate Limiter for Order Submissions (Anti-DDoS / Anti-Spam protection)
const orderRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes window
    max: 5, // Max 5 submissions per 10 minutes per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Слишком много заявок с вашего устройства. Пожалуйста, подождите 10 минут или позвоните диспетчеру по телефону +7 (995) 075-84-14'
    }
});

// Escape string for safe Markdown logging (strips newlines & escapes markdown + HTML tags)
function escapeMarkdown(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/[\r\n]+/g, ' ')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/([#*\[\]()_\\`~|])/g, '\\$1')
        .trim();
}

// Atomic file write helper to prevent 0-byte corrupted files during crashes (with Docker bind mount fallback)
function atomicWriteFileSync(filePath, content) {
    const tempPath = `${filePath}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    try {
        fs.writeFileSync(tempPath, content, 'utf8');
        fs.renameSync(tempPath, filePath);
    } catch (err) {
        fs.writeFileSync(filePath, content, 'utf8');
        if (fs.existsSync(tempPath)) {
            try { fs.unlinkSync(tempPath); } catch (e) {}
        }
    }
}

// Rebuild Markdown Log from Valid Active Orders
function rebuildMarkdownLog(orders) {
    try {
        let header = `# Журнал заявок — КрасПесок.рф\n\nНиже автоматически сохраняются все поступающие заявки с сайта (Срок хранения: 30 дней).\n\n----------------------------------------\n\n`;
        let content = header;
        orders.forEach(orderData => {
            const dateObj = orderData.timestamp ? new Date(orderData.timestamp) : new Date();
            const formattedDate = dateObj.toLocaleString('ru-RU', { timeZone: 'Asia/Krasnoyarsk' });
            const notesStr = orderData.notes ? escapeMarkdown(orderData.notes) : '—';
            const addressStr = escapeMarkdown(orderData.destinationAddress || 'Не указан (выбор по звонку)');

            content += `## Заявка № ${escapeMarkdown(orderData.id)} [${formattedDate}]\n`;
            content += `- **Телефон:** ${escapeMarkdown(orderData.phone)}\n`;
            content += `- **Материал:** ${escapeMarkdown(orderData.material)}\n`;
            content += `- **Объём:** ${escapeMarkdown(String(orderData.volume || 20))} м³\n`;
            content += `- **Адрес доставки:** ${addressStr}\n`;
            content += `- **Комментарий:** ${notesStr}\n`;
            content += `----------------------------------------\n\n`;
        });
        atomicWriteFileSync(ORDERS_MD_PATH, content);
    } catch (err) {
        console.error('[Server] Error rebuilding orders.md:', err);
    }
}

// Thread-safe write queue
let writeQueue = Promise.resolve();

function enqueueTask(taskFn) {
    writeQueue = writeQueue.then(() => {
        try {
            return taskFn();
        } catch (err) {
            console.error('[Queue Task Error]', err);
        }
    });
    return writeQueue;
}

// 30-Day Automated Log Retention Purge
function cleanupOldOrders() {
    return enqueueTask(() => {
        if (!fs.existsSync(ORDERS_PATH)) return;
        const data = fs.readFileSync(ORDERS_PATH, 'utf8');
        if (!data) return;
        let orders = [];
        try {
            orders = JSON.parse(data);
        } catch (e) {
            return;
        }
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const initialCount = orders.length;

        orders = orders.filter(order => {
            if (!order.timestamp) return true;
            const orderTime = new Date(order.timestamp).getTime();
            return (now - orderTime) <= thirtyDaysMs;
        });

        if (orders.length !== initialCount) {
            atomicWriteFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));
            rebuildMarkdownLog(orders);
            console.log(`[Purge Task] Removed ${initialCount - orders.length} order(s) older than 30 days. Active count: ${orders.length}`);
        }
    });
}

function backupOrders() {
    return enqueueTask(() => {
        if (!fs.existsSync(ORDERS_PATH)) return;
        const backupDir = path.join(__dirname, 'backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const dateStr = new Date().toISOString().split('T')[0];
        const backupPath = path.join(backupDir, `orders-${dateStr}.json`);
        fs.copyFileSync(ORDERS_PATH, backupPath);
        console.log(`[Backup] Created backup: ${backupPath}`);

        // Purge backups older than 30 days
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const files = fs.readdirSync(backupDir);
        files.forEach(file => {
            const filePath = path.join(backupDir, file);
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > thirtyDaysMs) {
                fs.unlinkSync(filePath);
                console.log(`[Backup Purge] Removed old backup file: ${file}`);
            }
        });
    });
}

// Append Order to Markdown file (orders.md)
function appendOrderToMarkdown(orderData) {
    try {
        const formattedDate = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Krasnoyarsk' });
        const notesStr = orderData.notes ? escapeMarkdown(orderData.notes) : '—';
        const addressStr = escapeMarkdown(orderData.destinationAddress || 'Не указан (выбор по звонку)');

        let entry = `## Заявка № ${escapeMarkdown(orderData.id)} [${formattedDate}]\n`;
        entry += `- **Телефон:** ${escapeMarkdown(orderData.phone)}\n`;
        entry += `- **Материал:** ${escapeMarkdown(orderData.material)}\n`;
        entry += `- **Объём:** ${escapeMarkdown(String(orderData.volume))} м³\n`;
        entry += `- **Адрес доставки:** ${addressStr}\n`;
        entry += `- **Комментарий:** ${notesStr}\n`;
        entry += `----------------------------------------\n\n`;

        if (!fs.existsSync(ORDERS_MD_PATH)) {
            const header = `# Журнал заявок — КрасПесок.рф\n\nНиже автоматически сохраняются все поступающие заявки с сайта.\n\n----------------------------------------\n\n`;
            atomicWriteFileSync(ORDERS_MD_PATH, header + entry);
        } else {
            fs.appendFileSync(ORDERS_MD_PATH, entry, 'utf8');
        }
    } catch (err) {
        console.error('[Server] Error appending order to orders.md:', err);
    }
}

// Save Order Helper with crypto-secure Order ID
function saveOrderToFile(orderData) {
    return new Promise((resolve) => {
        enqueueTask(() => {
            try {
                let orders = [];
                if (fs.existsSync(ORDERS_PATH)) {
                    const data = fs.readFileSync(ORDERS_PATH, 'utf8');
                    if (data) {
                        try {
                            orders = JSON.parse(data);
                        } catch (e) {
                            orders = [];
                        }
                    }
                }
                const secureSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
                orderData.id = orderData.id || `SCH-${Date.now().toString(36).toUpperCase()}-${secureSuffix}`;
                orderData.timestamp = new Date().toISOString();
                orders.push(orderData);
                atomicWriteFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));

                appendOrderToMarkdown(orderData);

                resolve(orderData.id);
            } catch (err) {
                console.error('[Server] Error saving order:', err);
                const fallbackId = `SCH-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
                resolve(fallbackId);
            }
        });
    });
}

// Email Transporter Helper
let mailTransporter = null;
function getMailTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        return null;
    }

    if (!mailTransporter) {
        mailTransporter = nodemailer.createTransport({
            host: host,
            port: Number(process.env.SMTP_PORT) || 465,
            secure: process.env.SMTP_SECURE !== 'false',
            auth: {
                user: user,
                pass: pass
            },
            connectionTimeout: 10000
        });
    }
    return mailTransporter;
}

// Send Instant Email Notification to Business Owner
async function sendLeadEmail(leadData) {
    const cleanPhone = (leadData.phone || '').trim();
    const rawDigits = cleanPhone.replace(/\D/g, '');
    const telLink = rawDigits.startsWith('8') ? '+7' + rawDigits.slice(1) : (rawDigits.startsWith('7') ? '+' + rawDigits : '+' + rawDigits);
    const material = leadData.material || 'Запрос звонка диспетчера';
    const now = new Date();
    const formattedDate = now.toLocaleString('ru-RU', { timeZone: 'Asia/Krasnoyarsk' });

    const transporter = getMailTransporter();
    if (!transporter) {
        console.log(`[Email] Заявка получена: ${cleanPhone} | Материал: ${material}. Письмо не отправлено: заполните SMTP_PASS в .env`);
        return false;
    }

    const subject = `🔔 Заявка на звонок: ${cleanPhone} [${material}]`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #0f172a; }
            .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 14px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06); }
            .header { background: #0f172a; color: #ffffff; padding: 22px 24px; text-align: center; }
            .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
            .content { padding: 28px 24px; }
            .phone-box { background: #ecfdf5; border: 2px solid #10b981; border-radius: 12px; padding: 18px; text-align: center; margin: 18px 0; }
            .phone-label { font-size: 13px; color: #047857; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 6px; }
            .phone-link { font-size: 24px; font-weight: 800; color: #065f46; text-decoration: none; }
            .btn-call { display: block; width: 100%; max-width: 260px; margin: 14px auto 0; background: #10b981; color: #ffffff !important; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 700; font-size: 16px; text-align: center; box-sizing: border-box; }
            .field-row { margin-bottom: 12px; font-size: 15px; }
            .field-label { color: #64748b; font-weight: 600; display: inline-block; min-width: 140px; }
            .field-value { color: #0f172a; font-weight: 700; }
            .footer { padding: 14px 24px; background: #f1f5f9; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="header">
                <h1>🚜 КрасПесок.рф — Заявка на звонок</h1>
            </div>
            <div class="content">
                <p style="margin-top: 0; font-size: 15px; color: #475569;">Клиент оставил номер на сайте и ждет звонка диспетчера:</p>
                
                <div class="phone-box">
                    <div class="phone-label">Номер телефона клиента:</div>
                    <a href="tel:${telLink}" class="phone-link">${cleanPhone}</a>
                    <a href="tel:${telLink}" class="btn-call">📞 Набрать клиента</a>
                </div>

                <div class="field-row">
                    <span class="field-label">Материал:</span>
                    <span class="field-value">${material}</span>
                </div>
                <div class="field-row">
                    <span class="field-label">Время заявки:</span>
                    <span class="field-value">${formattedDate} (Красноярск)</span>
                </div>
                ${leadData.destinationAddress && leadData.destinationAddress !== 'Запрос перезвона диспетчера' ? `<div class="field-row"><span class="field-label">Адрес:</span> <span class="field-value">${escapeMarkdown(leadData.destinationAddress)}</span></div>` : ''}
                ${leadData.notes ? `<div class="field-row"><span class="field-label">Комментарий:</span> <span class="field-value">${escapeMarkdown(leadData.notes)}</span></div>` : ''}
            </div>
            <div class="footer">
                Уведомление отправлено для ${EMAIL_TO} с сайта КрасПесок.рф
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `Новая заявка с сайта КрасПесок.рф\n\nТелефон клиента: ${cleanPhone}\nМатериал: ${material}\nВремя: ${formattedDate} (Красноярск)\nНабрать: tel:${telLink}\n`;

    try {
        const info = await transporter.sendMail({
            from: `"КрасПесок.рф" <${process.env.SMTP_USER}>`,
            to: EMAIL_TO,
            subject: subject,
            text: text,
            html: html
        });
        console.log(`[Email Sent] Уведомление успешно отправлено на ${EMAIL_TO}: ${info.messageId}`);
        return true;
    } catch (err) {
        console.error('[Email Error] Ошибка отправки письма:', err.message);
        return false;
    }
}

// Input validation with strict type checking and length limits
function isValidOrder(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
    if (typeof body.phone !== 'string' || body.phone.length < 10 || body.phone.length > 35) return false;
    
    const cleanedPhone = body.phone.replace(/\D/g, '').replace(/^8/, '7');
    if (!/^\+?\d{10,15}$/.test(cleanedPhone)) return false;
    
    if (body.material && (typeof body.material !== 'string' || body.material.length > 200)) return false;
    if (body.destinationAddress && (typeof body.destinationAddress !== 'string' || body.destinationAddress.length > 300)) return false;
    if (body.notes && (typeof body.notes !== 'string' || body.notes.length > 1000)) return false;
    
    if (body.volume !== undefined && body.volume !== null && body.volume !== '') {
        const vol = Number(body.volume);
        if (isNaN(vol) || vol <= 0 || vol > 1000) return false;
    }
    
    const validSources = ['website', 'callback', 'Запрос по звонку'];
    if (!validSources.includes(body.source)) {
        body.source = 'website';
    }
    
    return true;
}

// API Routes with try/catch to prevent unhandled rejections
app.post('/api/order', orderRateLimiter, async (req, res) => {
    try {
        if (!isValidOrder(req.body)) {
            return res.status(400).json({ success: false, message: 'Invalid order data' });
        }

        const { phone, material, volume, destinationAddress, notes, source } = req.body;

        const orderRecord = {
            phone: phone.trim(),
            material: material ? material.trim() : 'Запрос звонка диспетчера',
            volume: Number(volume) || 20,
            destinationAddress: destinationAddress ? destinationAddress.trim() : 'Запрос перезвона диспетчера',
            notes: notes ? notes.trim() : '',
            source: source || 'website'
        };
        const orderId = await saveOrderToFile(orderRecord);

        // Dispatch instant email notification to owner
        sendLeadEmail(orderRecord).catch(err => {
            console.error('[Email Dispatch Error]', err.message);
        });

        const maskedPhone = phone ? phone.replace(/\d(?=(?:\D*\d){0,3}$)/g, '*') : '***';
        console.log(`[Order] New lead saved: ${orderId} for phone ${maskedPhone}`);
        return res.json({ success: true, orderId, message: 'Номер успешно принят! Диспетчер перезвонит в течение 3 минут.' });
    } catch (err) {
        console.error('[API Error] /api/order:', err);
        return res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
    }
});

// Fallback 404 for unknown routes
app.use((req, res) => {
    res.status(404).send('Not Found');
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Unhandled Express Error]', err.message);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        success: false,
        message: status === 400 ? 'Некорректный запрос (неверный формат JSON)' : 'Внутренняя ошибка сервера'
    });
});

// Process-level crash prevention
process.on('unhandledRejection', (reason, promise) => {
    console.error('[Process] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[Process] Uncaught Exception:', err);
});

// Run 30-day retention cleanup on startup and schedule every 24 hours
cleanupOldOrders();
setInterval(cleanupOldOrders, 24 * 60 * 60 * 1000);
backupOrders();
setInterval(backupOrders, 24 * 60 * 60 * 1000);

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
