@echo off
chcp 65001 >nul
echo ====================================================
echo  ВОЗВРАТ ПОЛНОЙ ВЕРСИИ САЙТА КРАСПЕСОК.РФ
echo ====================================================
echo.
copy /Y index_full.html index.html
copy /Y index_full.html public\index.html
echo.
echo [OK] Полная версия сайта возвращена на главную страницу!
echo.
echo Для отправки на сервер запустите deploy.bat
echo.
pause
