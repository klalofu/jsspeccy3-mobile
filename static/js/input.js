// === ЛОГИКА ВВОДА (VIRTUAL KEYBOARD) ===

function simulateKey(keyCode, type, modifiers) {
    var evtName = (typeof(type) === "string") ? "key" + type : "keydown";	
    var modifier = (typeof(modifiers) === "object") ? modifier : {};

    var event = document.createEvent("HTMLEvents");
    event.initEvent(evtName, true, false);
    event.keyCode = keyCode;
    
    for (var i in modifiers) {
        event[i] = modifiers[i];
    }
    document.dispatchEvent(event);
}

class MyImageButton extends ImageButton {
    constructor(parent, x, y, w, h, suffix, keyCode) {
        super(parent, x, y, w, h, 'img/key' + suffix + '.png', 'img/keyNONE.png');
        this.keyCode = keyCode;

        let that = this;
        this.on_begin = this.on_enter = function() {
            simulateKey(keyCode, 'down');
        }
        this.on_end = this.on_leave = function() {
            simulateKey(keyCode, 'up');
        }
    }
}

/**
 * Строит виртуальную клавиатуру на основе строки конфигурации
 * @param {string} keystr - строка определения клавиш (например, "12345...")
 * @param {number} width - ширина экрана
 */
function buildVirtualKeyboard(keystr, width) {
    const btnrows = [];
    const keyrows = keystr.split(',');
    let height = 0;

    // 1. Сначала проходим по всем строкам, чтобы найти МАКСИМАЛЬНУЮ длину
    // Это нужно, чтобы размер кнопки (d) был одинаковым для всей клавиатуры
    let maxRowLen = 0;
    for (let j = 0; j < keyrows.length; j++) {
        const len = keyrows[j].length;
        if (len > maxRowLen) maxRowLen = len;
    }

    // Если строки пустые, ставим минимум 1, чтобы не делить на 0
    if (maxRowLen === 0) maxRowLen = 1;

    // 2. Рассчитываем размер кнопки по самой широкой строке
    // Ограничиваем maxRowLen до 10, если вдруг пришло больше
    const gridWidth = Math.min(maxRowLen, 10);
    const d = width / gridWidth;

    // 3. Строим кнопки, используя единый размер d
    for (let j = 0; j < keyrows.length; j++) {
        const keyrow = keyrows[j];
        const rowlen = keyrow.length;
        if (rowlen == 0) continue;

        // Центрируем строку, если она короче максимальной (опционально, но красиво)
        const rowOffset = (width - (rowlen * d)) / 2;
        
        const btnrow = { chs: [] };
        
        for (let i = 0; i < rowlen; i++) {
            let ch = keyrow.charAt(i);
            if (!(ch in keyCodes)) ch = '-';
            btnrow.chs.push(ch);
        }
        // Сохраняем смещение для центрирования
        btnrow.offset = rowOffset; 
        btnrows.push(btnrow);
        height += d;
    }

    const win = new SingleWindow('virtkeys');
    win.setTargetSize(width, height);

    let y = 0;
    for (let j = 0; j < btnrows.length; j++) {
        const btnrow = btnrows[j];
        // Используем сохраненное смещение
        let x = btnrow.offset || 0; 
        
        for (let i = 0; i < btnrow.chs.length; i++) {
            const ch = btnrow.chs[i];
            if (ch == '-') {
                new ImageButton(win, x, y, d, d, 'img/keyNONE.png', 'img/keyNONE.png');
            } else {
                let suffix = ch;
                if (suffix in imgExceptions) suffix = imgExceptions[ch];
                let code = keyCodes[ch];
                new MyImageButton(win, x, y, d, d, suffix, code);
            }
            x += d;
        }
        y += d;
    }
    win._onload();
}