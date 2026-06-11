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
 * @param {number} width - ширина канваса
 */
function buildVirtualKeyboard(keystr, width) {
    const btnrows = [];
    const keyrows = keystr.split(',');
    let height = 0;

    for (let j = 0; j < keyrows.length; j++) {
        const keyrow = keyrows[j];
        const rowlen = keyrow.length;
        if (rowlen == 0) continue;
        const currentRowLen = Math.min(rowlen, 10);
        const d = width / currentRowLen;
        const btnrow = { d: d, chs: [] };
        
        for (let i = 0; i < currentRowLen; i++) {
            let ch = keyrow.charAt(i);
            if (!(ch in keyCodes)) ch = '-';
            btnrow.chs.push(ch);
        }
        btnrows.push(btnrow);
        height += d;
    }

    const win = new SingleWindow('virtkeys');
    win.setTargetSize(width, height);

    let x = 0;
    let y = 0;
    for (let j = 0; j < btnrows.length; j++) {
        const btnrow = btnrows[j];
        const d = btnrow.d;
        x = 0;
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