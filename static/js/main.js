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

        fetch('games.json')
            .then(response => response.json())
            .then(games => {
                listContainer.innerHTML = '';
                
                if (games.length === 0) {
                    listContainer.innerHTML = '<div style="color:white">No games found</div>';
                    return;
                }

                games.forEach(game => {
                    const btn = document.createElement('a');
                    btn.className = 'game-btn';
                    btn.innerText = game.name;

                    let link = window.location.origin + window.location.pathname + '?u=' + encodeURIComponent(baseUrl + game.file);

                    let machineParam = '48'; 
                    if (game.machine === '128' || game.machine === '5') {
                        machineParam = game.machine;
                    }

                    const customConfig = gameConfigs[game.name];

                    if (customConfig) {
                        if (customConfig.machine) {
                            machineParam = customConfig.machine;
                        }
                        if (customConfig.keys) {
                            link += '&k=' + encodeURIComponent(customConfig.keys);
                        }

                        if (customConfig.filter) {
                            link += '&f=1';
                        }
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

        return;
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
        machine: 48,
        turbo: false
    };

    const defkeystr = '1234567890,QWERTYUIOP,ASDFGHJKLe,cZXCVBNMs_';
    let keystr = defkeystr;
    let doFilter = false;
    let needsTurbo = false; // Флаг для турбо

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
            
            // === НОВАЯ ЛОГИКА: Проверка конфига по имени файла ===
            // Извлекаем имя файла из URL (без расширения)
            try {
                const decodedUrl = decodeURIComponent(value);
                const fileName = decodedUrl.split('/').pop().split('.')[0];
                
                if (gameConfigs[fileName] && gameConfigs[fileName].turbo) {
                    emuParams.turbo = true;
                    console.log(`Turbo enabled for ${fileName} via config`);
                }
            } catch (e) { console.error(e); }
        }
        else if (key == 'f') {
            if (value && value != 0)
                doFilter = true;
        }
    }

    // === ДОБАВЛЕНО: Колбэк для включения турбо после загрузки ===
    if (needsTurbo) {
        emuParams.onLoad = function() {
            console.log("Game loaded, activating TURBO mode...");
            // window.emu уже должен быть доступен, так как JSSpeccy возвращает объект
            if (window.emu) {
                window.emu.setTurbo(true);
            }
        };
    }

    // === 4. ЗАПУСК ЭМУЛЯТОРА ===
    const emu = JSSpeccy(document.getElementById('jsspeccy'), emuParams);
    window.emu = emu;

    let machineType = '48K';
    if (emuParams.machine === 128) {
        machineType = '128K';
    }

    if (doFilter) {
        document.getElementsByTagName('canvas')[0].style.imageRendering = "auto";
    }

    // === 5. ПОСТРОЕНИЕ ВИРТУАЛЬНОЙ КЛАВИАТУРЫ ===
    buildVirtualKeyboard(keystr, window.innerWidth);

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