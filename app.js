// Audio Context Setup
let audioCtx;
let audioBuffer;
let sourceNode;
let gainNode;
let currentSegmentIndex = 0;
let segments = [];
let bookmarks = [];
let isPlaying = false;
let startTime = 0;
let pausedAt = 0;
let playbackRate = 1.0;
let autoReplay = false;
let pixelsPerSecond = 80;
let activeProjectId = null;
let cachedWaveformData = null;
let draggingMarkerIdx = -1;

// DOM Elements
const audioUpload = document.getElementById('audio-upload');
const uploadSection = document.getElementById('upload-section');
const playerSection = document.getElementById('player-section');
const playBtn = document.getElementById('play-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const prevBookmarkBtn = document.getElementById('prev-bookmark-btn');
const nextBookmarkBtn = document.getElementById('next-bookmark-btn');
const toggleBookmarkBtn = document.getElementById('toggle-bookmark-btn');
const volumeControl = document.getElementById('volume-control');
const volumeVal = document.getElementById('volume-val');
const speedControl = document.getElementById('speed-control');
const speedVal = document.getElementById('speed-val');
const zoomControl = document.getElementById('zoom-control');
const zoomVal = document.getElementById('zoom-val');
const autoReplayToggle = document.getElementById('auto-replay');
const allowBookmarkCheck = document.getElementById('allow-bookmark');
const allowSegmentCheck = document.getElementById('allow-segment');
const allowDeleteCheck = document.getElementById('allow-delete');
const segmentList = document.getElementById('segment-list');
const canvas = document.getElementById('waveform-canvas');
const ctx = canvas.getContext('2d');
const changeFileBtn = document.getElementById('change-file-btn');
const waveformContainer = document.getElementById('waveform-container');
const autoDetectBtn = document.getElementById('auto-detect-btn');
const clearAllBtn = document.getElementById('clear-all-btn');
const recentLessonsSection = document.getElementById('recent-lessons-section');
const recentLessonsList = document.getElementById('recent-lessons-list');
const homeBtn = document.getElementById('home-btn');
const projectNameDisplay = document.getElementById('project-name-display');
const shortcutsBtn = document.getElementById('shortcuts-btn');
const shortcutsModal = document.getElementById('shortcuts-modal');
const closeShortcuts = document.getElementById('close-shortcuts');
const shortcutsList = document.getElementById('shortcuts-list');
const resetShortcutsBtn = document.getElementById('reset-shortcuts');

// --- Shortcut Settings ---
const defaultShortcuts = {
    'togglePlay': { key: 'Space', label: 'Phát / Tạm dừng' },
    'prevSegment': { key: 'ArrowLeft', label: 'Đoạn trước' },
    'nextSegment': { key: 'ArrowRight', label: 'Đoạn tiếp theo' },
    'prevBookmark': { key: 'BracketLeft', label: 'Điểm dấu trước' },
    'nextBookmark': { key: 'BracketRight', label: 'Điểm dấu tiếp' },
    'toggleBookmark': { key: 'KeyB', label: 'Thêm/Bỏ ghim tại chỗ' },
    'toggleReplay': { key: 'KeyR', label: 'Tự động lặp lại' },
    'addSegment': { key: 'Enter', label: 'Thêm điểm cắt' }
};

let userShortcuts = JSON.parse(localStorage.getItem('echoDict_shortcuts')) || JSON.parse(JSON.stringify(defaultShortcuts));
let listeningForKey = null;

function renderShortcuts() {
    shortcutsList.innerHTML = '';
    Object.keys(userShortcuts).forEach(action => {
        const item = userShortcuts[action];
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 0.6rem; background: rgba(255,255,255,0.03); border-radius: 0.5rem; border: 1px solid rgba(255,255,255,0.05);';
        
        row.innerHTML = `
            <span style="font-size: 0.9rem; color: var(--text-secondary);">${item.label}</span>
            <button class="shortcut-key-btn" data-action="${action}" style="min-width: 80px; padding: 0.4rem 0.6rem; background: ${listeningForKey === action ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'}; border: 1px solid ${listeningForKey === action ? '#fff' : 'rgba(255,255,255,0.2)'}; border-radius: 0.4rem; color: ${listeningForKey === action ? '#000' : '#fff'}; font-family: monospace; font-weight: bold; cursor: pointer; transition: all 0.2s;">
                ${listeningForKey === action ? '...' : formatKeyCode(item.key)}
            </button>
        `;
        
        row.querySelector('button').onclick = () => {
            listeningForKey = action;
            renderShortcuts();
        };
        
        shortcutsList.appendChild(row);
    });
}

function formatKeyCode(code) {
    if (code === 'Space') return 'Space';
    return code.replace('Key', '').replace('Digit', '').replace('BracketLeft', '[').replace('BracketRight', ']').replace('Arrow', '');
}

shortcutsBtn.onclick = () => { shortcutsModal.classList.remove('hidden'); renderShortcuts(); };
closeShortcuts.onclick = () => { shortcutsModal.classList.add('hidden'); listeningForKey = null; };
shortcutsModal.onclick = (e) => { if (e.target === shortcutsModal) closeShortcuts.onclick(); };

resetShortcutsBtn.onclick = () => {
    userShortcuts = JSON.parse(JSON.stringify(defaultShortcuts));
    localStorage.setItem('echoDict_shortcuts', JSON.stringify(userShortcuts));
    renderShortcuts();
};

window.addEventListener('keydown', (e) => {
    // 1. Xu ly ghi phím moi neu dang nghe
    if (listeningForKey) {
        e.preventDefault();
        userShortcuts[listeningForKey].key = e.code;
        localStorage.setItem('echoDict_shortcuts', JSON.stringify(userShortcuts));
        listeningForKey = null;
        renderShortcuts();
        return;
    }

    // 2. Thuc thi phím tat neu khong phai dang go text
    if (playerSection.classList.contains('hidden') || e.target.tagName === 'INPUT' || e.target.contentEditable === "true") return;

    const action = Object.keys(userShortcuts).find(k => userShortcuts[k].key === e.code);
    if (!action) return;

    e.preventDefault();
    switch(action) {
        case 'togglePlay': togglePlay(); break;
        case 'prevSegment': navigateSegment(-1); break;
        case 'nextSegment': navigateSegment(1); break;
        case 'prevBookmark': navigateBookmark(-1); break;
        case 'nextBookmark': navigateBookmark(1); break;
        case 'toggleBookmark': {
            const currentTime = isPlaying ? (audioCtx.currentTime - startTime) * playbackRate + pausedAt : pausedAt;
            toggleBookmark(currentTime);
            saveState();
            break;
        }
        case 'toggleReplay': autoReplayToggle.click(); break;
        case 'addSegment': {
            const currentTime = isPlaying ? (audioCtx.currentTime - startTime) * playbackRate + pausedAt : pausedAt;
            addManualMarker(currentTime);
            saveState();
            break;
        }
    }
});
const dbName = "EchoDictDB_v2";
const storeName = "Projects";

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "id" });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

async function saveState(fileBlob = null, fileName = "") {
    if (!activeProjectId && !fileBlob) return;
    const db = await initDB();
    const transaction = db.transaction(storeName, "readwrite");
    const store = transaction.objectStore(storeName);
    let project;
    if (fileBlob) {
        activeProjectId = "proj_" + Date.now();
        project = {
            id: activeProjectId,
            name: fileName || "Bài học mới",
            file: fileBlob,
            segments: segments,
            bookmarks: bookmarks,
            zoom: pixelsPerSecond,
            lastModified: Date.now()
        };
    } else {
        const request = store.get(activeProjectId);
        project = await new Promise(r => { request.onsuccess = () => r(request.result); });
        if (!project) return;
        project.segments = segments;
        project.bookmarks = bookmarks;
        project.zoom = pixelsPerSecond;
        project.lastModified = Date.now();
    }
    await store.put(project);
    if (project.name) {
        projectNameDisplay.innerText = project.name;
        projectNameDisplay.style.display = 'inline-block';
        localStorage.setItem('echoDict_activeProjectId', activeProjectId);
    }
}

async function loadRecentLessons() {
    const db = await initDB();
    const store = db.transaction(storeName, "readonly").objectStore(storeName);
    const projects = await new Promise(r => { 
        const req = store.getAll(); req.onsuccess = () => r(req.result); 
    });
    
    if (projects && projects.length > 0) {
        recentLessonsSection.classList.remove('hidden');
        recentLessonsList.innerHTML = '';
        projects.sort((a, b) => b.lastModified - a.lastModified);
        
        projects.forEach(proj => {
            const item = document.createElement('div');
            item.className = 'glass project-item';
            item.style.padding = '0.8rem 1rem';
            item.style.borderRadius = '0.8rem';
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.border = '1px solid var(--glass-border)';
            item.style.transition = 'all 0.3s ease';
            
            const contentId = `name-${proj.id}`;
            const btnId = `edit-btn-${proj.id}`;
            
            item.innerHTML = `
                <div style="flex: 1; padding-right: 1rem;" class="project-info" data-id="${proj.id}">
                    <div id="${contentId}" class="project-name" style="font-weight: 600; color: var(--text-primary); outline: none; border-radius: 4px; padding: 2px 4px; cursor: pointer;">${proj.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); pointer-events: none;">
                        ${proj.segments.length} đoạn • ${new Date(proj.lastModified).toLocaleDateString()}
                    </div>
                </div>
                <div style="display: flex; gap: 0.8rem;">
                    <button id="${btnId}" class="btn-icon edit" onclick="event.stopPropagation(); handleEditClick('${proj.id}')" title="Đổi tên">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" onclick="event.stopPropagation(); deleteProject('${proj.id}')" title="Xóa">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            const infoArea = item.querySelector('.project-info');
            infoArea.onclick = () => {
                const nameEl = document.getElementById(contentId);
                if (nameEl.contentEditable !== "true") {
                    loadProject(proj.id);
                }
            };

            item.onmouseover = () => item.style.borderColor = 'var(--accent-color)';
            item.onmouseout = () => item.style.borderColor = 'var(--glass-border)';
            recentLessonsList.appendChild(item);
        });
    } else { recentLessonsSection.classList.add('hidden'); }
}

async function handleEditClick(id) {
    const nameEl = document.getElementById(`name-${id}`);
    if (nameEl.contentEditable === "true") finishInlineEdit(id);
    else startInlineEdit(id);
}

async function startInlineEdit(id) {
    const nameEl = document.getElementById(`name-${id}`);
    const btnEl = document.getElementById(`edit-btn-${id}`);
    if (!nameEl || !btnEl) return;
    const originalName = nameEl.innerText;
    nameEl.contentEditable = "true";
    nameEl.style.background = "rgba(56, 189, 248, 0.15)";
    nameEl.style.border = "1px solid var(--accent-color)";
    nameEl.focus();
    btnEl.innerHTML = '<i class="fas fa-check"></i>';
    btnEl.style.color = '#4ade80';
    const range = document.createRange();
    range.selectNodeContents(nameEl);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    nameEl.onkeydown = (e) => {
        if (e.key === "Enter") { e.preventDefault(); finishInlineEdit(id); }
        if (e.key === "Escape") { e.preventDefault(); cancelInlineEdit(id, originalName); }
    };
    nameEl.onblur = () => setTimeout(() => finishInlineEdit(id), 200);
}

async function finishInlineEdit(id) {
    const nameEl = document.getElementById(`name-${id}`);
    const btnEl = document.getElementById(`edit-btn-${id}`);
    if (!nameEl || nameEl.contentEditable !== "true") return;
    const newName = nameEl.innerText.trim();
    nameEl.contentEditable = "false";
    nameEl.style.background = "none";
    nameEl.style.border = "none";
    btnEl.innerHTML = '<i class="fas fa-edit"></i>';
    btnEl.style.color = "";
    if (newName !== "") {
        const db = await initDB();
        const store = db.transaction(storeName, "readwrite").objectStore(storeName);
        const proj = await new Promise(r => { const req = store.get(id); req.onsuccess = () => r(req.result); });
        if (proj && proj.name !== newName) {
            proj.name = newName;
            await store.put(proj);
            if (activeProjectId === id) projectNameDisplay.innerText = newName;
        }
    } else loadRecentLessons();
}

async function cancelInlineEdit(id, originalName) {
    const nameEl = document.getElementById(`name-${id}`);
    const btnEl = document.getElementById(`edit-btn-${id}`);
    if (!nameEl) return;
    nameEl.innerText = originalName;
    nameEl.contentEditable = "false";
    nameEl.style.background = "none";
    nameEl.style.border = "none";
    btnEl.innerHTML = '<i class="fas fa-edit"></i>';
    btnEl.style.color = "";
}

async function loadProject(id) {
    const db = await initDB();
    const store = db.transaction(storeName, "readonly").objectStore(storeName);
    const proj = await new Promise(r => { const req = store.get(id); req.onsuccess = () => r(req.result); });
    if (proj) {
        activeProjectId = proj.id;
        localStorage.setItem('echoDict_activeProjectId', id);
        projectNameDisplay.innerText = proj.name;
        projectNameDisplay.style.display = 'inline-block';
        segments = proj.segments;
        bookmarks = proj.bookmarks;
        pixelsPerSecond = proj.zoom || 80;
        zoomControl.value = pixelsPerSecond;
        zoomVal.innerText = `${pixelsPerSecond}px/s`;
        await handleFile(proj.file, false);
        resizeCanvas();
        renderSegmentList();
        drawWaveform();
    }
}

async function deleteProject(id) {
    if (confirm('Bạn có chắc muốn xóa bài học này?')) {
        const db = await initDB();
        await db.transaction(storeName, "readwrite").objectStore(storeName).delete(id);
        loadRecentLessons();
    }
}

// Events
audioUpload.addEventListener('change', (e) => handleFileUpload(e));
playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', () => navigateSegment(-1));
nextBtn.addEventListener('click', () => navigateSegment(1));
prevBookmarkBtn.addEventListener('click', () => navigateBookmark(-1));
nextBookmarkBtn.addEventListener('click', () => navigateBookmark(1));
volumeControl.addEventListener('input', updateVolume);
speedControl.addEventListener('input', updateSpeed);
zoomControl.addEventListener('input', updateZoom);

homeBtn.addEventListener('click', () => {
    if (isPlaying) pause();
    activeProjectId = null;
    localStorage.removeItem('echoDict_activeProjectId');
    projectNameDisplay.style.display = 'none';
    playerSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    homeBtn.classList.add('hidden');
    loadRecentLessons();
});

autoReplayToggle.addEventListener('change', (e) => { 
    autoReplay = e.target.checked; 
    localStorage.setItem('echoDict_autoReplay', autoReplay);
});

changeFileBtn.addEventListener('click', () => {
    activeProjectId = null;
    location.reload();
});

autoDetectBtn.addEventListener('click', () => {
    if (!audioBuffer) return;
    detectSegments();
    renderSegmentList();
    drawWaveform();
    saveState();
});

clearAllBtn.addEventListener('click', () => {
    if (!audioBuffer) return;
    segments = [{ start: 0, end: audioBuffer.duration }];
    bookmarks = [];
    currentSegmentIndex = 0;
    renderSegmentList();
    drawWaveform();
    saveState();
});

waveformContainer.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -5 : 5;
        pixelsPerSecond = Math.max(20, Math.min(150, pixelsPerSecond + delta));
        zoomControl.value = pixelsPerSecond;
        zoomVal.innerText = `${pixelsPerSecond}px/s`;
        resizeCanvas();
        saveState();
    }
}, { passive: false });

// --- Initialization & Persistence ---
window.addEventListener('DOMContentLoaded', async () => {
    // 1. Load basic settings
    const savedVolume = localStorage.getItem('echoDict_volume') || 1;
    const savedSpeed = localStorage.getItem('echoDict_speed') || 1;
    const savedAutoReplay = localStorage.getItem('echoDict_autoReplay') === 'true';
    const lastActiveId = localStorage.getItem('echoDict_activeProjectId');

    // 2. Load Mouse Interaction settings
    const savedBookmarkCheck = localStorage.getItem('echoDict_allowBookmark') === 'true';
    const savedSegmentCheck = localStorage.getItem('echoDict_allowSegment') === 'true';
    const savedDeleteCheck = localStorage.getItem('echoDict_allowDelete') === 'true';

    // Apply basic settings
    volumeControl.value = savedVolume;
    volumeVal.innerText = `${Math.round(savedVolume * 100)}%`;
    speedControl.value = savedSpeed;
    playbackRate = parseFloat(savedSpeed);
    speedVal.innerText = `${playbackRate.toFixed(1)}x`;
    autoReplayToggle.checked = savedAutoReplay;
    autoReplay = savedAutoReplay;
    zoomControl.value = 80;
    zoomVal.innerText = "80px/s";

    // Apply Interaction settings
    allowBookmarkCheck.checked = savedBookmarkCheck;
    allowSegmentCheck.checked = savedSegmentCheck;
    allowDeleteCheck.checked = savedDeleteCheck;

    await loadRecentLessons();
    if (lastActiveId) loadProject(lastActiveId);
});

// Save interaction settings on change
allowBookmarkCheck.addEventListener('change', (e) => localStorage.setItem('echoDict_allowBookmark', e.target.checked));
allowSegmentCheck.addEventListener('change', (e) => localStorage.setItem('echoDict_allowSegment', e.target.checked));
allowDeleteCheck.addEventListener('change', (e) => localStorage.setItem('echoDict_allowDelete', e.target.checked));

canvas.addEventListener('mousedown', (e) => {
    if (!audioBuffer || playerSection.classList.contains('hidden')) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const scrollLeft = waveformContainer.scrollLeft;
    const time = (x + scrollLeft) / pixelsPerSecond;
    const threshold = 15 / pixelsPerSecond;
    const idx = segments.findIndex((s, i) => i > 0 && Math.abs(s.start - time) < threshold);
    if (idx !== -1) {
        draggingMarkerIdx = idx;
        canvas.style.cursor = 'col-resize';
        e.preventDefault();
    }
});

window.addEventListener('mousemove', (e) => {
    if (playerSection.classList.contains('hidden')) return;
    const rect = canvas.getBoundingClientRect();
    const isInCanvas = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (draggingMarkerIdx === -1) {
        if (isInCanvas && audioBuffer) {
            const x = e.clientX - rect.left;
            const scrollLeft = waveformContainer.scrollLeft;
            const time = (x + scrollLeft) / pixelsPerSecond;
            const threshold = 10 / pixelsPerSecond;
            const isNear = segments.some((s, i) => i > 0 && Math.abs(s.start - time) < threshold);
            canvas.style.cursor = isNear ? 'col-resize' : 'crosshair';
        }
        return;
    }
    const scrollLeft = waveformContainer.scrollLeft;
    const x = Math.max(0, Math.min(canvas.width, e.clientX - rect.left + scrollLeft));
    const time = x / pixelsPerSecond;
    segments[draggingMarkerIdx].start = time;
    recalculateSegments();
    drawWaveform();
});

window.addEventListener('mouseup', () => {
    if (draggingMarkerIdx !== -1) {
        draggingMarkerIdx = -1;
        canvas.style.cursor = 'crosshair';
        renderSegmentList();
        saveState();
    }
});

canvas.addEventListener('click', (e) => {
    if (!audioBuffer || draggingMarkerIdx !== -1) return; 
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const scrollLeft = waveformContainer.scrollLeft;
    const time = (x + scrollLeft) / pixelsPerSecond;
    
    if (e.shiftKey || (allowSegmentCheck && allowSegmentCheck.checked)) {
        addManualMarker(time);
        saveState();
    } else if (allowBookmarkCheck && allowBookmarkCheck.checked) {
        toggleBookmark(time);
        saveState();
    } else {
        seekTo(time);
    }
});

function seekTo(time) {
    const wasPlaying = isPlaying;
    if (isPlaying) pause();
    pausedAt = Math.max(0, Math.min(time, audioBuffer.duration));
    const newIdx = segments.findIndex(s => pausedAt >= s.start && pausedAt < (s.end || audioBuffer.duration));
    if (newIdx !== -1) currentSegmentIndex = newIdx;
    
    scrollToTime(pausedAt);
    renderSegmentList();
    drawWaveform();
    if (wasPlaying) play();
}

function scrollToTime(time) {
    if (!waveformContainer || !audioBuffer) return;
    
    const targetX = time * pixelsPerSecond;
    
    // Luôn cập nhật chiều rộng thực tế dựa trên thời lượng âm thanh
    const totalWidth = Math.max(waveformContainer.clientWidth, audioBuffer.duration * pixelsPerSecond);
    const canvasWidth = Math.ceil(totalWidth);
    
    if (canvas.width !== canvasWidth) {
        canvas.width = canvasWidth;
        canvas.style.width = canvasWidth + 'px';
        canvas.style.minWidth = canvasWidth + 'px';
        canvas.style.maxWidth = 'none';
        cachedWaveformData = null;
        precalculateWaveform();
    }
    
    const newScrollLeft = Math.max(0, targetX - waveformContainer.clientWidth / 2);
    
    // Thực hiện cuộn ngay lập tức
    waveformContainer.scrollLeft = newScrollLeft;
    
    // Thử lại sau một vài khoảng thời gian ngắn để "cưỡng bức" trình duyệt phải cập nhật 
    // kể cả khi đang ở trạng thái dừng (không có loop vẽ liên tục)
    [50, 150].forEach(delay => {
        setTimeout(() => {
            waveformContainer.scrollLeft = newScrollLeft;
            drawWaveform();
        }, delay);
    });
}


canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!audioBuffer || !allowDeleteCheck.checked) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const scrollLeft = waveformContainer.scrollLeft;
    const time = (x + scrollLeft) / pixelsPerSecond;
    removeClosestMarkerOrBookmark(time);
    saveState();
});

// Core Logic Functions

function precalculateWaveform() {
    if (!audioBuffer) return;
    const width = canvas.width;
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    cachedWaveformData = new Float32Array(width * 2);
    for (let i = 0; i < width; i++) {
        let min = 1.0; let max = -1.0;
        const startIndex = Math.floor(i * step);
        for (let j = 0; j < step; j++) {
            const index = startIndex + j;
            if (index >= data.length) break;
            const datum = data[index];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        cachedWaveformData[i * 2] = min;
        cachedWaveformData[i * 2 + 1] = max;
    }
}

function drawWaveform() {
    if (!audioBuffer) return;
    if (!cachedWaveformData) precalculateWaveform();
    const width = canvas.width;
    const height = canvas.height;
    const scrollLeft = waveformContainer.scrollLeft;
    const visibleWidth = waveformContainer.clientWidth;
    const amp = height / 2;

    ctx.clearRect(0, 0, width, height);
    
    // Ve nen toi
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const startPixel = Math.max(0, Math.floor(scrollLeft) - 50);
    const endPixel = Math.min(width, Math.ceil(scrollLeft + visibleWidth) + 50);

    // Ve song am Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#38bdf8');
    gradient.addColorStop(0.5, '#818cf8');
    gradient.addColorStop(1, '#38bdf8');
    
    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 1;
    for (let i = startPixel; i < endPixel; i++) {
        const min = cachedWaveformData[i * 2];
        const max = cachedWaveformData[i * 2 + 1];
        ctx.moveTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();

    // Ve Bookmarks
    bookmarks.forEach(time => {
        const x = time * pixelsPerSecond;
        if (x < startPixel || x > endPixel) return;
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(x - 1, 0, 3, height);
        ctx.beginPath();
        ctx.moveTo(x - 6, 0); ctx.lineTo(x + 6, 0); ctx.lineTo(x + 6, 15); ctx.lineTo(x, 10); ctx.lineTo(x - 6, 15);
        ctx.fill();
    });

    // Ve Segments
    segments.forEach((seg, idx) => {
        const xStart = seg.start * pixelsPerSecond;
        const xEnd = (seg.end || audioBuffer.duration) * pixelsPerSecond;
        
        // To highlight cho doan dang active
        if (idx === currentSegmentIndex) {
            ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
            ctx.fillRect(xStart, 0, xEnd - xStart, height);
            ctx.fillStyle = 'var(--accent-color)';
            ctx.fillRect(xStart, 0, xEnd - xStart, 3); // Thanh ngang o tren
        }

        if (idx === 0) return;
        if (xStart < startPixel || xStart > endPixel) return;
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(xStart - 1, 0, 2, height);
        ctx.font = '10px Inter';
        ctx.fillText(idx + 1, xStart + 5, 12);
    });

    // Ve Playhead
    const currentTime = isPlaying ? (audioCtx.currentTime - startTime) * playbackRate + pausedAt : pausedAt;
    const playheadX = currentTime * pixelsPerSecond;
    ctx.shadowBlur = 10; ctx.shadowColor = '#38bdf8';
    ctx.fillStyle = '#fff';
    ctx.fillRect(playheadX - 1, 0, 2, height);
    ctx.shadowBlur = 0;

    if (isPlaying) requestAnimationFrame(drawWaveform);
}

function navigateBookmark(direction) {
    if (!audioBuffer || bookmarks.length === 0) return;
    const currentTime = isPlaying ? (audioCtx.currentTime - startTime) * playbackRate + pausedAt : pausedAt;
    const sorted = [...bookmarks].sort((a, b) => a - b);
    let targetTime = -1;
    if (direction === 1) targetTime = sorted.find(t => t > currentTime + 0.2);
    else {
        const prevs = sorted.filter(t => t < currentTime - 0.2);
        if (prevs.length > 0) targetTime = prevs[prevs.length - 1];
    }
    if (targetTime !== -1) {
        const wasPlaying = isPlaying;
        if (isPlaying) pause();
        pausedAt = targetTime;
        
        const newIdx = segments.findIndex(s => targetTime >= s.start && targetTime < (s.end || audioBuffer.duration));
        if (newIdx !== -1) currentSegmentIndex = newIdx;
        
        renderSegmentList();
        
        // Su dung ham cuon tap trung de dam bao hieu luc
        scrollToTime(targetTime);
        
        if (wasPlaying) play();
    }
}

function renderSegmentList() {
    segmentList.innerHTML = '';
    if (segments.length <= 1) return;
    segments.forEach((seg, index) => {
        const div = document.createElement('div');
        div.className = `segment-item ${index === currentSegmentIndex ? 'active' : ''}`;
        div.innerText = `Đoạn ${index + 1} (${formatTime(seg.start)})`;
        div.onclick = () => jumpToSegment(index);
        segmentList.appendChild(div);
    });

    // Cuon thanh ngang toi doan dang active (thử lại nhiều lần để đảm bảo nhảy đúng chỗ khi dừng)
    const performListScroll = () => {
        const activeItem = segmentList.querySelector('.segment-item.active');
        if (activeItem) {
            activeItem.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        }
    };

    [50, 150, 300].forEach(delay => setTimeout(performListScroll, delay));
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function togglePlay() { isPlaying ? pause() : play(); }

function play() {
    if (isPlaying) return;
    sourceNode = audioCtx.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.playbackRate.value = playbackRate;
    gainNode = audioCtx.createGain();
    gainNode.gain.value = volumeControl.value;
    sourceNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    sourceNode.start(0, pausedAt);
    startTime = audioCtx.currentTime;
    isPlaying = true;
    playBtn.innerHTML = '<i class="fas fa-pause"></i> <span>Tạm dừng</span>';
    sourceNode.onended = () => {
        if (!isPlaying) return;
        const elapsed = (audioCtx.currentTime - startTime) * playbackRate + pausedAt;
        if (elapsed >= (segments[currentSegmentIndex].end || audioBuffer.duration) - 0.1) {
            if (autoReplay) jumpToSegment(currentSegmentIndex);
            else if (currentSegmentIndex < segments.length - 1) navigateSegment(1);
            else { pause(); pausedAt = 0; }
        }
    };
    requestAnimationFrame(checkSegmentProgress);
    requestAnimationFrame(drawWaveform);
}

function pause() {
    if (!isPlaying) return;
    pausedAt += (audioCtx.currentTime - startTime) * playbackRate;
    if (sourceNode) sourceNode.stop();
    sourceNode = null;
    isPlaying = false;
    playBtn.innerHTML = '<i class="fas fa-play"></i> <span>Phát</span>';
}

function checkSegmentProgress() {
    if (!isPlaying) return;
    const currentTime = (audioCtx.currentTime - startTime) * playbackRate + pausedAt;
    const end = segments[currentSegmentIndex].end || audioBuffer.duration;
    if (currentTime >= end - 0.05) {
        if (autoReplay) jumpToSegment(currentSegmentIndex);
        else if (currentSegmentIndex < segments.length - 1) {
            currentSegmentIndex++;
            scrollToTime(segments[currentSegmentIndex].start);
            renderSegmentList();
            drawWaveform();
        }
    }
    requestAnimationFrame(checkSegmentProgress);
}

function jumpToSegment(index) {
    const wasPlaying = isPlaying;
    if (isPlaying) pause();
    currentSegmentIndex = index;
    pausedAt = segments[currentSegmentIndex].start;
    
    // Tu dong cuon toi doan moi
    scrollToTime(pausedAt);
    
    renderSegmentList();
    drawWaveform();
    if (wasPlaying) play();
}

function navigateSegment(direction) {
    const newIndex = currentSegmentIndex + direction;
    if (newIndex >= 0 && newIndex < segments.length) jumpToSegment(newIndex);
}

function updateVolume() {
    const val = volumeControl.value;
    volumeVal.innerText = `${Math.round(val * 100)}%`;
    localStorage.setItem('echoDict_volume', val);
    if (gainNode) gainNode.gain.value = val;
}

function updateSpeed() {
    playbackRate = parseFloat(speedControl.value);
    speedVal.innerText = `${playbackRate.toFixed(1)}x`;
    localStorage.setItem('echoDict_speed', playbackRate);
    if (sourceNode) sourceNode.playbackRate.value = playbackRate;
}

function updateZoom() {
    pixelsPerSecond = parseFloat(zoomControl.value);
    zoomVal.innerText = `${pixelsPerSecond}px/s`;
    cachedWaveformData = null;
    resizeCanvas();
    saveState();
}

function resizeCanvas() {
    if (!audioBuffer) { 
        canvas.width = waveformContainer.clientWidth; 
        canvas.style.width = '100%';
        canvas.height = 160; 
        return; 
    }
    
    // Giới hạn an toàn 60k pixel để tránh lỗi bộ nhớ trình duyệt (gây trắng màn hình)
    let targetWidth = Math.min(60000, audioBuffer.duration * pixelsPerSecond);
    const canvasWidth = Math.ceil(Math.max(waveformContainer.clientWidth, targetWidth));
    
    canvas.width = canvasWidth;
    canvas.style.width = canvasWidth + 'px';
    canvas.style.minWidth = canvasWidth + 'px';
    canvas.style.maxWidth = 'none';
    
    cachedWaveformData = null;
    drawWaveform();
}

async function handleFileUpload(e) { 
    const file = e.target.files[0];
    if (file) { activeProjectId = null; handleFile(file, true); }
}

async function handleFile(file, isNew = true) {
    if (!file) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    uploadSection.classList.add('hidden');
    playerSection.classList.remove('hidden');
    homeBtn.classList.remove('hidden');
    try {
        const arrayBuffer = await file.arrayBuffer();
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        if (isNew) {
            segments = [{ start: 0, end: audioBuffer.duration }];
            bookmarks = [];
            await saveState(file, file.name);
        }
        setTimeout(() => { resizeCanvas(); drawWaveform(); renderSegmentList(); }, 50);
    } catch (err) { console.error(err); alert('Lỗi khi đọc file âm thanh.'); }
}

function toggleBookmark(time) {
    const threshold = 0.2;
    const existingIdx = bookmarks.findIndex(b => Math.abs(b - time) < threshold);
    if (existingIdx !== -1) bookmarks.splice(existingIdx, 1);
    else bookmarks.push(time);
    drawWaveform();
}

function removeClosestMarkerOrBookmark(time) {
    const threshold = 0.5;
    const bIdx = bookmarks.findIndex(b => Math.abs(b - time) < threshold);
    if (bIdx !== -1) bookmarks.splice(bIdx, 1);
    if (segments.length > 1) {
        let closestIdx = -1; let minDiff = threshold;
        segments.forEach((s, i) => {
            if (i === 0) return;
            const diff = Math.abs(s.start - time);
            if (diff < minDiff) { minDiff = diff; closestIdx = i; }
        });
        if (closestIdx !== -1) segments.splice(closestIdx, 1);
    }
    recalculateSegments();
    renderSegmentList();
    drawWaveform();
}

function recalculateSegments() {
    segments.sort((a, b) => a.start - b.start);
    for (let i = 0; i < segments.length; i++) {
        segments[i].end = (i < segments.length - 1) ? segments[i+1].start : audioBuffer.duration;
    }
}

function detectSegments() {
    const rawData = audioBuffer.getChannelData(0); 
    const sampleRate = audioBuffer.sampleRate;
    const fftSize = 1024;
    const threshold = 0.015;
    const minSilenceDuration = 0.4; 
    const minSegmentDuration = 0.5; 
    segments = [{ start: 0, end: 0 }];
    let isSilence = false;
    let silenceStart = 0;
    for (let i = 0; i < rawData.length; i += fftSize) {
        let sum = 0; let count = 0;
        for (let j = 0; j < fftSize && (i + j) < rawData.length; j++) {
            sum += rawData[i + j] * rawData[i + j];
            count++;
        }
        const rms = Math.sqrt(sum / count);
        const time = i / sampleRate;
        if (rms < threshold) {
            if (!isSilence) { isSilence = true; silenceStart = time; }
        } else {
            if (isSilence) {
                const silenceDuration = time - silenceStart;
                if (silenceDuration > minSilenceDuration) {
                    const segmentEnd = silenceStart + (silenceDuration / 2);
                    if (segmentEnd - segments[segments.length-1].start > minSegmentDuration) {
                        segments.push({ start: segmentEnd, end: 0 });
                    }
                }
                isSilence = false;
            }
        }
    }
    recalculateSegments();
}

toggleBookmarkBtn.onclick = () => {
    const currentTime = isPlaying ? (audioCtx.currentTime - startTime) * playbackRate + pausedAt : pausedAt;
    toggleBookmark(currentTime);
    saveState();
};
