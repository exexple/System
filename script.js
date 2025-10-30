// ==================== NEXUS: ISEKAI SYSTEM - PHASE A (FINAL) ====================
// Self-Development App with Gamification & Anti-Cheat System
// Version: Phase A Final - All features with 10 ads, no stacking
// Updated: October 30, 2025

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAle5y1wcHMMyDxu-ppPkMfM5hFQNKahOQ",
  authDomain: "routine-planner-daf33.firebaseapp.com",
  databaseURL: "https://routine-planner-daf33-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "routine-planner-daf33",
  storageBucket: "routine-planner-daf33.firebasestorage.app",
  messagingSenderId: "62028696155",
  appId: "1:62028696155:web:5e6b1896e0f60eacb40d7e"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const RANKS = ['E', 'EE', 'EEE', 'D', 'DD', 'DDD', 'C', 'CC', 'CCC', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA', 'S', 'SS', 'SSS'];

const PRIORITY_POINTS = {
    high: 100,
    medium: 50,
    low: 30
};

const PRIORITY_PENALTIES = {
    high: 50,
    medium: 25,
    low: 15
};

const REWARD_AD_CONFIG = {
    adsRequired: 10,
    premiumDays: 7,
    allowStacking: false
};

let appData = {
    totalPoints: 0,
    tasks: [],
    currentRank: 0,
    rankUpChallenge: null,
    unlockedRanks: [0],
    premiumStatus: 'free',
    premiumExpiry: null,
    adsWatched: 0,
    subscriptionId: null,
    lastAdDate: null,
    cumulativeUsageTime: 0,
    usageSessionStart: null,
    lastUsageAdTime: 0,
    aiQueriesUsedToday: 0,
    lastAiResetDate: null
};

let currentCategory = 1;

let USER_ID = localStorage.getItem('nexus_user_id');
if (!USER_ID) {
    USER_ID = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('nexus_user_id', USER_ID);
}

function startUsageTracking() {
    appData.usageSessionStart = Date.now();
    checkDailyFirstOpenAd();
    setInterval(() => {
        if (appData.usageSessionStart) {
            updateUsageTime();
        }
    }, 60000);
    window.addEventListener('beforeunload', () => {
        updateUsageTime();
        saveData();
    });
}

function updateUsageTime() {
    if (!appData.usageSessionStart) return;
    const now = Date.now();
    const sessionMinutes = (now - appData.usageSessionStart) / (1000 * 60);
    appData.cumulativeUsageTime += sessionMinutes;
    appData.usageSessionStart = now;
    const timeSinceLastAd = appData.cumulativeUsageTime - appData.lastUsageAdTime;
    if (timeSinceLastAd >= 30 && appData.premiumStatus === 'free') {
        showUsageBasedAd();
        appData.lastUsageAdTime = appData.cumulativeUsageTime;
    }
    saveData();
}

function checkDailyFirstOpenAd() {
    const today = new Date().toDateString();
    if (appData.lastAdDate !== today && appData.premiumStatus === 'free') {
        setTimeout(() => {
            showDailyAd();
            appData.lastAdDate = today;
            saveData();
        }, 1000);
    }
}

function showDailyAd() {
    console.log('📢 Daily First-Open Ad');
    alert('🎬 Daily Ad

(AdMob integration in Phase C)');
}

function showUsageBasedAd() {
    console.log('📢 30-Minute Usage Ad');
    alert('🎬 30-Min Usage Ad

(AdMob integration in Phase C)');
}

function checkPremiumStatus() {
    if (appData.premiumStatus === 'ad-premium' && appData.premiumExpiry) {
        if (Date.now() > appData.premiumExpiry) {
            appData.premiumStatus = 'free';
            appData.premiumExpiry = null;
            alert('⏰ Your ad-earned premium has expired!');
            saveData();
            updateDisplay();
        }
    }
}

function watchRewardAd() {
    if (appData.premiumStatus === 'ad-premium' || appData.premiumStatus === 'paid') {
        const daysLeft = Math.ceil((appData.premiumExpiry - Date.now()) / (24 * 60 * 60 * 1000));
        alert(`⚠️ Premium Already Active!

You have ${daysLeft} day(s) remaining.

You can watch ads again after premium expires.`);
        return;
    }
    console.log('🎁 Reward ad shown');
    const config = REWARD_AD_CONFIG;
    appData.adsWatched++;
    if (appData.adsWatched >= config.adsRequired) {
        grantAdPremium(config.premiumDays);
        appData.adsWatched = 0;
    } else {
        alert(`🎁 Reward Ad Watched!

Progress: ${appData.adsWatched}/${config.adsRequired} ads

Watch ${config.adsRequired - appData.adsWatched} more ads for ${config.premiumDays} days premium!`);
    }
    saveData();
    updateDisplay();
}

function grantAdPremium(days) {
    appData.premiumExpiry = Date.now() + (days * 24 * 60 * 60 * 1000);
    appData.premiumStatus = 'ad-premium';
    alert(`🎉 PREMIUM UNLOCKED!

You now have ${days} days of premium!

✅ Advanced plans
✅ 8 AI queries/day
✅ No interstitial ads`);
    saveData();
    updateDisplay();
}

function getAIQueryLimit() {
    if (appData.premiumStatus === 'paid') return Infinity;
    if (appData.premiumStatus === 'ad-premium') return 8;
    return 5;
}

function checkAIQueryLimit() {
    const today = new Date().toDateString();
    if (appData.lastAiResetDate !== today) {
        appData.aiQueriesUsedToday = 0;
        appData.lastAiResetDate = today;
        saveData();
    }
    const limit = getAIQueryLimit();
    if (appData.aiQueriesUsedToday >= limit) {
        const upgradeMsg = appData.premiumStatus === 'free' ? 'Watch reward ads or upgrade to premium!' : 'Upgrade to paid premium for unlimited!';
        alert(`🤖 AI Query Limit!

Used: ${appData.aiQueriesUsedToday}/${limit === Infinity ? '∞' : limit}

${upgradeMsg}`);
        return false;
    }
    appData.aiQueriesUsedToday++;
    saveData();
    return true;
}

function resetDailyTasks() {
    const today = new Date().toDateString();
    const lastResetDate = localStorage.getItem('lastResetDate');
    if (lastResetDate !== today) {
        applyMidnightPenalties();
        appData.tasks.forEach(task => {
            if (task.isDone) {
                task.isDone = false;
                task.doneTimestamp = null;
            }
            task.createdAt = Date.now();
            task.lastPenaltyDate = null;
        });
        appData.cumulativeUsageTime = 0;
        appData.lastUsageAdTime = 0;
        localStorage.setItem('lastResetDate', today);
        console.log('🌅 Daily reset complete!');
        saveData();
    }
}

function applyMidnightPenalties() {
    const today = new Date().toDateString();
    let totalPenalty = 0;
    const penalizedTasks = [];
    appData.tasks.forEach(task => {
        if (!task.isDone) {
            const penalty = PRIORITY_PENALTIES[task.priority] || 25;
            if (task.lastPenaltyDate !== today) {
                appData.totalPoints -= penalty;
                totalPenalty += penalty;
                task.lastPenaltyDate = today;
                penalizedTasks.push({
                    name: task.name,
                    penalty: penalty,
                    priority: task.priority
                });
                console.log(`⚠️ Penalty: -${penalty} for "${task.name}"`);
            }
        }
    });
    if (totalPenalty > 0) {
        let message = `⚠️ DAILY PENALTIES!

Lost ${totalPenalty} points:

`;
        penalizedTasks.forEach(t => {
            const emoji = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢';
            message += `${emoji} ${t.name}: -${t.penalty}
`;
        });
        message += '
💡 Complete tasks to avoid penalties!';
        alert(message);
    }
}

function saveData() {
    database.ref('users/' + USER_ID).set({
        ...appData,
        lastUpdated: Date.now()
    });
}

function loadData() {
    database.ref('users/' + USER_ID).once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            Object.keys(appData).forEach(key => {
                if (data[key] !== undefined) {
                    appData[key] = data[key];
                }
            });
        }
        resetDailyTasks();
        checkPremiumStatus();
        updateDisplay();
        startUsageTracking();
    });
}

function formatPoints(points) {
    if (points >= 1000000) {
        return (points / 1000000).toFixed(1).replace('.0', '') + 'M';
    } else if (points >= 1000) {
        return (points / 1000).toFixed(1).replace('.0', '') + 'k';
    }
    return points.toString();
}

function calculateLevel(points) {
    return Math.floor(points / 1000);
}

function calculateRank(level) {
    const rankIndex = Math.floor(level / 10);
    return RANKS[Math.min(rankIndex, RANKS.length - 1)];
}

function updateDisplay() {
    const level = calculateLevel(appData.totalPoints);
    const rank = calculateRank(level);
    const pointsInLevel = appData.totalPoints % 1000;
    const progress = (pointsInLevel / 1000) * 100;
    document.getElementById('totalPoints').textContent = formatPoints(appData.totalPoints);
    document.getElementById('level').textContent = level;
    document.getElementById('rank').textContent = rank;
    document.getElementById('progressBar').style.width = `${progress}%`;
    document.getElementById('progressText').textContent = `${pointsInLevel}/1000`;
    for (let i = 1; i <= 4; i++) {
        const count = appData.tasks.filter(t => t.categoryId === i).length;
        const countEl = document.getElementById(`count-${i}`);
        if (countEl) countEl.textContent = count;
    }
    updatePremiumBadge();
    renderTasks();
}

function updatePremiumBadge() {
    const badge = document.getElementById('premiumBadge');
    if (!badge) return;
    if (appData.premiumStatus === 'paid') {
        badge.textContent = '👑 PREMIUM';
        badge.className = 'premium-badge paid';
    } else if (appData.premiumStatus === 'ad-premium') {
        const daysLeft = Math.ceil((appData.premiumExpiry - Date.now()) / (24 * 60 * 60 * 1000));
        badge.textContent = `⭐ PREMIUM (${daysLeft}d)`;
        badge.className = 'premium-badge ad-premium';
    } else {
        badge.textContent = '🆓 FREE';
        badge.className = 'premium-badge free';
    }
}

function renderTasks() {
    const taskList = document.getElementById('taskList');
    const categoryTasks = appData.tasks.filter(t => t.categoryId === currentCategory);
    taskList.innerHTML = '';
    if (categoryTasks.length === 0) {
        taskList.innerHTML = '<div class="no-tasks">No tasks yet!</div>';
        return;
    }
    categoryTasks.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item ${task.isDone ? 'completed' : ''} priority-${task.priority}`;
        const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
        const points = PRIORITY_POINTS[task.priority];
        taskDiv.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.isDone ? 'checked' : ''} data-id="${task.id}">
            <div class="task-content">
                <div class="task-name">${task.name} ${priorityEmoji}</div>
                <div class="task-points">+${points} pts</div>
            </div>
            <div class="task-actions">
                <button class="edit-btn" data-id="${task.id}">✏️</button>
                <button class="delete-btn" data-id="${task.id}">🗑️</button>
            </div>
        `;
        taskList.appendChild(taskDiv);
    });
}

function addTask() {
    const nameInput = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const name = nameInput.value.trim();
    const priority = prioritySelect.value;
    if (!name) {
        alert('⚠️ Enter task name!');
        return;
    }
    const task = {
        id: Date.now(),
        name,
        priority,
        points: PRIORITY_POINTS[priority],
        isDone: false,
        doneTimestamp: null,
        categoryId: currentCategory,
        createdAt: Date.now(),
        lastPenaltyDate: null
    };
    appData.tasks.push(task);
    saveData();
    updateDisplay();
    nameInput.value = '';
    prioritySelect.value = 'medium';
}

function toggleTask(id) {
    const task = appData.tasks.find(t => t.id === id);
    if (!task) return;
    const now = Date.now();
    if (!task.isDone) {
        task.isDone = true;
        task.doneTimestamp = now;
        appData.totalPoints += task.points;
        const pointsEl = document.getElementById('totalPoints');
        pointsEl.classList.add('points-gained');
        setTimeout(() => pointsEl.classList.remove('points-gained'), 500);
    } else {
        const hoursPassed = (now - task.doneTimestamp) / (1000 * 60 * 60);
        if (hoursPassed < 24) {
            appData.totalPoints -= task.points;
        }
        task.isDone = false;
        task.doneTimestamp = null;
    }
    saveData();
    updateDisplay();
}

function deleteTask(id) {
    const task = appData.tasks.find(t => t.id === id);
    if (!task) return;
    if (task.isDone && task.doneTimestamp) {
        const hoursPassed = (Date.now() - task.doneTimestamp) / (1000 * 60 * 60);
        if (hoursPassed < 24) {
            appData.totalPoints -= task.points;
        }
    }
    appData.tasks = appData.tasks.filter(t => t.id !== id);
    saveData();
    updateDisplay();
}

function editTask(id) {
    const task = appData.tasks.find(t => t.id === id);
    if (!task) return;
    const newName = prompt('Edit task name:', task.name);
    if (newName && newName.trim()) {
        task.name = newName.trim();
        saveData();
        updateDisplay();
    }
}

function switchCategory(categoryId) {
    currentCategory = categoryId;
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-category="${categoryId}"]`);
    if (activeBtn) activeBtn.classList.add('active');
    renderTasks();
}

document.getElementById('addTaskBtn').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchCategory(parseInt(btn.dataset.category));
    });
});
document.getElementById('taskList').addEventListener('click', (e) => {
    const id = parseInt(e.target.dataset.id);
    if (e.target.classList.contains('task-checkbox')) {
        toggleTask(id);
    } else if (e.target.classList.contains('delete-btn')) {
        if (confirm('Delete this task?')) {
            deleteTask(id);
        }
    } else if (e.target.classList.contains('edit-btn')) {
        editTask(id);
    }
});
const watchAdBtn = document.getElementById('watchAdBtn');
if (watchAdBtn) {
    watchAdBtn.addEventListener('click', watchRewardAd);
}
console.log('🎮 NEXUS: Phase A Loaded - Ready for Testing!');
loadData();