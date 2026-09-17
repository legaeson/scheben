<?php
// order.php - Обработчик заявок для КрасПесок.рф (PHP 7.0 - 8.4+)
// Отправляет уведомления на Gmail через защищенное SSL SMTP-соединение
// и сохраняет резервную копию в orders.json

header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');

// Разрешаем CORS если необходимо
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Метод не поддерживается'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Получаем тело запроса
$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);

if (!is_array($data) || empty($data['phone'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Пожалуйста, укажите номер телефона'], JSON_UNESCAPED_UNICODE);
    exit;
}

$rawPhone = trim((string)$data['phone']);
$cleanDigits = preg_replace('/\D/', '', $rawPhone);

// Проверка длины номера (от 10 до 15 цифр)
if (strlen($cleanDigits) < 10 || strlen($cleanDigits) > 15) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Некорректный номер телефона'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Нормализуем номер для ссылки tel:
$telLink = '+' . preg_replace('/^8/', '7', $cleanDigits);
$material = !empty($data['material']) ? htmlspecialchars(trim((string)$data['material']), ENT_QUOTES, 'UTF-8') : 'Запрос звонка диспетчера';
$address = !empty($data['destinationAddress']) ? htmlspecialchars(trim((string)$data['destinationAddress']), ENT_QUOTES, 'UTF-8') : '';
$notes = !empty($data['notes']) ? htmlspecialchars(trim((string)$data['notes']), ENT_QUOTES, 'UTF-8') : '';

// Красноярское время (UTC+7)
$dt = new DateTime('now', new DateTimeZone('Asia/Krasnoyarsk'));
$orderTime = $dt->format('d.m.Y H:i:s');
$orderId = 'SCH-' . mt_rand(1000, 9999);

// 1. Сохранение в локальный файл orders.json (резервная копия на сервере)
$orderRecord = [
    'id' => $orderId,
    'timestamp' => $dt->format('c'),
    'phone' => $rawPhone,
    'cleanPhone' => $telLink,
    'material' => $material,
    'destinationAddress' => $address,
    'notes' => $notes,
    'ip' => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown',
    'userAgent' => isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : ''
];

$ordersFile = __DIR__ . '/orders.json';
$orders = [];
if (file_exists($ordersFile)) {
    $existing = @file_get_contents($ordersFile);
    if ($existing) {
        $orders = json_decode($existing, true);
        if (!is_array($orders)) $orders = [];
    }
}
$orders[] = $orderRecord;
// Ограничиваем историю последними 500 заявками
if (count($orders) > 500) {
    $orders = array_slice($orders, -500);
}
@file_put_contents($ordersFile, json_encode($orders, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

// Также пишем в текстовый журнал orders.txt
$txtLine = sprintf("[%s] Заявка %s | Тел: %s | Материал: %s\n", $orderTime, $orderId, $rawPhone, $material);
@file_put_contents(__DIR__ . '/orders.txt', $txtLine, FILE_APPEND);

// 2. Отправка Email на Gmail
$to = 'isthismytea@gmail.com';
$smtpUser = 'isthismytea@gmail.com';
$smtpPass = 'wiouewhahcapgqui'; // Google App Password
$subject = "🚜 Новая заявка на звонок: {$rawPhone} (КрасПесок.рф)";

$html = <<<HTML
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>Заявка КрасПесок.рф</title>
</head>
<body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #10b981;">
            <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">🚜 КрасПесок.рф — Заявка на звонок</h1>
        </div>
        <div style="padding: 24px;">
            <p style="margin-top: 0; font-size: 15px; color: #475569;">Клиент оставил номер на сайте и ожидает звонка диспетчера:</p>
            
            <div style="background: #f0fdf4; border: 2px solid #bbf7d0; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0;">
                <div style="font-size: 13px; text-transform: uppercase; color: #166534; font-weight: 700; margin-bottom: 6px;">Номер телефона клиента:</div>
                <a href="tel:{$telLink}" style="font-size: 26px; font-weight: 800; color: #15803d; text-decoration: none; display: block; margin-bottom: 12px;">{$rawPhone}</a>
                <a href="tel:{$telLink}" style="display: inline-block; background: #10b981; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 16px;">📞 Набрать клиента</a>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 15px;">
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 140px;">Материал:</td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">{$material}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Время заявки:</td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">{$orderTime} (Красноярск)</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">ID заявки:</td>
                    <td style="padding: 8px 0; color: #64748b;">{$orderId}</td>
                </tr>
HTML;

if (!empty($address)) {
    $html .= <<<HTML
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Адрес:</td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">{$address}</td>
                </tr>
HTML;
}

if (!empty($notes)) {
    $html .= <<<HTML
                <tr>
                    <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Комментарий:</td>
                    <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">{$notes}</td>
                </tr>
HTML;
}

$html .= <<<HTML
            </table>
        </div>
        <div style="padding: 14px 24px; background: #f1f5f9; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0;">
            Уведомление отправлено для {$to} с сайта КрасПесок.рф
        </div>
    </div>
</body>
</html>
HTML;

$text = "Новая заявка с сайта КрасПесок.рф\n\nТелефон: {$rawPhone}\nМатериал: {$material}\nВремя: {$orderTime} (Красноярск)\nНабрать: tel:{$telLink}\nID: {$orderId}\n";

// Отправка через SMTP (SSL порт 465)
$mailSent = sendSmtpSsl($smtpUser, $smtpPass, $to, $subject, $html, $text);

// Если SMTP не сработал (например, хостинг блокирует исходящий порт 465), пробуем встроенный mail()
if (!$mailSent) {
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: =?UTF-8?B?" . base64_encode("КрасПесок.рф") . "?= <no-reply@краспесок.рф>\r\n";
    $headers .= "Reply-To: {$to}\r\n";
    @mail($to, $encodedSubject, $html, $headers);
}

// Возвращаем успешный ответ браузеру
echo json_encode([
    'success' => true,
    'orderId' => $orderId,
    'message' => 'Номер успешно принят! Диспетчер перезвонит в течение 3 минут.'
], JSON_UNESCAPED_UNICODE);


/**
 * Встроенный легковесный клиент SMTP через SSL (без внешних библиотек)
 */
function sendSmtpSsl($user, $pass, $to, $subject, $html, $text) {
    $host = 'smtp.gmail.com';
    $port = 465;
    $timeout = 8;

    $ctx = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false,
            'allow_self_signed' => true
        ]
    ]);

    $socket = @stream_socket_client("ssl://{$host}:{$port}", $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT, $ctx);
    if (!$socket) {
        error_log("[SMTP Socket Error] $errstr ($errno)");
        return false;
    }

    stream_set_timeout($socket, $timeout);

    $read = function() use ($socket) {
        $out = '';
        while ($str = fgets($socket, 515)) {
            $out .= $str;
            if (substr($str, 3, 1) === ' ') break;
        }
        return $out;
    };

    $send = function($cmd, $expect) use ($socket, $read) {
        fputs($socket, $cmd . "\r\n");
        $res = $read();
        return (substr($res, 0, 3) === (string)$expect);
    };

    $greet = $read();
    if (substr($greet, 0, 3) !== '220') {
        fclose($socket);
        return false;
    }

    $helloHost = isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost';
    if (!$send("EHLO " . $helloHost, 250)) {
        fclose($socket);
        return false;
    }

    if (!$send("AUTH LOGIN", 334)) {
        fclose($socket);
        return false;
    }

    if (!$send(base64_encode($user), 334)) {
        fclose($socket);
        return false;
    }

    if (!$send(base64_encode($pass), 235)) {
        fclose($socket);
        return false;
    }

    if (!$send("MAIL FROM: <{$user}>", 250)) {
        fclose($socket);
        return false;
    }

    if (!$send("RCPT TO: <{$to}>", 250)) {
        fclose($socket);
        return false;
    }

    if (!$send("DATA", 354)) {
        fclose($socket);
        return false;
    }

    $boundary = '=_boundary_' . md5(uniqid(microtime(true), true));
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

    $headers = [
        "From: =?UTF-8?B?" . base64_encode("КрасПесок.рф") . "?= <{$user}>",
        "To: <{$to}>",
        "Subject: {$encodedSubject}",
        "Date: " . date('r'),
        "MIME-Version: 1.0",
        "Content-Type: multipart/alternative; boundary=\"{$boundary}\""
    ];

    $body = [
        "--{$boundary}",
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        chunk_split(base64_encode($text)),
        "--{$boundary}",
        "Content-Type: text/html; charset=UTF-8",
        "Content-Transfer-Encoding: base64",
        "",
        chunk_split(base64_encode($html)),
        "--{$boundary}--"
    ];

    $fullMessage = implode("\r\n", $headers) . "\r\n\r\n" . implode("\r\n", $body) . "\r\n.";

    if (!$send($fullMessage, 250)) {
        fclose($socket);
        return false;
    }

    $send("QUIT", 221);
    fclose($socket);
    return true;
}
