// === РАБОТА С СОСТОЯНИЕМ (SAVE/LOAD/MEMORY) ===

function downloadFile(data, filename) {
    const blob = new Blob([data], {type: 'application/octet-stream'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function getPage(memoryData, pageNum) {
    const start = pageNum * 16384;
    // Проверка на случай, если память меньше ожидаемой
    if (!memoryData || start + 16384 > memoryData.length) return new Uint8Array(16384); 
    return memoryData.slice(start, start + 16384);
}

async function saveGame() {
    if (!window.emu || !window.emu.readMemory) {
        console.log("Emulator not ready");
        return;
    }

    try {
        const result = await window.emu.readMemory();
        if (!result || !result.data || !result.registers) {
            console.error("Invalid memory data received");
            return;
        }
        saveSNA(result);
    } catch (e) {
        console.error("Save error", e);
    }
}

async function saveSNA(result) {
    const memoryData = result.data; 
    const regs = result.registers;
    const paging = result.paging || []; 

    // === 1. Формируем заголовок (27 байт) ===
    const header = new Uint8Array(27);
    const view = new DataView(header.buffer);
    
    // Байт 0: I
    header[0] = (regs.ir >> 8) & 0xFF; 
    
    // Байты 1-8: Shadow Registers
    view.setUint16(1, regs.hl_, true);
    view.setUint16(3, regs.de_, true);
    view.setUint16(5, regs.bc_, true);
    view.setUint16(7, regs.af_, true);
    
    // Байты 9-18: Main Registers
    view.setUint16(9, regs.hl, true);
    view.setUint16(11, regs.de, true);
    view.setUint16(13, regs.bc, true);
    view.setUint16(15, regs.iy, true);
    view.setUint16(17, regs.ix, true);
    
    header[19] = regs.iff2 ? 0xFF : 0x00;
    header[20] = regs.ir & 0xFF;
    view.setUint16(21, regs.af, true);
    
    let sp = regs.sp;
    let pc = regs.pc;
    header[25] = regs.im; 
    header[26] = 0; 

    // === 2. Логика для 48K ===
    if (result.machineType === 48) {
        sp = (sp - 2) & 0xFFFF;
        view.setUint16(23, sp, true);
        
        // ИСПРАВЛЕНО: добавлен memoryData
        const bank5 = getPage(memoryData, 5);
        const bank2 = getPage(memoryData, 2);
        const bank0 = new Uint8Array(getPage(memoryData, 0)); 

        if (sp >= 0xC000) {
            const offsetInBank0 = sp - 0xC000;
            bank0[offsetInBank0] = pc & 0xFF;       
            bank0[offsetInBank0 + 1] = (pc >> 8) & 0xFF;
        } else {
            console.warn("Stack pointer in unusual location");
        }

        const snaFile = new Uint8Array(27 + 49152);
        snaFile.set(header, 0);
        let offset = 27;
        snaFile.set(bank5, offset); offset += 16384;
        snaFile.set(bank2, offset); offset += 16384;
        snaFile.set(bank0, offset);
        
        downloadFile(snaFile, "game_48k.sna");

    } else {
        // === 3. Логика для 128K ===
        view.setUint16(23, sp, true);

        let port7FFD = paging[3] & 0x07;
        if (paging[0] === 9) port7FFD |= 0x10;
        if (paging[1] === 7) port7FFD |= 0x08;

        // ИСПРАВЛЕНО: добавлен memoryData
        const bank5 = getPage(memoryData, 5);
        const bank2 = getPage(memoryData, 2);
        const bank0 = getPage(memoryData, 0);
        const extraBanks = [1, 3, 4, 6, 7].map(p => getPage(memoryData, p));
        
        const totalSize = 27 + (3 * 16384) + 4 + (5 * 16384);
        const snaFile = new Uint8Array(totalSize);
        
        let offset = 0;
        snaFile.set(header, offset); offset += 27;
        
        snaFile.set(bank5, offset); offset += 16384;
        snaFile.set(bank2, offset); offset += 16384;
        snaFile.set(bank0, offset); offset += 16384;
        
        const extView = new DataView(snaFile.buffer, offset, 4);
        extView.setUint16(0, pc, true);
        extView.setUint8(2, port7FFD);
        extView.setUint8(3, 0);
        offset += 4;
        
        extraBanks.forEach(bank => {
            snaFile.set(bank, offset);
            offset += 16384;
        });
        
        downloadFile(snaFile, "game_128k.sna");
    }
}

function sendMemoryToServer(data, machineType) {
    let binary = '';
    const bytes = new Uint8Array(data);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const base64String = window.btoa(binary);

    // Убедитесь, что адрес актуален (ваш домен или туннель)
    const serverUrl = 'https://jzx.klalo.top/api/memory-dump'; 

    let userInfo = { id: 0, first_name: 'Guest', username: 'unknown' };
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe.user) {
        const user = window.Telegram.WebApp.initDataUnsafe.user;
        userInfo.id = user.id;
        userInfo.first_name = user.first_name || '';
        userInfo.username = user.username || '';
    }

    let gameName = 'Unknown Game';
    const urlParams = new URLSearchParams(window.location.search);
    const gameUrl = urlParams.get('u');
    if (gameUrl) {
        try {
            const decodedUrl = decodeURIComponent(gameUrl);
            gameName = decodedUrl.split('/').pop().split('?')[0];
        } catch (e) { console.error(e); }
    }

    fetch(serverUrl, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true' // На всякий случай, если вернетесь к ngrok
        },
        body: JSON.stringify({
            timestamp: Date.now(),
            size: data.length,
            dump: base64String,
            user: userInfo,
            game: gameName,
            machine: machineType
        })
    })
    .then(response => console.log('Memory sent successfully'))
    .catch(error => console.error('Error sending memory:', error));
}