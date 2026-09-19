const pagesData = {
    index: {
        title: "Главная страница (index.html)",
        desc: "Инженерный калькулятор, каталог нерудных материалов, автопарк самосвалов, зоны доставки по Красноярску и пригороду, замер кузова, FAQ",
        url: "https://краспесок.рф/",
        desktop: "ui/index_desktop.png",
        mobile: "ui/index_mobile.png"
    },
    delivery_terms: {
        title: "Правила доставки и замера кузова (delivery_terms.html)",
        desc: "Регламент автотранспортной доставки самосвалами 4т, 10т и 20м³, контрольный замер рулеткой до выгрузки, порядок приёмки и возврата",
        url: "https://краспесок.рф/delivery_terms.html",
        desktop: "ui/delivery_terms_desktop.png",
        mobile: "ui/delivery_terms_mobile.png"
    },
    oferta: {
        title: "Публичная оферта (oferta.html)",
        desc: "Официальный договор-оферта на оказание услуг по доставке сыпучих строительных материалов (ст. 437 ГК РФ, 422-ФЗ)",
        url: "https://краспесок.рф/oferta.html",
        desktop: "ui/oferta_desktop.png",
        mobile: "ui/oferta_mobile.png"
    },
    privacy: {
        title: "Политика конфиденциальности (privacy.html)",
        desc: "Политика в отношении обработки персональных данных и файлов Cookie в соответствии с Федеральным законом № 152-ФЗ",
        url: "https://краспесок.рф/privacy.html",
        desktop: "ui/privacy_desktop.png",
        mobile: "ui/privacy_mobile.png"
    },
    consent: {
        title: "Согласие на обработку персональных данных (consent.html)",
        desc: "Текст согласия пользователя на обработку персональных данных при оформлении заявки и расчете стоимости на сайте",
        url: "https://краспесок.рф/consent.html",
        desktop: "ui/consent_desktop.png",
        mobile: "ui/consent_mobile.png"
    },
    cookies: {
        title: "Политика использования файлов Cookie (cookies.html)",
        desc: "Сведения об используемых категориях файлов cookie, технических целях хранения и управлении ими",
        url: "https://краспесок.рф/cookies.html",
        desktop: "ui/cookies_desktop.png",
        mobile: "ui/cookies_mobile.png"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const pageTabs = document.querySelectorAll('.btn-tab');
    const modeTabs = document.querySelectorAll('.btn-mode');
    const viewContainer = document.getElementById('view-container');
    const currentTitle = document.getElementById('current-title');
    const currentDesc = document.getElementById('current-desc');
    const desktopUrl = document.getElementById('desktop-url');
    const imgDesktop = document.getElementById('img-desktop');
    const imgMobile = document.getElementById('img-mobile');
    const downloadDesktop = document.getElementById('download-desktop');
    const downloadMobile = document.getElementById('download-mobile');

    pageTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            pageTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const pageKey = tab.getAttribute('data-page');
            const data = pagesData[pageKey];
            if (!data) return;

            currentTitle.textContent = data.title;
            currentDesc.textContent = data.desc;
            desktopUrl.textContent = `${data.url} (ПК 1920x1080)`;
            
            // Adjust paths if running inside /ui/ subfolder
            const isInsideUiFolder = window.location.pathname.includes('/ui/');
            const dPath = isInsideUiFolder ? data.desktop.replace('ui/', '') : data.desktop;
            const mPath = isInsideUiFolder ? data.mobile.replace('ui/', '') : data.mobile;

            imgDesktop.src = dPath;
            imgMobile.src = mPath;
            downloadDesktop.href = dPath;
            downloadMobile.href = mPath;
        });
    });

    modeTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            modeTabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const mode = btn.getAttribute('data-mode');
            viewContainer.classList.remove('mode-desktop', 'mode-mobile');
            if (mode === 'desktop') {
                viewContainer.classList.add('mode-desktop');
            } else if (mode === 'mobile') {
                viewContainer.classList.add('mode-mobile');
            }
        });
    });
});
