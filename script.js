/**
 * ATHERION - SELF-DEVELOPMENT RANK-UP APP
 * Phase A: Task Management + Dynamic Points System
 * Version: 2.0 (Dynamic +150 points per rank)
 * ALL-IN-ONE VERSION (No external imports)
 */

let tasks = [];
let userPoints = 0;
let userPremiumAds = 0;
let isPremium = false;
let streakDays = 0;
let lastLoginDate = new Date().toDateString();

const RANKS = ['E', 'EE', 'EEE', 'D', 'DD', 'DDD', 'C', 'CC', 'CCC', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA', 'S', 'SS', 'SSS'];
const RANK_COLORS = {
    'E': '#808080', 'EE': '#A9A9A9', 'EEE': '#C0C0C0',
    'D': '#4169E1', 'DD': '#6495ED', 'DDD': '#87CEEB',
    'C': '#32CD32', 'CC': '#90EE90', 'CCC': '#ADFFAD',
    'B': '#FFD700', 'BB': '#FFA500', 'BBB': '#FF8C00',
    'A': '#FF1493', 'AA': '#FF69B4', 'AAA': '#FFB6C1',
    'S': '#9370DB', 'SS': '#BA55D3', 'SSS': '#FF00FF'
};

function getPointsPerLevel(rankIndex) {
    return 1000 + (rankIndex * 150);
}

function getPointsPerRank(rankIndex) {
    return getPointsPerLevel(rankIndex) * 10;
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
    if (rankIndex >= RANKS.length) {
        rankIndex = RANKS.length - 1;
        levelInRank = 9;
    } else {
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
    return {
        rank: RANKS[rankIndex],
        rankIndex: rankIndex,
        level: levelInRank + 1,
        totalLevel: rankIndex * 10 + levelInRank + 1,
        totalPoints: totalPoints,
        pointsInCurrentRank: inRank,
        pointsNeededForNextLevel: Math.max(0, nextLevel),
        pointsPerLevelRequired: perLevel,
        progressInLevelPercent: Math.max(0, Math.min(100, progLevel)),
        progressInRankPercent: Math.max(0, Math.min(100, progRank)),
        color: RANK_COLORS[RANKS[rankIndex]]
    };
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 ATHERION App Loading...');
    loadFromLocalStorage();
    renderTasks();
    updateUserDisplay();
    setupEventListeners();
    checkMidnightPenalty();
    console.log('✅ ATHERION Ready! Points:', userPoints);
});

function setupEventListeners() {
    const addBtn = document.getElementById('add-task-btn');
    if (addBtn) addBtn.addEventListener('click', addTask);
    const confirmBtn = document.getElementById('confirm-add-task');
    if (confirmBtn) confirmBtn.addEventListener('click', addTask);
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
    const premiumBtn = document.getElementById('claim-premium');
    if (premiumBtn) premiumBtn.addEventListener('click', claimPremiumReward);
}

function addTask() {
    const name = document.getElementById('new-task-name')?.value.trim();
    const priority = document.getElementById('priority-select')?.value || 'medium';
    const category = document.getElementById('category-select')?.value || 'learning';
    if (!name) { showNotification('Task name needed!', 'error'); return; }
    const pointMap = { 'high': 100, 'medium': 50, 'low': 30 };
    tasks.push({
        id: Date.now(),
        name: name,
        priority: priority,
        category: category,
        completed: false,
        points: pointMap[priority] || 50
    });
    document.getElementById('new-task-name').value = '';
    renderTasks();
    updateUserDisplay();
    saveToLocalStorage();
    showNotification(`✅ Task added: ${name}`, 'success');
}

function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const oldStats = calculateRankAndLevel(userPoints);
    task.completed = !task.completed;
    userPoints += task.completed ? task.points : -task.points;
    userPoints = Math.max(0, userPoints);
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
    if (newName && newName.trim()) {
        task.name = newName.trim();
        renderTasks();
        saveToLocalStorage();
        showNotification('Task updated', 'success');
    }
}

function renderTasks() {
    const category = document.querySelector('[data-category].active')?.dataset.category || 'all';
    let filtered = category === 'all' ? tasks : tasks.filter(t => t.category === category);
    const list = document.getElementById('task-list');
    if (!list) return;
    if (filtered.length === 0) {
        list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">No tasks. Create one! 🚀</p>';
        return;
    }
    list.innerHTML = filtered.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}" style="opacity: ${task.completed ? 0.6 : 1};display:flex;align-items:center;padding:10px;border:1px solid #333;margin:5px 0;border-radius:5px;">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})" />
            <span style="flex:1;margin-left:10px;">${task.name}</span>
            <span style="color:#9370DB;">+${task.points}pts</span>
            <button onclick="editTask(${task.id})" style="padding:5px 10px;margin:0 5px;background:#333;color:#fff;border:none;border-radius:3px;cursor:pointer;">✏️</button>
            <button onclick="deleteTask(${task.id})" style="padding:5px 10px;background:#333;color:#fff;border:none;border-radius:3px;cursor:pointer;">🗑️</button>
        </div>
    `).join('');
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
    const badge = document.getElementById('rank-badge');
    if (badge) { badge.textContent = stats.rank; badge.style.backgroundColor = stats.color; }
    const adCounter = document.getElementById('ad-counter');
    if (adCounter) adCounter.textContent = `${userPremiumAds}/10`;
    const premiumStatus = document.getElementById('premium-status');
    if (premiumStatus) { premiumStatus.textContent = isPremium ? '👑 PREMIUM' : 'Free'; premiumStatus.style.color = isPremium ? '#FFD700' : '#999'; }
}

function triggerRankUpAnimation(oldRank, newRank) {
    const notification = document.createElement('div');
    notification.innerHTML = `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#1a1a2e;border:2px solid ${RANK_COLORS[newRank]};padding:30px;border-radius:10px;z-index:10000;text-align:center;color:white;"><h2>🎉 RANK UP! 🎉</h2><p style="margin:10px 0;"><span style="color:${RANK_COLORS[oldRank]}">${oldRank}</span> → <span style="color:${RANK_COLORS[newRank]}">${newRank}</span></p></div>`;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

function watchAd() {
    if (isPremium) { showNotification('You already have premium! 👑', 'info'); return; }
    userPremiumAds++;
    if (userPremiumAds >= 10) { isPremium = true; userPremiumAds = 0; showNotification('🎉 Premium unlocked! +50% rewards!', 'success'); }
    updateUserDisplay();
    saveToLocalStorage();
}

function claimPremiumReward() {
    if (!isPremium) { showNotification('Watch 10 ads for premium!', 'warning'); return; }
    const bonus = 750;
    const oldStats = calculateRankAndLevel(userPoints);
    userPoints += bonus;
    const newStats = calculateRankAndLevel(userPoints);
    if (newStats.rank !== oldStats.rank) triggerRankUpAnimation(oldStats.rank, newStats.rank);
    showNotification(`💎 +${formatNumber(bonus)} points!`, 'success');
    updateUserDisplay();
    saveToLocalStorage();
}

function checkMidnightPenalty() {
    const today = new Date().toDateString();
    if (lastLoginDate !== today) { applyMidnightPenalty(); lastLoginDate = today; }
}

function applyMidnightPenalty() {
    const uncompleted = tasks.filter(t => !t.completed).length;
    const penalty = uncompleted * 100;
    if (uncompleted === 0) { showNotification('✅ Perfect day! No penalties!', 'success'); streakDays++; return; }
    userPoints = Math.max(0, userPoints - penalty);
    tasks.forEach(t => t.completed = false);
    streakDays = 0;
    showNotification(`⚠️ Penalty: -${formatNumber(penalty)} pts`, 'warning');
    updateUserDisplay();
    renderTasks();
    saveToLocalStorage();
}

function saveToLocalStorage() {
    const data = { tasks, userPoints, userPremiumAds, isPremium, streakDays, lastLoginDate, lastUpdated: new Date().toISOString(), systemVersion: 2 };
    try { localStorage.setItem('atherionAppData', JSON.stringify(data)); console.log('✅ ATHERION saved'); } catch (error) { console.error('Error:', error); }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('atherionAppData');
        if (!saved) { console.log('No ATHERION data'); return; }
        const data = JSON.parse(saved);
        tasks = data.tasks || [];
        userPoints = data.userPoints || 0;
        userPremiumAds = data.userPremiumAds || 0;
        isPremium = data.isPremium || false;
        streakDays = data.streakDays || 0;
        lastLoginDate = data.lastLoginDate || new Date().toDateString();
        console.log('✅ ATHERION loaded');
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
    testRanks: () => { [0, 10000, 100000, 200000, 409500].forEach(p => { const s = calculateRankAndLevel(p); console.log(`${formatNumber(p)} → ${s.rank} L${s.level}`); }); }
};

console.log('🎮 ATHERION Ready!');
