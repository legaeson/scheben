@echo off
chcp 65001 >nul
echo ====================================================
echo  ВКЛЮЧЕНИЕ СТРАНИЦЫ-ЗАГЛУШКИ (ТЕХНИЧЕСКИЕ РАБОТЫ)
echo ====================================================
echo.
copy /Y maintenance.html index.html
copy /Y maintenance.html public\index.html
echo.
echo [OK] Заглушка установлена как главная страница сайта!
echo      (Полная версия сохранена в index_full.html)
echo.
echo Для отправки на сервер запустите deploy.bat
echo.
pause
