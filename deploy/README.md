# Инструкция по деплою сайта КрасПесок.рф на сервер

В этой папке подготовлено всё необходимое для запуска сайта на продакшн-сервере (Ubuntu / Debian / CentOS или любом другом Linux VPS / VDS).

---

## Содержимое папки `deploy`

* `public/` — изолированная директория публичных веб-файлов (HTML, CSS, JS, изображения, правовые документы 152-ФЗ, robots, sitemap)
* `server.js` — защищенный Node.js сервер (Express, Helmet, Rate-Limit, 152-FZ очистка, защита от DoS)
* `package.json` и `package-lock.json` — зависимости приложения
* `.env` — файл настроек окружения
* `ecosystem.config.js` — конфигурация для менеджера процессов PM2
* `Dockerfile` и `docker-compose.yml` — запуск через изолированный Docker-контейнер
* `nginx.conf` — защищенный конфиг проксирования Nginx с блокировкой системных файлов
* `kraspesok.service` — конфиг системного сервиса systemd
* `orders.json` — локальная база заявок (создается автоматически)

---

## 🚀 Способ 1: Запуск через PM2 (Самый простой и рекомендуемый)

1. Загрузите файлы на сервер в директорию `/var/www/kraspesok`:
   ```bash
   mkdir -p /var/www/kraspesok
   # Скопируйте файлы (через FileZilla, SCP или распакуйте deploy.zip)
   cd /var/www/kraspesok
   ```

2. Установите зависимости (если Node.js v18+ уже установлен):
   ```bash
   npm ci --omit=dev
   ```

3. Установите PM2 (если не установлен):
   ```bash
   npm install -g pm2
   ```

4. Запустите сайт через PM2:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```
   *Сайт сразу начнет работать на порту 2000 в фоновом режиме с автозапуском при перезагрузке сервера.*

5. Полезные команды управления:
   * `pm2 status` — статус приложения
   * `pm2 logs kraspesok` — просмотр логов
   * `pm2 restart kraspesok` — перезапуск

---

## 🐳 Способ 2: Запуск в одну команду через Docker Compose

Если на сервере установлен Docker:

1. Перейдите в папку с файлами:
   ```bash
   cd /var/www/kraspesok
   ```

2. Запустите контейнер:
   ```bash
   docker compose up -d --build
   ```

3. Проверка статуса:
   ```bash
   docker compose ps
   docker compose logs -f
   ```

---

## ⚙️ Настройка Nginx и бесплатного SSL (HTTPS)

Чтобы сайт открывался по стандартному адресу `http://краспесок.рф` (порт 80) и по защищенному `https://`:

1. Скопируйте конфиг Nginx и удалите дефолтный сайт:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/kraspesok
   sudo rm -f /etc/nginx/sites-enabled/default
   sudo ln -sf /etc/nginx/sites-available/kraspesok /etc/nginx/sites-enabled/
   sudo chmod -R 755 /var/www/kraspesok
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. Получите бесплатный SSL-сертификат Let's Encrypt (Certbot):
   ```bash
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d xn--80aknctefjc.xn--p1ai -d kraspesok.ru
   ```
   *Certbot автоматически настроит HTTPS и автоматическое продление.*

---

## 📞 Реквизиты в коде

* **Исполнитель:** Чалабиев Гафлан Эльдар оглы (самозанятый, НПД)
* **ИНН:** `240802262403`
* **Телефон диспетчера:** `+7 (995) 075-84-14`
* **Электронная почта:** `поддержка@краспесок.рф`

