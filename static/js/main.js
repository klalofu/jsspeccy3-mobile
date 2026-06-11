// === ОСНОВНАЯ ЛОГИКА ПРИЛОЖЕНИЯ ===

function onBodyLoad() {
    // === 1. ИНИЦИАЛИЗАЦИЯ TELEGRAM ===
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.expand();
        window.Telegram.WebApp.setHeaderColor('#0000aa');
        
        const platform = window.Telegram.WebApp.platform;
        console.log("Platform:", platform);
        console.log("Window width:", window.innerWidth);
        
        if (platform === 'android' || platform === 'ios') {
            isMobile = true;
        }
    }

    // === 2. ПРОВЕРКА РЕЖИМА (МЕНЮ ИЛИ ИГРА) ===
    const url = new URL(window.location.href);
    const gameUrlParam = url.searchParams.get('u');

    if (!gameUrlParam) {
        // --- РЕЖИМ МЕНЮ ---
        document.getElementById('menu-screen').style.display = 'flex';
        document.getElementById('jsspeccy').style.display = 'none';
        document.getElementById('guiparent').style.display = 'none';
        
        const listContainer = document.getElementById('game-list-container');
        listContainer.innerHTML = 'Loading game list...';

        const baseUrl = 'https://klalofu.github.io/jsspeccy3-mobile/games/';

        // Загрузка списка игр
        fetch('games.json')
            .then(response => response.json())
            .then(games => {
                listContainer.innerHTML = ''; // Очищаем сообщение о загрузке
                
                if (games.length === 0) {
                    listContainer.innerHTML = '<div style="color:white">No games found</div>';
                    return;
                }

                games.forEach(game => {
                    const btn = document.createElement('a');
                    btn.className = 'game-btn';
                    btn.innerText = game.name;

                    // Формируем ссылку
                    let link = window.location.origin + window.location.pathname + '?u=' + encodeURIComponent(baseUrl + game.file);

                    // Логика определения модели (по умолчанию 48K)
                    let machineParam = '48'; 
                    if (game.machine === '128' || game.machine === '5') {
                        machineParam = game.machine;
                    }
                    
                    link += '&m=' + machineParam;
                    btn.href = link;
                    listContainer.appendChild(btn);
                });
            })
            .catch(err => {
                console.error(err);
                listContainer.innerHTML = 'Error loading list';
            });

        return; // Выходим, чтобы не запускать эмулятор
    }

    // --- РЕЖИМ ИГРЫ ---
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('jsspeccy').style.display = 'block';
    document.getElementById('guiparent').style.display = 'block';

    // === 3. НАСТРОЙКА ПАРАМЕТРОВ ЭМУЛЯТОРА ===
    const emuParams = {
        zoom: (window.innerWidth / 320),
        sandbox: false,
        autoLoadTapes: true,
        autoStart: true,
        machine: 48
    };

    const defkeystr = '1234567890,QWERTYUIOP,ASDFGHJKLe,cZXCVBNMs_';
    let keystr = defkeystr;
    let doFilter = false;

    // Обработка параметров URL
    for (const [key, value] of url.searchParams) {
        if (key == 'm') {
            if (value == '128' || value == '5')
                emuParams.machine = 128;
        }
        else if (key == 'k') {
            keystr = value;
        }
        else if (key == 'u') {
            emuParams.openUrl = value;
        }
        else if (key == 'f') {
            if (value && value != 0)
                doFilter = true;
        }
    }

    // === 4. ЗАПУСК ЭМУЛЯТОРА ===
    const emu = JSSpeccy(document.getElementById('jsspeccy'), emuParams);
    window.emu = emu;

    // Определение типа машины для статистики/отправки
    let machineType = '48K';
    if (emuParams.machine === 128) {
        machineType = '128K';
    }

    /* 
    // Опционально: отправка памяти на сервер (расскомментировать при необходимости)
    const MEMORY_SEND_INTERVAL = 10000; // 10 секунд

    setInterval(async () => {
        if (!window.emu || !window.emu.readMemory) return;
        try {
            const memoryData = await window.emu.readMemory();
            if (memoryData) {
                sendMemoryToServer(memoryData, machineType);
            }
        } catch (error) {
            console.error("Failed to read memory", error);
        }
    }, MEMORY_SEND_INTERVAL);
    */

    if (doFilter) {
        document.getElementsByTagName('canvas')[0].style.imageRendering = "auto";
    }

    // === 5. ПОСТРОЕНИЕ ВИРТУАЛЬНОЙ КЛАВИАТУРЫ ===
    buildVirtualKeyboard(keystr, 960);

    // === 6. ОБРАБОТКА ГОРЯЧИХ КЛАВИШ (TURBO) ===
    let turboActive = false;
    document.addEventListener('keydown', (e) => {
        if (e.key === 't' || e.key === 'T' || e.code === 'KeyT') {
            turboActive = !turboActive;
            window.emu.setTurbo(turboActive);
            console.log("Turbo mode:", turboActive ? "ON" : "OFF");
        }
    });
}