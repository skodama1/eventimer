'use strict';

/* =============================================================
   基本状態
============================================================= */
let baseStartTimeStr = "08:00";
let timetableRaw = [];      // [{duration, title, sound, alertMin}]
let timetableParsed = [];   // 時刻計算済み

let currentIndex = -1;      // 時刻同期モードの現在プログラム
let editTargetIndex = -1;
let insertTargetIndex = -1;
let timeLeft = 0;           // 時刻同期モードの残り秒
let timerRunning = false;
let isPaused = false;
let dayOffset = 0;
let pauseStartTime = null;

/* 進行モード: 'clock' = 時刻同期 / 'manual' = 手動進行 */
let progressMode = 'clock';
let manualIndex = 0;
let manualRemaining = 0;    // 秒。負の値 = 超過時間
let manualRunning = false;
let manualAlerted = false;
let manualEnded = false;
let clockAlertedIndex = -1; // 時刻同期モードで警告音を鳴らした項目

let currentScheduleName = '未選択';
let isDirty = false;        // 未保存の変更があるか
let undoSnapshot = null;
let toastTimer = null;

let mouseTimer = null;
let qrCodeObj = null;
let isViewOnly = false;
let dragSrcIndex = null;

const $ = (id) => document.getElementById(id);

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* SVGアイコン (index.htmlのシンボル定義を参照) */
function icon(name) {
    return `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
}

/* =============================================================
   プリセットデータ
============================================================= */
const defaultSampleData = {
    baseStartTimeStr: "07:30",
    timetableRaw: [
        { duration: 48, title: "登校", sound: false, alertMin: 2 },
        { duration: 7, title: "朝学習", sound: false, alertMin: 0 },
        { duration: 5, title: "朝会", sound: false, alertMin: 0 },
        { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
        { duration: 50, title: "1時間目", sound: false, alertMin: 0 },
        { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
        { duration: 50, title: "2時間目", sound: false, alertMin: 0 },
        { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
        { duration: 50, title: "3時間目", sound: false, alertMin: 0 },
        { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
        { duration: 50, title: "4時間目", sound: false, alertMin: 0 },
        { duration: 40, title: "給食", sound: false, alertMin: 0 },
        { duration: 30, title: "昼休み", sound: false, alertMin: 2 },
        { duration: 50, title: "5時間目", sound: false, alertMin: 0 },
        { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
        { duration: 50, title: "6時間目", sound: false, alertMin: 0 },
        { duration: 5, title: "休み時間", sound: false, alertMin: 2 },
        { duration: 10, title: "帰会", sound: false, alertMin: 0 }
    ]
};

const defaultPresetTimetables = {
    "6時間｜清掃なし": {
        baseStartTimeStr: "07:30",
        timetableRaw: [
            { duration: 48, title: "登校", sound: false, alertMin: 2 },
            { duration: 7, title: "朝学習", sound: false, alertMin: 0 },
            { duration: 5, title: "朝会", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "1時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "2時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "3時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "4時間目", sound: false, alertMin: 0 },
            { duration: 40, title: "給食", sound: false, alertMin: 0 },
            { duration: 30, title: "昼休み", sound: false, alertMin: 2 },
            { duration: 50, title: "5時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "6時間目", sound: false, alertMin: 0 },
            { duration: 5, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 10, title: "帰会", sound: false, alertMin: 0 }
        ]
    },
    "6時間｜清掃あり": {
        baseStartTimeStr: "07:30",
        timetableRaw: [
            { duration: 48, title: "登校", sound: false, alertMin: 2 },
            { duration: 7, title: "朝学習", sound: false, alertMin: 0 },
            { duration: 5, title: "朝会", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "1時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "2時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "3時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "4時間目", sound: false, alertMin: 0 },
            { duration: 40, title: "給食", sound: false, alertMin: 0 },
            { duration: 25, title: "昼休み", sound: false, alertMin: 2 },
            { duration: 50, title: "5時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "6時間目", sound: false, alertMin: 0 },
            { duration: 7, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 10, title: "清掃", sound: false, alertMin: 0 },
            { duration: 8, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 10, title: "帰会", sound: false, alertMin: 0 }
        ]
    },
    "6時間｜諸活動あり": {
        baseStartTimeStr: "07:30",
        timetableRaw: [
            { duration: 48, title: "登校", sound: false, alertMin: 2 },
            { duration: 7, title: "朝学習", sound: false, alertMin: 0 },
            { duration: 5, title: "朝会", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "1時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "2時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "3時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "4時間目", sound: false, alertMin: 0 },
            { duration: 40, title: "給食", sound: false, alertMin: 0 },
            { duration: 25, title: "昼休み", sound: false, alertMin: 2 },
            { duration: 50, title: "5時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "6時間目", sound: false, alertMin: 0 },
            { duration: 5, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 20, title: "諸活動", sound: false, alertMin: 0 },
            { duration: 5, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 10, title: "帰会", sound: false, alertMin: 0 }
        ]
    },
    "5時間": {
        baseStartTimeStr: "07:30",
        timetableRaw: [
            { duration: 48, title: "登校", sound: false, alertMin: 2 },
            { duration: 7, title: "朝学習", sound: false, alertMin: 0 },
            { duration: 5, title: "朝会", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "1時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "2時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "3時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 50, title: "4時間目", sound: false, alertMin: 0 },
            { duration: 40, title: "給食", sound: false, alertMin: 0 },
            { duration: 30, title: "昼休み", sound: false, alertMin: 2 },
            { duration: 50, title: "5時間目", sound: false, alertMin: 0 },
            { duration: 5, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 10, title: "帰会", sound: false, alertMin: 0 }
        ]
    },
    "6時間｜45分授業": {
        baseStartTimeStr: "07:30",
        timetableRaw: [
            { duration: 48, title: "登校", sound: false, alertMin: 2 },
            { duration: 7, title: "朝学習", sound: false, alertMin: 0 },
            { duration: 5, title: "朝会", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 45, title: "1時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 45, title: "2時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 45, title: "3時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 45, title: "4時間目", sound: false, alertMin: 0 },
            { duration: 40, title: "給食", sound: false, alertMin: 0 },
            { duration: 30, title: "昼休み", sound: false, alertMin: 2 },
            { duration: 45, title: "5時間目", sound: false, alertMin: 0 },
            { duration: 10, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 45, title: "6時間目", sound: false, alertMin: 0 },
            { duration: 5, title: "休み時間", sound: false, alertMin: 2 },
            { duration: 10, title: "帰会", sound: false, alertMin: 0 }
        ]
    },
    "イベント進行サンプル": {
        baseStartTimeStr: "13:00",
        timetableRaw: [
            { duration: 5, title: "開会挨拶", sound: true, alertMin: 1 },
            { duration: 10, title: "来賓挨拶", sound: true, alertMin: 2 },
            { duration: 40, title: "基調講演", sound: true, alertMin: 5 },
            { duration: 10, title: "休憩", sound: true, alertMin: 2 },
            { duration: 45, title: "パネルディスカッション", sound: true, alertMin: 5 },
            { duration: 15, title: "質疑応答", sound: true, alertMin: 3 },
            { duration: 5, title: "閉会挨拶", sound: true, alertMin: 1 }
        ]
    },
    "会議60分サンプル": {
        baseStartTimeStr: "10:00",
        timetableRaw: [
            { duration: 5, title: "アジェンダ確認", sound: true, alertMin: 1 },
            { duration: 15, title: "報告事項", sound: true, alertMin: 3 },
            { duration: 25, title: "議題ディスカッション", sound: true, alertMin: 5 },
            { duration: 10, title: "決定事項の整理", sound: true, alertMin: 2 },
            { duration: 5, title: "次回までのアクション確認", sound: true, alertMin: 1 }
        ]
    }
};

/* =============================================================
   サウンド
============================================================= */
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

/* kind: 'end' = 終了音(長め1回) / 'warn' = 警告音(短め2回) */
function playBeep(kind = 'end') {
    if (!audioCtx) return;
    try {
        const t = audioCtx.currentTime;
        const mk = (start, dur, freq) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t + start);
            gain.gain.setValueAtTime(0.5, t + start);
            osc.start(t + start);
            osc.stop(t + start + dur);
        };
        if (kind === 'warn') {
            mk(0, 0.15, 660);
            mk(0.25, 0.15, 660);
        } else {
            mk(0, 0.5, 880);
        }
    } catch (e) {
        console.log("Audio play error:", e);
    }
}

/* =============================================================
   時刻ユーティリティ
============================================================= */
function addMinutesToTimeStr(timeStr, minsToAdd) {
    if (!timeStr) return "";
    const parts = timeStr.split(':');
    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10);
    minutes += minsToAdd;
    hours += Math.floor(minutes / 60);
    minutes = minutes % 60;
    hours = hours % 24;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

function dateToTimeString(dateObj) {
    const h = dateObj.getHours().toString().padStart(2, '0');
    const m = dateObj.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
}

function timeStringToDate(timeStr, offsetDays = 0) {
    const now = new Date();
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays, parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
}

function formatTimeLeftString(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getHMSClockHTML() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}<span class="sec-red">:${seconds}</span>`;
}

/* =============================================================
   スケジュール構造の再計算
============================================================= */
function rebuildParsed() {
    if (!baseStartTimeStr) baseStartTimeStr = "08:00";

    const now = new Date();
    let track = timeStringToDate(baseStartTimeStr, 0);

    const totalMinutes = timetableRaw.reduce((a, b) => a + b.duration, 0);
    const scheduleEnd = new Date(track.getTime() + totalMinutes * 60 * 1000);
    dayOffset = (now >= scheduleEnd) ? 1 : 0;

    track = timeStringToDate(baseStartTimeStr, dayOffset);

    timetableParsed = timetableRaw.map(item => {
        const start = new Date(track.getTime());
        const end = new Date(start.getTime() + item.duration * 60 * 1000);
        track = end;
        return {
            start: start,
            end: end,
            title: item.title,
            startStr: dateToTimeString(start),
            endStr: dateToTimeString(end),
            sound: item.sound !== undefined ? item.sound : false,
            alertMin: item.alertMin !== undefined ? item.alertMin : 0
        };
    });

    setupNextFormPlaceholder();
}

function refreshTimetableStructure(skipBackup = false) {
    rebuildParsed();

    if (progressMode === 'manual') {
        if (timetableRaw.length === 0) {
            manualIndex = 0;
            manualRemaining = 0;
            manualRunning = false;
        } else if (manualIndex >= timetableRaw.length) {
            manualLoadIndex(timetableRaw.length - 1);
        }
    } else {
        autoSelectCurrentIndex();
        recomputeTimeLeft();
    }

    if (!skipBackup) saveAutoBackup();
    renderTimetableList();
    updateDisplayOnly();
}

function autoSelectCurrentIndex() {
    currentIndex = -1;
    const now = new Date();
    for (let i = 0; i < timetableParsed.length; i++) {
        if (now >= timetableParsed[i].start && now < timetableParsed[i].end) {
            currentIndex = i;
            break;
        }
    }
}

function recomputeTimeLeft() {
    const now = new Date();
    if (currentIndex >= 0) {
        timeLeft = Math.max(0, Math.floor((timetableParsed[currentIndex].end - now) / 1000));
    } else if (timetableParsed.length > 0 && now < timetableParsed[0].start) {
        timeLeft = Math.floor((timetableParsed[0].start - now) / 1000);
    } else {
        timeLeft = 0;
    }
}

function updateActiveRowHighlight() {
    if (editTargetIndex !== -1 || insertTargetIndex !== -1) return;
    const active = progressMode === 'manual' ? manualIndex : currentIndex;
    timetableParsed.forEach((_, i) => {
        const row = $(`row-${i}`);
        if (row) row.classList.toggle('active-row', i === active);
    });
}

/* =============================================================
   メインループ (1秒ごと)
============================================================= */
function tick() {
    if (progressMode === 'manual') {
        manualTick();
        return;
    }
    const now = new Date();
    if (isPaused) {
        updateDisplayOnly();
        return;
    }
    if (timetableParsed.length > 0 && timerRunning) {
        checkAndSyncTime(now);
    } else {
        updateDisplayOnly();
    }
}

function checkAndSyncTime(now) {
    if (timetableParsed.length === 0) return;

    if (currentIndex === -1) {
        if (now >= timetableParsed[0].start) {
            currentIndex = 0;
            clockAlertedIndex = -1;
            updateTimetableCellsOnly();
            updateActiveRowHighlight();
        } else {
            updateDisplayOnly();
            return;
        }
    }

    const current = timetableParsed[currentIndex];
    if (now >= current.end) {
        if (current.sound) playBeep('end');
        autoSelectCurrentIndex();
        clockAlertedIndex = -1;

        if (currentIndex === -1) {
            const totalEnd = timetableParsed[timetableParsed.length - 1].end;
            if (now >= totalEnd) {
                refreshTimetableStructure(); // 翌日分として再構築
                return;
            }
        }
        updateTimetableCellsOnly();
        updateActiveRowHighlight();
    }

    if (currentIndex >= 0) {
        const cur = timetableParsed[currentIndex];
        timeLeft = Math.max(0, Math.floor((cur.end - now) / 1000));

        const alertSec = (cur.alertMin || 0) * 60;
        if (alertSec > 0 && timeLeft <= alertSec && timeLeft > 0 && clockAlertedIndex !== currentIndex) {
            clockAlertedIndex = currentIndex;
            if (cur.sound) playBeep('warn');
        }
    }

    updateDisplayOnly();
}

/* =============================================================
   手動進行モード
============================================================= */
function manualLoadIndex(i) {
    if (timetableRaw.length === 0) {
        manualIndex = 0;
        manualRemaining = 0;
        manualAlerted = false;
        manualEnded = false;
        return;
    }
    manualIndex = Math.max(0, Math.min(i, timetableRaw.length - 1));
    manualRemaining = (timetableRaw[manualIndex].duration || 0) * 60;
    manualAlerted = false;
    manualEnded = false;
}

function manualTick() {
    if (manualRunning && timetableRaw.length > 0) {
        manualRemaining--;
        const item = timetableRaw[manualIndex];
        const alertSec = (item.alertMin || 0) * 60;
        if (!manualAlerted && alertSec > 0 && manualRemaining <= alertSec && manualRemaining > 0) {
            manualAlerted = true;
            if (item.sound) playBeep('warn');
        }
        if (!manualEnded && manualRemaining <= 0) {
            manualEnded = true;
            if (item.sound) playBeep('end');
        }
    }
    updateDisplayOnly();
}

function manualNext() {
    if (manualIndex < timetableRaw.length - 1) {
        manualLoadIndex(manualIndex + 1);
        updateActiveRowHighlight();
        updateDisplayOnly();
    }
}

function manualPrev() {
    if (manualIndex > 0) {
        manualLoadIndex(manualIndex - 1);
        updateActiveRowHighlight();
        updateDisplayOnly();
    }
}

function manualJumpTo(i) {
    manualLoadIndex(i);
    updateActiveRowHighlight();
    updateDisplayOnly();
}

/* =============================================================
   モード切替
============================================================= */
function setMode(mode) {
    if (mode === progressMode) return;
    progressMode = mode;
    localStorage.setItem('timer_progress_mode', mode);

    if (mode === 'manual') {
        timerRunning = false;
        isPaused = false;
        pauseStartTime = null;
        autoSelectCurrentIndex();
        const idx = currentIndex >= 0 ? currentIndex : 0;
        manualLoadIndex(idx);
        // 進行中の項目からは残り時間を引き継ぐ
        if (currentIndex >= 0) {
            const now = new Date();
            const rem = Math.floor((timetableParsed[currentIndex].end - now) / 1000);
            if (rem > 0) manualRemaining = rem;
        }
        manualRunning = true;
        initAudio();
    } else {
        manualRunning = false;
        rebuildParsed();
        startClockSync();
    }

    renderTimetableList();
    updateDisplayOnly();
}

function startClockSync() {
    timerRunning = true;
    isPaused = false;
    pauseStartTime = null;
    autoSelectCurrentIndex();
    recomputeTimeLeft();
    updateActiveRowHighlight();
}

/* =============================================================
   スタート / 一時停止 (両モード共通ボタン)
============================================================= */
function startTimer() {
    if (timetableRaw.length === 0) return;
    initAudio();

    if (progressMode === 'manual') {
        manualRunning = true;
        updateDisplayOnly();
        return;
    }

    // 時刻同期モード: 一時停止していた分だけスケジュール全体を繰り下げて再開
    if (isPaused && pauseStartTime) {
        const pausedDurationMs = Date.now() - pauseStartTime;
        timetableParsed = timetableParsed.map(item => {
            const newStart = new Date(item.start.getTime() + pausedDurationMs);
            const newEnd = new Date(item.end.getTime() + pausedDurationMs);
            return {
                ...item,
                start: newStart,
                end: newEnd,
                startStr: dateToTimeString(newStart),
                endStr: dateToTimeString(newEnd)
            };
        });
        baseStartTimeStr = timetableParsed[0].startStr;
        pauseStartTime = null;
    }

    isPaused = false;
    timerRunning = true;
    autoSelectCurrentIndex();
    recomputeTimeLeft();
    updateTimetableCellsOnly();
    updateActiveRowHighlight();
    updateDisplayOnly();
}

function pauseTimer() {
    if (progressMode === 'manual') {
        manualRunning = false;
        updateDisplayOnly();
        return;
    }
    if (timerRunning && !isPaused) {
        isPaused = true;
        timerRunning = false;
        pauseStartTime = Date.now();
        updateDisplayOnly();
    }
}

/* =============================================================
   画面表示の更新
============================================================= */
function updateDisplayOnly() {
    const now = new Date();
    const week = ["日", "月", "火", "水", "木", "金", "土"];
    const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}(${week[now.getDay()]})`;
    const hm = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const topInfoEl = $('top-info');
    const timeLeftEl = $('time-left');
    const controlsZone = $('timer-controls-zone');
    const modeToggle = $('mode-toggle');
    const progTrack = $('program-progress');
    const progFill = $('program-progress-fill');
    const pauseInfo = $('pause-info');

    timeLeftEl.classList.remove('alert-mode', 'overtime', 'paused');
    pauseInfo.style.display = 'none';

    $('schedule-name').textContent = currentScheduleName;

    if (timetableRaw.length === 0) {
        topInfoEl.textContent = '';
        $('current-title').textContent = 'プログラムが登録されていません';
        timeLeftEl.textContent = '00:00';
        $('next-title').textContent = '次：--';
        $('overall-progress').textContent = '';
        controlsZone.style.display = 'none';
        modeToggle.style.display = 'none';
        progTrack.style.display = 'none';
        syncControlButtons();
        return;
    }

    modeToggle.style.display = isViewOnly ? 'none' : 'flex';
    controlsZone.style.display = isViewOnly ? 'none' : 'flex';

    if (progressMode === 'manual') {
        /* ---------- 手動進行モード ---------- */
        const item = timetableRaw[manualIndex];
        topInfoEl.innerHTML = `${dateStr} ${getHMSClockHTML()}`;
        $('current-title').textContent = item.title;

        if (manualRemaining >= 0) {
            timeLeftEl.textContent = formatTimeLeftString(manualRemaining);
            const alertSec = (item.alertMin || 0) * 60;
            if (alertSec > 0 && manualRemaining <= alertSec) {
                timeLeftEl.classList.add('alert-mode');
            }
        } else {
            timeLeftEl.textContent = `+${formatTimeLeftString(-manualRemaining)}`;
            timeLeftEl.classList.add('overtime');
        }
        if (!manualRunning) timeLeftEl.classList.add('paused');

        const next = timetableRaw[manualIndex + 1];
        $('next-title').textContent = next ? `次：${next.title} (${next.duration}分)` : '次：なし (最後のプログラム)';

        const total = (item.duration || 0) * 60;
        const elapsed = total - Math.max(manualRemaining, 0);
        progTrack.style.display = 'block';
        progFill.style.width = total > 0 ? `${Math.min(100, (elapsed / total) * 100)}%` : '0%';
        progFill.classList.toggle('over', manualRemaining < 0);
    } else {
        /* ---------- 時刻同期モード ---------- */
        const waiting = (currentIndex === -1 && timetableParsed.length > 0 && now < timetableParsed[0].start);

        if (waiting) {
            const secToStart = Math.max(0, Math.floor((timetableParsed[0].start - now) / 1000));
            topInfoEl.innerHTML = `${dateStr} ${getHMSClockHTML()}`;
            $('current-title').textContent = '開始前';
            timeLeftEl.textContent = formatTimeLeftString(secToStart);
            $('next-title').textContent = `開始予定：${timetableParsed[0].startStr}〜「${timetableParsed[0].title}」`;
            progTrack.style.display = 'none';
        } else if (currentIndex < 0) {
            topInfoEl.textContent = dateStr;
            $('current-title').textContent = '';
            timeLeftEl.innerHTML = getHMSClockHTML();
            $('next-title').textContent = '次：--';
            progTrack.style.display = 'none';
        } else {
            const current = timetableParsed[currentIndex];
            topInfoEl.textContent = `${dateStr} ${hm}`;
            $('current-title').textContent = current.title;
            timeLeftEl.textContent = formatTimeLeftString(timeLeft);

            const alertSec = (current.alertMin || 0) * 60;
            if (alertSec > 0 && timeLeft <= alertSec) {
                timeLeftEl.classList.add('alert-mode');
            }

            const next = timetableParsed[currentIndex + 1];
            $('next-title').textContent = next ? `次：${next.title} (${next.startStr}〜)` : '次：なし (終了後は翌日ループ)';

            const total = (current.end - current.start) / 1000;
            progTrack.style.display = 'block';
            progFill.style.width = `${Math.min(100, ((total - timeLeft) / total) * 100)}%`;
            progFill.classList.remove('over');

            if (isPaused && pauseStartTime) {
                timeLeftEl.classList.add('paused');
                const pausedSec = Math.floor((Date.now() - pauseStartTime) / 1000);
                pauseInfo.style.display = 'block';
                pauseInfo.innerHTML = `${icon('pause')} 一時停止中 +${formatTimeLeftString(pausedSec)} — 再開するとスケジュール全体がこの分だけ繰り下がります`;
            }
        }
    }

    updateOverallProgress(now);
    syncControlButtons();
}

function updateOverallProgress(now) {
    const el = $('overall-progress');
    if (timetableRaw.length === 0) {
        el.textContent = '';
        return;
    }
    const totalSec = timetableRaw.reduce((a, b) => a + b.duration * 60, 0);
    let doneSec = 0;
    let pos = 0;

    if (progressMode === 'manual') {
        for (let i = 0; i < manualIndex; i++) doneSec += timetableRaw[i].duration * 60;
        const t = timetableRaw[manualIndex].duration * 60;
        doneSec += Math.min(t, t - Math.max(manualRemaining, 0));
        pos = manualIndex + 1;
    } else {
        if (currentIndex < 0 && timetableParsed.length > 0 && now < timetableParsed[0].start) {
            el.textContent = `開始前・全 ${timetableRaw.length} プログラム (合計 ${Math.round(totalSec / 60)}分)`;
            return;
        }
        if (currentIndex >= 0) {
            doneSec = Math.max(0, Math.min(totalSec, Math.floor((now - timetableParsed[0].start) / 1000)));
            pos = currentIndex + 1;
        } else {
            el.textContent = '';
            return;
        }
    }

    const pct = totalSec > 0 ? Math.min(100, Math.round((doneSec / totalSec) * 100)) : 0;
    el.textContent = `${pos} / ${timetableRaw.length}・全体 ${pct}%`;
}

function syncControlButtons() {
    const manual = (progressMode === 'manual');
    $('btn-prev').style.display = manual ? '' : 'none';
    $('btn-next').style.display = manual ? '' : 'none';
    $('mode-clock').classList.toggle('active', !manual);
    $('mode-manual').classList.toggle('active', manual);

    if (manual) {
        $('btn-prev').disabled = (manualIndex <= 0);
        $('btn-next').disabled = (manualIndex >= timetableRaw.length - 1);
        $('btn-start').disabled = manualRunning;
        $('btn-pause').disabled = !manualRunning;
        $('btn-start').innerHTML = `${icon('play')}スタート`;
    } else {
        $('btn-start').disabled = timerRunning;
        $('btn-pause').disabled = !timerRunning;
        $('btn-start').innerHTML = `${icon('play')}${isPaused ? '再開' : 'スタート'}`;
    }
}

/* =============================================================
   フルスクリーン
============================================================= */
function resetMouseTimer() {
    const timerArea = $('timer-area');
    if (!timerArea.classList.contains('ios-fullscreen')) return;

    timerArea.classList.remove('hide-cursor');
    if (mouseTimer) clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => {
        if (timerArea.classList.contains('ios-fullscreen')) {
            timerArea.classList.add('hide-cursor');
        }
    }, 2500);
}
document.addEventListener('mousemove', resetMouseTimer);

function toggleFullscreen() {
    const timerArea = $('timer-area');
    const btn = document.querySelector('.fullscreen-btn');

    if (timerArea.classList.contains('ios-fullscreen')) {
        timerArea.classList.remove('ios-fullscreen');
        timerArea.classList.remove('hide-cursor');
        if (mouseTimer) clearTimeout(mouseTimer);
        btn.innerHTML = `${icon('maximize')}<span>全画面</span>`;
    } else {
        timerArea.classList.add('ios-fullscreen');
        btn.innerHTML = `${icon('minimize')}<span>閉じる</span>`;
        initAudio();
        resetMouseTimer();
    }
}

/* =============================================================
   追加フォーム
============================================================= */
function calculateEndTime() {
    const startVal = $('input-start').value;
    const durationVal = parseInt($('input-duration').value, 10);

    if (!startVal || isNaN(durationVal) || durationVal <= 0) {
        $('input-end').value = '';
        return;
    }
    $('input-end').value = addMinutesToTimeStr(startVal, durationVal);
}

function onStartTimeInput() {
    if (timetableRaw.length === 0) {
        baseStartTimeStr = $('input-start').value || "08:00";
    }
    calculateEndTime();
}

function setupNextFormPlaceholder() {
    if (timetableRaw.length === 0) {
        if (!baseStartTimeStr) baseStartTimeStr = "08:00";
        $('input-start').value = baseStartTimeStr;
        $('input-start').disabled = false;
    } else {
        if (timetableParsed.length > 0) {
            const lastItem = timetableParsed[timetableParsed.length - 1];
            $('input-start').value = lastItem.endStr;
        }
        $('input-start').disabled = true;
    }
    calculateEndTime();
}

function clearForm() {
    $('input-duration').value = '';
    $('input-title').value = '';
    $('input-end').value = '';
    $('input-alert-min').value = '0';
}

function submitFormItem() {
    const duration = parseInt($('input-duration').value, 10);
    const title = $('input-title').value.trim();
    let alertMin = parseInt($('input-alert-min').value, 10);
    if (isNaN(alertMin) || alertMin < 0) alertMin = 0;

    if (isNaN(duration) || duration <= 0 || !title) {
        alert('所要時間とプログラム名を正しく入力してください。');
        return;
    }

    if (timetableRaw.length === 0) {
        baseStartTimeStr = $('input-start').value || "08:00";
    }
    timetableRaw.push({ duration, title, sound: false, alertMin });

    markDirty();
    clearForm();
    refreshTimetableStructure();
}

/* =============================================================
   インライン編集・挿入
============================================================= */
function editProgramItem(index) {
    insertTargetIndex = -1;
    editTargetIndex = index;
    renderTimetableList();
}

function cancelInlineEdit() {
    editTargetIndex = -1;
    renderTimetableList();
}

function saveInlineEdit(index) {
    const row = $(`row-${index}`);
    const newTitle = row.querySelector('.inline-title-input').value.trim();
    const newDuration = parseInt(row.querySelector('.inline-duration-input').value, 10);
    let newAlertMin = parseInt(row.querySelector('.inline-alert-edit').value, 10);
    if (isNaN(newAlertMin) || newAlertMin < 0) newAlertMin = 0;
    const newSound = row.querySelector('.inline-sound-input').checked;

    let newStartStr = null;
    if (index === 0) {
        newStartStr = row.querySelector('.inline-start-input').value;
    }

    if (!newTitle || isNaN(newDuration) || newDuration <= 0) {
        alert('有効なプログラム名と所要時間を入力してください。');
        return;
    }

    if (index === 0 && newStartStr) {
        baseStartTimeStr = newStartStr;
    }

    timetableRaw[index].title = newTitle;
    timetableRaw[index].duration = newDuration;
    timetableRaw[index].alertMin = newAlertMin;
    timetableRaw[index].sound = newSound;

    editTargetIndex = -1;
    markDirty();
    refreshTimetableStructure();
}

function prepareInsertItem(index) {
    editTargetIndex = -1;
    insertTargetIndex = index;
    renderTimetableList();
}

function cancelInlineInsert() {
    insertTargetIndex = -1;
    renderTimetableList();
}

function saveInlineInsert(index) {
    const row = $(`insert-row-${index}`);
    const title = row.querySelector('.inline-insert-title').value.trim();
    const duration = parseInt(row.querySelector('.inline-insert-duration').value, 10);
    let alertMin = parseInt(row.querySelector('.inline-insert-alert').value, 10);
    if (isNaN(alertMin) || alertMin < 0) alertMin = 0;

    if (!title || isNaN(duration) || duration <= 0) {
        alert('プログラム名と所要時間を正しく入力してください。');
        return;
    }

    timetableRaw.splice(index + 1, 0, { duration, title, sound: false, alertMin });

    insertTargetIndex = -1;
    markDirty();
    refreshTimetableStructure();
}

/* =============================================================
   行操作 (削除・並べ替え・音)
============================================================= */
function deleteProgramItem(index) {
    if (editTargetIndex === index) editTargetIndex = -1;
    if (insertTargetIndex === index) insertTargetIndex = -1;

    const removed = timetableRaw[index];
    snapshotForUndo(`「${removed.title}」を削除しました`);

    timetableRaw.splice(index, 1);
    if (progressMode === 'manual' && manualIndex >= index && manualIndex > 0) {
        manualIndex--;
    }
    markDirty();
    refreshTimetableStructure();
}

function clearAllPrograms() {
    if (timetableRaw.length === 0) return;
    if (!confirm('スケジュールの全プログラムを削除しますか？')) return;

    snapshotForUndo('全プログラムを削除しました');
    timetableRaw = [];
    editTargetIndex = -1;
    insertTargetIndex = -1;
    manualIndex = 0;
    manualRemaining = 0;
    manualRunning = false;
    markDirty();
    refreshTimetableStructure();
}

function moveProgramItem(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= timetableRaw.length) return;

    const temp = timetableRaw[index];
    timetableRaw[index] = timetableRaw[newIndex];
    timetableRaw[newIndex] = temp;

    // 編集中の行を移動した場合は追従する
    if (editTargetIndex === index) editTargetIndex = newIndex;

    markDirty();
    refreshTimetableStructure();
}

function handleDrop(targetIndex) {
    if (dragSrcIndex === null || dragSrcIndex === targetIndex) {
        dragSrcIndex = null;
        return;
    }
    const moved = timetableRaw.splice(dragSrcIndex, 1)[0];
    timetableRaw.splice(targetIndex, 0, moved);
    dragSrcIndex = null;
    markDirty();
    refreshTimetableStructure();
}

function clearDragOver() {
    document.querySelectorAll('#timetable-body tr').forEach(r => r.classList.remove('drag-over'));
}

function toggleSoundItem(index) {
    timetableRaw[index].sound = !timetableRaw[index].sound;
    if (timetableParsed[index]) timetableParsed[index].sound = timetableRaw[index].sound;
    markDirty();
    saveAutoBackup();
    renderTimetableList();
}

function toggleAllSounds() {
    if (timetableRaw.length === 0) return;
    const anyOff = timetableRaw.some(item => !item.sound);
    timetableRaw.forEach((item, i) => {
        item.sound = anyOff;
        if (timetableParsed[i]) timetableParsed[i].sound = anyOff;
    });
    markDirty();
    saveAutoBackup();
    renderTimetableList();
    showToast(anyOff ? '全プログラムの音をONにしました' : '全プログラムの音をOFFにしました');
}

/* =============================================================
   テーブル描画
============================================================= */
function renderTimetableList() {
    const tbody = $('timetable-body');
    tbody.innerHTML = '';

    if (timetableParsed.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#555;">スケジュールが登録されていません</td></tr>`;
        return;
    }

    const activeIdx = progressMode === 'manual' ? manualIndex : currentIndex;
    const today = new Date();

    timetableParsed.forEach((item, index) => {
        const row = document.createElement('tr');
        row.id = `row-${index}`;
        if (index === activeIdx) row.className = 'active-row';

        const isSoundOn = item.sound;
        const dateLabel = (item.start.getDate() !== today.getDate())
            ? `<span class="next-day-label">(翌日)</span>` : '';
        const alertMin = timetableRaw[index].alertMin || 0;
        const alertBadge = alertMin > 0 ? `<span class="alert-badge">${icon('alert')}${alertMin}分前</span>` : '';

        if (index === editTargetIndex) {
            row.className = 'edit-row';
            const startInputHTML = index === 0
                ? `<input type="time" class="inline-edit-input inline-start-input" value="${baseStartTimeStr}">`
                : `<span class="auto-label">開始：自動連動</span>`;

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    ${startInputHTML}
                    <div class="edit-duration-wrap">
                        <input type="number" class="inline-edit-input inline-edit-num inline-duration-input" min="1" value="${timetableRaw[index].duration}">分
                    </div>
                </td>
                <td>
                    <input type="text" class="inline-edit-input inline-title-input" value="${escapeHtml(item.title)}">
                    <div class="edit-sub-wrap">
                        ${icon('alert')}警告 <input type="number" class="inline-edit-num inline-alert-edit" min="0" value="${alertMin}">分前
                        <label class="sound-check"><input type="checkbox" class="inline-sound-input" ${isSoundOn ? 'checked' : ''}> ${icon('volume')}音を鳴らす</label>
                    </div>
                </td>
                <td class="ops-cell"><div class="ops-cell-inner">
                    <button class="icon-btn" onclick="moveProgramItem(${index}, -1)" ${index === 0 ? "disabled" : ""} title="上へ移動">${icon('chev-up')}</button>
                    <button class="icon-btn" onclick="moveProgramItem(${index}, 1)" ${index === timetableParsed.length - 1 ? "disabled" : ""} title="下へ移動">${icon('chev-down')}</button>
                    <button class="btn-primary" onclick="saveInlineEdit(${index})">${icon('check')}保存</button>
                    <button onclick="cancelInlineEdit()">${icon('x')}取消</button>
                </div></td>
            `;
        } else {
            const jumpBtn = progressMode === 'manual'
                ? `<button class="icon-btn jump-btn" onclick="manualJumpTo(${index})" title="このプログラムにジャンプ">${icon('play')}</button>` : '';

            row.innerHTML = `
                <td class="drag-handle" title="ドラッグで並べ替え">${icon('grip')}${index + 1}</td>
                <td class="time-range-cell">${dateLabel}${item.startStr} 〜 ${item.endStr}<br><span class="dur-label">(${timetableRaw[index].duration}分)</span></td>
                <td>${escapeHtml(item.title)}${alertBadge}</td>
                <td class="ops-cell"><div class="ops-cell-inner">
                    ${jumpBtn}
                    <button class="icon-btn btn-sound ${isSoundOn ? 'on' : ''}" onclick="toggleSoundItem(${index})" title="${isSoundOn ? '音をミュートする' : '音を鳴らす'}">${icon(isSoundOn ? 'volume' : 'volume-x')}</button>
                    <button class="icon-btn" onclick="editProgramItem(${index})" title="編集">${icon('edit')}</button>
                    <button class="icon-btn" onclick="prepareInsertItem(${index})" title="このプログラムの後ろに挿入">${icon('insert')}</button>
                    <button class="icon-btn danger" onclick="deleteProgramItem(${index})" title="削除">${icon('trash')}</button>
                </div></td>
            `;

            // ドラッグ&ドロップ並べ替え (編集中は無効)
            if (editTargetIndex === -1 && insertTargetIndex === -1 && !isViewOnly) {
                row.draggable = true;
                row.addEventListener('dragstart', (e) => {
                    dragSrcIndex = index;
                    row.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                });
                row.addEventListener('dragend', () => {
                    row.classList.remove('dragging');
                    clearDragOver();
                });
                row.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    row.classList.add('drag-over');
                });
                row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
                row.addEventListener('drop', (e) => {
                    e.preventDefault();
                    clearDragOver();
                    handleDrop(index);
                });
            }
        }
        tbody.appendChild(row);

        if (index === insertTargetIndex) {
            const insertRow = document.createElement('tr');
            insertRow.id = `insert-row-${index}`;
            insertRow.className = 'insert-row';
            insertRow.innerHTML = `
                <td style="text-align:center; color:var(--clock);">${icon('insert')}</td>
                <td>
                    <span class="auto-label">開始：自動連動</span>
                    <div class="edit-duration-wrap">
                        <input type="number" class="inline-edit-input inline-edit-num inline-insert-duration" min="1" placeholder="分" value="15">分
                    </div>
                </td>
                <td>
                    <input type="text" class="inline-edit-input inline-insert-title" placeholder="挿入するプログラム名を入力...">
                    <div class="edit-sub-wrap">
                        ${icon('alert')}警告 <input type="number" class="inline-edit-num inline-insert-alert" min="0" value="0">分前
                    </div>
                </td>
                <td class="ops-cell"><div class="ops-cell-inner">
                    <button class="btn-accent" onclick="saveInlineInsert(${index})">${icon('check')}挿入</button>
                    <button onclick="cancelInlineInsert()">${icon('x')}取消</button>
                </div></td>
            `;
            tbody.appendChild(insertRow);
        }
    });
}

function updateTimetableCellsOnly() {
    if (editTargetIndex !== -1 || insertTargetIndex !== -1) return;

    const now = new Date();
    timetableParsed.forEach((item, index) => {
        const row = $(`row-${index}`);
        if (row) {
            const cell = row.querySelector('.time-range-cell');
            if (cell) {
                const dateLabel = (item.start.getDate() !== now.getDate())
                    ? `<span class="next-day-label">(翌日)</span>` : "";
                cell.innerHTML = `${dateLabel}${item.startStr} 〜 ${item.endStr}<br><span class="dur-label">(${timetableRaw[index].duration}分)</span>`;
            }
        }
    });
    setupNextFormPlaceholder();
}

/* =============================================================
   未保存の変更 / 元に戻す / トースト
============================================================= */
function markDirty() {
    isDirty = true;
    updateDirtyBanner();
}

function clearDirty() {
    isDirty = false;
    updateDirtyBanner();
}

function updateDirtyBanner() {
    const banner = $('dirty-banner');
    if (!isDirty || isViewOnly) {
        banner.style.display = 'none';
        return;
    }
    banner.style.display = 'flex';
    const saved = JSON.parse(localStorage.getItem('saved_timetables') || '{}');
    const btn = $('dirty-save-btn');
    if (currentScheduleName && saved[currentScheduleName]) {
        btn.textContent = `「${currentScheduleName}」に上書き保存`;
    } else {
        btn.textContent = '名前を付けて保存';
    }
}

function quickSave() {
    const saved = JSON.parse(localStorage.getItem('saved_timetables') || '{}');
    if (currentScheduleName && saved[currentScheduleName]) {
        saved[currentScheduleName] = {
            baseStartTimeStr: baseStartTimeStr,
            timetableRaw: timetableRaw
        };
        localStorage.setItem('saved_timetables', JSON.stringify(saved));
        clearDirty();
        showToast(`「${currentScheduleName}」に上書き保存しました`);
    } else {
        $('save-name').focus();
        showToast('保存名を入力して「保存」ボタンを押してください');
    }
}

function snapshotForUndo(message) {
    undoSnapshot = {
        base: baseStartTimeStr,
        raw: JSON.parse(JSON.stringify(timetableRaw)),
        name: currentScheduleName,
        dirty: isDirty
    };
    showToast(message, '元に戻す', () => {
        if (!undoSnapshot) return;
        baseStartTimeStr = undoSnapshot.base;
        timetableRaw = undoSnapshot.raw;
        currentScheduleName = undoSnapshot.name;
        isDirty = undoSnapshot.dirty;
        undoSnapshot = null;
        editTargetIndex = -1;
        insertTargetIndex = -1;
        updateDirtyBanner();
        refreshTimetableStructure();
        hideToast();
    });
}

function showToast(message, actionLabel = null, actionFn = null, duration = 8000) {
    const toast = $('toast');
    $('toast-msg').textContent = message;
    const actionBtn = $('toast-action');
    if (actionLabel && actionFn) {
        actionBtn.textContent = actionLabel;
        actionBtn.style.display = '';
        actionBtn.onclick = actionFn;
    } else {
        actionBtn.style.display = 'none';
        actionBtn.onclick = null;
    }
    toast.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, duration);
}

function hideToast() {
    $('toast').classList.remove('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = null;
}

/* =============================================================
   保存 / 読込 (localStorage)
============================================================= */
function saveTimetableToStorage() {
    const nameInput = $('save-name');
    const name = nameInput.value.trim();
    if (!name) {
        alert('保存名（テンプレート名）を入力してください。');
        return;
    }

    let savedData = JSON.parse(localStorage.getItem('saved_timetables') || '{}');
    savedData[name] = {
        baseStartTimeStr: baseStartTimeStr,
        timetableRaw: timetableRaw
    };
    localStorage.setItem('saved_timetables', JSON.stringify(savedData));

    currentScheduleName = name;
    localStorage.setItem('timetable_current_name', name);

    nameInput.value = '';
    clearDirty();
    updateLoadSelectOptions();
    updateDisplayOnly();
    showToast(`「${name}」として保存しました`);
}

function loadTimetableFromStorage() {
    const select = $('load-select');
    const name = select.value;
    if (!name) {
        alert('読み込むスケジュールを選択してください。');
        return;
    }

    if (isDirty && !confirm('未保存の変更があります。破棄して読み込みますか？')) {
        return;
    }

    let savedData = JSON.parse(localStorage.getItem('saved_timetables') || '{}');
    if (savedData[name]) {
        baseStartTimeStr = savedData[name].baseStartTimeStr || "08:00";
        timetableRaw = (savedData[name].timetableRaw || []).map(item => {
            if (item.alertMin === undefined) item.alertMin = 0;
            return item;
        });

        currentScheduleName = name;
        localStorage.setItem('timetable_current_name', name);

        editTargetIndex = -1;
        insertTargetIndex = -1;
        clearDirty();

        rebuildParsed();
        if (progressMode === 'manual') {
            manualLoadIndex(0);
            manualRunning = false;
        } else {
            startClockSync();
        }
        saveAutoBackup();
        renderTimetableList();
        updateDisplayOnly();
        showToast(`「${name}」を読み込みました`);
    }
}

function deleteTimetableFromStorage() {
    const select = $('load-select');
    const name = select.value;
    if (!name) {
        alert('削除するスケジュールを選択してください。');
        return;
    }

    if (confirm(`本当に「${name}」の保存データを削除しますか？`)) {
        let savedData = JSON.parse(localStorage.getItem('saved_timetables') || '{}');
        delete savedData[name];
        localStorage.setItem('saved_timetables', JSON.stringify(savedData));
        updateLoadSelectOptions();
        select.value = "";

        const currentName = localStorage.getItem('timetable_current_name');
        if (currentName === name) {
            currentScheduleName = '未選択';
            localStorage.removeItem('timetable_current_name');
            updateDisplayOnly();
        }
    }
}

function updateLoadSelectOptions() {
    const select = $('load-select');
    select.innerHTML = '<option value="">-- 選択してください --</option>';

    let savedData = JSON.parse(localStorage.getItem('saved_timetables') || '{}');
    Object.keys(savedData).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

function saveAutoBackup() {
    const backup = {
        baseStartTimeStr: baseStartTimeStr,
        timetableRaw: timetableRaw
    };
    localStorage.setItem('timetable_autobackup', JSON.stringify(backup));
}

/* =============================================================
   モーダル / 共有 / JSON入出力
============================================================= */
function openShareModal() {
    $('share-modal').classList.add('active');
    generateQrCode();
}

function closeShareModal() {
    $('share-modal').classList.remove('active');
}

// 日本語テキストを安全に Base64 エンコード
function utf8ToBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode('0x' + p1)));
}

function base64ToUtf8(str) {
    return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
}

function getShareUrl(viewerMode = false) {
    const shareData = {
        name: currentScheduleName,
        baseStartTimeStr: baseStartTimeStr,
        timetableRaw: timetableRaw
    };
    const jsonStr = JSON.stringify(shareData);
    const encodedData = utf8ToBase64(jsonStr);
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('data', encodedData);
    if (viewerMode) url.searchParams.set('view', '1');
    return url.toString();
}

function copyShareUrl() {
    navigator.clipboard.writeText(getShareUrl()).then(() => {
        showToast('共有用URLをクリップボードにコピーしました');
    }).catch(err => {
        alert('コピーに失敗しました: ' + err);
    });
}

function copyViewerUrl() {
    navigator.clipboard.writeText(getShareUrl(true)).then(() => {
        showToast('閲覧専用URLをコピーしました (開くと表示専用の全画面になります)');
    }).catch(err => {
        alert('コピーに失敗しました: ' + err);
    });
}

function generateQrCode() {
    const url = getShareUrl();
    const qrBox = $('qrcode-box');
    qrBox.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
        qrCodeObj = new QRCode(qrBox, {
            text: url,
            width: 160,
            height: 160,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M
        });
    }
}

function exportToJsonFile() {
    const savedData = JSON.parse(localStorage.getItem('saved_timetables') || '{}');
    const exportObj = {
        saved_timetables: savedData,
        current: {
            name: currentScheduleName,
            baseStartTimeStr: baseStartTimeStr,
            timetableRaw: timetableRaw
        }
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `timetable_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importFromJsonFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.saved_timetables) {
                let savedData = JSON.parse(localStorage.getItem('saved_timetables') || '{}');
                Object.assign(savedData, imported.saved_timetables);
                localStorage.setItem('saved_timetables', JSON.stringify(savedData));
                updateLoadSelectOptions();
            }
            if (imported.current) {
                baseStartTimeStr = imported.current.baseStartTimeStr || "08:00";
                timetableRaw = imported.current.timetableRaw || [];
                currentScheduleName = imported.current.name || "復元データ";
                clearDirty();
                rebuildParsed();
                if (progressMode === 'manual') {
                    manualLoadIndex(0);
                    manualRunning = false;
                } else {
                    startClockSync();
                }
                saveAutoBackup();
                renderTimetableList();
                updateDisplayOnly();
            }
            showToast('データを正常に読み込みました');
            closeShareModal();
        } catch (err) {
            alert('JSONファイルの読み込みに失敗しました。形式を確認してください。');
        }
    };
    reader.readAsText(file);
}

function checkUrlShareParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    if (dataParam) {
        try {
            const jsonStr = base64ToUtf8(dataParam);
            const shareData = JSON.parse(jsonStr);

            if (shareData && shareData.timetableRaw) {
                baseStartTimeStr = shareData.baseStartTimeStr || "08:00";
                timetableRaw = shareData.timetableRaw;
                const name = shareData.name || "URL共有データ";
                currentScheduleName = name;

                // 保存済みデータにも自動追加
                let savedData = JSON.parse(localStorage.getItem('saved_timetables') || '{}');
                savedData[name] = {
                    baseStartTimeStr: baseStartTimeStr,
                    timetableRaw: timetableRaw
                };
                localStorage.setItem('saved_timetables', JSON.stringify(savedData));

                // アドレスバーのパラメータを綺麗に消去
                window.history.replaceState({}, document.title, window.location.pathname);
                return true;
            }
        } catch (e) {
            console.error("共有URLのロード失敗:", e);
        }
    }
    return false;
}

/* =============================================================
   初期化
============================================================= */
function initLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    isViewOnly = urlParams.get('view') === '1';

    let savedData = JSON.parse(localStorage.getItem('saved_timetables') || '{}');
    Object.keys(defaultPresetTimetables).forEach(key => {
        if (!savedData[key]) {
            savedData[key] = defaultPresetTimetables[key];
        }
    });
    localStorage.setItem('saved_timetables', JSON.stringify(savedData));

    updateLoadSelectOptions();

    // 1. URL共有パラメータを優先チェック
    const loadedFromUrl = checkUrlShareParams();

    if (!loadedFromUrl) {
        // 2. 自動バックアップをチェック
        const checkBackup = localStorage.getItem('timetable_autobackup');
        let hasValidBackup = false;

        if (checkBackup) {
            try {
                const parsedBackup = JSON.parse(checkBackup);
                if (parsedBackup.timetableRaw && parsedBackup.timetableRaw.length > 0) {
                    baseStartTimeStr = parsedBackup.baseStartTimeStr || "08:00";
                    timetableRaw = parsedBackup.timetableRaw.map(item => {
                        if (item.alertMin === undefined) item.alertMin = 0;
                        return item;
                    });
                    hasValidBackup = true;
                }
            } catch (e) {
                hasValidBackup = false;
            }
        }

        if (!hasValidBackup || timetableRaw.length === 0) {
            baseStartTimeStr = defaultSampleData.baseStartTimeStr;
            timetableRaw = JSON.parse(JSON.stringify(defaultSampleData.timetableRaw));
            currentScheduleName = '6時間｜清掃なし (初期プリセット)';
        } else {
            const savedCurrentName = localStorage.getItem('timetable_current_name');
            currentScheduleName = savedCurrentName || '自動バックアップから復元';
        }
    }

    // 進行モードの復元 (閲覧専用は常に時刻同期)
    const savedMode = localStorage.getItem('timer_progress_mode');
    if (!isViewOnly && savedMode === 'manual') {
        progressMode = 'manual';
    }

    if (isViewOnly) {
        document.body.classList.add('view-only');
    }

    rebuildParsed();

    if (progressMode === 'manual') {
        autoSelectCurrentIndex();
        manualLoadIndex(currentIndex >= 0 ? currentIndex : 0);
        manualRunning = false;
    } else {
        startClockSync();
    }

    if (isViewOnly) {
        const timerArea = $('timer-area');
        timerArea.classList.add('ios-fullscreen');
        document.querySelector('.fullscreen-btn').innerHTML = `${icon('minimize')}<span>閉じる</span>`;
        resetMouseTimer();
    }

    renderTimetableList();
    updateDisplayOnly();
}

initLoad();
setInterval(tick, 1000);
