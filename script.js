/**
 * ATHERION - COMPLETE WORKING VERSION
 * All functions included - buttons work - midnight reset works - ads work
 */

let tasks = [];
let userPoints = 0;
let userAdWatched = 0;
let premiumType = 'free';
let premiumExpiresAt = null;
let streakDays = 0;
let lastLoginDate = localStorage.getItem('atherionLastLogin');
let lastInterstitialTime = Date.now();
const INTERSTITIAL_INTERVAL = 20 * 60 * 1000;

const RANKS = ['E', 'EE', 'EEE', 'D', 'DD', 'DDD', 'C', 'CC', 'CCC', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA', 'S', 'SS', 'SSS'];

const RANK_COLORS = {
    'E': '#808080', 'EE': '#A9A9A9', 'EEE': '#C0C0C0',
    'D': '#4169E1', 'DD': '#6495ED', 'DDD': '#87CEEB',
    'C': '#32CD32', 'CC': '#90EE90', 'CCC': '#ADFFAD',
    'B': '#FFD700', 'BB': '#FFA500', 'BBB': '#FF8C00',
    'A': '#FF1493', 'AA': '#FF69B4', 'AAA': '#FFB6C1',
    'S': '#A855F7', 'SS': '#9333EA', 'SSS': '#7E22CE'
};

const AI_QUERY_LIMITS = { 'free': 5, 'ad-premium': 8, 'paid-premium': 20 };

function getPointsPerLevel(rankIndex) { return 1000 + (rankIndex * 150); }
function getPointsPerRank(rankIndex) { return getPointsPerLevel(rankIndex) * 10; }
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

function calculateRankAndLevel(totalPoints) {
    let rankIndex = 0, levelInRank = 0, pointsUsedSoFar = 0;
    for (let i = 0; i < RANKS.length; i++) {
        const pointsNeeded = getPointsPerRank(i);
        if (pointsUsedSoFar + pointsNeeded <= totalPoints) {
            pointsUsedSoFar += pointsNeeded;
            rankIndex++;
        } else break;
    }
    if (rankIndex >= RANKS.length) { rankIndex = RANKS.length - 1; levelInRank = 9; }
    else {
        const remaining = totalPoints - pointsUsedSoFar;
        const perLevel = getPointsPerLevel(rankIndex);
        levelInRank = Math.min(Math.floor(remaining / perLevel), 9);
    }
    const perLevel = getPointsPerLevel(rankIndex);
    const inRank = totalPoints - pointsUsedSoFar;
    const usedInLevel = inRank % perLevel;
    const nextLevel = perLevel - usedInLevel;
    const progLevel = (usedInLevel / perLevel) * 100;
    const pointsInRank = levelInRank * perLevel + usedInLevel;
    const progRank = (pointsInRank / (perLevel * 10)) * 100;
    return { rank: RANKS[rankIndex], rankIndex, level: levelInRank + 1, totalLevel: rankIndex * 10 + levelInRank + 1, totalPoints, pointsInCurrentRank: inRank, pointsNeededForNextLevel: Math.max(0, nextLevel), pointsPerLevelRequired: perLevel, progressInLevelPercent: Math.max(0, Math.min(100, progLevel)), progressInRankPercent: Math.max(0, Math.min(100, progRank)), color: RANK_COLORS[RANKS[rankIndex]] };
}

function isPremiumActive() {
    if (premiumType === 'paid-premium') return true;
    if (premiumType === 'ad-premium' && premiumExpiresAt) {
        const now = new Date();
        if (new Date(premiumExpiresAt) > now) return true;
        premiumType = 'free';
        premiumExpiresAt = null;
        saveToLocalStorage();
        showNotification('⏰ Ad Premium Expired!', 'warning');
        renderBannerAds();
        return false;
    }
    return false;
}

function shouldShowInterstitial() {
    if (premiumType !== 'free') return false;
    return Date.now() - lastInterstitialTime > INTERSTITIAL_INTERVAL;
}

function showInterstitialAd() {
    if (premiumType !== 'free') return;
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;`;
    overlay.innerHTML = `<div style="background:#A855F7;padding:30px;border-radius:15px;text-align:center;color:white;max-width:300px;"><h2>📢 ADVERTISEMENT</h2><p style="margin:15px 0;">Watch ads to support ATHERION</p><button onclick="this.closest('div').parentElement.remove();updateLastInterstitialTime();" style="padding:10px 20px;background:#06B6D4;border:none;color:white;border-radius:8px;cursor:pointer;font-weight:700;">Close Ad</button></div>`;
    document.body.appendChild(overlay);
    lastInterstitialTime = Date.now();
}

function updateLastInterstitialTime() { lastInterstitialTime = Date.now(); }

function renderBannerAds() {
    const bannerContainer = document.getElementById('banner-ad-top');
    const bannerBottom = document.getElementById('banner-ad-bottom');
    if (premiumType === 'free') {
        const bannerHTML = `<div style="background:rgba(168,85,247,0.15);border:2px solid #FBBF24;padding:16px;border-radius:8px;text-align:center;margin-bottom:15px;min-height:60px;display:flex;flex-direction:column;justify-content:center;"><small style="color:#FBBF24;font-weight:700;font-size:1.1em;">📢 ADVERTISEMENT</small><p style="color:#A855F7;margin:8px 0;font-size:0.95em;font-weight:600;">Watch 10 ads to unlock 7-day Premium!</p></div>`;
        if (bannerContainer) bannerContainer.innerHTML = bannerHTML;
        if (bannerBottom) bannerBottom.innerHTML = bannerHTML;
        return;
    }
    if (premiumType === 'ad-premium') {
        const bannerHTML = `<div style="background:rgba(168,85,247,0.12);border:1px solid #FBBF24;padding:8px 12px;border-radius:6px;text-align:center;margin-bottom:10px;min-height:30px;display:flex;align-items:center;justify-content:center;"><small style="color:#FBBF24;font-weight:600;font-size:0.8em;">📢 AD SPACE</small></div>`;
        if (bannerContainer) bannerContainer.innerHTML = bannerHTML;
        if (bannerBottom) bannerBottom.innerHTML = bannerHTML;
        return;
    }
    if (premiumType === 'paid-premium') {
        if (bannerContainer) bannerContainer.innerHTML = '';
        if (bannerBottom) bannerBottom.innerHTML = '';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadFromLocalStorage();
    checkMidnightPenalty();
    renderTasks();
    updateUserDisplay();
    renderBannerAds();
    showInterstitialAd();
    setupEventListeners();
});

function setupEventListeners() {
    const addBtn = document.getElementById('add-task-btn');
    if (addBtn) addBtn.addEventListener('click', addTask);
    const input = document.getElementById('new-task-name');
    if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });
    document.querySelectorAll('[data-category]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-category]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderTasks();
        });
    });
    const watchBtn = document.getElementById('watch-ad-btn');
    if (watchBtn) watchBtn.addEventListener('click', watchAd);
    const buyBtn = document.getElementById('buy-premium-btn');
    if (buyBtn) buyBtn.addEventListener('click', buyPremium);
}

function addTask() {
    const name = document.getElementById('new-task-name')?.value.trim();
    const priority = document.getElementById('priority-select')?.value || 'medium';
    const category = document.getElementById('category-select')?.value || 'learning';
    if (!name) { showNotification('Task name needed!', 'error'); return; }
    const pointMap = { 'high': 100, 'medium': 50, 'low': 30 };
    tasks.push({ id: Date.now(), name, priority, category, completed: false, points: pointMap[priority] || 50 });
    document.getElementById('new-task-name').value = '';
    renderTasks();
    updateUserDisplay();
    saveToLocalStorage();
    showNotification(`✅ Task added: ${name}`, 'success');
}

function toggleTask(taskId) {
    if (shouldShowInterstitial()) showInterstitialAd();
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const oldStats = calculateRankAndLevel(userPoints);
    task.completed = !task.completed;
    if (task.completed) { userPoints += task.points; }
    else { userPoints -= task.points; userPoints = Math.max(0, userPoints); }
    const newStats = calculateRankAndLevel(userPoints);
    if (newStats.rank !== oldStats.rank) triggerRankUpAnimation(oldStats.rank, newStats.rank);
    renderTasks();
    updateUserDisplay();
    saveToLocalStorage();
}

function deleteTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (task.completed) userPoints = Math.max(0, userPoints - task.points);
    tasks = tasks.filter(t => t.id !== taskId);
    renderTasks();
    updateUserDisplay();
    saveToLocalStorage();
    showNotification('Task deleted', 'info');
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newName = prompt('Edit task name:', task.name);
    if (newName && newName.trim()) { task.name = newName.trim(); renderTasks(); saveToLocalStorage(); showNotification('Task updated', 'success'); }
}

function renderTasks() {
    const category = document.querySelector('[data-category].active')?.dataset.category || 'all';
    let filtered = category === 'all' ? tasks : tasks.filter(t => t.category === category);
    const list = document.getElementById('task-list');
    if (!list) return;
    if (filtered.length === 0) { list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No tasks. Create one! 🚀</p>'; return; }
    list.innerHTML = filtered.map(task => `<div class="task-item ${task.completed ? 'completed' : ''}" style="opacity:${task.completed ? 0.6 : 1};display:flex;align-items:center;padding:10px;border:1px solid #333;margin:5px 0;border-radius:5px;"><input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})" /><span style="flex:1;margin-left:10px;">${task.name}</span><span style="color:#A855F7;">+${task.points}pts</span><button onclick="editTask(${task.id})" style="padding:5px 10px;margin:0 5px;background:#333;color:#fff;border:none;border-radius:3px;cursor:pointer;">✏️</button><button onclick="deleteTask(${task.id})" style="padding:5px 10px;background:#333;color:#fff;border:none;border-radius:3px;cursor:pointer;">🗑️</button></div>`).join('');
}

function updateUserDisplay() {
    const stats = calculateRankAndLevel(userPoints);
    const rankDisplay = document.getElementById('rank-display');
    if (rankDisplay) { rankDisplay.textContent = `${stats.rank} - Level ${stats.level}`; rankDisplay.style.color = stats.color; }
    const levelEl = document.getElementById('total-level');
    if (levelEl) levelEl.textContent = `Total Level: ${stats.totalLevel}/180`;
    const pointsEl = document.getElementById('points-display');
    if (pointsEl) pointsEl.textContent = `${formatNumber(stats.totalPoints)} points`;
    const levelBar = document.getElementById('level-progress-bar');
    if (levelBar) levelBar.style.width = stats.progressInLevelPercent + '%';
    const rankBar = document.getElementById('rank-progress-bar');
    if (rankBar) rankBar.style.width = stats.progressInRankPercent + '%';
    const nextLevel = document.getElementById('next-level-cost');
    if (nextLevel) nextLevel.textContent = `Next Level: ${formatNumber(stats.pointsNeededForNextLevel)} pts`;
    const premiumStatus = document.getElementById('premium-status');
    if (premiumStatus) {
        if (premiumType === 'paid-premium') { premiumStatus.textContent = '👑 PREMIUM'; premiumStatus.style.color = '#FBBF24'; }
        else if (premiumType === 'ad-premium') {
            const expiresDate = new Date(premiumExpiresAt);
            const daysLeft = Math.ceil((expiresDate - new Date()) / (1000 * 60 * 60 * 24));
            premiumStatus.textContent = `⏰ PREMIUM (${daysLeft}d)`;
            premiumStatus.style.color = '#FBBF24';
        } else { premiumStatus.textContent = 'Free'; premiumStatus.style.color = '#999'; }
    }
    const adCounter = document.getElementById('ad-counter');
    if (adCounter) adCounter.textContent = `${userAdWatched}/10`;
    const queryLimit = document.getElementById('ai-query-limit');
    if (queryLimit) queryLimit.textContent = `AI: 0/${AI_QUERY_LIMITS[premiumType]}`;
}

function triggerRankUpAnimation(oldRank, newRank) {
    const notification = document.createElement('div');
    notification.innerHTML = `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a2e;border:2px solid #A855F7;padding:30px;border-radius:10px;z-index:10000;text-align:center;color:white;"><h2>🎉 RANK UP! 🎉</h2><p style="margin:10px 0;"><span style="color:#06B6D4">${oldRank}</span> → <span style="color:#A855F7">${newRank}</span></p></div>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function watchAd() {
    if (isPremiumActive()) { showNotification('You already have Premium!', 'info'); return; }
    userAdWatched++;
    showNotification(`✅ Ad watched! (${userAdWatched}/10)`, 'success');
    if (userAdWatched >= 10) {
        premiumType = 'ad-premium';
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        premiumExpiresAt = expiresAt.toISOString();
        userAdWatched = 0;
        showNotification('🎉 7-day Premium Unlocked!', 'success');
        renderBannerAds();
    }
    updateUserDisplay();
    saveToLocalStorage();
}

function buyPremium() {
    showNotification('💳 Paid Premium Coming Soon!', 'info');
}

function checkMidnightPenalty() {
    const today = new Date().toDateString();
    console.log('📅 Today:', today);
    console.log('📅 Last Login:', lastLoginDate);
    if (!lastLoginDate || lastLoginDate !== today) {
        console.log('🌙 MIDNIGHT DETECTED!');
        applyMidnightPenalty();
    }
    lastLoginDate = today;
    localStorage.setItem('atherionLastLogin', today);
}

function applyMidnightPenalty() {
    const uncompleted = tasks.filter(t => !t.completed).length;
    const penalty = uncompleted * 100;
    console.log('⚠️ Uncompleted:', uncompleted);
    if (uncompleted === 0) {
        showNotification('✅ Perfect day! No penalties!', 'success');
        streakDays++;
        saveToLocalStorage();
        return;
    }
    userPoints = Math.max(0, userPoints - penalty);
    tasks.forEach(t => t.completed = false);
    streakDays = 0;
    showNotification(`⚠️ Penalty: -${formatNumber(penalty)} pts`, 'warning');
    console.log('💥 Penalty applied!');
    updateUserDisplay();
    renderTasks();
    saveToLocalStorage();
}

function saveToLocalStorage() {
    const data = { tasks, userPoints, userAdWatched, premiumType, premiumExpiresAt, streakDays, lastUpdated: new Date().toISOString(), systemVersion: 5 };
    try { localStorage.setItem('atherionAppData', JSON.stringify(data)); console.log('✅ Saved'); }
    catch (error) { console.error('Error:', error); }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('atherionAppData');
        if (!saved) { console.log('❌ No data'); lastLoginDate = new Date().toDateString(); localStorage.setItem('atherionLastLogin', lastLoginDate); return; }
        const data = JSON.parse(saved);
        tasks = data.tasks || [];
        userPoints = data.userPoints || 0;
        userAdWatched = data.userAdWatched || 0;
        premiumType = data.premiumType || 'free';
        premiumExpiresAt = data.premiumExpiresAt || null;
        streakDays = data.streakDays || 0;
        console.log('✅ Loaded');
    } catch (error) { console.error('Error:', error); }
}

function showNotification(message, type = 'info') {
    const colors = { 'success': '#4CAF50', 'error': '#f44336', 'warning': '#ff9800', 'info': '#2196F3' };
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:20px;right:20px;padding:15px 20px;background:${colors[type]};color:white;border-radius:5px;z-index:10000;`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

window.atherionDebug = {
    addPoints: (amount) => { userPoints += amount; updateUserDisplay(); saveToLocalStorage(); },
    testMidnightPenalty: () => { localStorage.setItem('atherionLastLogin', 'OLD_DATE'); location.reload(); },
    forceReset: () => { tasks.forEach(t => t.completed = false); renderTasks(); saveToLocalStorage(); }
};

console.log('🎮 ATHERION Ready!');
