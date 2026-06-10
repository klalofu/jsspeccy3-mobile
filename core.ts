export const FRAME_BUFFER:usize = 0;

// allocate memory for 8 RAM, 8 ROM pages
// 0..7 - 128K RAM pages;
// 8 = 128 rom 0, 9 = 128 rom 1
// 10 = 48 rom, 11 = scratch area for ROM writes
// 12 = Pentagon rom 0 (Pentagon ROM 1 is identical to 128 rom 1)
// 13 = TRDOS rom
export const MACHINE_MEMORY:usize = 26112;

export const MEMORY_PAGE_READ_MAP:usize = 288256;
export const MEMORY_PAGE_WRITE_MAP:usize = 288260;

store<u8>(288264, 0);
store<u8>(288265, 1);
store<u8>(288266, 0);
store<u8>(288267, 1);
store<u8>(288268, 0);
store<u8>(288269, 1);
store<u8>(288270, 0);
store<u8>(288271, 1);
store<u8>(288272, 0);
store<u8>(288273, 0);
store<u8>(288274, 0);
store<u8>(288275, 0);


export const REGISTERS:usize = 288276;


store<u8>(288300, 0);
store<u8>(288301, 0x10);
store<u8>(288302, 0x10);
store<u8>(288303, 0x10);
store<u8>(288304, 0);
store<u8>(288305, 0);
store<u8>(288306, 0);
store<u8>(288307, 0x10);


store<u8>(288308, 0);
store<u8>(288309, 0);
store<u8>(288310, 0x10);
store<u8>(288311, 0);
store<u8>(288312, 0x10);
store<u8>(288313, 0);
store<u8>(288314, 0x10);
store<u8>(288315, 0x10);


store<u8>(288316, 0);
store<u8>(288317, 0);
store<u8>(288318, 0);
store<u8>(288319, 0x04);
store<u8>(288320, 0x04);
store<u8>(288321, 0);
store<u8>(288322, 0);
store<u8>(288323, 0);

store<u8>(288324, 0);
store<u8>(288325, 0x04);
store<u8>(288326, 0);
store<u8>(288327, 0);
store<u8>(288328, 0);
store<u8>(288329, 0);
store<u8>(288330, 0x04);
store<u8>(288331, 0);






// NB needs to start at an offset that's a multiple of 4
export const AUDIO_BUFFER_LEFT:usize = 505108;
export const AUDIO_BUFFER_RIGHT:usize = 505108;

export const TAPE_PULSES:usize = 513300;
export const TAPE_PULSES_LENGTH:usize = 10000;

store<f32>(533300, 0.0);
store<f32>(533304, 0.0022915);
store<f32>(533308, 0.0034105);
store<f32>(533312, 0.004842);
store<f32>(533316, 0.007057);
store<f32>(533320, 0.010307);
store<f32>(533324, 0.0141195);
store<f32>(533328, 0.0228165);
store<f32>(533332, 0.028188);
store<f32>(533336, 0.04411);
store<f32>(533340, 0.058784);
store<f32>(533344, 0.0749885);
store<f32>(533348, 0.0950615);
store<f32>(533352, 0.114544);
store<f32>(533356, 0.1413585);
store<f32>(533360, 0.166662);


export const LOG_ENTRIES:usize = 533364;


let requestedSamplesPerFrame:u32 = 0;
let samplesPerFrame:u32 = 0;
let ayCyclesPerSample:f64 = 0.0;
let lastAudioT:u32 = 0;  // the t on which we last called updateAudioBuffer
let microslicesSinceLastSample:u32 = 0;
let audioBufferPointer:u32 = 0;

// which pages in memory bank correspond to roms 0 and 1 in paging
let rom0Page:u8 = 8;
let rom1Page:u8 = 9;

let betadiskEnabled:bool = false;
let betadiskROMActive:bool = false;
let tapeTrapsEnabled:bool = true;

let i:u8 = 0;
while (true) {
store<u8>(288332 + (i), (u8(i) & ( 0x08 | 0x20 | 0x80 )));
    let j = i;
    let parity:u8 = 0;
    for (let k:i8 = 0; k < 8; k++) {
        parity ^= j & 1;
        j >>= 1;
    }

store<u8>(288588 + (i), ((parity ? 0 : 0x04)));
store<u8>(288844 + (i), (load<u8>(288332 + (i)) | load<u8>(288588 + (i))));

store<u8>(288332 + (0), (load<u8>(288332 + (0)) | (0x40)));
store<u8>(288844 + (0), (load<u8>(288844 + (0)) | (0x40)));
    i++;
    if (i == 0) break;
}


function buildScreenEventsTable(mainScreenStartTstate:u32, tstatesPerRow:u32, borderTimeMask:u32):void {
    /* build screen events table: a list of which screen bytes should be fetched on which
    t-states. load<u8>(288277) sequence of: two u32s per event:
    - tstate number or 0xffffffff for end marker
    - screen address offset | (attr address offset << 16),
    or 0xffffffff if this is a 'fetch border' event
    */
    let screenEventPointer:u32 = 0;

    /* top border */
    for (let y:u32 = 0; y < 24; y++) {
        const rowTime:u32 = mainScreenStartTstate - (24 - y) * tstatesPerRow - 16;
        for (let x:u32 = 0; x < 160; x++) {
store<u32>(361100 + 4 * (screenEventPointer++), (rowTime + (x & borderTimeMask)));
store<u32>(361100 + 4 * (screenEventPointer++), (0xffffffff));
        }
    }

    for (let y:u32 = 0; y < 192; y++) {
        const rowTime:u32 = mainScreenStartTstate + tstatesPerRow * y;
        const rowScreenOffset:u32 = ((y & 0xc0) << 5) | ((y & 0x07) << 8) | ((y & 0x38) << 2);
        const rowAttrOffset:u32 = 0x1800 | ((y & 0xf8) << 2);

        /* left border */
        for (let x:u32 = 0; x < 16; x++) {
store<u32>(361100 + 4 * (screenEventPointer++), (rowTime - 16 + (x & borderTimeMask)));
store<u32>(361100 + 4 * (screenEventPointer++), (0xffffffff));
        }

        /* main screen */
        for (let x:u32 = 0; x < 16; x++) {
store<u32>(361100 + 4 * (screenEventPointer++), (rowTime + 8 * x));
            const screenOffset:u32 = rowScreenOffset | (x << 1);
            const attrOffset:u32 = rowAttrOffset | (x << 1);
store<u32>(361100 + 4 * (screenEventPointer++), (screenOffset | (attrOffset << 16)));
        }

        /* right border */
        for (let x:u32 = 0; x < 16; x++) {
store<u32>(361100 + 4 * (screenEventPointer++), (rowTime + 128 + (x & borderTimeMask)));
store<u32>(361100 + 4 * (screenEventPointer++), (0xffffffff));
        }
    }

    /* bottom border */
    for (let y:u32 = 0; y < 24; y++) {
        const rowTime:u32 = mainScreenStartTstate + (192 + y) * tstatesPerRow - 16;
        for (let x:u32 = 0; x < 160; x++) {
store<u32>(361100 + 4 * (screenEventPointer++), (rowTime + (x & borderTimeMask)));
store<u32>(361100 + 4 * (screenEventPointer++), (0xffffffff));
        }
    }

    // add end marker
store<u32>(361100 + 4 * (screenEventPointer), (0xffffffff));
}


function buildContentionTable(mainScreenStartTstate:u32, tstatesPerRow:u32, frameCycleCount:u32):void {
    let pos:u32 = 0;
    while (pos < mainScreenStartTstate) {
store<u8>(289100 + (pos++), (0));
    }
    for (let y:u32 = 0; y < 192; y++) {
        for (let x:u32 = 0; x < tstatesPerRow; x++) {
            if (x < 128) {
                const seq:u32 = x & 0x07;
store<u8>(289100 + (pos++), (u8((seq == 7) ? 0 : (6 - seq))));
            } else {
store<u8>(289100 + (pos++), (0));
            }
        }
    }
    while (pos < frameCycleCount) {
store<u8>(289100 + (pos++), (0));
    }
}


function clearContentionTable(frameCycleCount:u32):void {
    for (let i:u32 = 0; i < frameCycleCount; i++) {
store<u8>(289100 + (i), (0));
    }
}


let frameCycleCount:u32 = 69888;
let screenPageIndex:u32 = 5;
let pagingLocked:bool = 0;
let t:u32 = 0;
let pc:u16 = 0;
let iff1:bool = 0;
let iff2:bool = 0;
let im:u8 = 0;
let interruptible:bool = false;
let halted:bool = false;
let opcodePrefix:u8 = 0;
let framebufferIndex = 0;
let borderColour:u8 = 0;
let speakerState:u8 = 0;
let selectedAYRegister:u8 = 0;
let floatingBusValue:u8 = 0xff;
let currentTapeTime:u32 = 0;  // time at which tape pulse pointer was last updated
let tapePulseReadIndex:u16 = 0;  // index into the tape pulses buffer for the current pulse
let tapePulseWriteIndex:u16 = 0;
let tapePulseBufferTstateCount:u32 = 0;  // total number of tstates of all pulses in the buffer
let tapePulseCyclesElapsed:u32 = 0;  // number of cycles of the current pulse that have elapsed
let tapeLevel:u8 = 0x00;

// whether a trap on the next instruction will be honoured
let willTrap:bool = true;

let loggingEnabled:bool = false;
let logPtr = 0;

let machineType:u32 = 48;
export function setMachineType(type:u32):void {
    machineType = type;
    if (type == 48 || type == 1212) {
        frameCycleCount = 69888;
        recalculateAYCyclesPerSample();
        buildScreenEventsTable(14335, 224, 0xfc);
        buildContentionTable(14335, 224, frameCycleCount);
        betadiskEnabled = false;
    } else if (type == 5) {  // pentagon
        frameCycleCount = 71680;
        recalculateAYCyclesPerSample();
        buildScreenEventsTable(17988, 224, 0xff);
        clearContentionTable(frameCycleCount);
        rom0Page = 12;
        rom1Page = 9;
        betadiskEnabled = true;
        betadiskROMActive = false;
    } else {  // 128
        frameCycleCount = 70908;
        recalculateAYCyclesPerSample();
        buildScreenEventsTable(14361, 228, 0xfc);
        buildContentionTable(14361, 228, frameCycleCount);
        rom0Page = 8;
        rom1Page = 9;
        betadiskEnabled = false;
    }
    reset();
}
export function reset():void {
    if (machineType == 48) {
store<u8>(288256, 10);
store<u8>(288257, 5);
store<u8>(288258, 2);
store<u8>(288259, 0);

store<u8>(288260, 11);
store<u8>(288261, 5);
store<u8>(288262, 2);
store<u8>(288263, 0);

        pagingLocked = 1;
    } else if (machineType == 1212) {
        // 1212 = test machine type with writeable ROM
store<u8>(288256, 10);
store<u8>(288257, 5);
store<u8>(288258, 2);
store<u8>(288259, 0);

store<u8>(288260, 10);
store<u8>(288261, 5);
store<u8>(288262, 2);
store<u8>(288263, 0);

        pagingLocked = 1;
    } else if (machineType == 5) {
        // Pentagon
store<u8>(288256, 12);
store<u8>(288257, 5);
store<u8>(288258, 2);
store<u8>(288259, 0);

store<u8>(288260, 11);
store<u8>(288261, 5);
store<u8>(288262, 2);
store<u8>(288263, 0);

        pagingLocked = 0;
    } else {  // 128
store<u8>(288256, 8);
store<u8>(288257, 5);
store<u8>(288258, 2);
store<u8>(288259, 0);

store<u8>(288260, 11);
store<u8>(288261, 5);
store<u8>(288262, 2);
store<u8>(288263, 0);

        pagingLocked = 0;
    }
    for (let i:u8 = 0; i < 14; i++) {
        writeAYRegister(i, 0);
    }
    screenPageIndex = 5;
    t = 0;
    pc = 0;
    iff1 = iff2 = 0;
    im = 0;
    interruptible = false;
    halted = false;
    opcodePrefix = 0;
    framebufferIndex = 0;
}
setMachineType(48);

for (let i=0; i < 8; i++) {
store<u8>(505100 + (i), (0xff));
}

export function setRegisters(af:u16, bc:u16, de:u16, hl:u16, af_:u16, bc_:u16, de_:u16, hl_:u16, ix:u16, iy:u16, sp:u16, ir:u16):void {
store<u16>(288276, (af));
store<u16>(288278, (bc));
store<u16>(288280, (de));
store<u16>(288282, (hl));
store<u16>(288284, (af_));
store<u16>(288286, (bc_));
store<u16>(288288, (de_));
store<u16>(288290, (hl_));
store<u16>(288292, (ix));
store<u16>(288294, (iy));
store<u16>(288296, (sp));
store<u16>(288298, (ir));
}

export function setPC(val:u16):void {
    pc = val;
}
export function getPC():u16 {
    return pc;
}
export function setIFF1(val:bool):void {
    iff1 = val;
}
export function getIFF1():bool {
    return iff1;
}
export function setIFF2(val:bool):void {
    iff2 = val;
}
export function getIFF2():bool {
    return iff2;
}
export function setIM(val:u8):void {
    im = val;
}
export function getIM():u8 {
    return im;
}
export function setTStates(val:u32):void {
    t = val;
}
export function getTStates():u32 {
    return t;
}
export function setHalted(val:bool):void {
    halted = val;
}
export function getHalted():bool {
    return halted;
}
export function setTapeTraps(val:bool):void {
    tapeTrapsEnabled = val;
}

function log(time:u32, type:u16, addr:u16, val:u8):void {
store<u16>(533364 + 2 * (logPtr++), (u16(time)));
store<u16>(533364 + 2 * (logPtr++), (type));
store<u16>(533364 + 2 * (logPtr++), (addr));
store<u16>(533364 + 2 * (logPtr++), (u16(val)));
    logPtr = logPtr % 2048;
}

export function startLog():void {
    loggingEnabled = true;
    logPtr = 0;
}
export function stopLog():void {
    log(0xffff, 0xffff, 0, 0);
    loggingEnabled = false;
}

export function setAudioSamplesPerFrame(val:u32):void {
    requestedSamplesPerFrame = val;
}
export function getAudioSamplesPerFrame():u32 {
    return samplesPerFrame;
}
export function getTapePulseWriteIndex():u16 {
    return tapePulseWriteIndex;
}
export function getTapePulseBufferTstateCount():u32 {
    return tapePulseBufferTstateCount;
}
export function setTapePulseBufferState(writeIndex: u16, tstateCount:u32):void {
    tapePulseWriteIndex = writeIndex;
    tapePulseBufferTstateCount = tstateCount;
}

function readMem(addr:u16):u8 {
    const page:u8 = load<u8>(288256 + (addr >> 14));
    const pageOffset:u32 = u32(page) << 14;
    if (loggingEnabled) log(t, 3, addr, 0);
    if (load<u8>(288264 + (page))) t += load<u8>(289100 + (t % frameCycleCount));
    t += 3;
    if (loggingEnabled) {
        const val:u8 = load<u8>(26112 + (pageOffset | (addr & 0x3fff)));
        log(t, 1, addr, val);
        return val;
    } else {
        return load<u8>(26112 + (pageOffset | (addr & 0x3fff)));
    }
}

function readMemInternal(addr:u16):u8 {
    const page:u8 = load<u8>(288256 + (addr >> 14));
    const pageStartPtr:u32 = u32(page) << 14;
    if (loggingEnabled) {
        const val:u8 = load<u8>(26112 + (pageStartPtr | (addr & 0x3fff)));
        log(t, 1, addr, val);
        return val;
    } else {
        return load<u8>(26112 + (pageStartPtr | (addr & 0x3fff)));
    }
}

function writeMem(addr:u16, val:u8):void {
    const page:u8 = load<u8>(288260 + (addr >> 14));
    const pageStartPtr:u32 = u32(page) << 14;
    if (loggingEnabled) log(t, 3, addr, 0);
    if (load<u8>(288264 + (page))) t += load<u8>(289100 + (t % frameCycleCount));
    const pageOffset:u16 = addr & 0x3fff;
    if (page == screenPageIndex && pageOffset < 0x1b00) {
        updateFramebuffer();
    }
store<u8>(26112 + (pageStartPtr | pageOffset), (val));
    t += 3;
    if (loggingEnabled) {
        log(t, 2, addr, val);
    }
}

function contendRead(addr:u16):void {
    const page:u8 = load<u8>(288256 + (addr >> 14));
    if (loggingEnabled) log(t, 3, addr, 0);
    if (load<u8>(288264 + (page))) t += load<u8>(289100 + (t % frameCycleCount));
}
function contendDirtyRead(addr:u16):void {
    const page:u8 = load<u8>(288256 + (addr >> 14));
    if (loggingEnabled) log(t, 3, addr, 0);
    if (load<u8>(288264 + (page))) t += load<u8>(289100 + (t % frameCycleCount));
}
function contendDirtyWrite(addr:u16):void {
    const page:u8 = load<u8>(288260 + (addr >> 14));
    if (loggingEnabled) log(t, 3, addr, 0);
    if (load<u8>(288264 + (page))) t += load<u8>(289100 + (t % frameCycleCount));
}

export function peek(addr:u16):u8 {
    const pageOffset:u32 = u32(load<u8>(288256 + (addr >> 14))) << 14;
    return load<u8>(26112 + (pageOffset | (addr & 0x3fff)));
}
export function poke(addr:u16, val:u8):void {
    const pageOffset:u32 = u32(load<u8>(288260 + (addr >> 14))) << 14;
store<u8>(26112 + (pageOffset | (addr & 0x3fff)), (val));
}

export function readPort(addr:u16):u8 {
    /* apply pre-read contention */
    const page:u8 = load<u8>(288256 + (addr >> 14));
    const addressIsContended:u8 = load<u8>(288264 + (page));
    if (addressIsContended) {
        if (loggingEnabled) log(t, 6, addr, 0);
        t += load<u8>(289100 + (t % frameCycleCount));
    }
    t++;

    let result:u8 = 0xff;
    if (machineType == 1212) {
        /*
        on port reads, the test machine just responds with the high byte of the port address.
        That's a thing now, load<u8>(288299) decided. (Well, Phil Kendall decided it to be exact.)
        */
        result = u8(addr >> 8);
    } else {

        if (!(addr & 0x0001)) {
            /* poll keyboard */
            result = pollKeyboard(u8(addr >> 8));
            updateTapePulses(t);
            result |= tapeLevel;
        } else if ((addr & 0xc002) == 0xc000) {
            result = readAYRegister(selectedAYRegister);
        } else if (!(addr & 0x00e0)) {
            /* kempston joystick */
            result = 0;
        } else if (machineType == 48 || machineType == 128) {
            /* floating bus */
            updateFramebuffer();
            result = floatingBusValue;
        }
    }
    if (loggingEnabled) log(t, 4, addr, result);

    /* apply post-read contention */
    if (addr & 0x0001) {
        if (addressIsContended) {
            if (loggingEnabled) log(t, 6, addr, 0);
            t += load<u8>(289100 + (t % frameCycleCount));
            t++;
            if (loggingEnabled) log(t, 6, addr, 0);
            t += load<u8>(289100 + (t % frameCycleCount));
            t++;
            if (loggingEnabled) log(t, 6, addr, 0);
            t += load<u8>(289100 + (t % frameCycleCount));
            t++;
        } else {
            t += 3;
        }
    } else {
        if (loggingEnabled) log(t, 6, addr, 0);
        t += load<u8>(289100 + (t % frameCycleCount));
        t += 3;
    }

    return result;
}

export function writePort(addr:u16, val:u8):void {
    /* apply pre-write contention */
    const page:u8 = load<u8>(288260 + (addr >> 14));
    const addressIsContended:u8 = load<u8>(288264 + (page));
    if (addressIsContended) {
        if (loggingEnabled) log(t, 6, addr, 0);
        t += load<u8>(289100 + (t % frameCycleCount));
    }
    t++;

    if (loggingEnabled) log(t, 5, addr, val);
    if (!(addr & 0x0001)) {
        /* border colour / speaker */
        updateFramebuffer();  // apply all screen upates up to this point
        updateAudioBuffer(t);
        borderColour = val & 0x07;
        speakerState = (val & 0x10) >> 4;
    } else if (!(addr & 0x8002)) {
        /* 128/+2 paging */
        if (!pagingLocked) {

            updateFramebuffer();  // so that screen switching happens at the right position

store<u8>(288256 + (3), (val & 0x07));
store<u8>(288260 + (3), (val & 0x07));
            screenPageIndex = (val & 0x08) ? 7 : 5;
store<u8>(288256 + (0), ((val & 0x10) ? rom1Page : rom0Page));
            pagingLocked = bool(val & 0x20);
        }
    } else if ((addr & 0xc002) == 0xc000) {
        selectedAYRegister = val;
    } else if ((addr & 0xc002) == 0x8000) {
        updateAudioBuffer(t);
        writeAYRegister(selectedAYRegister, val);
    }

    /* apply post-write contention */
    if (addr & 0x0001) {
        if (addressIsContended) {
            if (loggingEnabled) log(t, 6, addr, 0);
            t += load<u8>(289100 + (t % frameCycleCount));
            t++;
            if (loggingEnabled) log(t, 6, addr, 0);
            t += load<u8>(289100 + (t % frameCycleCount));
            t++;
            if (loggingEnabled) log(t, 6, addr, 0);
            t += load<u8>(289100 + (t % frameCycleCount));
            t++;
        } else {
            t += 3;
        }
    } else {
        if (loggingEnabled) log(t, 6, addr, 0);
        t += load<u8>(289100 + (t % frameCycleCount));
        t += 3;
    }

}

let screenEventPointer:u32 = 0;

function updateFramebuffer():void {
    /* process all of the screen bytes that are due up to the current tstate */
    const screenBaseAddr:u32 = screenPageIndex << 14;

    // end marker is 0xffffffff, which will always be greater than t
    while (load<u32>(361100 + 4 * (screenEventPointer)) <= t) {
        const addressWord:u32 = load<u32>(361100 + 4 * (screenEventPointer + 1));
        if (addressWord == 0xffffffff) {
store<u8>(0 + (framebufferIndex++), (borderColour));
            floatingBusValue = 0xff;
        } else {
            const screenAddr:u32 = screenBaseAddr | (addressWord & 0xffff);
            const attributeAddr:u32 = screenBaseAddr | (addressWord >> 16);
store<u8>(0 + (framebufferIndex++), (load<u8>(26112 + (screenAddr))));
store<u8>(0 + (framebufferIndex++), (load<u8>(26112 + (attributeAddr))));
store<u8>(0 + (framebufferIndex++), (load<u8>(26112 + (screenAddr + 1))));
            floatingBusValue = load<u8>(26112 + (attributeAddr + 1));
store<u8>(0 + (framebufferIndex++), (floatingBusValue));
        }
        screenEventPointer += 2;
    }
}

function updateAudioBuffer(targetTime:u32):void {
    /* Fill the audio buffer up to the given target tstate number, using the current state
    of the speaker and AY, and fetching new tape pulses as required. */

    updateTapePulses(targetTime);
    updateAudioBufferInner(targetTime);
}

function updateAudioBufferInner(targetTime:u32):void {
    /* Fill the audio buffer up to the given target tstate number, using the current state
    of the speaker, AY and tape. targetTime is chosen to be a small enough increment that
    no changes of state (including new tape pulses) occur in this timespan. */
    microslicesSinceLastSample += (targetTime - lastAudioT) * samplesPerFrame;
    while (microslicesSinceLastSample >= frameCycleCount) {
        const speakerLevel:f32 = (speakerState ? 0.5 : 0.0) + (tapeLevel ? 0.25 : 0.0);

        toneGeneratorACounter -= ayCyclesPerSample;
        while (toneGeneratorACounter < 0) {
            toneGeneratorACounter += toneGeneratorAPeriod;
            toneGeneratorAPhase ^= 0xff;
        }

        toneGeneratorBCounter -= ayCyclesPerSample;
        while (toneGeneratorBCounter < 0) {
            toneGeneratorBCounter += toneGeneratorBPeriod;
            toneGeneratorBPhase ^= 0xff;
        }

        toneGeneratorCCounter -= ayCyclesPerSample;
        while (toneGeneratorCCounter < 0) {
            toneGeneratorCCounter += toneGeneratorCPeriod;
            toneGeneratorCPhase ^= 0xff;
        }

        noiseGeneratorCounter -= ayCyclesPerSample;
        while (noiseGeneratorCounter < 0) {
            noiseGeneratorCounter += noiseGeneratorPeriod;

            if ((noiseGeneratorSeed + 1) & 2)
                noiseGeneratorPhase ^= 0xff;

            /* rng is 17-bit shift reg, bit 0 is output.
            * input is bit 0 xor bit 3.
            */
            if (noiseGeneratorSeed & 1) noiseGeneratorSeed ^= 0x24000;
            noiseGeneratorSeed >>= 1;
        }

        envelopeCounter -= ayCyclesPerSample;
        while (envelopeCounter < 0) {
            envelopeCounter += envelopePeriod;

            envelopeRampCounter--;
            if (envelopeRampCounter == 0xff) {
                envelopeRampCounter = 15;
                envelopeOnFirstRamp = false;
                envelopeAlternatePhase ^= 0x0f;
            }

            envelopeValue = (
                /* start with the descending ramp counter */
                envelopeRampCounter
                /* XOR with the 'alternating' bit if on an even-numbered ramp */
                ^ (envelopeAlternatePhase && envelopeAlternateMask)
            );
            /* OR with the 'hold' bit if past the first ramp */
            if (!envelopeOnFirstRamp) envelopeValue |= envelopeHoldMask;
            /* XOR with the 'attack' bit */
            envelopeValue ^= envelopeAttackMask;
            /* AND with the 'continue' bit if past the first ramp */
            if (!envelopeOnFirstRamp) envelopeValue &= envelopeContinueMask;
        }

        const finalVolumeA:u8 = (
            ((volumeA & 0x10) ? envelopeValue : (volumeA & 0x0f))
            & (toneGeneratorAPhase | toneChanAMask)
            & (noiseGeneratorPhase | noiseChanAMask)
        );
        const finalVolumeB:u8 = (
            ((volumeB & 0x10) ? envelopeValue : (volumeB & 0x0f))
            & (toneGeneratorBPhase | toneChanBMask)
            & (noiseGeneratorPhase | noiseChanBMask)
        );
        const finalVolumeC:u8 = (
            ((volumeC & 0x10) ? envelopeValue : (volumeC & 0x0f))
            & (toneGeneratorCPhase | toneChanCMask)
            & (noiseGeneratorPhase | noiseChanCMask)
        );
        const levelA:f32 = load<f32>(533300 + 4 * (finalVolumeA));
        const levelB:f32 = load<f32>(533300 + 4 * (finalVolumeB));
        const levelC:f32 = load<f32>(533300 + 4 * (finalVolumeC));

store<f32>(505108 + 4 * (audioBufferPointer), (speakerLevel * 0.70711 + levelA * 0.86603 + levelB * 0.5 + levelC * 0.70711));
store<f32>(509204 + 4 * (audioBufferPointer), (speakerLevel * 0.70711 + levelA * 0.5 + levelB * 0.86603 + levelC * 0.70711));
        audioBufferPointer = (audioBufferPointer + 1) & 0x03ff;
        microslicesSinceLastSample -= frameCycleCount;
    }
    lastAudioT = targetTime;
}

function updateTapePulses(targetTime:u32): void {
    while (targetTime > currentTapeTime) {
        if (tapePulseReadIndex == tapePulseWriteIndex) {
            updateAudioBufferInner(currentTapeTime);
            tapeLevel = 0;
            currentTapeTime = targetTime;
            return;
        }

        const pulseData = load<u16>(513300 + 2 * (tapePulseReadIndex));
        tapeLevel = u8((pulseData & 0x8000) >> 9);
        const pulseLength = u32(pulseData & 0x7fff);
        const remainingPulseCycles = pulseLength - tapePulseCyclesElapsed;
        const pulseEndTime = currentTapeTime + remainingPulseCycles;
        if (pulseEndTime <= targetTime) {
            // finish this pulse and move to next
            updateAudioBufferInner(pulseEndTime);
            currentTapeTime = pulseEndTime;
            tapePulseReadIndex++;
            tapePulseCyclesElapsed = 0;
        } else {
            // target time is within this pulse; update cycles elapsed accordingly
            const cyclesToAdvance = targetTime - currentTapeTime;
            tapePulseCyclesElapsed += cyclesToAdvance;
            currentTapeTime = targetTime;
        }
    }
}

export function keyDown(row:u8, mask:u8):void {
store<u8>(505100 + (row), (load<u8>(505100 + (row)) & ~mask));
}
export function keyUp(row:u8, mask:u8):void {
store<u8>(505100 + (row), (load<u8>(505100 + (row)) | mask));
}

function pollKeyboard(addr:u8):u8 {
    let result:u8 = 0xbf;
    for (let row:u8 = 0; row < 8; row++) {
        if (!(addr & (1<<row))) {
            /* scan this row */
            result &= load<u8>(505100 + (row));
        }
    }
    return result;
}

function recalculateAYCyclesPerSample():void {
    ayCyclesPerSample = 0.5 * f64(frameCycleCount) / f64(samplesPerFrame);
}

/* status codes returned from runFrame / resumeFrame:
0 = OK (end of frame)
1 = unrecognised opcode (should never happen...)
*/


export function runFrame():i16 {
    screenEventPointer = 0;
    framebufferIndex = 0;

    if (requestedSamplesPerFrame != samplesPerFrame) {
        samplesPerFrame = requestedSamplesPerFrame;
        recalculateAYCyclesPerSample();
        audioBufferPointer = 0;
        lastAudioT = 0;
    } else {
        /* copy any excess samples from previous frame's buffer */
        for (i = 0; i < audioBufferPointer; i++) {
store<f32>(505108 + 4 * (i), (load<f32>(505108 + 4 * (samplesPerFrame + i))));
store<f32>(509204 + 4 * (i), (load<f32>(509204 + 4 * (samplesPerFrame + i))));
        }
    }

    currentTapeTime = 0;

    return resumeFrame();
}

export function resumeFrame():i16 {
    const status = runUntil(frameCycleCount);
    if (status) {
        // a non-zero status indicates we've broken out of the frame prematurely
        // and will need to resume it with resumeFrame.
        // When we do, a trap on the next instruction back will not be honoured
        // (so that it's possible for the trap to leave pc unchanged without putting us
        // in an infinite loop).
        willTrap = false;
        return status;
    }

    updateFramebuffer();
    updateAudioBuffer(t);

    if (tapePulseWriteIndex > tapePulseReadIndex) {
        // copy excess from tape pulse buffer to start of buffer
        const excessPulses:u16 = tapePulseWriteIndex - tapePulseReadIndex;
        for (let i:u16 = 0; i < excessPulses; i++) {
            if (i == 0) {
store<u16>(513300 + 2 * (0), (load<u16>(513300 + 2 * (tapePulseReadIndex)) - u16(tapePulseCyclesElapsed)));
                tapePulseCyclesElapsed = 0;
            } else {
store<u16>(513300 + 2 * (i), (load<u16>(513300 + 2 * (tapePulseReadIndex + i))));
            }
        }
        tapePulseReadIndex = 0;
        tapePulseWriteIndex = excessPulses;
        tapePulseBufferTstateCount -= t;
    } else {
        tapePulseReadIndex = 0;
        tapePulseWriteIndex = 0;
        tapePulseCyclesElapsed = 0;
        tapePulseBufferTstateCount = 0;
    }

    t -= frameCycleCount;
    lastAudioT -= frameCycleCount;
    audioBufferPointer -= samplesPerFrame;

    return 0;
}

export function runUntil(maxT:u32):i16 {
    while (t < maxT || opcodePrefix) {
        if (t < 36 && iff1 && interruptible) {
            /* process interrupt */

            if (halted) {
                // move PC on from the HALT opcode
                pc++;
                halted = 0;
            }

            iff1 = iff2 = 0;

            /* push current PC in readiness for call to interrupt handler */
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));

            if (im == 1) {
                pc = 0x0038;
                t += 7;
            } else if (im == 2) {
                const intVector:u16 = (u16(load<u8>(288299)) << 8) | 0xff;
                const lo:u16 = u16(readMem(intVector));
                const hi:u16 = u16(readMem(intVector + 1));
                pc = (lo | (hi << 8));
                t += 7;
            } else { /* im == 0 */
                pc = 0x0038;
                t += 6;
            }
        }

        if (
            (pc == 0x056b || pc == 0x0111)
            && (load<u8>(288256 + (0)) == 9 || load<u8>(288256 + (0)) == 10)
            && tapeTrapsEnabled && willTrap
        ) {
            // tape loading trap
            return 2;
        }
        willTrap = true;

        if (betadiskEnabled) {
            if ((pc & 0xff00) == 0x3d00 && !betadiskROMActive && load<u8>(288256 + (0)) == rom1Page) {
                betadiskROMActive = true;
store<u8>(288256 + (0), (13));
            } else if (pc >= 0x4000 && betadiskROMActive) {
                betadiskROMActive = false;
store<u8>(288256 + (0), (rom1Page));
            }
        }

        interruptible = true; // unless overridden by opcode
        if (opcodePrefix == 0) {
            contendRead(pc);
            t += 4;
            let op:u8 = readMemInternal(pc++);

            const r = load<u8>(288298);
store<u8>(288298, ((r & 0x80) | ((r + 1) & 0x7f)));

            switch (op) {

        case 0x0:  /* NOP */
    

            break;
    
        case 0x1:  /* LD BC,nn */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u16>(288278, (lo | (hi << 8)));
    

            break;
    
        case 0x2:  /* LD (BC),A */
    
        writeMem(load<u16>(288278), load<u8>(288277));
    

            break;
    
        case 0x3:  /* INC BC */
    
store<u16>(288278, (load<u16>(288278) + 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x4:  /* INC B */
    
        const val = load<u8>(288279);
        const result:u8 = val + 1;
store<u8>(288279, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x5:  /* DEC B */
    
        const val = load<u8>(288279);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288279, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x6:  /* LD B,n */
    
        const val = readMem(pc++);
store<u8>(288279, (val));
        

            break;
    
        case 0x7:  /* RLCA */
    
        let a:u8 = load<u8>(288277);
        a = (a << 1) | (a >> 7);
store<u8>(288277, (a));
store<u8>(288276, ((load<u8>(288276) & (0x04 | 0x40 | 0x80)) | (a & (0x01 | 0x08 | 0x20))));
    

            break;
    
        case 0x8:  /* EX AF,AF' */
    
        let tmp:u16 = load<u16>(288276);
store<u16>(288276, (load<u16>(288284)));
store<u16>(288284, (tmp));
    

            break;
    
        case 0x9:  /* ADD HL,BC */
    
        const rr1:u16 = load<u16>(288282);
        const rr2:u16 = load<u16>(288278);
        const add16temp:u32 = u32(rr1) + u32(rr2);
        const lookup:u32 = ((rr1 & 0x0800) >> 11) | ((rr2 & 0x0800) >> 10) | ((add16temp & 0x0800) >>  9);
store<u16>(288282, (add16temp));
store<u8>(288276, ((load<u8>(288276) & ( 0x04 | 0x40 | 0x80 )) | (add16temp & 0x10000 ? 0x01 : 0) | ((add16temp >> 8) & ( 0x08 | 0x20 )) | load<u8>(288300 + (lookup))));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0xa:  /* LD A,(BC) */
    
store<u8>(288277, (readMem(load<u16>(288278))));
    

            break;
    
        case 0xb:  /* DEC BC */
    
store<u16>(288278, (load<u16>(288278) - 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0xc:  /* INC C */
    
        const val = load<u8>(288278);
        const result:u8 = val + 1;
store<u8>(288278, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0xd:  /* DEC C */
    
        const val = load<u8>(288278);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288278, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0xe:  /* LD C,n */
    
        const val = readMem(pc++);
store<u8>(288278, (val));
        

            break;
    
        case 0xf:  /* RRCA */
    
        let a:u8 = load<u8>(288277);
        const f:u8 = (load<u8>(288276) & (0x04 | 0x40 | 0x80)) | (a & 0x01);
        a = (a >> 1) | (a << 7);
store<u8>(288277, (a));
store<u8>(288276, (f | (a & (0x08 | 0x20))));
    

            break;
    
        case 0x10:  /* DJNZ n */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const b:u8 = load<u8>(288279) - 1;
store<u8>(288279, (b));
        if (b) {
            /* take branch */
            const offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            /* do not take branch */
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x11:  /* LD DE,nn */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u16>(288280, (lo | (hi << 8)));
    

            break;
    
        case 0x12:  /* LD (DE),A */
    
        writeMem(load<u16>(288280), load<u8>(288277));
    

            break;
    
        case 0x13:  /* INC DE */
    
store<u16>(288280, (load<u16>(288280) + 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x14:  /* INC D */
    
        const val = load<u8>(288281);
        const result:u8 = val + 1;
store<u8>(288281, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x15:  /* DEC D */
    
        const val = load<u8>(288281);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288281, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x16:  /* LD D,n */
    
        const val = readMem(pc++);
store<u8>(288281, (val));
        

            break;
    
        case 0x17:  /* RLA */
    
        const val:u8 = load<u8>(288277);
        const f:u8 = load<u8>(288276);
        const result:u8 = (val << 1) | (f & 0x01);
store<u8>(288277, (result));
store<u8>(288276, ((f & (0x04 | 0x40 | 0x80)) | (result & (0x08 | 0x20)) | (val >> 7)));
    

            break;
    
        case 0x18:  /* JR n */
    
        let offset = i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc += i16(offset) + 1;
    

            break;
    
        case 0x19:  /* ADD HL,DE */
    
        const rr1:u16 = load<u16>(288282);
        const rr2:u16 = load<u16>(288280);
        const add16temp:u32 = u32(rr1) + u32(rr2);
        const lookup:u32 = ((rr1 & 0x0800) >> 11) | ((rr2 & 0x0800) >> 10) | ((add16temp & 0x0800) >>  9);
store<u16>(288282, (add16temp));
store<u8>(288276, ((load<u8>(288276) & ( 0x04 | 0x40 | 0x80 )) | (add16temp & 0x10000 ? 0x01 : 0) | ((add16temp >> 8) & ( 0x08 | 0x20 )) | load<u8>(288300 + (lookup))));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x1a:  /* LD A,(DE) */
    
store<u8>(288277, (readMem(load<u16>(288280))));
    

            break;
    
        case 0x1b:  /* DEC DE */
    
store<u16>(288280, (load<u16>(288280) - 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x1c:  /* INC E */
    
        const val = load<u8>(288280);
        const result:u8 = val + 1;
store<u8>(288280, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x1d:  /* DEC E */
    
        const val = load<u8>(288280);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288280, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x1e:  /* LD E,n */
    
        const val = readMem(pc++);
store<u8>(288280, (val));
        

            break;
    
        case 0x1f:  /* RRA */
    
        const val:u8 = load<u8>(288277);
        const f:u8 = load<u8>(288276);
        const result = (val >> 1) | (f << 7);
store<u8>(288277, (result));
store<u8>(288276, ((f & (0x04 | 0x40 | 0x80)) | (result & (0x08 | 0x20)) | (val & 0x01)));
    

            break;
    
        case 0x20:  /* JR NZ,n */
    
        if (!(load<u8>(288276) & 0x40)) {
            let offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x21:  /* LD HL,nn */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u16>(288282, (lo | (hi << 8)));
    

            break;
    
        case 0x22:  /* LD (nn),HL */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
        const rr:u16 = load<u16>(288282);
        writeMem(addr, u8(rr & 0xff));
        writeMem(addr + 1, u8(rr >> 8));
    

            break;
    
        case 0x23:  /* INC HL */
    
store<u16>(288282, (load<u16>(288282) + 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x24:  /* INC H */
    
        const val = load<u8>(288283);
        const result:u8 = val + 1;
store<u8>(288283, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x25:  /* DEC H */
    
        const val = load<u8>(288283);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288283, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x26:  /* LD H,n */
    
        const val = readMem(pc++);
store<u8>(288283, (val));
        

            break;
    
        case 0x27:  /* DAA */
    
        let add:u32 = 0;
        let a:u32 = u32(load<u8>(288277));
        let f:u8 = load<u8>(288276);
        let carry:u8 = f & 0x01;
        if ((f & 0x10) || ((a & 0x0f) > 9)) add = 6;
        if (carry || (a > 0x99)) add |= 0x60;
        if (a > 0x99) carry = 0x01;
        let result:u32;
        if (f & 0x02) {
            result = a - add;
            const lookup:u32 = ((a & 0x88) >> 3) | ((add & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
            f = (result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)));
        } else {
            result = a + add;
            const lookup:u32 = ((a & 0x88) >> 3) | ((add & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
            f = (result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)));
        }
store<u8>(288276, ((f & ~(0x01 | 0x04)) | carry | load<u8>(288588 + (u8(result)))));
    

            break;
    
        case 0x28:  /* JR Z,n */
    
        if ((load<u8>(288276) & 0x40)) {
            let offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x29:  /* ADD HL,HL */
    
        const rr1:u16 = load<u16>(288282);
        const rr2:u16 = load<u16>(288282);
        const add16temp:u32 = u32(rr1) + u32(rr2);
        const lookup:u32 = ((rr1 & 0x0800) >> 11) | ((rr2 & 0x0800) >> 10) | ((add16temp & 0x0800) >>  9);
store<u16>(288282, (add16temp));
store<u8>(288276, ((load<u8>(288276) & ( 0x04 | 0x40 | 0x80 )) | (add16temp & 0x10000 ? 0x01 : 0) | ((add16temp >> 8) & ( 0x08 | 0x20 )) | load<u8>(288300 + (lookup))));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x2a:  /* LD HL,(nn) */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
store<u16>(288282, (u16(readMem(addr)) | (u16(readMem(addr + 1)) << 8)));
    

            break;
    
        case 0x2b:  /* DEC HL */
    
store<u16>(288282, (load<u16>(288282) - 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x2c:  /* INC L */
    
        const val = load<u8>(288282);
        const result:u8 = val + 1;
store<u8>(288282, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x2d:  /* DEC L */
    
        const val = load<u8>(288282);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288282, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x2e:  /* LD L,n */
    
        const val = readMem(pc++);
store<u8>(288282, (val));
        

            break;
    
        case 0x2f:  /* CPL */
    
        const result:u8 = load<u8>(288277) ^ 0xff;
store<u8>(288277, (result));
store<u8>(288276, ((load<u8>(288276) & (0x01 | 0x04 | 0x40 | 0x80)) | (result & (0x08 | 0x20)) | 0x02 | 0x10));
    

            break;
    
        case 0x30:  /* JR NC,n */
    
        if (!(load<u8>(288276) & 0x01)) {
            let offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x31:  /* LD SP,nn */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u16>(288296, (lo | (hi << 8)));
    

            break;
    
        case 0x32:  /* LD (nn),A */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        writeMem(lo | (hi << 8), load<u8>(288277));
    

            break;
    
        case 0x33:  /* INC SP */
    
store<u16>(288296, (load<u16>(288296) + 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x34:  /* INC (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val + 1;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x35:  /* DEC (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x36:  /* LD (HL),n */
    
        writeMem(load<u16>(288282), readMem(pc++));
    

            break;
    
        case 0x37:  /* SCF */
    
store<u8>(288276, ((load<u8>(288276) & (0x04 | 0x40 | 0x80)) | (load<u8>(288277) & (0x08 | 0x20)) | 0x01));
    

            break;
    
        case 0x38:  /* JR C,n */
    
        if ((load<u8>(288276) & 0x01)) {
            let offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x39:  /* ADD HL,SP */
    
        const rr1:u16 = load<u16>(288282);
        const rr2:u16 = load<u16>(288296);
        const add16temp:u32 = u32(rr1) + u32(rr2);
        const lookup:u32 = ((rr1 & 0x0800) >> 11) | ((rr2 & 0x0800) >> 10) | ((add16temp & 0x0800) >>  9);
store<u16>(288282, (add16temp));
store<u8>(288276, ((load<u8>(288276) & ( 0x04 | 0x40 | 0x80 )) | (add16temp & 0x10000 ? 0x01 : 0) | ((add16temp >> 8) & ( 0x08 | 0x20 )) | load<u8>(288300 + (lookup))));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x3a:  /* LD A,(nn) */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u8>(288277, (readMem(lo | (hi << 8))));
    

            break;
    
        case 0x3b:  /* DEC SP */
    
store<u16>(288296, (load<u16>(288296) - 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x3c:  /* INC A */
    
        const val = load<u8>(288277);
        const result:u8 = val + 1;
store<u8>(288277, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x3d:  /* DEC A */
    
        const val = load<u8>(288277);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288277, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x3e:  /* LD A,n */
    
        const val = readMem(pc++);
store<u8>(288277, (val));
        

            break;
    
        case 0x3f:  /* CCF */
    
        const f:u8 = load<u8>(288276);
store<u8>(288276, (( f & ( 0x04 | 0x40 | 0x80 ) ) | ( ( f & 0x01 ) ? 0x10 : 0x01 ) | ( load<u8>(288277) & ( 0x08 | 0x20 ) )));
    

            break;
    
        case 0x40:  /* LD B,B */
    

            break;
    
        case 0x41:  /* LD B,C */
    
        const val = load<u8>(288278);
store<u8>(288279, (val));
        

            break;
    
        case 0x42:  /* LD B,D */
    
        const val = load<u8>(288281);
store<u8>(288279, (val));
        

            break;
    
        case 0x43:  /* LD B,E */
    
        const val = load<u8>(288280);
store<u8>(288279, (val));
        

            break;
    
        case 0x44:  /* LD B,H */
    
        const val = load<u8>(288283);
store<u8>(288279, (val));
        

            break;
    
        case 0x45:  /* LD B,L */
    
        const val = load<u8>(288282);
store<u8>(288279, (val));
        

            break;
    
        case 0x46:  /* LD B,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
store<u8>(288279, (val));
        

            break;
    
        case 0x47:  /* LD B,A */
    
        const val = load<u8>(288277);
store<u8>(288279, (val));
        

            break;
    
        case 0x48:  /* LD C,B */
    
        const val = load<u8>(288279);
store<u8>(288278, (val));
        

            break;
    
        case 0x49:  /* LD C,C */
    

            break;
    
        case 0x4a:  /* LD C,D */
    
        const val = load<u8>(288281);
store<u8>(288278, (val));
        

            break;
    
        case 0x4b:  /* LD C,E */
    
        const val = load<u8>(288280);
store<u8>(288278, (val));
        

            break;
    
        case 0x4c:  /* LD C,H */
    
        const val = load<u8>(288283);
store<u8>(288278, (val));
        

            break;
    
        case 0x4d:  /* LD C,L */
    
        const val = load<u8>(288282);
store<u8>(288278, (val));
        

            break;
    
        case 0x4e:  /* LD C,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
store<u8>(288278, (val));
        

            break;
    
        case 0x4f:  /* LD C,A */
    
        const val = load<u8>(288277);
store<u8>(288278, (val));
        

            break;
    
        case 0x50:  /* LD D,B */
    
        const val = load<u8>(288279);
store<u8>(288281, (val));
        

            break;
    
        case 0x51:  /* LD D,C */
    
        const val = load<u8>(288278);
store<u8>(288281, (val));
        

            break;
    
        case 0x52:  /* LD D,D */
    

            break;
    
        case 0x53:  /* LD D,E */
    
        const val = load<u8>(288280);
store<u8>(288281, (val));
        

            break;
    
        case 0x54:  /* LD D,H */
    
        const val = load<u8>(288283);
store<u8>(288281, (val));
        

            break;
    
        case 0x55:  /* LD D,L */
    
        const val = load<u8>(288282);
store<u8>(288281, (val));
        

            break;
    
        case 0x56:  /* LD D,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
store<u8>(288281, (val));
        

            break;
    
        case 0x57:  /* LD D,A */
    
        const val = load<u8>(288277);
store<u8>(288281, (val));
        

            break;
    
        case 0x58:  /* LD E,B */
    
        const val = load<u8>(288279);
store<u8>(288280, (val));
        

            break;
    
        case 0x59:  /* LD E,C */
    
        const val = load<u8>(288278);
store<u8>(288280, (val));
        

            break;
    
        case 0x5a:  /* LD E,D */
    
        const val = load<u8>(288281);
store<u8>(288280, (val));
        

            break;
    
        case 0x5b:  /* LD E,E */
    

            break;
    
        case 0x5c:  /* LD E,H */
    
        const val = load<u8>(288283);
store<u8>(288280, (val));
        

            break;
    
        case 0x5d:  /* LD E,L */
    
        const val = load<u8>(288282);
store<u8>(288280, (val));
        

            break;
    
        case 0x5e:  /* LD E,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
store<u8>(288280, (val));
        

            break;
    
        case 0x5f:  /* LD E,A */
    
        const val = load<u8>(288277);
store<u8>(288280, (val));
        

            break;
    
        case 0x60:  /* LD H,B */
    
        const val = load<u8>(288279);
store<u8>(288283, (val));
        

            break;
    
        case 0x61:  /* LD H,C */
    
        const val = load<u8>(288278);
store<u8>(288283, (val));
        

            break;
    
        case 0x62:  /* LD H,D */
    
        const val = load<u8>(288281);
store<u8>(288283, (val));
        

            break;
    
        case 0x63:  /* LD H,E */
    
        const val = load<u8>(288280);
store<u8>(288283, (val));
        

            break;
    
        case 0x64:  /* LD H,H */
    

            break;
    
        case 0x65:  /* LD H,L */
    
        const val = load<u8>(288282);
store<u8>(288283, (val));
        

            break;
    
        case 0x66:  /* LD H,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
store<u8>(288283, (val));
        

            break;
    
        case 0x67:  /* LD H,A */
    
        const val = load<u8>(288277);
store<u8>(288283, (val));
        

            break;
    
        case 0x68:  /* LD L,B */
    
        const val = load<u8>(288279);
store<u8>(288282, (val));
        

            break;
    
        case 0x69:  /* LD L,C */
    
        const val = load<u8>(288278);
store<u8>(288282, (val));
        

            break;
    
        case 0x6a:  /* LD L,D */
    
        const val = load<u8>(288281);
store<u8>(288282, (val));
        

            break;
    
        case 0x6b:  /* LD L,E */
    
        const val = load<u8>(288280);
store<u8>(288282, (val));
        

            break;
    
        case 0x6c:  /* LD L,H */
    
        const val = load<u8>(288283);
store<u8>(288282, (val));
        

            break;
    
        case 0x6d:  /* LD L,L */
    

            break;
    
        case 0x6e:  /* LD L,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
store<u8>(288282, (val));
        

            break;
    
        case 0x6f:  /* LD L,A */
    
        const val = load<u8>(288277);
store<u8>(288282, (val));
        

            break;
    
        case 0x70:  /* LD (HL),B */
    
        writeMem(load<u16>(288282), load<u8>(288279));
    

            break;
    
        case 0x71:  /* LD (HL),C */
    
        writeMem(load<u16>(288282), load<u8>(288278));
    

            break;
    
        case 0x72:  /* LD (HL),D */
    
        writeMem(load<u16>(288282), load<u8>(288281));
    

            break;
    
        case 0x73:  /* LD (HL),E */
    
        writeMem(load<u16>(288282), load<u8>(288280));
    

            break;
    
        case 0x74:  /* LD (HL),H */
    
        writeMem(load<u16>(288282), load<u8>(288283));
    

            break;
    
        case 0x75:  /* LD (HL),L */
    
        writeMem(load<u16>(288282), load<u8>(288282));
    

            break;
    
        case 0x76:  /* HALT */
    
        halted = 1;
        pc--;
    

            break;
    
        case 0x77:  /* LD (HL),A */
    
        writeMem(load<u16>(288282), load<u8>(288277));
    

            break;
    
        case 0x78:  /* LD A,B */
    
        const val = load<u8>(288279);
store<u8>(288277, (val));
        

            break;
    
        case 0x79:  /* LD A,C */
    
        const val = load<u8>(288278);
store<u8>(288277, (val));
        

            break;
    
        case 0x7a:  /* LD A,D */
    
        const val = load<u8>(288281);
store<u8>(288277, (val));
        

            break;
    
        case 0x7b:  /* LD A,E */
    
        const val = load<u8>(288280);
store<u8>(288277, (val));
        

            break;
    
        case 0x7c:  /* LD A,H */
    
        const val = load<u8>(288283);
store<u8>(288277, (val));
        

            break;
    
        case 0x7d:  /* LD A,L */
    
        const val = load<u8>(288282);
store<u8>(288277, (val));
        

            break;
    
        case 0x7e:  /* LD A,(HL) */
    
store<u8>(288277, (readMem(load<u16>(288282))));
    

            break;
    
        case 0x7f:  /* LD A,A */
    

            break;
    
        case 0x80:  /* ADD A,B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x81:  /* ADD A,C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x82:  /* ADD A,D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x83:  /* ADD A,E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x84:  /* ADD A,H */
    
        const val = load<u8>(288283);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x85:  /* ADD A,L */
    
        const val = load<u8>(288282);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x86:  /* ADD A,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x87:  /* ADD A,A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x88:  /* ADC A,B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x89:  /* ADC A,C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8a:  /* ADC A,D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8b:  /* ADC A,E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8c:  /* ADC A,H */
    
        const val = load<u8>(288283);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8d:  /* ADC A,L */
    
        const val = load<u8>(288282);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8e:  /* ADC A,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8f:  /* ADC A,A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x90:  /* SUB B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x91:  /* SUB C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x92:  /* SUB D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x93:  /* SUB E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x94:  /* SUB H */
    
        const val = load<u8>(288283);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x95:  /* SUB L */
    
        const val = load<u8>(288282);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x96:  /* SUB (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x97:  /* SUB A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x98:  /* SBC A,B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x99:  /* SBC A,C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9a:  /* SBC A,D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9b:  /* SBC A,E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9c:  /* SBC A,H */
    
        const val = load<u8>(288283);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9d:  /* SBC A,L */
    
        const val = load<u8>(288282);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9e:  /* SBC A,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9f:  /* SBC A,A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xa0:  /* AND B */
    
        const val = load<u8>(288279);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa1:  /* AND C */
    
        const val = load<u8>(288278);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa2:  /* AND D */
    
        const val = load<u8>(288281);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa3:  /* AND E */
    
        const val = load<u8>(288280);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa4:  /* AND H */
    
        const val = load<u8>(288283);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa5:  /* AND L */
    
        const val = load<u8>(288282);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa6:  /* AND (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa7:  /* AND A */
    
store<u8>(288276, (0x10 | load<u8>(288844 + (load<u8>(288277)))));
    

            break;
    
        case 0xa8:  /* XOR B */
    
        const val = load<u8>(288279);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xa9:  /* XOR C */
    
        const val = load<u8>(288278);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xaa:  /* XOR D */
    
        const val = load<u8>(288281);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xab:  /* XOR E */
    
        const val = load<u8>(288280);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xac:  /* XOR H */
    
        const val = load<u8>(288283);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xad:  /* XOR L */
    
        const val = load<u8>(288282);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xae:  /* XOR (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xaf:  /* XOR A */
    
store<u8>(288277, (0));
store<u8>(288276, (load<u8>(288844 + (0))));
    

            break;
    
        case 0xb0:  /* OR B */
    
        const val = load<u8>(288279);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb1:  /* OR C */
    
        const val = load<u8>(288278);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb2:  /* OR D */
    
        const val = load<u8>(288281);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb3:  /* OR E */
    
        const val = load<u8>(288280);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb4:  /* OR H */
    
        const val = load<u8>(288283);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb5:  /* OR L */
    
        const val = load<u8>(288282);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb6:  /* OR (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb7:  /* OR A */
    
store<u8>(288276, (load<u8>(288844 + (load<u8>(288277)))));
    

            break;
    
        case 0xb8:  /* CP B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xb9:  /* CP C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xba:  /* CP D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbb:  /* CP E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbc:  /* CP H */
    
        const val = load<u8>(288283);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbd:  /* CP L */
    
        const val = load<u8>(288282);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbe:  /* CP (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbf:  /* CP A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xc0:  /* RET NZ */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if (!(load<u8>(288276) & 0x40)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xc1:  /* POP BC */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
store<u16>(288278, (lo | (hi << 8)));
    

            break;
    
        case 0xc2:  /* JP NZ,nn */
    
        if (!(load<u8>(288276) & 0x40)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xc3:  /* JP nn */
    
        let lo = u16(readMem(pc++));
        let hi = u16(readMem(pc++));
        pc = lo + (hi << 8);
    

            break;
    
        case 0xc4:  /* CALL NZ,nn */
    
        if (!(load<u8>(288276) & 0x40)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xc5:  /* PUSH BC */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const rr:u16 = load<u16>(288278);
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(rr >> 8));
        sp--;
        writeMem(sp, u8(rr & 0xff));
store<u16>(288296, (sp));
    

            break;
    
        case 0xc6:  /* ADD A,n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xc7:  /* RST 0x00 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 0;
    

            break;
    
        case 0xc8:  /* RET Z */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if ((load<u8>(288276) & 0x40)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xc9:  /* RET */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
        pc = lo | (hi << 8);
    

            break;
    
        case 0xca:  /* JP Z,nn */
    
        if ((load<u8>(288276) & 0x40)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xcb:  /* prefix cb */
    
        opcodePrefix = 0xcb;
        interruptible = false;
    

            break;
    
        case 0xcc:  /* CALL Z,nn */
    
        if ((load<u8>(288276) & 0x40)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xcd:  /* CALL nn */
    
        let lo = u16(readMem(pc++));
        let hi = u16(readMem(pc));
        contendDirtyRead(pc);
        t++;
        pc++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = lo + (hi << 8);
    

            break;
    
        case 0xce:  /* ADC A,n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xcf:  /* RST 0x08 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 8;
    

            break;
    
        case 0xd0:  /* RET NC */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if (!(load<u8>(288276) & 0x01)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xd1:  /* POP DE */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
store<u16>(288280, (lo | (hi << 8)));
    

            break;
    
        case 0xd2:  /* JP NC,nn */
    
        if (!(load<u8>(288276) & 0x01)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xd3:  /* OUT (n),A */
    
        const lo:u16 = u16(readMem(pc++));
        const a:u8 = load<u8>(288277);
        writePort(lo | (u16(a) << 8), a);
    

            break;
    
        case 0xd4:  /* CALL NC,nn */
    
        if (!(load<u8>(288276) & 0x01)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xd5:  /* PUSH DE */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const rr:u16 = load<u16>(288280);
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(rr >> 8));
        sp--;
        writeMem(sp, u8(rr & 0xff));
store<u16>(288296, (sp));
    

            break;
    
        case 0xd6:  /* SUB n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xd7:  /* RST 0x10 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 16;
    

            break;
    
        case 0xd8:  /* RET C */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if ((load<u8>(288276) & 0x01)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xd9:  /* EXX */
    
        let tmp:u16 = load<u16>(288278);
store<u16>(288278, (load<u16>(288286)));
store<u16>(288286, (tmp));
        tmp = load<u16>(288280);
store<u16>(288280, (load<u16>(288288)));
store<u16>(288288, (tmp));
        tmp = load<u16>(288282);
store<u16>(288282, (load<u16>(288290)));
store<u16>(288290, (tmp));
    

            break;
    
        case 0xda:  /* JP C,nn */
    
        if ((load<u8>(288276) & 0x01)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xdb:  /* IN A,(n) */
    
        const port:u16 = (u16(load<u8>(288277)) << 8) | u16(readMem(pc++));
store<u8>(288277, (readPort(port)));
    

            break;
    
        case 0xdc:  /* CALL C,nn */
    
        if ((load<u8>(288276) & 0x01)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xdd:  /* prefix dd */
    
        opcodePrefix = 0xdd;
        interruptible = false;
    

            break;
    
        case 0xde:  /* SBC A,n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xdf:  /* RST 0x18 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 24;
    

            break;
    
        case 0xe0:  /* RET PO */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if (!(load<u8>(288276) & 0x04)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xe1:  /* POP HL */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
store<u16>(288282, (lo | (hi << 8)));
    

            break;
    
        case 0xe2:  /* JP PO,nn */
    
        if (!(load<u8>(288276) & 0x04)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xe3:  /* EX (SP),HL */
    
        const sp:u16 = load<u16>(288296);
        const lo = u16(readMem(sp));
        const hi = u16(readMem(sp + 1));
        contendDirtyRead(sp + 1);
        t++;
        const rr:u16 = load<u16>(288282);
        writeMem(sp + 1, u8(rr >> 8));
        writeMem(sp, u8(rr & 0xff));
store<u16>(288282, (lo | (hi << 8)));
        contendDirtyWrite(sp);
        t++;
        contendDirtyWrite(sp);
        t++;
    

            break;
    
        case 0xe4:  /* CALL PO,nn */
    
        if (!(load<u8>(288276) & 0x04)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xe5:  /* PUSH HL */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const rr:u16 = load<u16>(288282);
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(rr >> 8));
        sp--;
        writeMem(sp, u8(rr & 0xff));
store<u16>(288296, (sp));
    

            break;
    
        case 0xe6:  /* AND n */
    
        const val = readMem(pc++);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xe7:  /* RST 0x20 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 32;
    

            break;
    
        case 0xe8:  /* RET PE */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if ((load<u8>(288276) & 0x04)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xe9:  /* JP (HL) */
    
        pc = load<u16>(288282);
    

            break;
    
        case 0xea:  /* JP PE,nn */
    
        if ((load<u8>(288276) & 0x04)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xeb:  /* EX DE,HL */
    
        let tmp:u16 = load<u16>(288280);
store<u16>(288280, (load<u16>(288282)));
store<u16>(288282, (tmp));
    

            break;
    
        case 0xec:  /* CALL PE,nn */
    
        if ((load<u8>(288276) & 0x04)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xed:  /* prefix ed */
    
        opcodePrefix = 0xed;
        interruptible = false;
    

            break;
    
        case 0xee:  /* XOR n */
    
        const val = readMem(pc++);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xef:  /* RST 0x28 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 40;
    

            break;
    
        case 0xf0:  /* RET P */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if (!(load<u8>(288276) & 0x80)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xf1:  /* POP AF */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
store<u16>(288276, (lo | (hi << 8)));
    

            break;
    
        case 0xf2:  /* JP P,nn */
    
        if (!(load<u8>(288276) & 0x80)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xf3:  /* DI */
    
        iff1 = iff2 = 0;
    

            break;
    
        case 0xf4:  /* CALL P,nn */
    
        if (!(load<u8>(288276) & 0x80)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xf5:  /* PUSH AF */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const rr:u16 = load<u16>(288276);
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(rr >> 8));
        sp--;
        writeMem(sp, u8(rr & 0xff));
store<u16>(288296, (sp));
    

            break;
    
        case 0xf6:  /* OR n */
    
        const val = readMem(pc++);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xf7:  /* RST 0x30 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 48;
    

            break;
    
        case 0xf8:  /* RET M */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if ((load<u8>(288276) & 0x80)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xf9:  /* LD SP,HL */
    
store<u16>(288296, (load<u16>(288282)));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0xfa:  /* JP M,nn */
    
        if ((load<u8>(288276) & 0x80)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xfb:  /* EI */
    
        iff1 = iff2 = 1;
        interruptible = false;
    

            break;
    
        case 0xfc:  /* CALL M,nn */
    
        if ((load<u8>(288276) & 0x80)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xfd:  /* prefix fd */
    
        opcodePrefix = 0xfd;
        interruptible = false;
    

            break;
    
        case 0xfe:  /* CP n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xff:  /* RST 0x38 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 56;
    

            break;
    
                default:
                    return 1;  /* unrecognised opcode */
            }
        } else if (opcodePrefix == 0xcb) {
            opcodePrefix = 0;  // for the next instruction (unless overridden)
            contendRead(pc);
            t += 4;
            let op:u8 = readMemInternal(pc++);

            const r = load<u8>(288298);
store<u8>(288298, ((r & 0x80) | ((r + 1) & 0x7f)));

            switch (op) {

        case 0x0:  /* RLC B */
    
        const val = load<u8>(288279);
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
store<u8>(288279, (result));
    

            break;
    
        case 0x1:  /* RLC C */
    
        const val = load<u8>(288278);
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
store<u8>(288278, (result));
    

            break;
    
        case 0x2:  /* RLC D */
    
        const val = load<u8>(288281);
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
store<u8>(288281, (result));
    

            break;
    
        case 0x3:  /* RLC E */
    
        const val = load<u8>(288280);
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
store<u8>(288280, (result));
    

            break;
    
        case 0x4:  /* RLC H */
    
        const val = load<u8>(288283);
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
store<u8>(288283, (result));
    

            break;
    
        case 0x5:  /* RLC L */
    
        const val = load<u8>(288282);
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
store<u8>(288282, (result));
    

            break;
    
        case 0x6:  /* RLC (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0x7:  /* RLC A */
    
        const val = load<u8>(288277);
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
store<u8>(288277, (result));
    

            break;
    
        case 0x8:  /* RRC B */
    
        const val = load<u8>(288279);
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288279, (result));
    

            break;
    
        case 0x9:  /* RRC C */
    
        const val = load<u8>(288278);
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288278, (result));
    

            break;
    
        case 0xa:  /* RRC D */
    
        const val = load<u8>(288281);
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288281, (result));
    

            break;
    
        case 0xb:  /* RRC E */
    
        const val = load<u8>(288280);
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288280, (result));
    

            break;
    
        case 0xc:  /* RRC H */
    
        const val = load<u8>(288283);
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288283, (result));
    

            break;
    
        case 0xd:  /* RRC L */
    
        const val = load<u8>(288282);
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288282, (result));
    

            break;
    
        case 0xe:  /* RRC (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xf:  /* RRC A */
    
        const val = load<u8>(288277);
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288277, (result));
    

            break;
    
        case 0x10:  /* RL B */
    
        const val = load<u8>(288279);
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
store<u8>(288279, (result));
    

            break;
    
        case 0x11:  /* RL C */
    
        const val = load<u8>(288278);
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
store<u8>(288278, (result));
    

            break;
    
        case 0x12:  /* RL D */
    
        const val = load<u8>(288281);
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
store<u8>(288281, (result));
    

            break;
    
        case 0x13:  /* RL E */
    
        const val = load<u8>(288280);
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
store<u8>(288280, (result));
    

            break;
    
        case 0x14:  /* RL H */
    
        const val = load<u8>(288283);
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
store<u8>(288283, (result));
    

            break;
    
        case 0x15:  /* RL L */
    
        const val = load<u8>(288282);
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
store<u8>(288282, (result));
    

            break;
    
        case 0x16:  /* RL (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0x17:  /* RL A */
    
        const val = load<u8>(288277);
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
store<u8>(288277, (result));
    

            break;
    
        case 0x18:  /* RR B */
    
        const val = load<u8>(288279);
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
store<u8>(288279, (result));
    

            break;
    
        case 0x19:  /* RR C */
    
        const val = load<u8>(288278);
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
store<u8>(288278, (result));
    

            break;
    
        case 0x1a:  /* RR D */
    
        const val = load<u8>(288281);
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
store<u8>(288281, (result));
    

            break;
    
        case 0x1b:  /* RR E */
    
        const val = load<u8>(288280);
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
store<u8>(288280, (result));
    

            break;
    
        case 0x1c:  /* RR H */
    
        const val = load<u8>(288283);
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
store<u8>(288283, (result));
    

            break;
    
        case 0x1d:  /* RR L */
    
        const val = load<u8>(288282);
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
store<u8>(288282, (result));
    

            break;
    
        case 0x1e:  /* RR (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0x1f:  /* RR A */
    
        const val = load<u8>(288277);
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
store<u8>(288277, (result));
    

            break;
    
        case 0x20:  /* SLA B */
    
        const val = load<u8>(288279);
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288279, (result));
    

            break;
    
        case 0x21:  /* SLA C */
    
        const val = load<u8>(288278);
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288278, (result));
    

            break;
    
        case 0x22:  /* SLA D */
    
        const val = load<u8>(288281);
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288281, (result));
    

            break;
    
        case 0x23:  /* SLA E */
    
        const val = load<u8>(288280);
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288280, (result));
    

            break;
    
        case 0x24:  /* SLA H */
    
        const val = load<u8>(288283);
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288283, (result));
    

            break;
    
        case 0x25:  /* SLA L */
    
        const val = load<u8>(288282);
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288282, (result));
    

            break;
    
        case 0x26:  /* SLA (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0x27:  /* SLA A */
    
        const val = load<u8>(288277);
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288277, (result));
    

            break;
    
        case 0x28:  /* SRA B */
    
        const val = load<u8>(288279);
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288279, (result));
    

            break;
    
        case 0x29:  /* SRA C */
    
        const val = load<u8>(288278);
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288278, (result));
    

            break;
    
        case 0x2a:  /* SRA D */
    
        const val = load<u8>(288281);
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288281, (result));
    

            break;
    
        case 0x2b:  /* SRA E */
    
        const val = load<u8>(288280);
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288280, (result));
    

            break;
    
        case 0x2c:  /* SRA H */
    
        const val = load<u8>(288283);
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288283, (result));
    

            break;
    
        case 0x2d:  /* SRA L */
    
        const val = load<u8>(288282);
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288282, (result));
    

            break;
    
        case 0x2e:  /* SRA (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0x2f:  /* SRA A */
    
        const val = load<u8>(288277);
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288277, (result));
    

            break;
    
        case 0x30:  /* SLL B */
    
        const val = load<u8>(288279);
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288279, (result));
    

            break;
    
        case 0x31:  /* SLL C */
    
        const val = load<u8>(288278);
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288278, (result));
    

            break;
    
        case 0x32:  /* SLL D */
    
        const val = load<u8>(288281);
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288281, (result));
    

            break;
    
        case 0x33:  /* SLL E */
    
        const val = load<u8>(288280);
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288280, (result));
    

            break;
    
        case 0x34:  /* SLL H */
    
        const val = load<u8>(288283);
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288283, (result));
    

            break;
    
        case 0x35:  /* SLL L */
    
        const val = load<u8>(288282);
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288282, (result));
    

            break;
    
        case 0x36:  /* SLL (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0x37:  /* SLL A */
    
        const val = load<u8>(288277);
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288277, (result));
    

            break;
    
        case 0x38:  /* SRL B */
    
        const val = load<u8>(288279);
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288279, (result));
    

            break;
    
        case 0x39:  /* SRL C */
    
        const val = load<u8>(288278);
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288278, (result));
    

            break;
    
        case 0x3a:  /* SRL D */
    
        const val = load<u8>(288281);
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288281, (result));
    

            break;
    
        case 0x3b:  /* SRL E */
    
        const val = load<u8>(288280);
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288280, (result));
    

            break;
    
        case 0x3c:  /* SRL H */
    
        const val = load<u8>(288283);
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288283, (result));
    

            break;
    
        case 0x3d:  /* SRL L */
    
        const val = load<u8>(288282);
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288282, (result));
    

            break;
    
        case 0x3e:  /* SRL (HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0x3f:  /* SRL A */
    
        const val = load<u8>(288277);
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
store<u8>(288277, (result));
    

            break;
    
        case 0x40:  /* BIT 0,B */
    
        const val:u8 = load<u8>(288279);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x41:  /* BIT 0,C */
    
        const val:u8 = load<u8>(288278);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x42:  /* BIT 0,D */
    
        const val:u8 = load<u8>(288281);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x43:  /* BIT 0,E */
    
        const val:u8 = load<u8>(288280);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x44:  /* BIT 0,H */
    
        const val:u8 = load<u8>(288283);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x45:  /* BIT 0,L */
    
        const val:u8 = load<u8>(288282);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x46:  /* BIT 0,(HL) */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(hl);
        t++;
    

            break;
    
        case 0x47:  /* BIT 0,A */
    
        const val:u8 = load<u8>(288277);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x48:  /* BIT 1,B */
    
        const val:u8 = load<u8>(288279);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x49:  /* BIT 1,C */
    
        const val:u8 = load<u8>(288278);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x4a:  /* BIT 1,D */
    
        const val:u8 = load<u8>(288281);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x4b:  /* BIT 1,E */
    
        const val:u8 = load<u8>(288280);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x4c:  /* BIT 1,H */
    
        const val:u8 = load<u8>(288283);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x4d:  /* BIT 1,L */
    
        const val:u8 = load<u8>(288282);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x4e:  /* BIT 1,(HL) */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(hl);
        t++;
    

            break;
    
        case 0x4f:  /* BIT 1,A */
    
        const val:u8 = load<u8>(288277);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x50:  /* BIT 2,B */
    
        const val:u8 = load<u8>(288279);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x51:  /* BIT 2,C */
    
        const val:u8 = load<u8>(288278);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x52:  /* BIT 2,D */
    
        const val:u8 = load<u8>(288281);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x53:  /* BIT 2,E */
    
        const val:u8 = load<u8>(288280);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x54:  /* BIT 2,H */
    
        const val:u8 = load<u8>(288283);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x55:  /* BIT 2,L */
    
        const val:u8 = load<u8>(288282);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x56:  /* BIT 2,(HL) */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(hl);
        t++;
    

            break;
    
        case 0x57:  /* BIT 2,A */
    
        const val:u8 = load<u8>(288277);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x58:  /* BIT 3,B */
    
        const val:u8 = load<u8>(288279);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x59:  /* BIT 3,C */
    
        const val:u8 = load<u8>(288278);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x5a:  /* BIT 3,D */
    
        const val:u8 = load<u8>(288281);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x5b:  /* BIT 3,E */
    
        const val:u8 = load<u8>(288280);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x5c:  /* BIT 3,H */
    
        const val:u8 = load<u8>(288283);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x5d:  /* BIT 3,L */
    
        const val:u8 = load<u8>(288282);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x5e:  /* BIT 3,(HL) */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(hl);
        t++;
    

            break;
    
        case 0x5f:  /* BIT 3,A */
    
        const val:u8 = load<u8>(288277);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x60:  /* BIT 4,B */
    
        const val:u8 = load<u8>(288279);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x61:  /* BIT 4,C */
    
        const val:u8 = load<u8>(288278);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x62:  /* BIT 4,D */
    
        const val:u8 = load<u8>(288281);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x63:  /* BIT 4,E */
    
        const val:u8 = load<u8>(288280);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x64:  /* BIT 4,H */
    
        const val:u8 = load<u8>(288283);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x65:  /* BIT 4,L */
    
        const val:u8 = load<u8>(288282);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x66:  /* BIT 4,(HL) */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(hl);
        t++;
    

            break;
    
        case 0x67:  /* BIT 4,A */
    
        const val:u8 = load<u8>(288277);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x68:  /* BIT 5,B */
    
        const val:u8 = load<u8>(288279);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x69:  /* BIT 5,C */
    
        const val:u8 = load<u8>(288278);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x6a:  /* BIT 5,D */
    
        const val:u8 = load<u8>(288281);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x6b:  /* BIT 5,E */
    
        const val:u8 = load<u8>(288280);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x6c:  /* BIT 5,H */
    
        const val:u8 = load<u8>(288283);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x6d:  /* BIT 5,L */
    
        const val:u8 = load<u8>(288282);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x6e:  /* BIT 5,(HL) */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(hl);
        t++;
    

            break;
    
        case 0x6f:  /* BIT 5,A */
    
        const val:u8 = load<u8>(288277);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x70:  /* BIT 6,B */
    
        const val:u8 = load<u8>(288279);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x71:  /* BIT 6,C */
    
        const val:u8 = load<u8>(288278);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x72:  /* BIT 6,D */
    
        const val:u8 = load<u8>(288281);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x73:  /* BIT 6,E */
    
        const val:u8 = load<u8>(288280);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x74:  /* BIT 6,H */
    
        const val:u8 = load<u8>(288283);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x75:  /* BIT 6,L */
    
        const val:u8 = load<u8>(288282);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x76:  /* BIT 6,(HL) */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(hl);
        t++;
    

            break;
    
        case 0x77:  /* BIT 6,A */
    
        const val:u8 = load<u8>(288277);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
    

            break;
    
        case 0x78:  /* BIT 7,B */
    
        const val:u8 = load<u8>(288279);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
    

            break;
    
        case 0x79:  /* BIT 7,C */
    
        const val:u8 = load<u8>(288278);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
    

            break;
    
        case 0x7a:  /* BIT 7,D */
    
        const val:u8 = load<u8>(288281);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
    

            break;
    
        case 0x7b:  /* BIT 7,E */
    
        const val:u8 = load<u8>(288280);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
    

            break;
    
        case 0x7c:  /* BIT 7,H */
    
        const val:u8 = load<u8>(288283);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
    

            break;
    
        case 0x7d:  /* BIT 7,L */
    
        const val:u8 = load<u8>(288282);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
    

            break;
    
        case 0x7e:  /* BIT 7,(HL) */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(hl);
        t++;
    

            break;
    
        case 0x7f:  /* BIT 7,A */
    
        const val:u8 = load<u8>(288277);
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( val & ( 0x08 | 0x20 ) );
        if ( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
    

            break;
    
        case 0x80:  /* RES 0,B */
    
        const val = load<u8>(288279);
        const result:u8 = val & 254;
store<u8>(288279, (result));
    

            break;
    
        case 0x81:  /* RES 0,C */
    
        const val = load<u8>(288278);
        const result:u8 = val & 254;
store<u8>(288278, (result));
    

            break;
    
        case 0x82:  /* RES 0,D */
    
        const val = load<u8>(288281);
        const result:u8 = val & 254;
store<u8>(288281, (result));
    

            break;
    
        case 0x83:  /* RES 0,E */
    
        const val = load<u8>(288280);
        const result:u8 = val & 254;
store<u8>(288280, (result));
    

            break;
    
        case 0x84:  /* RES 0,H */
    
        const val = load<u8>(288283);
        const result:u8 = val & 254;
store<u8>(288283, (result));
    

            break;
    
        case 0x85:  /* RES 0,L */
    
        const val = load<u8>(288282);
        const result:u8 = val & 254;
store<u8>(288282, (result));
    

            break;
    
        case 0x86:  /* RES 0,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val & 254;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0x87:  /* RES 0,A */
    
        const val = load<u8>(288277);
        const result:u8 = val & 254;
store<u8>(288277, (result));
    

            break;
    
        case 0x88:  /* RES 1,B */
    
        const val = load<u8>(288279);
        const result:u8 = val & 253;
store<u8>(288279, (result));
    

            break;
    
        case 0x89:  /* RES 1,C */
    
        const val = load<u8>(288278);
        const result:u8 = val & 253;
store<u8>(288278, (result));
    

            break;
    
        case 0x8a:  /* RES 1,D */
    
        const val = load<u8>(288281);
        const result:u8 = val & 253;
store<u8>(288281, (result));
    

            break;
    
        case 0x8b:  /* RES 1,E */
    
        const val = load<u8>(288280);
        const result:u8 = val & 253;
store<u8>(288280, (result));
    

            break;
    
        case 0x8c:  /* RES 1,H */
    
        const val = load<u8>(288283);
        const result:u8 = val & 253;
store<u8>(288283, (result));
    

            break;
    
        case 0x8d:  /* RES 1,L */
    
        const val = load<u8>(288282);
        const result:u8 = val & 253;
store<u8>(288282, (result));
    

            break;
    
        case 0x8e:  /* RES 1,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val & 253;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0x8f:  /* RES 1,A */
    
        const val = load<u8>(288277);
        const result:u8 = val & 253;
store<u8>(288277, (result));
    

            break;
    
        case 0x90:  /* RES 2,B */
    
        const val = load<u8>(288279);
        const result:u8 = val & 251;
store<u8>(288279, (result));
    

            break;
    
        case 0x91:  /* RES 2,C */
    
        const val = load<u8>(288278);
        const result:u8 = val & 251;
store<u8>(288278, (result));
    

            break;
    
        case 0x92:  /* RES 2,D */
    
        const val = load<u8>(288281);
        const result:u8 = val & 251;
store<u8>(288281, (result));
    

            break;
    
        case 0x93:  /* RES 2,E */
    
        const val = load<u8>(288280);
        const result:u8 = val & 251;
store<u8>(288280, (result));
    

            break;
    
        case 0x94:  /* RES 2,H */
    
        const val = load<u8>(288283);
        const result:u8 = val & 251;
store<u8>(288283, (result));
    

            break;
    
        case 0x95:  /* RES 2,L */
    
        const val = load<u8>(288282);
        const result:u8 = val & 251;
store<u8>(288282, (result));
    

            break;
    
        case 0x96:  /* RES 2,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val & 251;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0x97:  /* RES 2,A */
    
        const val = load<u8>(288277);
        const result:u8 = val & 251;
store<u8>(288277, (result));
    

            break;
    
        case 0x98:  /* RES 3,B */
    
        const val = load<u8>(288279);
        const result:u8 = val & 247;
store<u8>(288279, (result));
    

            break;
    
        case 0x99:  /* RES 3,C */
    
        const val = load<u8>(288278);
        const result:u8 = val & 247;
store<u8>(288278, (result));
    

            break;
    
        case 0x9a:  /* RES 3,D */
    
        const val = load<u8>(288281);
        const result:u8 = val & 247;
store<u8>(288281, (result));
    

            break;
    
        case 0x9b:  /* RES 3,E */
    
        const val = load<u8>(288280);
        const result:u8 = val & 247;
store<u8>(288280, (result));
    

            break;
    
        case 0x9c:  /* RES 3,H */
    
        const val = load<u8>(288283);
        const result:u8 = val & 247;
store<u8>(288283, (result));
    

            break;
    
        case 0x9d:  /* RES 3,L */
    
        const val = load<u8>(288282);
        const result:u8 = val & 247;
store<u8>(288282, (result));
    

            break;
    
        case 0x9e:  /* RES 3,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val & 247;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0x9f:  /* RES 3,A */
    
        const val = load<u8>(288277);
        const result:u8 = val & 247;
store<u8>(288277, (result));
    

            break;
    
        case 0xa0:  /* RES 4,B */
    
        const val = load<u8>(288279);
        const result:u8 = val & 239;
store<u8>(288279, (result));
    

            break;
    
        case 0xa1:  /* RES 4,C */
    
        const val = load<u8>(288278);
        const result:u8 = val & 239;
store<u8>(288278, (result));
    

            break;
    
        case 0xa2:  /* RES 4,D */
    
        const val = load<u8>(288281);
        const result:u8 = val & 239;
store<u8>(288281, (result));
    

            break;
    
        case 0xa3:  /* RES 4,E */
    
        const val = load<u8>(288280);
        const result:u8 = val & 239;
store<u8>(288280, (result));
    

            break;
    
        case 0xa4:  /* RES 4,H */
    
        const val = load<u8>(288283);
        const result:u8 = val & 239;
store<u8>(288283, (result));
    

            break;
    
        case 0xa5:  /* RES 4,L */
    
        const val = load<u8>(288282);
        const result:u8 = val & 239;
store<u8>(288282, (result));
    

            break;
    
        case 0xa6:  /* RES 4,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val & 239;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xa7:  /* RES 4,A */
    
        const val = load<u8>(288277);
        const result:u8 = val & 239;
store<u8>(288277, (result));
    

            break;
    
        case 0xa8:  /* RES 5,B */
    
        const val = load<u8>(288279);
        const result:u8 = val & 223;
store<u8>(288279, (result));
    

            break;
    
        case 0xa9:  /* RES 5,C */
    
        const val = load<u8>(288278);
        const result:u8 = val & 223;
store<u8>(288278, (result));
    

            break;
    
        case 0xaa:  /* RES 5,D */
    
        const val = load<u8>(288281);
        const result:u8 = val & 223;
store<u8>(288281, (result));
    

            break;
    
        case 0xab:  /* RES 5,E */
    
        const val = load<u8>(288280);
        const result:u8 = val & 223;
store<u8>(288280, (result));
    

            break;
    
        case 0xac:  /* RES 5,H */
    
        const val = load<u8>(288283);
        const result:u8 = val & 223;
store<u8>(288283, (result));
    

            break;
    
        case 0xad:  /* RES 5,L */
    
        const val = load<u8>(288282);
        const result:u8 = val & 223;
store<u8>(288282, (result));
    

            break;
    
        case 0xae:  /* RES 5,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val & 223;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xaf:  /* RES 5,A */
    
        const val = load<u8>(288277);
        const result:u8 = val & 223;
store<u8>(288277, (result));
    

            break;
    
        case 0xb0:  /* RES 6,B */
    
        const val = load<u8>(288279);
        const result:u8 = val & 191;
store<u8>(288279, (result));
    

            break;
    
        case 0xb1:  /* RES 6,C */
    
        const val = load<u8>(288278);
        const result:u8 = val & 191;
store<u8>(288278, (result));
    

            break;
    
        case 0xb2:  /* RES 6,D */
    
        const val = load<u8>(288281);
        const result:u8 = val & 191;
store<u8>(288281, (result));
    

            break;
    
        case 0xb3:  /* RES 6,E */
    
        const val = load<u8>(288280);
        const result:u8 = val & 191;
store<u8>(288280, (result));
    

            break;
    
        case 0xb4:  /* RES 6,H */
    
        const val = load<u8>(288283);
        const result:u8 = val & 191;
store<u8>(288283, (result));
    

            break;
    
        case 0xb5:  /* RES 6,L */
    
        const val = load<u8>(288282);
        const result:u8 = val & 191;
store<u8>(288282, (result));
    

            break;
    
        case 0xb6:  /* RES 6,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val & 191;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xb7:  /* RES 6,A */
    
        const val = load<u8>(288277);
        const result:u8 = val & 191;
store<u8>(288277, (result));
    

            break;
    
        case 0xb8:  /* RES 7,B */
    
        const val = load<u8>(288279);
        const result:u8 = val & 127;
store<u8>(288279, (result));
    

            break;
    
        case 0xb9:  /* RES 7,C */
    
        const val = load<u8>(288278);
        const result:u8 = val & 127;
store<u8>(288278, (result));
    

            break;
    
        case 0xba:  /* RES 7,D */
    
        const val = load<u8>(288281);
        const result:u8 = val & 127;
store<u8>(288281, (result));
    

            break;
    
        case 0xbb:  /* RES 7,E */
    
        const val = load<u8>(288280);
        const result:u8 = val & 127;
store<u8>(288280, (result));
    

            break;
    
        case 0xbc:  /* RES 7,H */
    
        const val = load<u8>(288283);
        const result:u8 = val & 127;
store<u8>(288283, (result));
    

            break;
    
        case 0xbd:  /* RES 7,L */
    
        const val = load<u8>(288282);
        const result:u8 = val & 127;
store<u8>(288282, (result));
    

            break;
    
        case 0xbe:  /* RES 7,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val & 127;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xbf:  /* RES 7,A */
    
        const val = load<u8>(288277);
        const result:u8 = val & 127;
store<u8>(288277, (result));
    

            break;
    
        case 0xc0:  /* SET 0,B */
    
        const val = load<u8>(288279);
        const result:u8 = val | 1;
store<u8>(288279, (result));
    

            break;
    
        case 0xc1:  /* SET 0,C */
    
        const val = load<u8>(288278);
        const result:u8 = val | 1;
store<u8>(288278, (result));
    

            break;
    
        case 0xc2:  /* SET 0,D */
    
        const val = load<u8>(288281);
        const result:u8 = val | 1;
store<u8>(288281, (result));
    

            break;
    
        case 0xc3:  /* SET 0,E */
    
        const val = load<u8>(288280);
        const result:u8 = val | 1;
store<u8>(288280, (result));
    

            break;
    
        case 0xc4:  /* SET 0,H */
    
        const val = load<u8>(288283);
        const result:u8 = val | 1;
store<u8>(288283, (result));
    

            break;
    
        case 0xc5:  /* SET 0,L */
    
        const val = load<u8>(288282);
        const result:u8 = val | 1;
store<u8>(288282, (result));
    

            break;
    
        case 0xc6:  /* SET 0,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val | 1;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xc7:  /* SET 0,A */
    
        const val = load<u8>(288277);
        const result:u8 = val | 1;
store<u8>(288277, (result));
    

            break;
    
        case 0xc8:  /* SET 1,B */
    
        const val = load<u8>(288279);
        const result:u8 = val | 2;
store<u8>(288279, (result));
    

            break;
    
        case 0xc9:  /* SET 1,C */
    
        const val = load<u8>(288278);
        const result:u8 = val | 2;
store<u8>(288278, (result));
    

            break;
    
        case 0xca:  /* SET 1,D */
    
        const val = load<u8>(288281);
        const result:u8 = val | 2;
store<u8>(288281, (result));
    

            break;
    
        case 0xcb:  /* SET 1,E */
    
        const val = load<u8>(288280);
        const result:u8 = val | 2;
store<u8>(288280, (result));
    

            break;
    
        case 0xcc:  /* SET 1,H */
    
        const val = load<u8>(288283);
        const result:u8 = val | 2;
store<u8>(288283, (result));
    

            break;
    
        case 0xcd:  /* SET 1,L */
    
        const val = load<u8>(288282);
        const result:u8 = val | 2;
store<u8>(288282, (result));
    

            break;
    
        case 0xce:  /* SET 1,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val | 2;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xcf:  /* SET 1,A */
    
        const val = load<u8>(288277);
        const result:u8 = val | 2;
store<u8>(288277, (result));
    

            break;
    
        case 0xd0:  /* SET 2,B */
    
        const val = load<u8>(288279);
        const result:u8 = val | 4;
store<u8>(288279, (result));
    

            break;
    
        case 0xd1:  /* SET 2,C */
    
        const val = load<u8>(288278);
        const result:u8 = val | 4;
store<u8>(288278, (result));
    

            break;
    
        case 0xd2:  /* SET 2,D */
    
        const val = load<u8>(288281);
        const result:u8 = val | 4;
store<u8>(288281, (result));
    

            break;
    
        case 0xd3:  /* SET 2,E */
    
        const val = load<u8>(288280);
        const result:u8 = val | 4;
store<u8>(288280, (result));
    

            break;
    
        case 0xd4:  /* SET 2,H */
    
        const val = load<u8>(288283);
        const result:u8 = val | 4;
store<u8>(288283, (result));
    

            break;
    
        case 0xd5:  /* SET 2,L */
    
        const val = load<u8>(288282);
        const result:u8 = val | 4;
store<u8>(288282, (result));
    

            break;
    
        case 0xd6:  /* SET 2,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val | 4;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xd7:  /* SET 2,A */
    
        const val = load<u8>(288277);
        const result:u8 = val | 4;
store<u8>(288277, (result));
    

            break;
    
        case 0xd8:  /* SET 3,B */
    
        const val = load<u8>(288279);
        const result:u8 = val | 8;
store<u8>(288279, (result));
    

            break;
    
        case 0xd9:  /* SET 3,C */
    
        const val = load<u8>(288278);
        const result:u8 = val | 8;
store<u8>(288278, (result));
    

            break;
    
        case 0xda:  /* SET 3,D */
    
        const val = load<u8>(288281);
        const result:u8 = val | 8;
store<u8>(288281, (result));
    

            break;
    
        case 0xdb:  /* SET 3,E */
    
        const val = load<u8>(288280);
        const result:u8 = val | 8;
store<u8>(288280, (result));
    

            break;
    
        case 0xdc:  /* SET 3,H */
    
        const val = load<u8>(288283);
        const result:u8 = val | 8;
store<u8>(288283, (result));
    

            break;
    
        case 0xdd:  /* SET 3,L */
    
        const val = load<u8>(288282);
        const result:u8 = val | 8;
store<u8>(288282, (result));
    

            break;
    
        case 0xde:  /* SET 3,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val | 8;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xdf:  /* SET 3,A */
    
        const val = load<u8>(288277);
        const result:u8 = val | 8;
store<u8>(288277, (result));
    

            break;
    
        case 0xe0:  /* SET 4,B */
    
        const val = load<u8>(288279);
        const result:u8 = val | 16;
store<u8>(288279, (result));
    

            break;
    
        case 0xe1:  /* SET 4,C */
    
        const val = load<u8>(288278);
        const result:u8 = val | 16;
store<u8>(288278, (result));
    

            break;
    
        case 0xe2:  /* SET 4,D */
    
        const val = load<u8>(288281);
        const result:u8 = val | 16;
store<u8>(288281, (result));
    

            break;
    
        case 0xe3:  /* SET 4,E */
    
        const val = load<u8>(288280);
        const result:u8 = val | 16;
store<u8>(288280, (result));
    

            break;
    
        case 0xe4:  /* SET 4,H */
    
        const val = load<u8>(288283);
        const result:u8 = val | 16;
store<u8>(288283, (result));
    

            break;
    
        case 0xe5:  /* SET 4,L */
    
        const val = load<u8>(288282);
        const result:u8 = val | 16;
store<u8>(288282, (result));
    

            break;
    
        case 0xe6:  /* SET 4,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val | 16;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xe7:  /* SET 4,A */
    
        const val = load<u8>(288277);
        const result:u8 = val | 16;
store<u8>(288277, (result));
    

            break;
    
        case 0xe8:  /* SET 5,B */
    
        const val = load<u8>(288279);
        const result:u8 = val | 32;
store<u8>(288279, (result));
    

            break;
    
        case 0xe9:  /* SET 5,C */
    
        const val = load<u8>(288278);
        const result:u8 = val | 32;
store<u8>(288278, (result));
    

            break;
    
        case 0xea:  /* SET 5,D */
    
        const val = load<u8>(288281);
        const result:u8 = val | 32;
store<u8>(288281, (result));
    

            break;
    
        case 0xeb:  /* SET 5,E */
    
        const val = load<u8>(288280);
        const result:u8 = val | 32;
store<u8>(288280, (result));
    

            break;
    
        case 0xec:  /* SET 5,H */
    
        const val = load<u8>(288283);
        const result:u8 = val | 32;
store<u8>(288283, (result));
    

            break;
    
        case 0xed:  /* SET 5,L */
    
        const val = load<u8>(288282);
        const result:u8 = val | 32;
store<u8>(288282, (result));
    

            break;
    
        case 0xee:  /* SET 5,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val | 32;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xef:  /* SET 5,A */
    
        const val = load<u8>(288277);
        const result:u8 = val | 32;
store<u8>(288277, (result));
    

            break;
    
        case 0xf0:  /* SET 6,B */
    
        const val = load<u8>(288279);
        const result:u8 = val | 64;
store<u8>(288279, (result));
    

            break;
    
        case 0xf1:  /* SET 6,C */
    
        const val = load<u8>(288278);
        const result:u8 = val | 64;
store<u8>(288278, (result));
    

            break;
    
        case 0xf2:  /* SET 6,D */
    
        const val = load<u8>(288281);
        const result:u8 = val | 64;
store<u8>(288281, (result));
    

            break;
    
        case 0xf3:  /* SET 6,E */
    
        const val = load<u8>(288280);
        const result:u8 = val | 64;
store<u8>(288280, (result));
    

            break;
    
        case 0xf4:  /* SET 6,H */
    
        const val = load<u8>(288283);
        const result:u8 = val | 64;
store<u8>(288283, (result));
    

            break;
    
        case 0xf5:  /* SET 6,L */
    
        const val = load<u8>(288282);
        const result:u8 = val | 64;
store<u8>(288282, (result));
    

            break;
    
        case 0xf6:  /* SET 6,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val | 64;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xf7:  /* SET 6,A */
    
        const val = load<u8>(288277);
        const result:u8 = val | 64;
store<u8>(288277, (result));
    

            break;
    
        case 0xf8:  /* SET 7,B */
    
        const val = load<u8>(288279);
        const result:u8 = val | 128;
store<u8>(288279, (result));
    

            break;
    
        case 0xf9:  /* SET 7,C */
    
        const val = load<u8>(288278);
        const result:u8 = val | 128;
store<u8>(288278, (result));
    

            break;
    
        case 0xfa:  /* SET 7,D */
    
        const val = load<u8>(288281);
        const result:u8 = val | 128;
store<u8>(288281, (result));
    

            break;
    
        case 0xfb:  /* SET 7,E */
    
        const val = load<u8>(288280);
        const result:u8 = val | 128;
store<u8>(288280, (result));
    

            break;
    
        case 0xfc:  /* SET 7,H */
    
        const val = load<u8>(288283);
        const result:u8 = val | 128;
store<u8>(288283, (result));
    

            break;
    
        case 0xfd:  /* SET 7,L */
    
        const val = load<u8>(288282);
        const result:u8 = val | 128;
store<u8>(288282, (result));
    

            break;
    
        case 0xfe:  /* SET 7,(HL) */
    
        
            const hl:u16 = load<u16>(288282);
            const val = readMem(hl);
        
        const result:u8 = val | 128;
        
            contendDirtyRead(hl);
            t++;
            writeMem(hl, result);
        
    

            break;
    
        case 0xff:  /* SET 7,A */
    
        const val = load<u8>(288277);
        const result:u8 = val | 128;
store<u8>(288277, (result));
    

            break;
    
                default:
                    return 1;  /* unrecognised opcode */
            }
        } else if (opcodePrefix == 0xdd) {
            opcodePrefix = 0;  // for the next instruction (unless overridden)
            contendRead(pc);
            t += 4;
            let op:u8 = readMemInternal(pc++);

            const r = load<u8>(288298);
store<u8>(288298, ((r & 0x80) | ((r + 1) & 0x7f)));

            switch (op) {

        case 0x0:  /* NOP */
    

            break;
    
        case 0x1:  /* LD BC,nn */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u16>(288278, (lo | (hi << 8)));
    

            break;
    
        case 0x2:  /* LD (BC),A */
    
        writeMem(load<u16>(288278), load<u8>(288277));
    

            break;
    
        case 0x3:  /* INC BC */
    
store<u16>(288278, (load<u16>(288278) + 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x4:  /* INC B */
    
        const val = load<u8>(288279);
        const result:u8 = val + 1;
store<u8>(288279, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x5:  /* DEC B */
    
        const val = load<u8>(288279);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288279, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x6:  /* LD B,n */
    
        const val = readMem(pc++);
store<u8>(288279, (val));
        

            break;
    
        case 0x7:  /* RLCA */
    
        let a:u8 = load<u8>(288277);
        a = (a << 1) | (a >> 7);
store<u8>(288277, (a));
store<u8>(288276, ((load<u8>(288276) & (0x04 | 0x40 | 0x80)) | (a & (0x01 | 0x08 | 0x20))));
    

            break;
    
        case 0x8:  /* EX AF,AF' */
    
        let tmp:u16 = load<u16>(288276);
store<u16>(288276, (load<u16>(288284)));
store<u16>(288284, (tmp));
    

            break;
    
        case 0x9:  /* ADD IX,BC */
    
        const rr1:u16 = load<u16>(288292);
        const rr2:u16 = load<u16>(288278);
        const add16temp:u32 = u32(rr1) + u32(rr2);
        const lookup:u32 = ((rr1 & 0x0800) >> 11) | ((rr2 & 0x0800) >> 10) | ((add16temp & 0x0800) >>  9);
store<u16>(288292, (add16temp));
store<u8>(288276, ((load<u8>(288276) & ( 0x04 | 0x40 | 0x80 )) | (add16temp & 0x10000 ? 0x01 : 0) | ((add16temp >> 8) & ( 0x08 | 0x20 )) | load<u8>(288300 + (lookup))));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0xa:  /* LD A,(BC) */
    
store<u8>(288277, (readMem(load<u16>(288278))));
    

            break;
    
        case 0xb:  /* DEC BC */
    
store<u16>(288278, (load<u16>(288278) - 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0xc:  /* INC C */
    
        const val = load<u8>(288278);
        const result:u8 = val + 1;
store<u8>(288278, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0xd:  /* DEC C */
    
        const val = load<u8>(288278);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288278, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0xe:  /* LD C,n */
    
        const val = readMem(pc++);
store<u8>(288278, (val));
        

            break;
    
        case 0xf:  /* RRCA */
    
        let a:u8 = load<u8>(288277);
        const f:u8 = (load<u8>(288276) & (0x04 | 0x40 | 0x80)) | (a & 0x01);
        a = (a >> 1) | (a << 7);
store<u8>(288277, (a));
store<u8>(288276, (f | (a & (0x08 | 0x20))));
    

            break;
    
        case 0x10:  /* DJNZ n */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const b:u8 = load<u8>(288279) - 1;
store<u8>(288279, (b));
        if (b) {
            /* take branch */
            const offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            /* do not take branch */
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x11:  /* LD DE,nn */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u16>(288280, (lo | (hi << 8)));
    

            break;
    
        case 0x12:  /* LD (DE),A */
    
        writeMem(load<u16>(288280), load<u8>(288277));
    

            break;
    
        case 0x13:  /* INC DE */
    
store<u16>(288280, (load<u16>(288280) + 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x14:  /* INC D */
    
        const val = load<u8>(288281);
        const result:u8 = val + 1;
store<u8>(288281, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x15:  /* DEC D */
    
        const val = load<u8>(288281);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288281, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x16:  /* LD D,n */
    
        const val = readMem(pc++);
store<u8>(288281, (val));
        

            break;
    
        case 0x17:  /* RLA */
    
        const val:u8 = load<u8>(288277);
        const f:u8 = load<u8>(288276);
        const result:u8 = (val << 1) | (f & 0x01);
store<u8>(288277, (result));
store<u8>(288276, ((f & (0x04 | 0x40 | 0x80)) | (result & (0x08 | 0x20)) | (val >> 7)));
    

            break;
    
        case 0x18:  /* JR n */
    
        let offset = i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc += i16(offset) + 1;
    

            break;
    
        case 0x19:  /* ADD IX,DE */
    
        const rr1:u16 = load<u16>(288292);
        const rr2:u16 = load<u16>(288280);
        const add16temp:u32 = u32(rr1) + u32(rr2);
        const lookup:u32 = ((rr1 & 0x0800) >> 11) | ((rr2 & 0x0800) >> 10) | ((add16temp & 0x0800) >>  9);
store<u16>(288292, (add16temp));
store<u8>(288276, ((load<u8>(288276) & ( 0x04 | 0x40 | 0x80 )) | (add16temp & 0x10000 ? 0x01 : 0) | ((add16temp >> 8) & ( 0x08 | 0x20 )) | load<u8>(288300 + (lookup))));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x1a:  /* LD A,(DE) */
    
store<u8>(288277, (readMem(load<u16>(288280))));
    

            break;
    
        case 0x1b:  /* DEC DE */
    
store<u16>(288280, (load<u16>(288280) - 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x1c:  /* INC E */
    
        const val = load<u8>(288280);
        const result:u8 = val + 1;
store<u8>(288280, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x1d:  /* DEC E */
    
        const val = load<u8>(288280);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288280, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x1e:  /* LD E,n */
    
        const val = readMem(pc++);
store<u8>(288280, (val));
        

            break;
    
        case 0x1f:  /* RRA */
    
        const val:u8 = load<u8>(288277);
        const f:u8 = load<u8>(288276);
        const result = (val >> 1) | (f << 7);
store<u8>(288277, (result));
store<u8>(288276, ((f & (0x04 | 0x40 | 0x80)) | (result & (0x08 | 0x20)) | (val & 0x01)));
    

            break;
    
        case 0x20:  /* JR NZ,n */
    
        if (!(load<u8>(288276) & 0x40)) {
            let offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x21:  /* LD IX,nn */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u16>(288292, (lo | (hi << 8)));
    

            break;
    
        case 0x22:  /* LD (nn),IX */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
        const rr:u16 = load<u16>(288292);
        writeMem(addr, u8(rr & 0xff));
        writeMem(addr + 1, u8(rr >> 8));
    

            break;
    
        case 0x23:  /* INC IX */
    
store<u16>(288292, (load<u16>(288292) + 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x24:  /* INC IXH */
    
        const val = load<u8>(288293);
        const result:u8 = val + 1;
store<u8>(288293, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x25:  /* DEC IXH */
    
        const val = load<u8>(288293);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288293, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x26:  /* LD IXH,n */
    
        const val = readMem(pc++);
store<u8>(288293, (val));
        

            break;
    
        case 0x27:  /* DAA */
    
        let add:u32 = 0;
        let a:u32 = u32(load<u8>(288277));
        let f:u8 = load<u8>(288276);
        let carry:u8 = f & 0x01;
        if ((f & 0x10) || ((a & 0x0f) > 9)) add = 6;
        if (carry || (a > 0x99)) add |= 0x60;
        if (a > 0x99) carry = 0x01;
        let result:u32;
        if (f & 0x02) {
            result = a - add;
            const lookup:u32 = ((a & 0x88) >> 3) | ((add & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
            f = (result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)));
        } else {
            result = a + add;
            const lookup:u32 = ((a & 0x88) >> 3) | ((add & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
            f = (result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)));
        }
store<u8>(288276, ((f & ~(0x01 | 0x04)) | carry | load<u8>(288588 + (u8(result)))));
    

            break;
    
        case 0x28:  /* JR Z,n */
    
        if ((load<u8>(288276) & 0x40)) {
            let offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x29:  /* ADD IX,IX */
    
        const rr1:u16 = load<u16>(288292);
        const rr2:u16 = load<u16>(288292);
        const add16temp:u32 = u32(rr1) + u32(rr2);
        const lookup:u32 = ((rr1 & 0x0800) >> 11) | ((rr2 & 0x0800) >> 10) | ((add16temp & 0x0800) >>  9);
store<u16>(288292, (add16temp));
store<u8>(288276, ((load<u8>(288276) & ( 0x04 | 0x40 | 0x80 )) | (add16temp & 0x10000 ? 0x01 : 0) | ((add16temp >> 8) & ( 0x08 | 0x20 )) | load<u8>(288300 + (lookup))));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x2a:  /* LD IX,(nn) */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
store<u16>(288292, (u16(readMem(addr)) | (u16(readMem(addr + 1)) << 8)));
    

            break;
    
        case 0x2b:  /* DEC IX */
    
store<u16>(288292, (load<u16>(288292) - 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x2c:  /* INC IXL */
    
        const val = load<u8>(288292);
        const result:u8 = val + 1;
store<u8>(288292, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x2d:  /* DEC IXL */
    
        const val = load<u8>(288292);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288292, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x2e:  /* LD IXL,n */
    
        const val = readMem(pc++);
store<u8>(288292, (val));
        

            break;
    
        case 0x2f:  /* CPL */
    
        const result:u8 = load<u8>(288277) ^ 0xff;
store<u8>(288277, (result));
store<u8>(288276, ((load<u8>(288276) & (0x01 | 0x04 | 0x40 | 0x80)) | (result & (0x08 | 0x20)) | 0x02 | 0x10));
    

            break;
    
        case 0x30:  /* JR NC,n */
    
        if (!(load<u8>(288276) & 0x01)) {
            let offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x31:  /* LD SP,nn */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u16>(288296, (lo | (hi << 8)));
    

            break;
    
        case 0x32:  /* LD (nn),A */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        writeMem(lo | (hi << 8), load<u8>(288277));
    

            break;
    
        case 0x33:  /* INC SP */
    
store<u16>(288296, (load<u16>(288296) + 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x34:  /* INC (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
        const result:u8 = val + 1;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x35:  /* DEC (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x36:  /* LD (IX+n),n */
    
        const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc++));
        const result = readMem(pc);
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(ixAddr, result);
    

            break;
    
        case 0x37:  /* SCF */
    
store<u8>(288276, ((load<u8>(288276) & (0x04 | 0x40 | 0x80)) | (load<u8>(288277) & (0x08 | 0x20)) | 0x01));
    

            break;
    
        case 0x38:  /* JR C,n */
    
        if ((load<u8>(288276) & 0x01)) {
            let offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x39:  /* ADD IX,SP */
    
        const rr1:u16 = load<u16>(288292);
        const rr2:u16 = load<u16>(288296);
        const add16temp:u32 = u32(rr1) + u32(rr2);
        const lookup:u32 = ((rr1 & 0x0800) >> 11) | ((rr2 & 0x0800) >> 10) | ((add16temp & 0x0800) >>  9);
store<u16>(288292, (add16temp));
store<u8>(288276, ((load<u8>(288276) & ( 0x04 | 0x40 | 0x80 )) | (add16temp & 0x10000 ? 0x01 : 0) | ((add16temp >> 8) & ( 0x08 | 0x20 )) | load<u8>(288300 + (lookup))));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x3a:  /* LD A,(nn) */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u8>(288277, (readMem(lo | (hi << 8))));
    

            break;
    
        case 0x3b:  /* DEC SP */
    
store<u16>(288296, (load<u16>(288296) - 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x3c:  /* INC A */
    
        const val = load<u8>(288277);
        const result:u8 = val + 1;
store<u8>(288277, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x3d:  /* DEC A */
    
        const val = load<u8>(288277);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288277, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x3e:  /* LD A,n */
    
        const val = readMem(pc++);
store<u8>(288277, (val));
        

            break;
    
        case 0x3f:  /* CCF */
    
        const f:u8 = load<u8>(288276);
store<u8>(288276, (( f & ( 0x04 | 0x40 | 0x80 ) ) | ( ( f & 0x01 ) ? 0x10 : 0x01 ) | ( load<u8>(288277) & ( 0x08 | 0x20 ) )));
    

            break;
    
        case 0x40:  /* LD B,B */
    

            break;
    
        case 0x41:  /* LD B,C */
    
        const val = load<u8>(288278);
store<u8>(288279, (val));
        

            break;
    
        case 0x42:  /* LD B,D */
    
        const val = load<u8>(288281);
store<u8>(288279, (val));
        

            break;
    
        case 0x43:  /* LD B,E */
    
        const val = load<u8>(288280);
store<u8>(288279, (val));
        

            break;
    
        case 0x44:  /* LD B,IXH */
    
        const val = load<u8>(288293);
store<u8>(288279, (val));
        

            break;
    
        case 0x45:  /* LD B,IXL */
    
        const val = load<u8>(288292);
store<u8>(288279, (val));
        

            break;
    
        case 0x46:  /* LD B,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
store<u8>(288279, (val));
        

            break;
    
        case 0x47:  /* LD B,A */
    
        const val = load<u8>(288277);
store<u8>(288279, (val));
        

            break;
    
        case 0x48:  /* LD C,B */
    
        const val = load<u8>(288279);
store<u8>(288278, (val));
        

            break;
    
        case 0x49:  /* LD C,C */
    

            break;
    
        case 0x4a:  /* LD C,D */
    
        const val = load<u8>(288281);
store<u8>(288278, (val));
        

            break;
    
        case 0x4b:  /* LD C,E */
    
        const val = load<u8>(288280);
store<u8>(288278, (val));
        

            break;
    
        case 0x4c:  /* LD C,IXH */
    
        const val = load<u8>(288293);
store<u8>(288278, (val));
        

            break;
    
        case 0x4d:  /* LD C,IXL */
    
        const val = load<u8>(288292);
store<u8>(288278, (val));
        

            break;
    
        case 0x4e:  /* LD C,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
store<u8>(288278, (val));
        

            break;
    
        case 0x4f:  /* LD C,A */
    
        const val = load<u8>(288277);
store<u8>(288278, (val));
        

            break;
    
        case 0x50:  /* LD D,B */
    
        const val = load<u8>(288279);
store<u8>(288281, (val));
        

            break;
    
        case 0x51:  /* LD D,C */
    
        const val = load<u8>(288278);
store<u8>(288281, (val));
        

            break;
    
        case 0x52:  /* LD D,D */
    

            break;
    
        case 0x53:  /* LD D,E */
    
        const val = load<u8>(288280);
store<u8>(288281, (val));
        

            break;
    
        case 0x54:  /* LD D,IXH */
    
        const val = load<u8>(288293);
store<u8>(288281, (val));
        

            break;
    
        case 0x55:  /* LD D,IXL */
    
        const val = load<u8>(288292);
store<u8>(288281, (val));
        

            break;
    
        case 0x56:  /* LD D,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
store<u8>(288281, (val));
        

            break;
    
        case 0x57:  /* LD D,A */
    
        const val = load<u8>(288277);
store<u8>(288281, (val));
        

            break;
    
        case 0x58:  /* LD E,B */
    
        const val = load<u8>(288279);
store<u8>(288280, (val));
        

            break;
    
        case 0x59:  /* LD E,C */
    
        const val = load<u8>(288278);
store<u8>(288280, (val));
        

            break;
    
        case 0x5a:  /* LD E,D */
    
        const val = load<u8>(288281);
store<u8>(288280, (val));
        

            break;
    
        case 0x5b:  /* LD E,E */
    

            break;
    
        case 0x5c:  /* LD E,IXH */
    
        const val = load<u8>(288293);
store<u8>(288280, (val));
        

            break;
    
        case 0x5d:  /* LD E,IXL */
    
        const val = load<u8>(288292);
store<u8>(288280, (val));
        

            break;
    
        case 0x5e:  /* LD E,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
store<u8>(288280, (val));
        

            break;
    
        case 0x5f:  /* LD E,A */
    
        const val = load<u8>(288277);
store<u8>(288280, (val));
        

            break;
    
        case 0x60:  /* LD IXH,B */
    
        const val = load<u8>(288279);
store<u8>(288293, (val));
        

            break;
    
        case 0x61:  /* LD IXH,C */
    
        const val = load<u8>(288278);
store<u8>(288293, (val));
        

            break;
    
        case 0x62:  /* LD IXH,D */
    
        const val = load<u8>(288281);
store<u8>(288293, (val));
        

            break;
    
        case 0x63:  /* LD IXH,E */
    
        const val = load<u8>(288280);
store<u8>(288293, (val));
        

            break;
    
        case 0x64:  /* LD IXH,IXH */
    

            break;
    
        case 0x65:  /* LD IXH,IXL */
    
        const val = load<u8>(288292);
store<u8>(288293, (val));
        

            break;
    
        case 0x66:  /* LD H,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
store<u8>(288283, (val));
        

            break;
    
        case 0x67:  /* LD IXH,A */
    
        const val = load<u8>(288277);
store<u8>(288293, (val));
        

            break;
    
        case 0x68:  /* LD IXL,B */
    
        const val = load<u8>(288279);
store<u8>(288292, (val));
        

            break;
    
        case 0x69:  /* LD IXL,C */
    
        const val = load<u8>(288278);
store<u8>(288292, (val));
        

            break;
    
        case 0x6a:  /* LD IXL,D */
    
        const val = load<u8>(288281);
store<u8>(288292, (val));
        

            break;
    
        case 0x6b:  /* LD IXL,E */
    
        const val = load<u8>(288280);
store<u8>(288292, (val));
        

            break;
    
        case 0x6c:  /* LD IXL,IXH */
    
        const val = load<u8>(288293);
store<u8>(288292, (val));
        

            break;
    
        case 0x6d:  /* LD IXL,IXL */
    

            break;
    
        case 0x6e:  /* LD L,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
store<u8>(288282, (val));
        

            break;
    
        case 0x6f:  /* LD IXL,A */
    
        const val = load<u8>(288277);
store<u8>(288292, (val));
        

            break;
    
        case 0x70:  /* LD (IX+n),B */
    
        const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(ixAddr, load<u8>(288279));
    

            break;
    
        case 0x71:  /* LD (IX+n),C */
    
        const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(ixAddr, load<u8>(288278));
    

            break;
    
        case 0x72:  /* LD (IX+n),D */
    
        const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(ixAddr, load<u8>(288281));
    

            break;
    
        case 0x73:  /* LD (IX+n),E */
    
        const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(ixAddr, load<u8>(288280));
    

            break;
    
        case 0x74:  /* LD (IX+n),H */
    
        const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(ixAddr, load<u8>(288283));
    

            break;
    
        case 0x75:  /* LD (IX+n),L */
    
        const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(ixAddr, load<u8>(288282));
    

            break;
    
        case 0x76:  /* HALT */
    
        halted = 1;
        pc--;
    

            break;
    
        case 0x77:  /* LD (IX+n),A */
    
        const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(ixAddr, load<u8>(288277));
    

            break;
    
        case 0x78:  /* LD A,B */
    
        const val = load<u8>(288279);
store<u8>(288277, (val));
        

            break;
    
        case 0x79:  /* LD A,C */
    
        const val = load<u8>(288278);
store<u8>(288277, (val));
        

            break;
    
        case 0x7a:  /* LD A,D */
    
        const val = load<u8>(288281);
store<u8>(288277, (val));
        

            break;
    
        case 0x7b:  /* LD A,E */
    
        const val = load<u8>(288280);
store<u8>(288277, (val));
        

            break;
    
        case 0x7c:  /* LD A,IXH */
    
        const val = load<u8>(288293);
store<u8>(288277, (val));
        

            break;
    
        case 0x7d:  /* LD A,IXL */
    
        const val = load<u8>(288292);
store<u8>(288277, (val));
        

            break;
    
        case 0x7e:  /* LD A,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
store<u8>(288277, (val));
        

            break;
    
        case 0x7f:  /* LD A,A */
    

            break;
    
        case 0x80:  /* ADD A,B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x81:  /* ADD A,C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x82:  /* ADD A,D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x83:  /* ADD A,E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x84:  /* ADD A,IXH */
    
        const val = load<u8>(288293);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x85:  /* ADD A,IXL */
    
        const val = load<u8>(288292);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x86:  /* ADD A,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x87:  /* ADD A,A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x88:  /* ADC A,B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x89:  /* ADC A,C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8a:  /* ADC A,D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8b:  /* ADC A,E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8c:  /* ADC A,IXH */
    
        const val = load<u8>(288293);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8d:  /* ADC A,IXL */
    
        const val = load<u8>(288292);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8e:  /* ADC A,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8f:  /* ADC A,A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x90:  /* SUB B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x91:  /* SUB C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x92:  /* SUB D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x93:  /* SUB E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x94:  /* SUB IXH */
    
        const val = load<u8>(288293);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x95:  /* SUB IXL */
    
        const val = load<u8>(288292);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x96:  /* SUB (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x97:  /* SUB A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x98:  /* SBC A,B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x99:  /* SBC A,C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9a:  /* SBC A,D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9b:  /* SBC A,E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9c:  /* SBC A,IXH */
    
        const val = load<u8>(288293);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9d:  /* SBC A,IXL */
    
        const val = load<u8>(288292);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9e:  /* SBC A,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9f:  /* SBC A,A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xa0:  /* AND B */
    
        const val = load<u8>(288279);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa1:  /* AND C */
    
        const val = load<u8>(288278);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa2:  /* AND D */
    
        const val = load<u8>(288281);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa3:  /* AND E */
    
        const val = load<u8>(288280);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa4:  /* AND IXH */
    
        const val = load<u8>(288293);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa5:  /* AND IXL */
    
        const val = load<u8>(288292);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa6:  /* AND (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa7:  /* AND A */
    
store<u8>(288276, (0x10 | load<u8>(288844 + (load<u8>(288277)))));
    

            break;
    
        case 0xa8:  /* XOR B */
    
        const val = load<u8>(288279);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xa9:  /* XOR C */
    
        const val = load<u8>(288278);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xaa:  /* XOR D */
    
        const val = load<u8>(288281);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xab:  /* XOR E */
    
        const val = load<u8>(288280);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xac:  /* XOR IXH */
    
        const val = load<u8>(288293);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xad:  /* XOR IXL */
    
        const val = load<u8>(288292);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xae:  /* XOR (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xaf:  /* XOR A */
    
store<u8>(288277, (0));
store<u8>(288276, (load<u8>(288844 + (0))));
    

            break;
    
        case 0xb0:  /* OR B */
    
        const val = load<u8>(288279);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb1:  /* OR C */
    
        const val = load<u8>(288278);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb2:  /* OR D */
    
        const val = load<u8>(288281);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb3:  /* OR E */
    
        const val = load<u8>(288280);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb4:  /* OR IXH */
    
        const val = load<u8>(288293);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb5:  /* OR IXL */
    
        const val = load<u8>(288292);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb6:  /* OR (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb7:  /* OR A */
    
store<u8>(288276, (load<u8>(288844 + (load<u8>(288277)))));
    

            break;
    
        case 0xb8:  /* CP B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xb9:  /* CP C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xba:  /* CP D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbb:  /* CP E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbc:  /* CP IXH */
    
        const val = load<u8>(288293);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbd:  /* CP IXL */
    
        const val = load<u8>(288292);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbe:  /* CP (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(ixAddr);
            
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbf:  /* CP A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xc0:  /* RET NZ */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if (!(load<u8>(288276) & 0x40)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xc1:  /* POP BC */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
store<u16>(288278, (lo | (hi << 8)));
    

            break;
    
        case 0xc2:  /* JP NZ,nn */
    
        if (!(load<u8>(288276) & 0x40)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xc3:  /* JP nn */
    
        let lo = u16(readMem(pc++));
        let hi = u16(readMem(pc++));
        pc = lo + (hi << 8);
    

            break;
    
        case 0xc4:  /* CALL NZ,nn */
    
        if (!(load<u8>(288276) & 0x40)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xc5:  /* PUSH BC */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const rr:u16 = load<u16>(288278);
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(rr >> 8));
        sp--;
        writeMem(sp, u8(rr & 0xff));
store<u16>(288296, (sp));
    

            break;
    
        case 0xc6:  /* ADD A,n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xc7:  /* RST 0x00 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 0;
    

            break;
    
        case 0xc8:  /* RET Z */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if ((load<u8>(288276) & 0x40)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xc9:  /* RET */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
        pc = lo | (hi << 8);
    

            break;
    
        case 0xca:  /* JP Z,nn */
    
        if ((load<u8>(288276) & 0x40)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xcb:  /* prefix ddcb */
    
        opcodePrefix = 0xdc;
        interruptible = false;
    

            break;
    
        case 0xcc:  /* CALL Z,nn */
    
        if ((load<u8>(288276) & 0x40)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xcd:  /* CALL nn */
    
        let lo = u16(readMem(pc++));
        let hi = u16(readMem(pc));
        contendDirtyRead(pc);
        t++;
        pc++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = lo + (hi << 8);
    

            break;
    
        case 0xce:  /* ADC A,n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xcf:  /* RST 0x08 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 8;
    

            break;
    
        case 0xd0:  /* RET NC */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if (!(load<u8>(288276) & 0x01)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xd1:  /* POP DE */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
store<u16>(288280, (lo | (hi << 8)));
    

            break;
    
        case 0xd2:  /* JP NC,nn */
    
        if (!(load<u8>(288276) & 0x01)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xd3:  /* OUT (n),A */
    
        const lo:u16 = u16(readMem(pc++));
        const a:u8 = load<u8>(288277);
        writePort(lo | (u16(a) << 8), a);
    

            break;
    
        case 0xd4:  /* CALL NC,nn */
    
        if (!(load<u8>(288276) & 0x01)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xd5:  /* PUSH DE */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const rr:u16 = load<u16>(288280);
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(rr >> 8));
        sp--;
        writeMem(sp, u8(rr & 0xff));
store<u16>(288296, (sp));
    

            break;
    
        case 0xd6:  /* SUB n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xd7:  /* RST 0x10 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 16;
    

            break;
    
        case 0xd8:  /* RET C */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if ((load<u8>(288276) & 0x01)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xd9:  /* EXX */
    
        let tmp:u16 = load<u16>(288278);
store<u16>(288278, (load<u16>(288286)));
store<u16>(288286, (tmp));
        tmp = load<u16>(288280);
store<u16>(288280, (load<u16>(288288)));
store<u16>(288288, (tmp));
        tmp = load<u16>(288282);
store<u16>(288282, (load<u16>(288290)));
store<u16>(288290, (tmp));
    

            break;
    
        case 0xda:  /* JP C,nn */
    
        if ((load<u8>(288276) & 0x01)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xdb:  /* IN A,(n) */
    
        const port:u16 = (u16(load<u8>(288277)) << 8) | u16(readMem(pc++));
store<u8>(288277, (readPort(port)));
    

            break;
    
        case 0xdc:  /* CALL C,nn */
    
        if ((load<u8>(288276) & 0x01)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xdd:  /* prefix dd */
    
        opcodePrefix = 0xdd;
        interruptible = false;
    

            break;
    
        case 0xde:  /* SBC A,n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xdf:  /* RST 0x18 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 24;
    

            break;
    
        case 0xe0:  /* RET PO */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if (!(load<u8>(288276) & 0x04)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xe1:  /* POP IX */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
store<u16>(288292, (lo | (hi << 8)));
    

            break;
    
        case 0xe2:  /* JP PO,nn */
    
        if (!(load<u8>(288276) & 0x04)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xe3:  /* EX (SP),IX */
    
        const sp:u16 = load<u16>(288296);
        const lo = u16(readMem(sp));
        const hi = u16(readMem(sp + 1));
        contendDirtyRead(sp + 1);
        t++;
        const rr:u16 = load<u16>(288292);
        writeMem(sp + 1, u8(rr >> 8));
        writeMem(sp, u8(rr & 0xff));
store<u16>(288292, (lo | (hi << 8)));
        contendDirtyWrite(sp);
        t++;
        contendDirtyWrite(sp);
        t++;
    

            break;
    
        case 0xe4:  /* CALL PO,nn */
    
        if (!(load<u8>(288276) & 0x04)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xe5:  /* PUSH IX */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const rr:u16 = load<u16>(288292);
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(rr >> 8));
        sp--;
        writeMem(sp, u8(rr & 0xff));
store<u16>(288296, (sp));
    

            break;
    
        case 0xe6:  /* AND n */
    
        const val = readMem(pc++);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xe7:  /* RST 0x20 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 32;
    

            break;
    
        case 0xe8:  /* RET PE */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if ((load<u8>(288276) & 0x04)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xe9:  /* JP (IX) */
    
        pc = load<u16>(288292);
    

            break;
    
        case 0xea:  /* JP PE,nn */
    
        if ((load<u8>(288276) & 0x04)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xeb:  /* EX DE,HL */
    
        let tmp:u16 = load<u16>(288280);
store<u16>(288280, (load<u16>(288282)));
store<u16>(288282, (tmp));
    

            break;
    
        case 0xec:  /* CALL PE,nn */
    
        if ((load<u8>(288276) & 0x04)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xed:  /* prefix ed */
    
        opcodePrefix = 0xed;
        interruptible = false;
    

            break;
    
        case 0xee:  /* XOR n */
    
        const val = readMem(pc++);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xef:  /* RST 0x28 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 40;
    

            break;
    
        case 0xf0:  /* RET P */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if (!(load<u8>(288276) & 0x80)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xf1:  /* POP AF */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
store<u16>(288276, (lo | (hi << 8)));
    

            break;
    
        case 0xf2:  /* JP P,nn */
    
        if (!(load<u8>(288276) & 0x80)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xf3:  /* DI */
    
        iff1 = iff2 = 0;
    

            break;
    
        case 0xf4:  /* CALL P,nn */
    
        if (!(load<u8>(288276) & 0x80)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xf5:  /* PUSH AF */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const rr:u16 = load<u16>(288276);
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(rr >> 8));
        sp--;
        writeMem(sp, u8(rr & 0xff));
store<u16>(288296, (sp));
    

            break;
    
        case 0xf6:  /* OR n */
    
        const val = readMem(pc++);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xf7:  /* RST 0x30 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 48;
    

            break;
    
        case 0xf8:  /* RET M */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if ((load<u8>(288276) & 0x80)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xf9:  /* LD SP,IX */
    
store<u16>(288296, (load<u16>(288292)));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0xfa:  /* JP M,nn */
    
        if ((load<u8>(288276) & 0x80)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xfb:  /* EI */
    
        iff1 = iff2 = 1;
        interruptible = false;
    

            break;
    
        case 0xfc:  /* CALL M,nn */
    
        if ((load<u8>(288276) & 0x80)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xfd:  /* prefix fd */
    
        opcodePrefix = 0xfd;
        interruptible = false;
    

            break;
    
        case 0xfe:  /* CP n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xff:  /* RST 0x38 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 56;
    

            break;
    
                default:
                    return 1;  /* unrecognised opcode */
            }
        } else if (opcodePrefix == 0xdc) {  // ddcb
            opcodePrefix = 0;  // for the next instruction (unless overridden)
            const indexOffset:i8 = i8(readMem(pc++));
            let op:u8 = readMem(pc++);
            switch (op) {

        case 0x0:  /* RLC (IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x1:  /* RLC (IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x2:  /* RLC (IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x3:  /* RLC (IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x4:  /* RLC (IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x5:  /* RLC (IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x6:  /* RLC (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0x7:  /* RLC (IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x8:  /* RRC (IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x9:  /* RRC (IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xa:  /* RRC (IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xb:  /* RRC (IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xc:  /* RRC (IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xd:  /* RRC (IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xe:  /* RRC (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xf:  /* RRC (IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x10:  /* RL (IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x11:  /* RL (IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x12:  /* RL (IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x13:  /* RL (IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x14:  /* RL (IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x15:  /* RL (IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x16:  /* RL (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0x17:  /* RL (IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x18:  /* RR (IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x19:  /* RR (IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x1a:  /* RR (IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x1b:  /* RR (IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x1c:  /* RR (IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x1d:  /* RR (IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x1e:  /* RR (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0x1f:  /* RR (IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x20:  /* SLA (IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x21:  /* SLA (IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x22:  /* SLA (IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x23:  /* SLA (IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x24:  /* SLA (IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x25:  /* SLA (IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x26:  /* SLA (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0x27:  /* SLA (IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x28:  /* SRA (IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x29:  /* SRA (IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x2a:  /* SRA (IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x2b:  /* SRA (IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x2c:  /* SRA (IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x2d:  /* SRA (IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x2e:  /* SRA (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0x2f:  /* SRA (IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x30:  /* SLL (IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x31:  /* SLL (IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x32:  /* SLL (IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x33:  /* SLL (IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x34:  /* SLL (IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x35:  /* SLL (IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x36:  /* SLL (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0x37:  /* SLL (IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x38:  /* SRL (IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x39:  /* SRL (IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x3a:  /* SRL (IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x3b:  /* SRL (IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x3c:  /* SRL (IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x3d:  /* SRL (IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x3e:  /* SRL (IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0x3f:  /* SRL (IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x40:  /* BIT 0,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x41:  /* BIT 0,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x42:  /* BIT 0,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x43:  /* BIT 0,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x44:  /* BIT 0,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x45:  /* BIT 0,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x46:  /* BIT 0,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x47:  /* BIT 0,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x48:  /* BIT 1,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x49:  /* BIT 1,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x4a:  /* BIT 1,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x4b:  /* BIT 1,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x4c:  /* BIT 1,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x4d:  /* BIT 1,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x4e:  /* BIT 1,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x4f:  /* BIT 1,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x50:  /* BIT 2,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x51:  /* BIT 2,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x52:  /* BIT 2,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x53:  /* BIT 2,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x54:  /* BIT 2,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x55:  /* BIT 2,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x56:  /* BIT 2,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x57:  /* BIT 2,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x58:  /* BIT 3,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x59:  /* BIT 3,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x5a:  /* BIT 3,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x5b:  /* BIT 3,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x5c:  /* BIT 3,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x5d:  /* BIT 3,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x5e:  /* BIT 3,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x5f:  /* BIT 3,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x60:  /* BIT 4,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x61:  /* BIT 4,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x62:  /* BIT 4,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x63:  /* BIT 4,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x64:  /* BIT 4,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x65:  /* BIT 4,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x66:  /* BIT 4,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x67:  /* BIT 4,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x68:  /* BIT 5,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x69:  /* BIT 5,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x6a:  /* BIT 5,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x6b:  /* BIT 5,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x6c:  /* BIT 5,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x6d:  /* BIT 5,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x6e:  /* BIT 5,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x6f:  /* BIT 5,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x70:  /* BIT 6,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x71:  /* BIT 6,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x72:  /* BIT 6,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x73:  /* BIT 6,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x74:  /* BIT 6,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x75:  /* BIT 6,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x76:  /* BIT 6,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x77:  /* BIT 6,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x78:  /* BIT 7,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x79:  /* BIT 7,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x7a:  /* BIT 7,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x7b:  /* BIT 7,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x7c:  /* BIT 7,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x7d:  /* BIT 7,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x7e:  /* BIT 7,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x7f:  /* BIT 7,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(ixAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(ixAddr);
        t++;
    

            break;
    
        case 0x80:  /* RES 0,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x81:  /* RES 0,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x82:  /* RES 0,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x83:  /* RES 0,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x84:  /* RES 0,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x85:  /* RES 0,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x86:  /* RES 0,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0x87:  /* RES 0,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x88:  /* RES 1,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x89:  /* RES 1,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x8a:  /* RES 1,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x8b:  /* RES 1,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x8c:  /* RES 1,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x8d:  /* RES 1,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x8e:  /* RES 1,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0x8f:  /* RES 1,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x90:  /* RES 2,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x91:  /* RES 2,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x92:  /* RES 2,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x93:  /* RES 2,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x94:  /* RES 2,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x95:  /* RES 2,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x96:  /* RES 2,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0x97:  /* RES 2,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x98:  /* RES 3,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x99:  /* RES 3,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x9a:  /* RES 3,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x9b:  /* RES 3,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x9c:  /* RES 3,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x9d:  /* RES 3,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x9e:  /* RES 3,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0x9f:  /* RES 3,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xa0:  /* RES 4,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xa1:  /* RES 4,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xa2:  /* RES 4,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xa3:  /* RES 4,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xa4:  /* RES 4,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xa5:  /* RES 4,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xa6:  /* RES 4,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xa7:  /* RES 4,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xa8:  /* RES 5,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xa9:  /* RES 5,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xaa:  /* RES 5,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xab:  /* RES 5,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xac:  /* RES 5,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xad:  /* RES 5,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xae:  /* RES 5,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xaf:  /* RES 5,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xb0:  /* RES 6,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xb1:  /* RES 6,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xb2:  /* RES 6,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xb3:  /* RES 6,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xb4:  /* RES 6,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xb5:  /* RES 6,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xb6:  /* RES 6,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xb7:  /* RES 6,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xb8:  /* RES 7,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xb9:  /* RES 7,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xba:  /* RES 7,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xbb:  /* RES 7,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xbc:  /* RES 7,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xbd:  /* RES 7,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xbe:  /* RES 7,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xbf:  /* RES 7,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xc0:  /* SET 0,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xc1:  /* SET 0,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xc2:  /* SET 0,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xc3:  /* SET 0,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xc4:  /* SET 0,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xc5:  /* SET 0,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xc6:  /* SET 0,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xc7:  /* SET 0,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xc8:  /* SET 1,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xc9:  /* SET 1,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xca:  /* SET 1,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xcb:  /* SET 1,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xcc:  /* SET 1,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xcd:  /* SET 1,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xce:  /* SET 1,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xcf:  /* SET 1,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xd0:  /* SET 2,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xd1:  /* SET 2,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xd2:  /* SET 2,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xd3:  /* SET 2,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xd4:  /* SET 2,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xd5:  /* SET 2,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xd6:  /* SET 2,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xd7:  /* SET 2,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xd8:  /* SET 3,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xd9:  /* SET 3,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xda:  /* SET 3,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xdb:  /* SET 3,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xdc:  /* SET 3,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xdd:  /* SET 3,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xde:  /* SET 3,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xdf:  /* SET 3,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xe0:  /* SET 4,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xe1:  /* SET 4,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xe2:  /* SET 4,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xe3:  /* SET 4,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xe4:  /* SET 4,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xe5:  /* SET 4,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xe6:  /* SET 4,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xe7:  /* SET 4,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xe8:  /* SET 5,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xe9:  /* SET 5,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xea:  /* SET 5,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xeb:  /* SET 5,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xec:  /* SET 5,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xed:  /* SET 5,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xee:  /* SET 5,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xef:  /* SET 5,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xf0:  /* SET 6,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xf1:  /* SET 6,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xf2:  /* SET 6,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xf3:  /* SET 6,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xf4:  /* SET 6,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xf5:  /* SET 6,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xf6:  /* SET 6,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xf7:  /* SET 6,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xf8:  /* SET 7,(IX+n>B) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xf9:  /* SET 7,(IX+n>C) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xfa:  /* SET 7,(IX+n>D) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xfb:  /* SET 7,(IX+n>E) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xfc:  /* SET 7,(IX+n>H) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xfd:  /* SET 7,(IX+n>L) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xfe:  /* SET 7,(IX+n) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
        
    

            break;
    
        case 0xff:  /* SET 7,(IX+n>A) */
    
        
                const ixAddr:u16 = load<u16>(288292) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(ixAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(ixAddr);
            t++;
            writeMem(ixAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
                default:
                    return 1;  /* unrecognised opcode */
            }
        } else if (opcodePrefix == 0xed) {
            opcodePrefix = 0;  // for the next instruction (unless overridden)
            contendRead(pc);
            t += 4;
            let op:u8 = readMemInternal(pc++);

            const r = load<u8>(288298);
store<u8>(288298, ((r & 0x80) | ((r + 1) & 0x7f)));

            switch (op) {

        case 0x0:  /* NOP */
    

            break;
    
        case 0x1:  /* NOP */
    

            break;
    
        case 0x2:  /* NOP */
    

            break;
    
        case 0x3:  /* NOP */
    

            break;
    
        case 0x4:  /* NOP */
    

            break;
    
        case 0x5:  /* NOP */
    

            break;
    
        case 0x6:  /* NOP */
    

            break;
    
        case 0x7:  /* NOP */
    

            break;
    
        case 0x8:  /* NOP */
    

            break;
    
        case 0x9:  /* NOP */
    

            break;
    
        case 0xa:  /* NOP */
    

            break;
    
        case 0xb:  /* NOP */
    

            break;
    
        case 0xc:  /* NOP */
    

            break;
    
        case 0xd:  /* NOP */
    

            break;
    
        case 0xe:  /* NOP */
    

            break;
    
        case 0xf:  /* NOP */
    

            break;
    
        case 0x10:  /* NOP */
    

            break;
    
        case 0x11:  /* NOP */
    

            break;
    
        case 0x12:  /* NOP */
    

            break;
    
        case 0x13:  /* NOP */
    

            break;
    
        case 0x14:  /* NOP */
    

            break;
    
        case 0x15:  /* NOP */
    

            break;
    
        case 0x16:  /* NOP */
    

            break;
    
        case 0x17:  /* NOP */
    

            break;
    
        case 0x18:  /* NOP */
    

            break;
    
        case 0x19:  /* NOP */
    

            break;
    
        case 0x1a:  /* NOP */
    

            break;
    
        case 0x1b:  /* NOP */
    

            break;
    
        case 0x1c:  /* NOP */
    

            break;
    
        case 0x1d:  /* NOP */
    

            break;
    
        case 0x1e:  /* NOP */
    

            break;
    
        case 0x1f:  /* NOP */
    

            break;
    
        case 0x20:  /* NOP */
    

            break;
    
        case 0x21:  /* NOP */
    

            break;
    
        case 0x22:  /* NOP */
    

            break;
    
        case 0x23:  /* NOP */
    

            break;
    
        case 0x24:  /* NOP */
    

            break;
    
        case 0x25:  /* NOP */
    

            break;
    
        case 0x26:  /* NOP */
    

            break;
    
        case 0x27:  /* NOP */
    

            break;
    
        case 0x28:  /* NOP */
    

            break;
    
        case 0x29:  /* NOP */
    

            break;
    
        case 0x2a:  /* NOP */
    

            break;
    
        case 0x2b:  /* NOP */
    

            break;
    
        case 0x2c:  /* NOP */
    

            break;
    
        case 0x2d:  /* NOP */
    

            break;
    
        case 0x2e:  /* NOP */
    

            break;
    
        case 0x2f:  /* NOP */
    

            break;
    
        case 0x30:  /* NOP */
    

            break;
    
        case 0x31:  /* NOP */
    

            break;
    
        case 0x32:  /* NOP */
    

            break;
    
        case 0x33:  /* NOP */
    

            break;
    
        case 0x34:  /* NOP */
    

            break;
    
        case 0x35:  /* NOP */
    

            break;
    
        case 0x36:  /* NOP */
    

            break;
    
        case 0x37:  /* NOP */
    

            break;
    
        case 0x38:  /* NOP */
    

            break;
    
        case 0x39:  /* NOP */
    

            break;
    
        case 0x3a:  /* NOP */
    

            break;
    
        case 0x3b:  /* NOP */
    

            break;
    
        case 0x3c:  /* NOP */
    

            break;
    
        case 0x3d:  /* NOP */
    

            break;
    
        case 0x3e:  /* NOP */
    

            break;
    
        case 0x3f:  /* NOP */
    

            break;
    
        case 0x40:  /* IN B,(C) */
    
        const result:u8 = readPort(load<u16>(288278));
store<u8>(288279, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | load<u8>(288844 + (result))));
    

            break;
    
        case 0x41:  /* OUT (C),B */
    
        writePort(load<u16>(288278), load<u8>(288279));
    

            break;
    
        case 0x42:  /* SBC HL,BC */
    
        const hl:u16 = load<u16>(288282);
        const rr:u16 = load<u16>(288278);
        const sub16temp:u32 = u32(hl) - u32(rr) - (load<u8>(288276) & 0x01);
        const lookup:u32 = ((hl & 0x8800) >> 11) | ((rr & 0x8800) >> 10) | ((sub16temp & 0x8800) >> 9);
store<u16>(288282, (u16(sub16temp)));
store<u8>(288276, ((sub16temp & 0x10000 ? 0x01 : 0) | 0x02 | load<u8>(288324 + (lookup >> 4)) | (((sub16temp & 0xff00) >> 8) & ( 0x08 | 0x20 | 0x80 )) | load<u8>(288308 + (lookup&0x07)) | (sub16temp & 0xffff ? 0 : 0x40)));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x43:  /* LD (nn),BC */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
        const rr:u16 = load<u16>(288278);
        writeMem(addr, u8(rr & 0xff));
        writeMem(addr + 1, u8(rr >> 8));
    

            break;
    
        case 0x44:  /* NEG */
    
        const a:i32 = i32(load<u8>(288277));
        const result:i32 = -a;
        const lookup:i32 = ((a & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x45:  /* RETN */
    
        iff1 = iff2;
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
        pc = lo | (hi << 8);
    

            break;
    
        case 0x46:  /* IM 0 */
    
        im = 0;
    

            break;
    
        case 0x47:  /* LD I,A */
    
        contendDirtyRead(load<u16>(288298));
store<u8>(288299, (load<u8>(288277)));
        t++;
    

            break;
    
        case 0x48:  /* IN C,(C) */
    
        const result:u8 = readPort(load<u16>(288278));
store<u8>(288278, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | load<u8>(288844 + (result))));
    

            break;
    
        case 0x49:  /* OUT (C),C */
    
        writePort(load<u16>(288278), load<u8>(288278));
    

            break;
    
        case 0x4a:  /* ADC HL,BC */
    
        const hl:u32 = u32(load<u16>(288282));
        const rr:u32 = u32(load<u16>(288278));
        const result:u32 = hl + rr + (load<u8>(288276) & 0x01);
        const lookup:u32 = ((hl & 0x8800) >> 11) | ((rr & 0x8800) >> 10) | ((result & 0x8800) >>  9);
store<u16>(288282, (result));
store<u8>(288276, ((result & 0x10000 ? 0x01 : 0) | load<u8>(288316 + (lookup >> 4)) | ((result >> 8) & (0x08 | 0x20 | 0x80)) | load<u8>(288300 + (lookup & 0x07)) | ((result & 0xffff) ? 0 : 0x40)));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x4b:  /* LD BC,(nn) */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
store<u16>(288278, (u16(readMem(addr)) | (u16(readMem(addr + 1)) << 8)));
    

            break;
    
        case 0x4c:  /* NEG */
    
        const a:i32 = i32(load<u8>(288277));
        const result:i32 = -a;
        const lookup:i32 = ((a & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x4d:  /* RETN */
    
        iff1 = iff2;
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
        pc = lo | (hi << 8);
    

            break;
    
        case 0x4e:  /* IM 0 */
    
        im = 0;
    

            break;
    
        case 0x4f:  /* LD R,A */
    
        contendDirtyRead(load<u16>(288298));
store<u8>(288298, (load<u8>(288277)));
        t++;
    

            break;
    
        case 0x50:  /* IN D,(C) */
    
        const result:u8 = readPort(load<u16>(288278));
store<u8>(288281, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | load<u8>(288844 + (result))));
    

            break;
    
        case 0x51:  /* OUT (C),D */
    
        writePort(load<u16>(288278), load<u8>(288281));
    

            break;
    
        case 0x52:  /* SBC HL,DE */
    
        const hl:u16 = load<u16>(288282);
        const rr:u16 = load<u16>(288280);
        const sub16temp:u32 = u32(hl) - u32(rr) - (load<u8>(288276) & 0x01);
        const lookup:u32 = ((hl & 0x8800) >> 11) | ((rr & 0x8800) >> 10) | ((sub16temp & 0x8800) >> 9);
store<u16>(288282, (u16(sub16temp)));
store<u8>(288276, ((sub16temp & 0x10000 ? 0x01 : 0) | 0x02 | load<u8>(288324 + (lookup >> 4)) | (((sub16temp & 0xff00) >> 8) & ( 0x08 | 0x20 | 0x80 )) | load<u8>(288308 + (lookup&0x07)) | (sub16temp & 0xffff ? 0 : 0x40)));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x53:  /* LD (nn),DE */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
        const rr:u16 = load<u16>(288280);
        writeMem(addr, u8(rr & 0xff));
        writeMem(addr + 1, u8(rr >> 8));
    

            break;
    
        case 0x54:  /* NEG */
    
        const a:i32 = i32(load<u8>(288277));
        const result:i32 = -a;
        const lookup:i32 = ((a & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x55:  /* RETN */
    
        iff1 = iff2;
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
        pc = lo | (hi << 8);
    

            break;
    
        case 0x56:  /* IM 1 */
    
        im = 1;
    

            break;
    
        case 0x57:  /* LD A,I */
    
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        const val:u8 = u8(ir >> 8);
store<u8>(288277, (val));
store<u8>(288276, ((load<u8>(288276) & 0x01) | load<u8>(288332 + (val)) | (iff2 ? 0x04 : 0)));
    

            break;
    
        case 0x58:  /* IN E,(C) */
    
        const result:u8 = readPort(load<u16>(288278));
store<u8>(288280, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | load<u8>(288844 + (result))));
    

            break;
    
        case 0x59:  /* OUT (C),E */
    
        writePort(load<u16>(288278), load<u8>(288280));
    

            break;
    
        case 0x5a:  /* ADC HL,DE */
    
        const hl:u32 = u32(load<u16>(288282));
        const rr:u32 = u32(load<u16>(288280));
        const result:u32 = hl + rr + (load<u8>(288276) & 0x01);
        const lookup:u32 = ((hl & 0x8800) >> 11) | ((rr & 0x8800) >> 10) | ((result & 0x8800) >>  9);
store<u16>(288282, (result));
store<u8>(288276, ((result & 0x10000 ? 0x01 : 0) | load<u8>(288316 + (lookup >> 4)) | ((result >> 8) & (0x08 | 0x20 | 0x80)) | load<u8>(288300 + (lookup & 0x07)) | ((result & 0xffff) ? 0 : 0x40)));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x5b:  /* LD DE,(nn) */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
store<u16>(288280, (u16(readMem(addr)) | (u16(readMem(addr + 1)) << 8)));
    

            break;
    
        case 0x5c:  /* NEG */
    
        const a:i32 = i32(load<u8>(288277));
        const result:i32 = -a;
        const lookup:i32 = ((a & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x5d:  /* RETN */
    
        iff1 = iff2;
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
        pc = lo | (hi << 8);
    

            break;
    
        case 0x5e:  /* IM 2 */
    
        im = 2;
    

            break;
    
        case 0x5f:  /* LD A,R */
    
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        const val:u8 = u8(ir & 0xff);
store<u8>(288277, (val));
store<u8>(288276, ((load<u8>(288276) & 0x01) | load<u8>(288332 + (val)) | (iff2 ? 0x04 : 0)));
    

            break;
    
        case 0x60:  /* IN H,(C) */
    
        const result:u8 = readPort(load<u16>(288278));
store<u8>(288283, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | load<u8>(288844 + (result))));
    

            break;
    
        case 0x61:  /* OUT (C),H */
    
        writePort(load<u16>(288278), load<u8>(288283));
    

            break;
    
        case 0x62:  /* SBC HL,HL */
    
        const hl:u16 = load<u16>(288282);
        const rr:u16 = load<u16>(288282);
        const sub16temp:u32 = u32(hl) - u32(rr) - (load<u8>(288276) & 0x01);
        const lookup:u32 = ((hl & 0x8800) >> 11) | ((rr & 0x8800) >> 10) | ((sub16temp & 0x8800) >> 9);
store<u16>(288282, (u16(sub16temp)));
store<u8>(288276, ((sub16temp & 0x10000 ? 0x01 : 0) | 0x02 | load<u8>(288324 + (lookup >> 4)) | (((sub16temp & 0xff00) >> 8) & ( 0x08 | 0x20 | 0x80 )) | load<u8>(288308 + (lookup&0x07)) | (sub16temp & 0xffff ? 0 : 0x40)));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x63:  /* LD (nn),HL */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
        const rr:u16 = load<u16>(288282);
        writeMem(addr, u8(rr & 0xff));
        writeMem(addr + 1, u8(rr >> 8));
    

            break;
    
        case 0x64:  /* NEG */
    
        const a:i32 = i32(load<u8>(288277));
        const result:i32 = -a;
        const lookup:i32 = ((a & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x65:  /* RETN */
    
        iff1 = iff2;
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
        pc = lo | (hi << 8);
    

            break;
    
        case 0x66:  /* IM 0 */
    
        im = 0;
    

            break;
    
        case 0x67:  /* RRD */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        const a:u8 = load<u8>(288277);
        const result:u8 = (a << 4) | (val >> 4);
        writeMem(hl, result);
        const finalA:u8 = (a & 0xf0) | (val & 0x0f);
store<u8>(288277, (finalA));
store<u8>(288276, ((load<u8>(288276) & 0x01) | load<u8>(288844 + (finalA))));
    

            break;
    
        case 0x68:  /* IN L,(C) */
    
        const result:u8 = readPort(load<u16>(288278));
store<u8>(288282, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | load<u8>(288844 + (result))));
    

            break;
    
        case 0x69:  /* OUT (C),L */
    
        writePort(load<u16>(288278), load<u8>(288282));
    

            break;
    
        case 0x6a:  /* ADC HL,HL */
    
        const hl:u32 = u32(load<u16>(288282));
        const rr:u32 = u32(load<u16>(288282));
        const result:u32 = hl + rr + (load<u8>(288276) & 0x01);
        const lookup:u32 = ((hl & 0x8800) >> 11) | ((rr & 0x8800) >> 10) | ((result & 0x8800) >>  9);
store<u16>(288282, (result));
store<u8>(288276, ((result & 0x10000 ? 0x01 : 0) | load<u8>(288316 + (lookup >> 4)) | ((result >> 8) & (0x08 | 0x20 | 0x80)) | load<u8>(288300 + (lookup & 0x07)) | ((result & 0xffff) ? 0 : 0x40)));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x6b:  /* LD HL,(nn) */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
store<u16>(288282, (u16(readMem(addr)) | (u16(readMem(addr + 1)) << 8)));
    

            break;
    
        case 0x6c:  /* NEG */
    
        const a:i32 = i32(load<u8>(288277));
        const result:i32 = -a;
        const lookup:i32 = ((a & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x6d:  /* RETN */
    
        iff1 = iff2;
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
        pc = lo | (hi << 8);
    

            break;
    
        case 0x6e:  /* IM 0 */
    
        im = 0;
    

            break;
    
        case 0x6f:  /* RLD */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        const a:u8 = load<u8>(288277);
        const result:u8 = (val << 4) | (a & 0x0f);
        writeMem(hl, result);
        const finalA:u8 = (a & 0xf0) | (val >> 4);
store<u8>(288277, (finalA));
store<u8>(288276, ((load<u8>(288276) & 0x01) | load<u8>(288844 + (finalA))));
    

            break;
    
        case 0x70:  /* IN F,(C) */
    
        const result:u8 = readPort(load<u16>(288278));
store<u8>(288276, ((load<u8>(288276) & 0x01) | load<u8>(288844 + (result))));
    

            break;
    
        case 0x71:  /* OUT (C),0 */
    
        writePort(load<u16>(288278), 0);
    

            break;
    
        case 0x72:  /* SBC HL,SP */
    
        const hl:u16 = load<u16>(288282);
        const rr:u16 = load<u16>(288296);
        const sub16temp:u32 = u32(hl) - u32(rr) - (load<u8>(288276) & 0x01);
        const lookup:u32 = ((hl & 0x8800) >> 11) | ((rr & 0x8800) >> 10) | ((sub16temp & 0x8800) >> 9);
store<u16>(288282, (u16(sub16temp)));
store<u8>(288276, ((sub16temp & 0x10000 ? 0x01 : 0) | 0x02 | load<u8>(288324 + (lookup >> 4)) | (((sub16temp & 0xff00) >> 8) & ( 0x08 | 0x20 | 0x80 )) | load<u8>(288308 + (lookup&0x07)) | (sub16temp & 0xffff ? 0 : 0x40)));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x73:  /* LD (nn),SP */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
        const rr:u16 = load<u16>(288296);
        writeMem(addr, u8(rr & 0xff));
        writeMem(addr + 1, u8(rr >> 8));
    

            break;
    
        case 0x74:  /* NEG */
    
        const a:i32 = i32(load<u8>(288277));
        const result:i32 = -a;
        const lookup:i32 = ((a & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x75:  /* RETN */
    
        iff1 = iff2;
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
        pc = lo | (hi << 8);
    

            break;
    
        case 0x76:  /* IM 1 */
    
        im = 1;
    

            break;
    
        case 0x77:  /* NOP */
    

            break;
    
        case 0x78:  /* IN A,(C) */
    
        const result:u8 = readPort(load<u16>(288278));
store<u8>(288277, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | load<u8>(288844 + (result))));
    

            break;
    
        case 0x79:  /* OUT (C),A */
    
        writePort(load<u16>(288278), load<u8>(288277));
    

            break;
    
        case 0x7a:  /* ADC HL,SP */
    
        const hl:u32 = u32(load<u16>(288282));
        const rr:u32 = u32(load<u16>(288296));
        const result:u32 = hl + rr + (load<u8>(288276) & 0x01);
        const lookup:u32 = ((hl & 0x8800) >> 11) | ((rr & 0x8800) >> 10) | ((result & 0x8800) >>  9);
store<u16>(288282, (result));
store<u8>(288276, ((result & 0x10000 ? 0x01 : 0) | load<u8>(288316 + (lookup >> 4)) | ((result >> 8) & (0x08 | 0x20 | 0x80)) | load<u8>(288300 + (lookup & 0x07)) | ((result & 0xffff) ? 0 : 0x40)));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x7b:  /* LD SP,(nn) */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
store<u16>(288296, (u16(readMem(addr)) | (u16(readMem(addr + 1)) << 8)));
    

            break;
    
        case 0x7c:  /* NEG */
    
        const a:i32 = i32(load<u8>(288277));
        const result:i32 = -a;
        const lookup:i32 = ((a & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x7d:  /* RETN */
    
        iff1 = iff2;
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
        pc = lo | (hi << 8);
    

            break;
    
        case 0x7e:  /* IM 2 */
    
        im = 2;
    

            break;
    
        case 0x7f:  /* NOP */
    

            break;
    
        case 0x80:  /* NOP */
    

            break;
    
        case 0x81:  /* NOP */
    

            break;
    
        case 0x82:  /* NOP */
    

            break;
    
        case 0x83:  /* NOP */
    

            break;
    
        case 0x84:  /* NOP */
    

            break;
    
        case 0x85:  /* NOP */
    

            break;
    
        case 0x86:  /* NOP */
    

            break;
    
        case 0x87:  /* NOP */
    

            break;
    
        case 0x88:  /* NOP */
    

            break;
    
        case 0x89:  /* NOP */
    

            break;
    
        case 0x8a:  /* NOP */
    

            break;
    
        case 0x8b:  /* NOP */
    

            break;
    
        case 0x8c:  /* NOP */
    

            break;
    
        case 0x8d:  /* NOP */
    

            break;
    
        case 0x8e:  /* NOP */
    

            break;
    
        case 0x8f:  /* NOP */
    

            break;
    
        case 0x90:  /* NOP */
    

            break;
    
        case 0x91:  /* NOP */
    

            break;
    
        case 0x92:  /* NOP */
    

            break;
    
        case 0x93:  /* NOP */
    

            break;
    
        case 0x94:  /* NOP */
    

            break;
    
        case 0x95:  /* NOP */
    

            break;
    
        case 0x96:  /* NOP */
    

            break;
    
        case 0x97:  /* NOP */
    

            break;
    
        case 0x98:  /* NOP */
    

            break;
    
        case 0x99:  /* NOP */
    

            break;
    
        case 0x9a:  /* NOP */
    

            break;
    
        case 0x9b:  /* NOP */
    

            break;
    
        case 0x9c:  /* NOP */
    

            break;
    
        case 0x9d:  /* NOP */
    

            break;
    
        case 0x9e:  /* NOP */
    

            break;
    
        case 0x9f:  /* NOP */
    

            break;
    
        case 0xa0:  /* LDI */
    
        const hl:u16 = load<u16>(288282);
        const de:u16 = load<u16>(288280);
        let val:u8 = readMem(hl);
        writeMem(de, val);
        const bc = load<u16>(288278) - 1;
store<u16>(288278, (bc));
        val += load<u8>(288277);
store<u8>(288276, ((load<u8>(288276) & ( 0x01 | 0x40 | 0x80 )) | (bc ? 0x04 : 0) | (val & 0x08) | ((val & 0x02) ? 0x20 : 0)));
store<u16>(288282, (hl + 1));
store<u16>(288280, (de + 1));
        contendDirtyWrite(de);
        t++;
        contendDirtyWrite(de);
        t++;
    

            break;
    
        case 0xa1:  /* CPI */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        const a:u8 = load<u8>(288277);
        let result:u8 = a - val;
        const lookup:u8 = ((a & 0x08) >> 3) | ((val & 0x08) >> 2) | ((result & 0x08) >> 1);
store<u16>(288282, (hl + 1));
        const bc:u16 = load<u16>(288278) - 1;
store<u16>(288278, (bc));
        const f:u8 = (load<u8>(288276) & 0x01) | (bc ? (0x04 | 0x02) : 0x02) | load<u8>(288308 + (lookup)) | (result ? 0 : 0x40) | (result & 0x80);
        if (f & 0x10) result--;
store<u8>(288276, (f | (result & 0x08) | ( (result & 0x02) ? 0x20 : 0 )));
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
    

            break;
    
        case 0xa2:  /* INI */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const bc:u16 = load<u16>(288278);
        const result:u8 = readPort(bc);
        const hl:u16 = load<u16>(288282);
        writeMem(hl, result);
        const b:u8 = u8(bc >> 8) - 1;
store<u8>(288279, (b));
store<u16>(288282, (hl + 1));

        const initemp2:u8 = (result + u8(bc & 0xff) + 1);

store<u8>(288276, ((result & 0x80 ? 0x02 : 0) | ((initemp2 < result) ? (0x10 | 0x01) : 0) | (load<u8>(288588 + ((initemp2 & 0x07) ^ b)) ? 0x04 : 0) | load<u8>(288332 + (b))));
    

            break;
    
        case 0xa3:  /* OUTI */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        const bc:u16 = load<u16>(288278) - 0x100;  /* the decrement does happen first, despite what the specs say */
        const b:u8 = u8(bc >> 8);
store<u8>(288279, (b));
        writePort(bc, val);
        hl++;
store<u16>(288282, (hl));
        const outitemp2:u8 = val + u8(hl & 0xff);
store<u8>(288276, ((val & 0x80 ? 0x02 : 0) | ((outitemp2 < val) ? (0x10 | 0x01) : 0) | (load<u8>(288588 + ((outitemp2 & 0x07) ^ b )) ? 0x04 : 0 ) | load<u8>(288332 + (b))));
    

            break;
    
        case 0xa4:  /* NOP */
    

            break;
    
        case 0xa5:  /* NOP */
    

            break;
    
        case 0xa6:  /* NOP */
    

            break;
    
        case 0xa7:  /* NOP */
    

            break;
    
        case 0xa8:  /* LDD */
    
        const hl:u16 = load<u16>(288282);
        const de:u16 = load<u16>(288280);
        let val:u8 = readMem(hl);
        writeMem(de, val);
        const bc = load<u16>(288278) - 1;
store<u16>(288278, (bc));
        val += load<u8>(288277);
store<u8>(288276, ((load<u8>(288276) & ( 0x01 | 0x40 | 0x80 )) | (bc ? 0x04 : 0) | (val & 0x08) | ((val & 0x02) ? 0x20 : 0)));
store<u16>(288282, (hl - 1));
store<u16>(288280, (de - 1));
        contendDirtyWrite(de);
        t++;
        contendDirtyWrite(de);
        t++;
    

            break;
    
        case 0xa9:  /* CPD */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        const a:u8 = load<u8>(288277);
        let result:u8 = a - val;
        const lookup:u8 = ((a & 0x08) >> 3) | ((val & 0x08) >> 2) | ((result & 0x08) >> 1);
store<u16>(288282, (hl - 1));
        const bc:u16 = load<u16>(288278) - 1;
store<u16>(288278, (bc));
        const f:u8 = (load<u8>(288276) & 0x01) | (bc ? (0x04 | 0x02) : 0x02) | load<u8>(288308 + (lookup)) | (result ? 0 : 0x40) | (result & 0x80);
        if (f & 0x10) result--;
store<u8>(288276, (f | (result & 0x08) | ( (result & 0x02) ? 0x20 : 0 )));
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
    

            break;
    
        case 0xaa:  /* IND */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const bc:u16 = load<u16>(288278);
        const result:u8 = readPort(bc);
        const hl:u16 = load<u16>(288282);
        writeMem(hl, result);
        const b:u8 = u8(bc >> 8) - 1;
store<u8>(288279, (b));
store<u16>(288282, (hl - 1));

        const initemp2:u8 = (result + u8(bc & 0xff) - 1);

store<u8>(288276, ((result & 0x80 ? 0x02 : 0) | ((initemp2 < result) ? (0x10 | 0x01) : 0) | (load<u8>(288588 + ((initemp2 & 0x07) ^ b)) ? 0x04 : 0) | load<u8>(288332 + (b))));
    

            break;
    
        case 0xab:  /* OUTD */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        const bc:u16 = load<u16>(288278) - 0x100;  /* the decrement does happen first, despite what the specs say */
        const b:u8 = u8(bc >> 8);
store<u8>(288279, (b));
        writePort(bc, val);
        hl--;
store<u16>(288282, (hl));
        const outitemp2:u8 = val + u8(hl & 0xff);
store<u8>(288276, ((val & 0x80 ? 0x02 : 0) | ((outitemp2 < val) ? (0x10 | 0x01) : 0) | (load<u8>(288588 + ((outitemp2 & 0x07) ^ b )) ? 0x04 : 0 ) | load<u8>(288332 + (b))));
    

            break;
    
        case 0xac:  /* NOP */
    

            break;
    
        case 0xad:  /* NOP */
    

            break;
    
        case 0xae:  /* NOP */
    

            break;
    
        case 0xaf:  /* NOP */
    

            break;
    
        case 0xb0:  /* LDIR */
    
        const hl:u16 = load<u16>(288282);
        const de:u16 = load<u16>(288280);
        let val:u8 = readMem(hl);
        writeMem(de, val);
        const bc = load<u16>(288278) - 1;
store<u16>(288278, (bc));
        val += load<u8>(288277);
store<u8>(288276, ((load<u8>(288276) & ( 0x01 | 0x40 | 0x80 )) | (bc ? 0x04 : 0) | (val & 0x08) | ((val & 0x02) ? 0x20 : 0)));
store<u16>(288282, (hl + 1));
store<u16>(288280, (de + 1));
        contendDirtyWrite(de);
        t++;
        contendDirtyWrite(de);
        t++;
        if (bc) {
            pc -= 2;
            contendDirtyWrite(de);
            t++;
            contendDirtyWrite(de);
            t++;
            contendDirtyWrite(de);
            t++;
            contendDirtyWrite(de);
            t++;
            contendDirtyWrite(de);
            t++;
        }
    

            break;
    
        case 0xb1:  /* CPIR */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        const a:u8 = load<u8>(288277);
        let result:u8 = a - val;
        const lookup:u8 = ((a & 0x08) >> 3) | ((val & 0x08) >> 2) | ((result & 0x08) >> 1);
store<u16>(288282, (hl + 1));
        const bc:u16 = load<u16>(288278) - 1;
store<u16>(288278, (bc));
        let f:u8 = (load<u8>(288276) & 0x01) | (bc ? (0x04 | 0x02) : 0x02) | load<u8>(288308 + (lookup)) | (result ? 0 : 0x40) | (result & 0x80);
        if (f & 0x10) result--;
        f |= (result & 0x08) | ( (result & 0x02) ? 0x20 : 0 );
store<u8>(288276, (f));
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        if ((f & (0x04 | 0x40)) == 0x04) {
            pc -= 2;
            contendDirtyRead(hl);
            t++;
            contendDirtyRead(hl);
            t++;
            contendDirtyRead(hl);
            t++;
            contendDirtyRead(hl);
            t++;
            contendDirtyRead(hl);
            t++;
        }
    

            break;
    
        case 0xb2:  /* INIR */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const bc:u16 = load<u16>(288278);
        const result:u8 = readPort(bc);
        const hl:u16 = load<u16>(288282);
        writeMem(hl, result);
        const b:u8 = u8(bc >> 8) - 1;
store<u8>(288279, (b));
store<u16>(288282, (hl + 1));

        const initemp2:u8 = (result + u8(bc & 0xff) + 1);

store<u8>(288276, ((result & 0x80 ? 0x02 : 0) | ((initemp2 < result) ? (0x10 | 0x01) : 0) | (load<u8>(288588 + ((initemp2 & 0x07) ^ b)) ? 0x04 : 0) | load<u8>(288332 + (b))));
        if (b) {
            contendDirtyWrite(hl);
            t++;
            contendDirtyWrite(hl);
            t++;
            contendDirtyWrite(hl);
            t++;
            contendDirtyWrite(hl);
            t++;
            contendDirtyWrite(hl);
            t++;
            pc -= 2;
        }
    

            break;
    
        case 0xb3:  /* OTIR */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        const bc:u16 = load<u16>(288278) - 0x100;  /* the decrement does happen first, despite what the specs say */
        const b:u8 = u8(bc >> 8);
store<u8>(288279, (b));
        writePort(bc, val);
        hl++;
store<u16>(288282, (hl));
        const outitemp2:u8 = val + u8(hl & 0xff);
store<u8>(288276, ((val & 0x80 ? 0x02 : 0) | ((outitemp2 < val) ? (0x10 | 0x01) : 0) | (load<u8>(288588 + ((outitemp2 & 0x07) ^ b )) ? 0x04 : 0 ) | load<u8>(288332 + (b))));
        if (b) {
            pc -= 2;
            contendDirtyRead(bc);
            t++;
            contendDirtyRead(bc);
            t++;
            contendDirtyRead(bc);
            t++;
            contendDirtyRead(bc);
            t++;
            contendDirtyRead(bc);
            t++;
        }
    

            break;
    
        case 0xb4:  /* NOP */
    

            break;
    
        case 0xb5:  /* NOP */
    

            break;
    
        case 0xb6:  /* NOP */
    

            break;
    
        case 0xb7:  /* NOP */
    

            break;
    
        case 0xb8:  /* LDDR */
    
        const hl:u16 = load<u16>(288282);
        const de:u16 = load<u16>(288280);
        let val:u8 = readMem(hl);
        writeMem(de, val);
        const bc = load<u16>(288278) - 1;
store<u16>(288278, (bc));
        val += load<u8>(288277);
store<u8>(288276, ((load<u8>(288276) & ( 0x01 | 0x40 | 0x80 )) | (bc ? 0x04 : 0) | (val & 0x08) | ((val & 0x02) ? 0x20 : 0)));
store<u16>(288282, (hl - 1));
store<u16>(288280, (de - 1));
        contendDirtyWrite(de);
        t++;
        contendDirtyWrite(de);
        t++;
        if (bc) {
            pc -= 2;
            contendDirtyWrite(de);
            t++;
            contendDirtyWrite(de);
            t++;
            contendDirtyWrite(de);
            t++;
            contendDirtyWrite(de);
            t++;
            contendDirtyWrite(de);
            t++;
        }
    

            break;
    
        case 0xb9:  /* CPDR */
    
        const hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        const a:u8 = load<u8>(288277);
        let result:u8 = a - val;
        const lookup:u8 = ((a & 0x08) >> 3) | ((val & 0x08) >> 2) | ((result & 0x08) >> 1);
store<u16>(288282, (hl - 1));
        const bc:u16 = load<u16>(288278) - 1;
store<u16>(288278, (bc));
        let f:u8 = (load<u8>(288276) & 0x01) | (bc ? (0x04 | 0x02) : 0x02) | load<u8>(288308 + (lookup)) | (result ? 0 : 0x40) | (result & 0x80);
        if (f & 0x10) result--;
        f |= (result & 0x08) | ( (result & 0x02) ? 0x20 : 0 );
store<u8>(288276, (f));
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        contendDirtyRead(hl);
        t++;
        if ((f & (0x04 | 0x40)) == 0x04) {
            pc -= 2;
            contendDirtyRead(hl);
            t++;
            contendDirtyRead(hl);
            t++;
            contendDirtyRead(hl);
            t++;
            contendDirtyRead(hl);
            t++;
            contendDirtyRead(hl);
            t++;    
        }
    

            break;
    
        case 0xba:  /* INDR */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const bc:u16 = load<u16>(288278);
        const result:u8 = readPort(bc);
        const hl:u16 = load<u16>(288282);
        writeMem(hl, result);
        const b:u8 = u8(bc >> 8) - 1;
store<u8>(288279, (b));
store<u16>(288282, (hl - 1));

        const initemp2:u8 = (result + u8(bc & 0xff) - 1);

store<u8>(288276, ((result & 0x80 ? 0x02 : 0) | ((initemp2 < result) ? (0x10 | 0x01) : 0) | (load<u8>(288588 + ((initemp2 & 0x07) ^ b)) ? 0x04 : 0) | load<u8>(288332 + (b))));
        if (b) {
            contendDirtyWrite(hl);
            t++;
            contendDirtyWrite(hl);
            t++;
            contendDirtyWrite(hl);
            t++;
            contendDirtyWrite(hl);
            t++;
            contendDirtyWrite(hl);
            t++;
            pc -= 2;
        }
    

            break;
    
        case 0xbb:  /* OTDR */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let hl:u16 = load<u16>(288282);
        const val:u8 = readMem(hl);
        const bc:u16 = load<u16>(288278) - 0x100;  /* the decrement does happen first, despite what the specs say */
        const b:u8 = u8(bc >> 8);
store<u8>(288279, (b));
        writePort(bc, val);
        hl--;
store<u16>(288282, (hl));
        const outitemp2:u8 = val + u8(hl & 0xff);
store<u8>(288276, ((val & 0x80 ? 0x02 : 0) | ((outitemp2 < val) ? (0x10 | 0x01) : 0) | (load<u8>(288588 + ((outitemp2 & 0x07) ^ b )) ? 0x04 : 0 ) | load<u8>(288332 + (b))));
        if (b) {
            pc -= 2;
            contendDirtyRead(bc);
            t++;
            contendDirtyRead(bc);
            t++;
            contendDirtyRead(bc);
            t++;
            contendDirtyRead(bc);
            t++;
            contendDirtyRead(bc);
            t++;
        }
    

            break;
    
        case 0xbc:  /* NOP */
    

            break;
    
        case 0xbd:  /* NOP */
    

            break;
    
        case 0xbe:  /* NOP */
    

            break;
    
        case 0xbf:  /* NOP */
    

            break;
    
        case 0xc0:  /* NOP */
    

            break;
    
        case 0xc1:  /* NOP */
    

            break;
    
        case 0xc2:  /* NOP */
    

            break;
    
        case 0xc3:  /* NOP */
    

            break;
    
        case 0xc4:  /* NOP */
    

            break;
    
        case 0xc5:  /* NOP */
    

            break;
    
        case 0xc6:  /* NOP */
    

            break;
    
        case 0xc7:  /* NOP */
    

            break;
    
        case 0xc8:  /* NOP */
    

            break;
    
        case 0xc9:  /* NOP */
    

            break;
    
        case 0xca:  /* NOP */
    

            break;
    
        case 0xcb:  /* NOP */
    

            break;
    
        case 0xcc:  /* NOP */
    

            break;
    
        case 0xcd:  /* NOP */
    

            break;
    
        case 0xce:  /* NOP */
    

            break;
    
        case 0xcf:  /* NOP */
    

            break;
    
        case 0xd0:  /* NOP */
    

            break;
    
        case 0xd1:  /* NOP */
    

            break;
    
        case 0xd2:  /* NOP */
    

            break;
    
        case 0xd3:  /* NOP */
    

            break;
    
        case 0xd4:  /* NOP */
    

            break;
    
        case 0xd5:  /* NOP */
    

            break;
    
        case 0xd6:  /* NOP */
    

            break;
    
        case 0xd7:  /* NOP */
    

            break;
    
        case 0xd8:  /* NOP */
    

            break;
    
        case 0xd9:  /* NOP */
    

            break;
    
        case 0xda:  /* NOP */
    

            break;
    
        case 0xdb:  /* NOP */
    

            break;
    
        case 0xdc:  /* NOP */
    

            break;
    
        case 0xdd:  /* NOP */
    

            break;
    
        case 0xde:  /* NOP */
    

            break;
    
        case 0xdf:  /* NOP */
    

            break;
    
        case 0xe0:  /* NOP */
    

            break;
    
        case 0xe1:  /* NOP */
    

            break;
    
        case 0xe2:  /* NOP */
    

            break;
    
        case 0xe3:  /* NOP */
    

            break;
    
        case 0xe4:  /* NOP */
    

            break;
    
        case 0xe5:  /* NOP */
    

            break;
    
        case 0xe6:  /* NOP */
    

            break;
    
        case 0xe7:  /* NOP */
    

            break;
    
        case 0xe8:  /* NOP */
    

            break;
    
        case 0xe9:  /* NOP */
    

            break;
    
        case 0xea:  /* NOP */
    

            break;
    
        case 0xeb:  /* NOP */
    

            break;
    
        case 0xec:  /* NOP */
    

            break;
    
        case 0xed:  /* NOP */
    

            break;
    
        case 0xee:  /* NOP */
    

            break;
    
        case 0xef:  /* NOP */
    

            break;
    
        case 0xf0:  /* NOP */
    

            break;
    
        case 0xf1:  /* NOP */
    

            break;
    
        case 0xf2:  /* NOP */
    

            break;
    
        case 0xf3:  /* NOP */
    

            break;
    
        case 0xf4:  /* NOP */
    

            break;
    
        case 0xf5:  /* NOP */
    

            break;
    
        case 0xf6:  /* NOP */
    

            break;
    
        case 0xf7:  /* NOP */
    

            break;
    
        case 0xf8:  /* NOP */
    

            break;
    
        case 0xf9:  /* NOP */
    

            break;
    
        case 0xfa:  /* NOP */
    

            break;
    
        case 0xfb:  /* NOP */
    

            break;
    
        case 0xfc:  /* NOP */
    

            break;
    
        case 0xfd:  /* NOP */
    

            break;
    
        case 0xfe:  /* NOP */
    

            break;
    
        case 0xff:  /* NOP */
    

            break;
    
                default:
                    return 1;  /* unrecognised opcode */
            }
        } else if (opcodePrefix == 0xfd) {
            opcodePrefix = 0;  // for the next instruction (unless overridden)
            contendRead(pc);
            t += 4;
            let op:u8 = readMemInternal(pc++);

            const r = load<u8>(288298);
store<u8>(288298, ((r & 0x80) | ((r + 1) & 0x7f)));

            switch (op) {

        case 0x0:  /* NOP */
    

            break;
    
        case 0x1:  /* LD BC,nn */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u16>(288278, (lo | (hi << 8)));
    

            break;
    
        case 0x2:  /* LD (BC),A */
    
        writeMem(load<u16>(288278), load<u8>(288277));
    

            break;
    
        case 0x3:  /* INC BC */
    
store<u16>(288278, (load<u16>(288278) + 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x4:  /* INC B */
    
        const val = load<u8>(288279);
        const result:u8 = val + 1;
store<u8>(288279, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x5:  /* DEC B */
    
        const val = load<u8>(288279);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288279, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x6:  /* LD B,n */
    
        const val = readMem(pc++);
store<u8>(288279, (val));
        

            break;
    
        case 0x7:  /* RLCA */
    
        let a:u8 = load<u8>(288277);
        a = (a << 1) | (a >> 7);
store<u8>(288277, (a));
store<u8>(288276, ((load<u8>(288276) & (0x04 | 0x40 | 0x80)) | (a & (0x01 | 0x08 | 0x20))));
    

            break;
    
        case 0x8:  /* EX AF,AF' */
    
        let tmp:u16 = load<u16>(288276);
store<u16>(288276, (load<u16>(288284)));
store<u16>(288284, (tmp));
    

            break;
    
        case 0x9:  /* ADD IY,BC */
    
        const rr1:u16 = load<u16>(288294);
        const rr2:u16 = load<u16>(288278);
        const add16temp:u32 = u32(rr1) + u32(rr2);
        const lookup:u32 = ((rr1 & 0x0800) >> 11) | ((rr2 & 0x0800) >> 10) | ((add16temp & 0x0800) >>  9);
store<u16>(288294, (add16temp));
store<u8>(288276, ((load<u8>(288276) & ( 0x04 | 0x40 | 0x80 )) | (add16temp & 0x10000 ? 0x01 : 0) | ((add16temp >> 8) & ( 0x08 | 0x20 )) | load<u8>(288300 + (lookup))));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0xa:  /* LD A,(BC) */
    
store<u8>(288277, (readMem(load<u16>(288278))));
    

            break;
    
        case 0xb:  /* DEC BC */
    
store<u16>(288278, (load<u16>(288278) - 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0xc:  /* INC C */
    
        const val = load<u8>(288278);
        const result:u8 = val + 1;
store<u8>(288278, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0xd:  /* DEC C */
    
        const val = load<u8>(288278);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288278, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0xe:  /* LD C,n */
    
        const val = readMem(pc++);
store<u8>(288278, (val));
        

            break;
    
        case 0xf:  /* RRCA */
    
        let a:u8 = load<u8>(288277);
        const f:u8 = (load<u8>(288276) & (0x04 | 0x40 | 0x80)) | (a & 0x01);
        a = (a >> 1) | (a << 7);
store<u8>(288277, (a));
store<u8>(288276, (f | (a & (0x08 | 0x20))));
    

            break;
    
        case 0x10:  /* DJNZ n */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const b:u8 = load<u8>(288279) - 1;
store<u8>(288279, (b));
        if (b) {
            /* take branch */
            const offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            /* do not take branch */
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x11:  /* LD DE,nn */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u16>(288280, (lo | (hi << 8)));
    

            break;
    
        case 0x12:  /* LD (DE),A */
    
        writeMem(load<u16>(288280), load<u8>(288277));
    

            break;
    
        case 0x13:  /* INC DE */
    
store<u16>(288280, (load<u16>(288280) + 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x14:  /* INC D */
    
        const val = load<u8>(288281);
        const result:u8 = val + 1;
store<u8>(288281, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x15:  /* DEC D */
    
        const val = load<u8>(288281);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288281, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x16:  /* LD D,n */
    
        const val = readMem(pc++);
store<u8>(288281, (val));
        

            break;
    
        case 0x17:  /* RLA */
    
        const val:u8 = load<u8>(288277);
        const f:u8 = load<u8>(288276);
        const result:u8 = (val << 1) | (f & 0x01);
store<u8>(288277, (result));
store<u8>(288276, ((f & (0x04 | 0x40 | 0x80)) | (result & (0x08 | 0x20)) | (val >> 7)));
    

            break;
    
        case 0x18:  /* JR n */
    
        let offset = i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc += i16(offset) + 1;
    

            break;
    
        case 0x19:  /* ADD IY,DE */
    
        const rr1:u16 = load<u16>(288294);
        const rr2:u16 = load<u16>(288280);
        const add16temp:u32 = u32(rr1) + u32(rr2);
        const lookup:u32 = ((rr1 & 0x0800) >> 11) | ((rr2 & 0x0800) >> 10) | ((add16temp & 0x0800) >>  9);
store<u16>(288294, (add16temp));
store<u8>(288276, ((load<u8>(288276) & ( 0x04 | 0x40 | 0x80 )) | (add16temp & 0x10000 ? 0x01 : 0) | ((add16temp >> 8) & ( 0x08 | 0x20 )) | load<u8>(288300 + (lookup))));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x1a:  /* LD A,(DE) */
    
store<u8>(288277, (readMem(load<u16>(288280))));
    

            break;
    
        case 0x1b:  /* DEC DE */
    
store<u16>(288280, (load<u16>(288280) - 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x1c:  /* INC E */
    
        const val = load<u8>(288280);
        const result:u8 = val + 1;
store<u8>(288280, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x1d:  /* DEC E */
    
        const val = load<u8>(288280);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288280, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x1e:  /* LD E,n */
    
        const val = readMem(pc++);
store<u8>(288280, (val));
        

            break;
    
        case 0x1f:  /* RRA */
    
        const val:u8 = load<u8>(288277);
        const f:u8 = load<u8>(288276);
        const result = (val >> 1) | (f << 7);
store<u8>(288277, (result));
store<u8>(288276, ((f & (0x04 | 0x40 | 0x80)) | (result & (0x08 | 0x20)) | (val & 0x01)));
    

            break;
    
        case 0x20:  /* JR NZ,n */
    
        if (!(load<u8>(288276) & 0x40)) {
            let offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x21:  /* LD IY,nn */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u16>(288294, (lo | (hi << 8)));
    

            break;
    
        case 0x22:  /* LD (nn),IY */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
        const rr:u16 = load<u16>(288294);
        writeMem(addr, u8(rr & 0xff));
        writeMem(addr + 1, u8(rr >> 8));
    

            break;
    
        case 0x23:  /* INC IY */
    
store<u16>(288294, (load<u16>(288294) + 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x24:  /* INC IYH */
    
        const val = load<u8>(288295);
        const result:u8 = val + 1;
store<u8>(288295, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x25:  /* DEC IYH */
    
        const val = load<u8>(288295);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288295, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x26:  /* LD IYH,n */
    
        const val = readMem(pc++);
store<u8>(288295, (val));
        

            break;
    
        case 0x27:  /* DAA */
    
        let add:u32 = 0;
        let a:u32 = u32(load<u8>(288277));
        let f:u8 = load<u8>(288276);
        let carry:u8 = f & 0x01;
        if ((f & 0x10) || ((a & 0x0f) > 9)) add = 6;
        if (carry || (a > 0x99)) add |= 0x60;
        if (a > 0x99) carry = 0x01;
        let result:u32;
        if (f & 0x02) {
            result = a - add;
            const lookup:u32 = ((a & 0x88) >> 3) | ((add & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
            f = (result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)));
        } else {
            result = a + add;
            const lookup:u32 = ((a & 0x88) >> 3) | ((add & 0x88) >> 2) | ((result & 0x88) >> 1);
store<u8>(288277, (result));
            f = (result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)));
        }
store<u8>(288276, ((f & ~(0x01 | 0x04)) | carry | load<u8>(288588 + (u8(result)))));
    

            break;
    
        case 0x28:  /* JR Z,n */
    
        if ((load<u8>(288276) & 0x40)) {
            let offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x29:  /* ADD IY,IY */
    
        const rr1:u16 = load<u16>(288294);
        const rr2:u16 = load<u16>(288294);
        const add16temp:u32 = u32(rr1) + u32(rr2);
        const lookup:u32 = ((rr1 & 0x0800) >> 11) | ((rr2 & 0x0800) >> 10) | ((add16temp & 0x0800) >>  9);
store<u16>(288294, (add16temp));
store<u8>(288276, ((load<u8>(288276) & ( 0x04 | 0x40 | 0x80 )) | (add16temp & 0x10000 ? 0x01 : 0) | ((add16temp >> 8) & ( 0x08 | 0x20 )) | load<u8>(288300 + (lookup))));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x2a:  /* LD IY,(nn) */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        const addr = lo | (hi << 8);
store<u16>(288294, (u16(readMem(addr)) | (u16(readMem(addr + 1)) << 8)));
    

            break;
    
        case 0x2b:  /* DEC IY */
    
store<u16>(288294, (load<u16>(288294) - 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x2c:  /* INC IYL */
    
        const val = load<u8>(288294);
        const result:u8 = val + 1;
store<u8>(288294, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x2d:  /* DEC IYL */
    
        const val = load<u8>(288294);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288294, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x2e:  /* LD IYL,n */
    
        const val = readMem(pc++);
store<u8>(288294, (val));
        

            break;
    
        case 0x2f:  /* CPL */
    
        const result:u8 = load<u8>(288277) ^ 0xff;
store<u8>(288277, (result));
store<u8>(288276, ((load<u8>(288276) & (0x01 | 0x04 | 0x40 | 0x80)) | (result & (0x08 | 0x20)) | 0x02 | 0x10));
    

            break;
    
        case 0x30:  /* JR NC,n */
    
        if (!(load<u8>(288276) & 0x01)) {
            let offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x31:  /* LD SP,nn */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u16>(288296, (lo | (hi << 8)));
    

            break;
    
        case 0x32:  /* LD (nn),A */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
        writeMem(lo | (hi << 8), load<u8>(288277));
    

            break;
    
        case 0x33:  /* INC SP */
    
store<u16>(288296, (load<u16>(288296) + 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x34:  /* INC (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
        const result:u8 = val + 1;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x35:  /* DEC (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x36:  /* LD (IY+n),n */
    
        const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc++));
        const result = readMem(pc);
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(iyAddr, result);
    

            break;
    
        case 0x37:  /* SCF */
    
store<u8>(288276, ((load<u8>(288276) & (0x04 | 0x40 | 0x80)) | (load<u8>(288277) & (0x08 | 0x20)) | 0x01));
    

            break;
    
        case 0x38:  /* JR C,n */
    
        if ((load<u8>(288276) & 0x01)) {
            let offset = i8(readMem(pc));
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            contendDirtyRead(pc);
            t++;
            pc += i16(offset) + 1;
        } else {
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0x39:  /* ADD IY,SP */
    
        const rr1:u16 = load<u16>(288294);
        const rr2:u16 = load<u16>(288296);
        const add16temp:u32 = u32(rr1) + u32(rr2);
        const lookup:u32 = ((rr1 & 0x0800) >> 11) | ((rr2 & 0x0800) >> 10) | ((add16temp & 0x0800) >>  9);
store<u16>(288294, (add16temp));
store<u8>(288276, ((load<u8>(288276) & ( 0x04 | 0x40 | 0x80 )) | (add16temp & 0x10000 ? 0x01 : 0) | ((add16temp >> 8) & ( 0x08 | 0x20 )) | load<u8>(288300 + (lookup))));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x3a:  /* LD A,(nn) */
    
        const lo = u16(readMem(pc++));
        const hi = u16(readMem(pc++));
store<u8>(288277, (readMem(lo | (hi << 8))));
    

            break;
    
        case 0x3b:  /* DEC SP */
    
store<u16>(288296, (load<u16>(288296) - 1));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0x3c:  /* INC A */
    
        const val = load<u8>(288277);
        const result:u8 = val + 1;
store<u8>(288277, (result));
store<u8>(288276, ((load<u8>(288276) & 0x01) | (result == 0x80 ? 0x04 : 0) | (result & 0x0f ? 0 : 0x10) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x3d:  /* DEC A */
    
        const val = load<u8>(288277);
        const tempF:u8 = (load<u8>(288276) & 0x01) | (val & 0x0f ? 0 : 0x10) | 0x02;
        const result:u8 = val - 1;
store<u8>(288277, (result));
store<u8>(288276, (tempF | (result == 0x7f ? 0x04 : 0) | load<u8>(288332 + (result))));
    

            break;
    
        case 0x3e:  /* LD A,n */
    
        const val = readMem(pc++);
store<u8>(288277, (val));
        

            break;
    
        case 0x3f:  /* CCF */
    
        const f:u8 = load<u8>(288276);
store<u8>(288276, (( f & ( 0x04 | 0x40 | 0x80 ) ) | ( ( f & 0x01 ) ? 0x10 : 0x01 ) | ( load<u8>(288277) & ( 0x08 | 0x20 ) )));
    

            break;
    
        case 0x40:  /* LD B,B */
    

            break;
    
        case 0x41:  /* LD B,C */
    
        const val = load<u8>(288278);
store<u8>(288279, (val));
        

            break;
    
        case 0x42:  /* LD B,D */
    
        const val = load<u8>(288281);
store<u8>(288279, (val));
        

            break;
    
        case 0x43:  /* LD B,E */
    
        const val = load<u8>(288280);
store<u8>(288279, (val));
        

            break;
    
        case 0x44:  /* LD B,IYH */
    
        const val = load<u8>(288295);
store<u8>(288279, (val));
        

            break;
    
        case 0x45:  /* LD B,IYL */
    
        const val = load<u8>(288294);
store<u8>(288279, (val));
        

            break;
    
        case 0x46:  /* LD B,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
store<u8>(288279, (val));
        

            break;
    
        case 0x47:  /* LD B,A */
    
        const val = load<u8>(288277);
store<u8>(288279, (val));
        

            break;
    
        case 0x48:  /* LD C,B */
    
        const val = load<u8>(288279);
store<u8>(288278, (val));
        

            break;
    
        case 0x49:  /* LD C,C */
    

            break;
    
        case 0x4a:  /* LD C,D */
    
        const val = load<u8>(288281);
store<u8>(288278, (val));
        

            break;
    
        case 0x4b:  /* LD C,E */
    
        const val = load<u8>(288280);
store<u8>(288278, (val));
        

            break;
    
        case 0x4c:  /* LD C,IYH */
    
        const val = load<u8>(288295);
store<u8>(288278, (val));
        

            break;
    
        case 0x4d:  /* LD C,IYL */
    
        const val = load<u8>(288294);
store<u8>(288278, (val));
        

            break;
    
        case 0x4e:  /* LD C,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
store<u8>(288278, (val));
        

            break;
    
        case 0x4f:  /* LD C,A */
    
        const val = load<u8>(288277);
store<u8>(288278, (val));
        

            break;
    
        case 0x50:  /* LD D,B */
    
        const val = load<u8>(288279);
store<u8>(288281, (val));
        

            break;
    
        case 0x51:  /* LD D,C */
    
        const val = load<u8>(288278);
store<u8>(288281, (val));
        

            break;
    
        case 0x52:  /* LD D,D */
    

            break;
    
        case 0x53:  /* LD D,E */
    
        const val = load<u8>(288280);
store<u8>(288281, (val));
        

            break;
    
        case 0x54:  /* LD D,IYH */
    
        const val = load<u8>(288295);
store<u8>(288281, (val));
        

            break;
    
        case 0x55:  /* LD D,IYL */
    
        const val = load<u8>(288294);
store<u8>(288281, (val));
        

            break;
    
        case 0x56:  /* LD D,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
store<u8>(288281, (val));
        

            break;
    
        case 0x57:  /* LD D,A */
    
        const val = load<u8>(288277);
store<u8>(288281, (val));
        

            break;
    
        case 0x58:  /* LD E,B */
    
        const val = load<u8>(288279);
store<u8>(288280, (val));
        

            break;
    
        case 0x59:  /* LD E,C */
    
        const val = load<u8>(288278);
store<u8>(288280, (val));
        

            break;
    
        case 0x5a:  /* LD E,D */
    
        const val = load<u8>(288281);
store<u8>(288280, (val));
        

            break;
    
        case 0x5b:  /* LD E,E */
    

            break;
    
        case 0x5c:  /* LD E,IYH */
    
        const val = load<u8>(288295);
store<u8>(288280, (val));
        

            break;
    
        case 0x5d:  /* LD E,IYL */
    
        const val = load<u8>(288294);
store<u8>(288280, (val));
        

            break;
    
        case 0x5e:  /* LD E,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
store<u8>(288280, (val));
        

            break;
    
        case 0x5f:  /* LD E,A */
    
        const val = load<u8>(288277);
store<u8>(288280, (val));
        

            break;
    
        case 0x60:  /* LD IYH,B */
    
        const val = load<u8>(288279);
store<u8>(288295, (val));
        

            break;
    
        case 0x61:  /* LD IYH,C */
    
        const val = load<u8>(288278);
store<u8>(288295, (val));
        

            break;
    
        case 0x62:  /* LD IYH,D */
    
        const val = load<u8>(288281);
store<u8>(288295, (val));
        

            break;
    
        case 0x63:  /* LD IYH,E */
    
        const val = load<u8>(288280);
store<u8>(288295, (val));
        

            break;
    
        case 0x64:  /* LD IYH,IYH */
    

            break;
    
        case 0x65:  /* LD IYH,IYL */
    
        const val = load<u8>(288294);
store<u8>(288295, (val));
        

            break;
    
        case 0x66:  /* LD H,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
store<u8>(288283, (val));
        

            break;
    
        case 0x67:  /* LD IYH,A */
    
        const val = load<u8>(288277);
store<u8>(288295, (val));
        

            break;
    
        case 0x68:  /* LD IYL,B */
    
        const val = load<u8>(288279);
store<u8>(288294, (val));
        

            break;
    
        case 0x69:  /* LD IYL,C */
    
        const val = load<u8>(288278);
store<u8>(288294, (val));
        

            break;
    
        case 0x6a:  /* LD IYL,D */
    
        const val = load<u8>(288281);
store<u8>(288294, (val));
        

            break;
    
        case 0x6b:  /* LD IYL,E */
    
        const val = load<u8>(288280);
store<u8>(288294, (val));
        

            break;
    
        case 0x6c:  /* LD IYL,IYH */
    
        const val = load<u8>(288295);
store<u8>(288294, (val));
        

            break;
    
        case 0x6d:  /* LD IYL,IYL */
    

            break;
    
        case 0x6e:  /* LD L,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
store<u8>(288282, (val));
        

            break;
    
        case 0x6f:  /* LD IYL,A */
    
        const val = load<u8>(288277);
store<u8>(288294, (val));
        

            break;
    
        case 0x70:  /* LD (IY+n),B */
    
        const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(iyAddr, load<u8>(288279));
    

            break;
    
        case 0x71:  /* LD (IY+n),C */
    
        const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(iyAddr, load<u8>(288278));
    

            break;
    
        case 0x72:  /* LD (IY+n),D */
    
        const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(iyAddr, load<u8>(288281));
    

            break;
    
        case 0x73:  /* LD (IY+n),E */
    
        const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(iyAddr, load<u8>(288280));
    

            break;
    
        case 0x74:  /* LD (IY+n),H */
    
        const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(iyAddr, load<u8>(288283));
    

            break;
    
        case 0x75:  /* LD (IY+n),L */
    
        const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(iyAddr, load<u8>(288282));
    

            break;
    
        case 0x76:  /* HALT */
    
        halted = 1;
        pc--;
    

            break;
    
        case 0x77:  /* LD (IY+n),A */
    
        const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        contendDirtyRead(pc);
        t++;
        pc++;
        writeMem(iyAddr, load<u8>(288277));
    

            break;
    
        case 0x78:  /* LD A,B */
    
        const val = load<u8>(288279);
store<u8>(288277, (val));
        

            break;
    
        case 0x79:  /* LD A,C */
    
        const val = load<u8>(288278);
store<u8>(288277, (val));
        

            break;
    
        case 0x7a:  /* LD A,D */
    
        const val = load<u8>(288281);
store<u8>(288277, (val));
        

            break;
    
        case 0x7b:  /* LD A,E */
    
        const val = load<u8>(288280);
store<u8>(288277, (val));
        

            break;
    
        case 0x7c:  /* LD A,IYH */
    
        const val = load<u8>(288295);
store<u8>(288277, (val));
        

            break;
    
        case 0x7d:  /* LD A,IYL */
    
        const val = load<u8>(288294);
store<u8>(288277, (val));
        

            break;
    
        case 0x7e:  /* LD A,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
store<u8>(288277, (val));
        

            break;
    
        case 0x7f:  /* LD A,A */
    

            break;
    
        case 0x80:  /* ADD A,B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x81:  /* ADD A,C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x82:  /* ADD A,D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x83:  /* ADD A,E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x84:  /* ADD A,IYH */
    
        const val = load<u8>(288295);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x85:  /* ADD A,IYL */
    
        const val = load<u8>(288294);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x86:  /* ADD A,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x87:  /* ADD A,A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x88:  /* ADC A,B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x89:  /* ADC A,C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8a:  /* ADC A,D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8b:  /* ADC A,E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8c:  /* ADC A,IYH */
    
        const val = load<u8>(288295);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8d:  /* ADC A,IYL */
    
        const val = load<u8>(288294);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8e:  /* ADC A,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x8f:  /* ADC A,A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x90:  /* SUB B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x91:  /* SUB C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x92:  /* SUB D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x93:  /* SUB E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x94:  /* SUB IYH */
    
        const val = load<u8>(288295);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x95:  /* SUB IYL */
    
        const val = load<u8>(288294);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x96:  /* SUB (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x97:  /* SUB A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x98:  /* SBC A,B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x99:  /* SBC A,C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9a:  /* SBC A,D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9b:  /* SBC A,E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9c:  /* SBC A,IYH */
    
        const val = load<u8>(288295);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9d:  /* SBC A,IYL */
    
        const val = load<u8>(288294);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9e:  /* SBC A,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0x9f:  /* SBC A,A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xa0:  /* AND B */
    
        const val = load<u8>(288279);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa1:  /* AND C */
    
        const val = load<u8>(288278);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa2:  /* AND D */
    
        const val = load<u8>(288281);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa3:  /* AND E */
    
        const val = load<u8>(288280);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa4:  /* AND IYH */
    
        const val = load<u8>(288295);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa5:  /* AND IYL */
    
        const val = load<u8>(288294);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa6:  /* AND (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xa7:  /* AND A */
    
store<u8>(288276, (0x10 | load<u8>(288844 + (load<u8>(288277)))));
    

            break;
    
        case 0xa8:  /* XOR B */
    
        const val = load<u8>(288279);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xa9:  /* XOR C */
    
        const val = load<u8>(288278);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xaa:  /* XOR D */
    
        const val = load<u8>(288281);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xab:  /* XOR E */
    
        const val = load<u8>(288280);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xac:  /* XOR IYH */
    
        const val = load<u8>(288295);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xad:  /* XOR IYL */
    
        const val = load<u8>(288294);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xae:  /* XOR (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xaf:  /* XOR A */
    
store<u8>(288277, (0));
store<u8>(288276, (load<u8>(288844 + (0))));
    

            break;
    
        case 0xb0:  /* OR B */
    
        const val = load<u8>(288279);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb1:  /* OR C */
    
        const val = load<u8>(288278);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb2:  /* OR D */
    
        const val = load<u8>(288281);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb3:  /* OR E */
    
        const val = load<u8>(288280);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb4:  /* OR IYH */
    
        const val = load<u8>(288295);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb5:  /* OR IYL */
    
        const val = load<u8>(288294);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb6:  /* OR (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xb7:  /* OR A */
    
store<u8>(288276, (load<u8>(288844 + (load<u8>(288277)))));
    

            break;
    
        case 0xb8:  /* CP B */
    
        const val = load<u8>(288279);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xb9:  /* CP C */
    
        const val = load<u8>(288278);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xba:  /* CP D */
    
        const val = load<u8>(288281);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbb:  /* CP E */
    
        const val = load<u8>(288280);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbc:  /* CP IYH */
    
        const val = load<u8>(288295);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbd:  /* CP IYL */
    
        const val = load<u8>(288294);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbe:  /* CP (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + i8(readMem(pc));
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                contendDirtyRead(pc);
                t++;
                pc++;
                const val = readMem(iyAddr);
            
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xbf:  /* CP A */
    
        const val = load<u8>(288277);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xc0:  /* RET NZ */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if (!(load<u8>(288276) & 0x40)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xc1:  /* POP BC */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
store<u16>(288278, (lo | (hi << 8)));
    

            break;
    
        case 0xc2:  /* JP NZ,nn */
    
        if (!(load<u8>(288276) & 0x40)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xc3:  /* JP nn */
    
        let lo = u16(readMem(pc++));
        let hi = u16(readMem(pc++));
        pc = lo + (hi << 8);
    

            break;
    
        case 0xc4:  /* CALL NZ,nn */
    
        if (!(load<u8>(288276) & 0x40)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xc5:  /* PUSH BC */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const rr:u16 = load<u16>(288278);
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(rr >> 8));
        sp--;
        writeMem(sp, u8(rr & 0xff));
store<u16>(288296, (sp));
    

            break;
    
        case 0xc6:  /* ADD A,n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xc7:  /* RST 0x00 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 0;
    

            break;
    
        case 0xc8:  /* RET Z */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if ((load<u8>(288276) & 0x40)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xc9:  /* RET */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
        pc = lo | (hi << 8);
    

            break;
    
        case 0xca:  /* JP Z,nn */
    
        if ((load<u8>(288276) & 0x40)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xcb:  /* prefix fdcb */
    
        opcodePrefix = 0xfc;
        interruptible = false;
    

            break;
    
        case 0xcc:  /* CALL Z,nn */
    
        if ((load<u8>(288276) & 0x40)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xcd:  /* CALL nn */
    
        let lo = u16(readMem(pc++));
        let hi = u16(readMem(pc));
        contendDirtyRead(pc);
        t++;
        pc++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = lo + (hi << 8);
    

            break;
    
        case 0xce:  /* ADC A,n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a + val + (load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | load<u8>(288300 + (lookup & 0x07)) | load<u8>(288316 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xcf:  /* RST 0x08 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 8;
    

            break;
    
        case 0xd0:  /* RET NC */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if (!(load<u8>(288276) & 0x01)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xd1:  /* POP DE */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
store<u16>(288280, (lo | (hi << 8)));
    

            break;
    
        case 0xd2:  /* JP NC,nn */
    
        if (!(load<u8>(288276) & 0x01)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xd3:  /* OUT (n),A */
    
        const lo:u16 = u16(readMem(pc++));
        const a:u8 = load<u8>(288277);
        writePort(lo | (u16(a) << 8), a);
    

            break;
    
        case 0xd4:  /* CALL NC,nn */
    
        if (!(load<u8>(288276) & 0x01)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xd5:  /* PUSH DE */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const rr:u16 = load<u16>(288280);
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(rr >> 8));
        sp--;
        writeMem(sp, u8(rr & 0xff));
store<u16>(288296, (sp));
    

            break;
    
        case 0xd6:  /* SUB n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xd7:  /* RST 0x10 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 16;
    

            break;
    
        case 0xd8:  /* RET C */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if ((load<u8>(288276) & 0x01)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xd9:  /* EXX */
    
        let tmp:u16 = load<u16>(288278);
store<u16>(288278, (load<u16>(288286)));
store<u16>(288286, (tmp));
        tmp = load<u16>(288280);
store<u16>(288280, (load<u16>(288288)));
store<u16>(288288, (tmp));
        tmp = load<u16>(288282);
store<u16>(288282, (load<u16>(288290)));
store<u16>(288290, (tmp));
    

            break;
    
        case 0xda:  /* JP C,nn */
    
        if ((load<u8>(288276) & 0x01)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xdb:  /* IN A,(n) */
    
        const port:u16 = (u16(load<u8>(288277)) << 8) | u16(readMem(pc++));
store<u8>(288277, (readPort(port)));
    

            break;
    
        case 0xdc:  /* CALL C,nn */
    
        if ((load<u8>(288276) & 0x01)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xdd:  /* prefix dd */
    
        opcodePrefix = 0xdd;
        interruptible = false;
    

            break;
    
        case 0xde:  /* SBC A,n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        const result:u32 = a - u32(val) - u32(load<u8>(288276) & 0x01);
        const lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (result & 0x88) >> 1 );
store<u8>(288277, (result));
store<u8>(288276, ((result & 0x100 ? 0x01 : 0) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | load<u8>(288332 + (u8(result)))));
    

            break;
    
        case 0xdf:  /* RST 0x18 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 24;
    

            break;
    
        case 0xe0:  /* RET PO */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if (!(load<u8>(288276) & 0x04)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xe1:  /* POP IY */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
store<u16>(288294, (lo | (hi << 8)));
    

            break;
    
        case 0xe2:  /* JP PO,nn */
    
        if (!(load<u8>(288276) & 0x04)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xe3:  /* EX (SP),IY */
    
        const sp:u16 = load<u16>(288296);
        const lo = u16(readMem(sp));
        const hi = u16(readMem(sp + 1));
        contendDirtyRead(sp + 1);
        t++;
        const rr:u16 = load<u16>(288294);
        writeMem(sp + 1, u8(rr >> 8));
        writeMem(sp, u8(rr & 0xff));
store<u16>(288294, (lo | (hi << 8)));
        contendDirtyWrite(sp);
        t++;
        contendDirtyWrite(sp);
        t++;
    

            break;
    
        case 0xe4:  /* CALL PO,nn */
    
        if (!(load<u8>(288276) & 0x04)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xe5:  /* PUSH IY */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const rr:u16 = load<u16>(288294);
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(rr >> 8));
        sp--;
        writeMem(sp, u8(rr & 0xff));
store<u16>(288296, (sp));
    

            break;
    
        case 0xe6:  /* AND n */
    
        const val = readMem(pc++);
        const result:u8 = load<u8>(288277) & val;
store<u8>(288277, (result));
store<u8>(288276, (0x10 | load<u8>(288844 + (result))));
    

            break;
    
        case 0xe7:  /* RST 0x20 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 32;
    

            break;
    
        case 0xe8:  /* RET PE */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if ((load<u8>(288276) & 0x04)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xe9:  /* JP (IY) */
    
        pc = load<u16>(288294);
    

            break;
    
        case 0xea:  /* JP PE,nn */
    
        if ((load<u8>(288276) & 0x04)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xeb:  /* EX DE,HL */
    
        let tmp:u16 = load<u16>(288280);
store<u16>(288280, (load<u16>(288282)));
store<u16>(288282, (tmp));
    

            break;
    
        case 0xec:  /* CALL PE,nn */
    
        if ((load<u8>(288276) & 0x04)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xed:  /* prefix ed */
    
        opcodePrefix = 0xed;
        interruptible = false;
    

            break;
    
        case 0xee:  /* XOR n */
    
        const val = readMem(pc++);
        const result:u8 = load<u8>(288277) ^ val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xef:  /* RST 0x28 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 40;
    

            break;
    
        case 0xf0:  /* RET P */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if (!(load<u8>(288276) & 0x80)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xf1:  /* POP AF */
    
        let sp = load<u16>(288296);
        const lo = u16(readMem(sp++));
        const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
store<u16>(288276, (lo | (hi << 8)));
    

            break;
    
        case 0xf2:  /* JP P,nn */
    
        if (!(load<u8>(288276) & 0x80)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xf3:  /* DI */
    
        iff1 = iff2 = 0;
    

            break;
    
        case 0xf4:  /* CALL P,nn */
    
        if (!(load<u8>(288276) & 0x80)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xf5:  /* PUSH AF */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        const rr:u16 = load<u16>(288276);
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(rr >> 8));
        sp--;
        writeMem(sp, u8(rr & 0xff));
store<u16>(288296, (sp));
    

            break;
    
        case 0xf6:  /* OR n */
    
        const val = readMem(pc++);
        const result:u8 = load<u8>(288277) | val;
store<u8>(288277, (result));
store<u8>(288276, (load<u8>(288844 + (result))));
    

            break;
    
        case 0xf7:  /* RST 0x30 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 48;
    

            break;
    
        case 0xf8:  /* RET M */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        if ((load<u8>(288276) & 0x80)) {
            let sp = load<u16>(288296);
            const lo = u16(readMem(sp++));
            const hi = u16(readMem(sp++));
store<u16>(288296, (sp));
            pc = lo | (hi << 8);
        }
    

            break;
    
        case 0xf9:  /* LD SP,IY */
    
store<u16>(288296, (load<u16>(288294)));
        const ir:u16 = load<u16>(288298);
        contendDirtyRead(ir);
        t++;
        contendDirtyRead(ir);
        t++;
    

            break;
    
        case 0xfa:  /* JP M,nn */
    
        if ((load<u8>(288276) & 0x80)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc++));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xfb:  /* EI */
    
        iff1 = iff2 = 1;
        interruptible = false;
    

            break;
    
        case 0xfc:  /* CALL M,nn */
    
        if ((load<u8>(288276) & 0x80)) {
            let lo = u16(readMem(pc++));
            let hi = u16(readMem(pc));
            contendDirtyRead(pc);
            t++;
            pc++;
            let sp = load<u16>(288296);
            sp--;
            writeMem(sp, u8(pc >> 8));
            sp--;
            writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
            pc = lo + (hi << 8);
        } else {
            contendRead(pc++);
            t += 3;
            contendRead(pc++);
            t += 3;
        }
    

            break;
    
        case 0xfd:  /* prefix fd */
    
        opcodePrefix = 0xfd;
        interruptible = false;
    

            break;
    
        case 0xfe:  /* CP n */
    
        const val = readMem(pc++);
        let a:u32 = u32(load<u8>(288277));
        let cptemp:u32 = a - u32(val);
        let lookup:u32 = ( (a & 0x88) >> 3 ) | ( (val & 0x88) >> 2 ) | ( (cptemp & 0x88) >> 1 );
store<u8>(288276, (( cptemp & 0x100 ? 0x01 : ( cptemp ? 0 : 0x40 ) ) | 0x02 | load<u8>(288308 + (lookup & 0x07)) | load<u8>(288324 + (lookup >> 4)) | ( val & ( 0x08 | 0x20 ) ) | ( cptemp & 0x80 )));
    

            break;
    
        case 0xff:  /* RST 0x38 */
    
        contendDirtyRead(load<u16>(288298));
        t++;
        let sp = load<u16>(288296);
        sp--;
        writeMem(sp, u8(pc >> 8));
        sp--;
        writeMem(sp, u8(pc & 0xff));
store<u16>(288296, (sp));
        pc = 56;
    

            break;
    
                default:
                    return 1;  /* unrecognised opcode */
            }
        } else if (opcodePrefix == 0xfc) {  // fdcb
            opcodePrefix = 0;  // for the next instruction (unless overridden)
            const indexOffset:i8 = i8(readMem(pc++));
            let op:u8 = readMem(pc++);
            switch (op) {

        case 0x0:  /* RLC (IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x1:  /* RLC (IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x2:  /* RLC (IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x3:  /* RLC (IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x4:  /* RLC (IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x5:  /* RLC (IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x6:  /* RLC (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0x7:  /* RLC (IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = ((val << 1) | (val >> 7));
store<u8>(288276, ((result & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x8:  /* RRC (IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x9:  /* RRC (IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xa:  /* RRC (IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xb:  /* RRC (IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xc:  /* RRC (IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xd:  /* RRC (IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xe:  /* RRC (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xf:  /* RRC (IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = ((val >> 1) | (val << 7));
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x10:  /* RL (IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x11:  /* RL (IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x12:  /* RL (IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x13:  /* RL (IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x14:  /* RL (IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x15:  /* RL (IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x16:  /* RL (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0x17:  /* RL (IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val << 1) | (load<u8>(288276) & 0x01);
store<u8>(288276, ((val >> 7) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x18:  /* RR (IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x19:  /* RR (IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x1a:  /* RR (IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x1b:  /* RR (IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x1c:  /* RR (IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x1d:  /* RR (IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x1e:  /* RR (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0x1f:  /* RR (IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = (val >> 1) | (load<u8>(288276) << 7);
store<u8>(288276, ((val & 0x01) | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x20:  /* SLA (IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x21:  /* SLA (IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x22:  /* SLA (IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x23:  /* SLA (IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x24:  /* SLA (IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x25:  /* SLA (IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x26:  /* SLA (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0x27:  /* SLA (IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = val << 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x28:  /* SRA (IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x29:  /* SRA (IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x2a:  /* SRA (IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x2b:  /* SRA (IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x2c:  /* SRA (IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x2d:  /* SRA (IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x2e:  /* SRA (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0x2f:  /* SRA (IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = (val & 0x80) | (val >> 1);
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x30:  /* SLL (IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x31:  /* SLL (IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x32:  /* SLL (IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x33:  /* SLL (IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x34:  /* SLL (IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x35:  /* SLL (IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x36:  /* SLL (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0x37:  /* SLL (IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val >> 7;
        const result:u8 = (val << 1) | 0x01;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x38:  /* SRL (IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x39:  /* SRL (IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x3a:  /* SRL (IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x3b:  /* SRL (IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x3c:  /* SRL (IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x3d:  /* SRL (IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x3e:  /* SRL (IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0x3f:  /* SRL (IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const f:u8 = val & 0x01;
        const result:u8 = val >> 1;
store<u8>(288276, (f | load<u8>(288844 + (result))));
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x40:  /* BIT 0,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x41:  /* BIT 0,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x42:  /* BIT 0,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x43:  /* BIT 0,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x44:  /* BIT 0,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x45:  /* BIT 0,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x46:  /* BIT 0,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x47:  /* BIT 0,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 1) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x48:  /* BIT 1,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x49:  /* BIT 1,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x4a:  /* BIT 1,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x4b:  /* BIT 1,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x4c:  /* BIT 1,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x4d:  /* BIT 1,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x4e:  /* BIT 1,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x4f:  /* BIT 1,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 2) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x50:  /* BIT 2,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x51:  /* BIT 2,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x52:  /* BIT 2,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x53:  /* BIT 2,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x54:  /* BIT 2,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x55:  /* BIT 2,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x56:  /* BIT 2,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x57:  /* BIT 2,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 4) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x58:  /* BIT 3,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x59:  /* BIT 3,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x5a:  /* BIT 3,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x5b:  /* BIT 3,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x5c:  /* BIT 3,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x5d:  /* BIT 3,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x5e:  /* BIT 3,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x5f:  /* BIT 3,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 8) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x60:  /* BIT 4,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x61:  /* BIT 4,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x62:  /* BIT 4,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x63:  /* BIT 4,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x64:  /* BIT 4,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x65:  /* BIT 4,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x66:  /* BIT 4,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x67:  /* BIT 4,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 16) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x68:  /* BIT 5,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x69:  /* BIT 5,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x6a:  /* BIT 5,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x6b:  /* BIT 5,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x6c:  /* BIT 5,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x6d:  /* BIT 5,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x6e:  /* BIT 5,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x6f:  /* BIT 5,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 32) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x70:  /* BIT 6,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x71:  /* BIT 6,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x72:  /* BIT 6,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x73:  /* BIT 6,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x74:  /* BIT 6,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x75:  /* BIT 6,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x76:  /* BIT 6,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x77:  /* BIT 6,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 64) ) f |= 0x04 | 0x40;
        
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x78:  /* BIT 7,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x79:  /* BIT 7,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x7a:  /* BIT 7,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x7b:  /* BIT 7,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x7c:  /* BIT 7,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x7d:  /* BIT 7,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x7e:  /* BIT 7,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x7f:  /* BIT 7,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        let f:u8 = ( load<u8>(288276) & 0x01 ) | 0x10 | ( u8(iyAddr >> 8) & ( 0x08 | 0x20 ) );
        if( !(val & 128) ) f |= 0x04 | 0x40;
        if (val & 0x80) f |= 0x80;
store<u8>(288276, (f));
        contendDirtyRead(iyAddr);
        t++;
    

            break;
    
        case 0x80:  /* RES 0,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x81:  /* RES 0,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x82:  /* RES 0,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x83:  /* RES 0,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x84:  /* RES 0,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x85:  /* RES 0,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x86:  /* RES 0,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0x87:  /* RES 0,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 254;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x88:  /* RES 1,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x89:  /* RES 1,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x8a:  /* RES 1,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x8b:  /* RES 1,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x8c:  /* RES 1,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x8d:  /* RES 1,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x8e:  /* RES 1,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0x8f:  /* RES 1,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 253;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x90:  /* RES 2,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x91:  /* RES 2,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x92:  /* RES 2,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x93:  /* RES 2,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x94:  /* RES 2,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x95:  /* RES 2,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x96:  /* RES 2,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0x97:  /* RES 2,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 251;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0x98:  /* RES 3,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0x99:  /* RES 3,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0x9a:  /* RES 3,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0x9b:  /* RES 3,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0x9c:  /* RES 3,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0x9d:  /* RES 3,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0x9e:  /* RES 3,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0x9f:  /* RES 3,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 247;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xa0:  /* RES 4,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xa1:  /* RES 4,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xa2:  /* RES 4,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xa3:  /* RES 4,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xa4:  /* RES 4,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xa5:  /* RES 4,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xa6:  /* RES 4,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xa7:  /* RES 4,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 239;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xa8:  /* RES 5,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xa9:  /* RES 5,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xaa:  /* RES 5,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xab:  /* RES 5,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xac:  /* RES 5,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xad:  /* RES 5,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xae:  /* RES 5,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xaf:  /* RES 5,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 223;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xb0:  /* RES 6,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xb1:  /* RES 6,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xb2:  /* RES 6,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xb3:  /* RES 6,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xb4:  /* RES 6,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xb5:  /* RES 6,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xb6:  /* RES 6,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xb7:  /* RES 6,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 191;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xb8:  /* RES 7,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xb9:  /* RES 7,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xba:  /* RES 7,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xbb:  /* RES 7,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xbc:  /* RES 7,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xbd:  /* RES 7,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xbe:  /* RES 7,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xbf:  /* RES 7,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val & 127;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xc0:  /* SET 0,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xc1:  /* SET 0,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xc2:  /* SET 0,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xc3:  /* SET 0,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xc4:  /* SET 0,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xc5:  /* SET 0,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xc6:  /* SET 0,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xc7:  /* SET 0,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 1;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xc8:  /* SET 1,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xc9:  /* SET 1,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xca:  /* SET 1,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xcb:  /* SET 1,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xcc:  /* SET 1,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xcd:  /* SET 1,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xce:  /* SET 1,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xcf:  /* SET 1,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 2;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xd0:  /* SET 2,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xd1:  /* SET 2,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xd2:  /* SET 2,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xd3:  /* SET 2,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xd4:  /* SET 2,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xd5:  /* SET 2,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xd6:  /* SET 2,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xd7:  /* SET 2,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 4;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xd8:  /* SET 3,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xd9:  /* SET 3,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xda:  /* SET 3,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xdb:  /* SET 3,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xdc:  /* SET 3,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xdd:  /* SET 3,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xde:  /* SET 3,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xdf:  /* SET 3,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 8;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xe0:  /* SET 4,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xe1:  /* SET 4,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xe2:  /* SET 4,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xe3:  /* SET 4,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xe4:  /* SET 4,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xe5:  /* SET 4,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xe6:  /* SET 4,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xe7:  /* SET 4,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 16;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xe8:  /* SET 5,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xe9:  /* SET 5,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xea:  /* SET 5,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xeb:  /* SET 5,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xec:  /* SET 5,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xed:  /* SET 5,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xee:  /* SET 5,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xef:  /* SET 5,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 32;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xf0:  /* SET 6,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xf1:  /* SET 6,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xf2:  /* SET 6,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xf3:  /* SET 6,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xf4:  /* SET 6,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xf5:  /* SET 6,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xf6:  /* SET 6,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xf7:  /* SET 6,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 64;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
        case 0xf8:  /* SET 7,(IY+n>B) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288279, (result));
        
    

            break;
    
        case 0xf9:  /* SET 7,(IY+n>C) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288278, (result));
        
    

            break;
    
        case 0xfa:  /* SET 7,(IY+n>D) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288281, (result));
        
    

            break;
    
        case 0xfb:  /* SET 7,(IY+n>E) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288280, (result));
        
    

            break;
    
        case 0xfc:  /* SET 7,(IY+n>H) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288283, (result));
        
    

            break;
    
        case 0xfd:  /* SET 7,(IY+n>L) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288282, (result));
        
    

            break;
    
        case 0xfe:  /* SET 7,(IY+n) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
        
    

            break;
    
        case 0xff:  /* SET 7,(IY+n>A) */
    
        
                const iyAddr:u16 = load<u16>(288294) + indexOffset;
                contendDirtyRead(pc-1);
                t++;
                contendDirtyRead(pc-1);
                t++;
                const val = readMem(iyAddr);
            
        const result:u8 = val | 128;
        
            contendDirtyRead(iyAddr);
            t++;
            writeMem(iyAddr, result);
store<u8>(288277, (result));
        
    

            break;
    
                default:
                    return 1;  /* unrecognised opcode */
            }
        }
    }

    return 0;
}


/* AY chip state */
let toneGeneratorAPhase:u8 = 0;
let toneGeneratorAPeriod:f64 = 8;
let toneGeneratorACounter:f64 = 0;

let toneGeneratorBPhase:u8 = 0;
let toneGeneratorBPeriod:f64 = 8;
let toneGeneratorBCounter:f64 = 0;

let toneGeneratorCPhase:u8 = 0;
let toneGeneratorCPeriod:f64 = 8;
let toneGeneratorCCounter:f64 = 0;

let noiseGeneratorPhase:u8 = 0;
let noiseGeneratorPeriod:f64 = 16;
let noiseGeneratorCounter:f64 = 0;
let noiseGeneratorSeed:u32 = 1;

let toneChanAMask:u8 = 0x00;
let toneChanBMask:u8 = 0x00;
let toneChanCMask:u8 = 0x00;
let noiseChanAMask:u8 = 0x00;
let noiseChanBMask:u8 = 0x00;
let noiseChanCMask:u8 = 0x00;

let envelopePeriod:f64 = 256;
let envelopeCounter:f64 = 0;
let envelopeRampCounter:u8 = 16;
let envelopeOnFirstRamp:bool = true;
let envelopeAlternateMask:u8 = 0x00;
let envelopeAlternatePhase:u8 = 0x00;
let envelopeHoldMask:u8 = 0x00;
let envelopeAttackMask:u8 = 0x00;
let envelopeContinueMask:u8 = 0x00;
let envelopeValue:u8 = 0x00;

let volumeA:u8 = 0x00;
let volumeB:u8 = 0x00;
let volumeC:u8 = 0x00;

function readAYRegister(reg:u8):u8 {
    if (reg < 14) {
        return load<u8>(537460 + (reg));
    } else {
        return 0x00;
    }
}

function writeAYRegister(reg:u8, val:u8):void {
    if (reg < 14) {
store<u8>(537460 + (reg), (val));
    }

    switch(reg) {
        case 0:
        case 1:
            toneGeneratorAPeriod = f64((((load<u8>(537460 + (1)) & 0x0f) << 8) | load<u8>(537460 + (0))) * 8);
            if (toneGeneratorAPeriod === 0) toneGeneratorAPeriod = 8;
            break;
        case 2:
        case 3:
            toneGeneratorBPeriod = f64((((load<u8>(537460 + (3)) & 0x0f) << 8) | load<u8>(537460 + (2))) * 8);
            if (toneGeneratorBPeriod === 0) toneGeneratorBPeriod = 8;
            break;
        case 4:
        case 5:
            toneGeneratorCPeriod = f64((((load<u8>(537460 + (5)) & 0x0f) << 8) | load<u8>(537460 + (4))) * 8);
            if (toneGeneratorCPeriod === 0) toneGeneratorCPeriod = 8;
            break;
        case 6:
            noiseGeneratorPeriod = f64((val & 0x1f) << 4);
            if (noiseGeneratorPeriod === 0) noiseGeneratorPeriod = 16;
            break;
        case 7:
            toneChanAMask = (val & 0x01) ? 0xff : 0x00;
            toneChanBMask = (val & 0x02) ? 0xff : 0x00;
            toneChanCMask = (val & 0x04) ? 0xff : 0x00;
            noiseChanAMask = (val & 0x08) ? 0xff : 0x00;
            noiseChanBMask = (val & 0x10) ? 0xff : 0x00;
            noiseChanCMask = (val & 0x20) ? 0xff : 0x00;
            break;
        case 8:
            volumeA = val;
            break;
        case 9:
            volumeB = val;
            break;
        case 10:
            volumeC = val;
            break;
        case 11:
        case 12:
            envelopePeriod = f64(((load<u8>(537460 + (12)) << 8) | load<u8>(537460 + (11))) << 4);
            if (envelopePeriod === 0) envelopePeriod = 16;
            break;
        case 13:
            envelopeCounter = 0;
            envelopeRampCounter = 16;
            envelopeOnFirstRamp = true;
            envelopeAlternatePhase = 0x00;
            envelopeHoldMask = (val & 0x01) ? 0x0f : 0x00;
            envelopeAlternateMask = (val & 0x02) ? 0x0f : 0x00;
            envelopeAttackMask = (val & 0x04) ? 0x0f : 0x00;
            envelopeContinueMask = (val & 0x08) ? 0x0f : 0x00;
            break;
    }
}
