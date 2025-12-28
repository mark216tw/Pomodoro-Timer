/**
 * 好用的番茄時鐘 -核心邏輯
 */

// --- 1. 常數與預設設定 ---
let workMinutes = parseInt(localStorage.getItem('pomoWorkMinutes')) || 25;
let breakMinutes = parseInt(localStorage.getItem('pomoBreakMinutes')) || 5;
let soundEnabled = localStorage.getItem('pomoSoundEnabled') !== 'false'; // 預設開啟

// Web Audio API 音效生成器
let audioContext = null;

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playNotificationSound() {
    if (!soundEnabled) return;

    try {
        initAudioContext();

        // 創建優雅的雙音提示音 (類似叮咚聲)
        const now = audioContext.currentTime;

        // 第一個音符 (較高音)
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);

        osc1.frequency.value = 800; // E5
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

        osc1.start(now);
        osc1.stop(now + 0.3);

        // 第二個音符 (較低音，稍後播放)
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);

        osc2.frequency.value = 600; // D5
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0, now + 0.15);
        gain2.gain.setValueAtTime(0.3, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc2.start(now + 0.15);
        osc2.stop(now + 0.5);

    } catch (e) {
        console.warn("音效播放失敗:", e);
    }
}

// --- 2. 狀態管理 ---
let timeLeft = workMinutes * 60;
let timerId = null;
let isRunning = false;
let currentMode = 'work'; // 'work' | 'break'
let completedCount = parseInt(localStorage.getItem('pomoCompletedCount')) || 0;

// --- 3. DOM 元素 ---
const timerDisplay = document.getElementById('timer');
const statusBadge = document.getElementById('status-badge');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const resetBtn = document.getElementById('reset-btn');
const pomoCountDisplay = document.getElementById('pomo-count');
const clearStatsBtn = document.getElementById('clear-stats-btn');
const themeDots = document.querySelectorAll('.theme-dot');

const appContainer = document.getElementById('app');
const body = document.body;

// 設置輸入框
const workInput = document.getElementById('work-duration');
const breakInput = document.getElementById('break-duration');
const soundToggle = document.getElementById('sound-toggle');

// Modal 相關
const confirmModal = document.getElementById('confirm-modal');
const modalCancel = document.getElementById('modal-cancel');
const modalConfirm = document.getElementById('modal-confirm');



// --- 4. 核心功能 ---

/**
 * 更新倒數顯示 (MM:SS)
 */
function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const displayStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerDisplay.textContent = displayStr;
    document.title = `${displayStr} - ${currentMode === 'work' ? '專注中' : '休息中'}`;
}

/**
 * 更新介面狀態 (配色、文字)
 */
function updateUIState() {
    if (currentMode === 'work') {
        body.className = 'mode-work';
        statusBadge.textContent = '🍅 專注中';
        statusBadge.style.backgroundColor = 'var(--accent-work)';
    } else {
        body.className = 'mode-break';
        statusBadge.textContent = '☕ 休息中';
        statusBadge.style.backgroundColor = 'var(--accent-break)';
    }
    pomoCountDisplay.textContent = completedCount;
}

/**
 * 切換模式 (工作 <-> 休息)
 */
function switchMode() {
    if (currentMode === 'work') {
        currentMode = 'break';
        timeLeft = breakMinutes * 60;
        completedCount++;
        localStorage.setItem('pomoCompletedCount', completedCount);
    } else {
        currentMode = 'work';
        timeLeft = workMinutes * 60;
    }

    playNotificationSound();
    updateUIState();
    updateTimerDisplay();
}

/**
 * 計時器 Tick
 */
function tick() {
    if (timeLeft > 0) {
        timeLeft--;
        updateTimerDisplay();
    } else {
        clearInterval(timerId);
        timerId = null;
        isRunning = false;
        startBtn.style.display = 'inline-block';
        pauseBtn.style.display = 'none';
        appContainer.classList.remove('running');

        switchMode();
        // 自動開始下一個階段 (可選，這裡設定為自動開始)
        startTimer();
    }
}

/**
 * 開始計時
 */
function startTimer() {
    // 初始化 AudioContext (需要使用者互動才能啟動)
    if (!isRunning && soundEnabled) {
        initAudioContext();
    }

    if (isRunning) return;

    isRunning = true;
    startBtn.style.display = 'none';
    pauseBtn.style.display = 'inline-block';
    appContainer.classList.add('running');

    timerId = setInterval(tick, 1000);
}

/**
 * 暫停計時
 */
function pauseTimer() {
    isRunning = false;
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
    appContainer.classList.remove('running');

    clearInterval(timerId);
    timerId = null;
}

/**
 * 重置計時
 */
function resetTimer() {
    pauseTimer();
    currentMode = 'work';
    timeLeft = workMinutes * 60;
    updateUIState();
    updateTimerDisplay();
}

// --- 5. 事件監聽 (Event Listeners) ---

startBtn.addEventListener('click', startTimer);
pauseBtn.addEventListener('click', pauseTimer);
resetBtn.addEventListener('click', resetTimer);

// 清除紀錄與 Modal 邏輯
clearStatsBtn.addEventListener('click', () => {
    confirmModal.style.display = 'flex';
});

modalCancel.addEventListener('click', () => {
    confirmModal.style.display = 'none';
});

modalConfirm.addEventListener('click', () => {
    completedCount = 0;
    localStorage.removeItem('pomoCompletedCount');
    updateUIState();
    confirmModal.style.display = 'none';
});

// 點擊 Modal 外部關閉
window.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        confirmModal.style.display = 'none';
    }
});

// 主題切換邏輯
themeDots.forEach(dot => {
    dot.addEventListener('click', () => {
        const selectedTheme = dot.getAttribute('data-t');
        setTheme(selectedTheme);
    });
});

function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('pomoTheme', themeName);

    // 更新點點的啟動狀態
    themeDots.forEach(d => {
        if (d.getAttribute('data-t') === themeName) {
            d.classList.add('active-theme');
        } else {
            d.classList.remove('active-theme');
        }
    });
}

// 時間設定變更邏輯
workInput.addEventListener('change', () => {
    let val = parseInt(workInput.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 60) val = 60;
    workInput.value = val;
    workMinutes = val;
    localStorage.setItem('pomoWorkMinutes', val);
    if (!isRunning && currentMode === 'work') {
        timeLeft = workMinutes * 60;
        updateTimerDisplay();
    }
});

breakInput.addEventListener('change', () => {
    let val = parseInt(breakInput.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 60) val = 60;
    breakInput.value = val;
    breakMinutes = val;
    localStorage.setItem('pomoBreakMinutes', val);
    if (!isRunning && currentMode === 'break') {
        timeLeft = breakMinutes * 60;
        updateTimerDisplay();
    }
});

// 音效開關邏輯
soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    localStorage.setItem('pomoSoundEnabled', soundEnabled);
});

// --- 6. 初始化 ---
(function init() {
    // 載入主題
    const savedTheme = localStorage.getItem('pomoTheme') || 'classic';
    setTheme(savedTheme);

    workInput.value = workMinutes;
    breakInput.value = breakMinutes;
    soundToggle.checked = soundEnabled;
    updateUIState();
    updateTimerDisplay();
})();
