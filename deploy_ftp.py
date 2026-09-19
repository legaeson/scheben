import os
import sys
import ftplib
from dotenv import load_dotenv

# Загружаем настройки из .env
load_dotenv()

FTP_HOST = os.getenv('FTP_HOST', '5.253.61.76')
FTP_USER = os.getenv('FTP_USER')
FTP_PASS = os.getenv('FTP_PASS')
FTP_DIR = os.getenv('FTP_DIR', 'www/xn--80aknctefjc.xn--p1ai/public')

if not FTP_USER or not FTP_PASS:
    print("[ERROR] Не заданы FTP_USER или FTP_PASS в файле .env!")
    sys.exit(1)

# Ключевые файлы корня сайта
ROOT_FILES = [
    'index.html',
    'index_full.html',
    'maintenance.html',
    'business-config.js',
    'pricing-engine.js',
    'admin.html',
    'app.js',
    'order.php',
    '.htaccess',
    'style.css',
    'oferta.html',
    'delivery_terms.html',
    'privacy.html',
    'consent.html',
    'cookies.html',
    'robots.txt',
    'sitemap.xml',
    'google36177f5bf8b4df82.html',
    'yandex_320ddde99b65402a.html',
    'favicon.ico',
    'favicon.svg',
    'favicon.png',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'apple-touch-icon.png'
]

def upload_file(ftp, local_path, remote_filename):
    try:
        with open(local_path, 'rb') as f:
            ftp.storbinary(f'STOR {remote_filename}', f)
        print(f"  [+] Загружен: {remote_filename}")
        return True
    except Exception as e:
        print(f"  [-] Ошибка при загрузке {remote_filename}: {e}")
        return False

def ensure_dir(ftp, dir_name):
    try:
        ftp.mkd(dir_name)
    except Exception:
        pass

def main():
    print("=" * 60)
    print("  АВТОВЫГРУЗКА САЙТА КРАСПЕСОК.РФ НА ХОСТИНГ ADMINVPS")
    print("=" * 60)
    print(f"[*] Подключение к FTP {FTP_HOST}...")
    try:
        ftp = ftplib.FTP(FTP_HOST, timeout=30)
        ftp.login(FTP_USER, FTP_PASS)
        print(f"[OK] Успешная авторизация (пользователь: {FTP_USER})")
    except Exception as e:
        print(f"[ERROR] Ошибка подключения к FTP: {e}")
        sys.exit(1)

    # Переход в целевую директорию сайта
    print(f"[*] Переход в папку: /{FTP_DIR}")
    try:
        # Переходим поэтапно, если путь содержит слэши
        parts = FTP_DIR.strip('/').split('/')
        for part in parts:
            ftp.cwd(part)
        print(f"[OK] Текущая директория FTP: {ftp.pwd()}")
    except Exception as e:
        print(f"[!] Ошибка перехода в {FTP_DIR}: {e}")
        print("[*] Попытка найти папку автоматически...")
        for cand in ['www/xn--80aknctefjc.xn--p1ai/public', 'public_html', 'www']:
            try:
                ftp.cwd('/')
                for p in cand.split('/'):
                    ftp.cwd(p)
                print(f"[OK] Успешный переход в {cand}")
                break
            except Exception:
                continue

    base_dir = os.path.dirname(os.path.abspath(__file__))
    uploaded_count = 0

    # 1. Загрузка основных файлов сайта
    print("\n[*] Загрузка ключевых файлов сайта...")
    for fname in ROOT_FILES:
        local_path = os.path.join(base_dir, fname)
        if os.path.exists(local_path):
            if upload_file(ftp, local_path, fname):
                uploaded_count += 1

    # 2. Создание и загрузка в подпапку api/
    print("\n[*] Загрузка в /api/...")
    ensure_dir(ftp, 'api')
    try:
        ftp.cwd('api')
        api_order = os.path.join(base_dir, 'order.php')
        if os.path.exists(api_order):
            if upload_file(ftp, api_order, 'order.php'):
                uploaded_count += 1
        ftp.cwd('..')
    except Exception as e:
        print(f"  [-] Ошибка при загрузке в /api/: {e}")

    # 3. Синхронизация изображений (images/)
    images_dir = os.path.join(base_dir, 'images')
    if os.path.exists(images_dir):
        print("\n[*] Загрузка изображений (WebP, JPG, Retina)...")
        ensure_dir(ftp, 'images')
        try:
            ftp.cwd('images')
            remote_images = ftp.nlst()
            for img in os.listdir(images_dir):
                img_path = os.path.join(images_dir, img)
                if os.path.isfile(img_path):
                    local_size = os.path.getsize(img_path)
                    # Если файла нет на сервере или это WebP — загружаем
                    if img not in remote_images or img.endswith('.webp'):
                        if upload_file(ftp, img_path, img):
                            uploaded_count += 1
            ftp.cwd('..')
        except Exception as e:
            print(f"  [-] Ошибка при загрузке изображений: {e}")

    # 4. Резервная копия order.php на уровень выше (для прямого вызова из www/домен/)
    try:
        ftp.cwd('..')
        order_php = os.path.join(base_dir, 'order.php')
        upload_file(ftp, order_php, 'order.php')
    except Exception:
        pass

    ftp.quit()
    print("\n" + "=" * 60)
    print(f"[ГОТОВО] Выгрузка успешно завершена! Файлов передано: {uploaded_count}")
    print("=" * 60)

if __name__ == '__main__':
    main()
