// ==================== NEXUS PHASE A - WORKING VERSION ====================
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
const PRIORITY_POINTS = { high: 100, medium: 50, low: 30 };
const PRIORITY_PENALTIES = { high: 50, medium: 25, low: 15 };
const REWARD_AD_CONFIG = { adsRequired: 10, premiumDays: 7 };

let appData = {
    totalPoints: 0,
    tasks: [],
    premiumStatus: 'free',
    premiumExpiry: null,
    adsWatched: 0,
    aiQueriesUsedToday: 0,
    lastAiResetDate: null,
    lastResetDate: null
};

let currentCategory = 1;
let USER_ID = localStorage.getItem('nexus_user_id');
if (!USER_ID) {
    USER_ID = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('nexus_user_id', USER_ID);
}

// RESET SYSTEM
function checkMidnightReset() {
    const today = new Date().toDateString();
    if (appData.lastResetDate !== today) {
        console.log('🌅 New day! Applying penalties...');
        let penalties = 0;
        appData.tasks.forEach(task => {
            if (!task.isDone) {
                const pen = PRIORITY_PENALTIES[task.priority];
                appData.totalPoints -= pen;
                penalties += pen;
                console.log(`⚠️ -${pen} for ${task.name}`);
            }
            task.isDone = false;
            task.doneTimestamp = null;
        });
        appData.lastResetDate = today;
        if (penalties > 0) {
            alert(`⚠️ MIDNIGHT PENALTIES!

Lost ${penalties} points for incomplete tasks.

💡 Complete tasks daily!`);
        }
        saveData();
    }
}

function formatPoints(points) {
    if (points >= 1000000) return (points / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (points >= 1000) return (points / 1000).toFixed(1).replace('.0', '') + 'k';
    return points.toString();
}

function calculateLevel(points) { return Math.floor(points / 1000); }
function calculateRank(level) { return RANKS[Math.min(Math.floor(level / 10), RANKS.length - 1)]; }

function updateDisplay() {
    const level = calculateLevel(appData.totalPoints);
    const rank = calculateRank(level);
    const pointsInLevel = appData.totalPoints % 1000;
    const progress = (pointsInLevel / 1000) * 100;
    
    document.getElementById('totalPoints').textContent = formatPoints(appData.totalPoints);
    document.getElementById('level').textContent = level;
    document.getElementById('rank').textContent = rank;
    
    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = `${progress}%`;
    
    const progressText = document.getElementById('progressText');
    if (progressText) progressText.textContent = `${pointsInLevel}/1000`;
    
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
    if (!taskList) return;
    const categoryTasks = appData.tasks.filter(t => t.categoryId === currentCategory);
    taskList.innerHTML = '';
    if (categoryTasks.length === 0) {
        taskList.innerHTML = '<div class="no-tasks">No tasks yet! Add one to get started.</div>';
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
    if (!nameInput || !prioritySelect) return;
    const name = nameInput.value.trim();
    const priority = prioritySelect.value;
    if (!name) { alert('⚠️ Please enter a task name!'); return; }
    const task = {
        id: Date.now(),
        name, priority,
        points: PRIORITY_POINTS[priority],
        isDone: false,
        categoryId: currentCategory,
        doneTimestamp: null
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
    if (!task.isDone) {
        task.isDone = true;
        task.doneTimestamp = Date.now();
        appData.totalPoints += task.points;
        const pointsEl = document.getElementById('totalPoints');
        if (pointsEl) {
            pointsEl.classList.add('points-gained');
            setTimeout(() => pointsEl.classList.remove('points-gained'), 500);
        }
    } else {
        task.isDone = false;
        task.doneTimestamp = null;
        appData.totalPoints -= task.points;
    }
    saveData();
    updateDisplay();
}

function deleteTask(id) {
    const task = appData.tasks.find(t => t.id === id);
    if (!task) return;
    if (task.isDone) appData.totalPoints -= task.points;
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
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-category="${categoryId}"]`)?.classList.add('active');
    renderTasks();
}

function watchRewardAd() {
    if (appData.premiumStatus === 'ad-premium' || appData.premiumStatus === 'paid') {
        const daysLeft = Math.ceil((appData.premiumExpiry - Date.now()) / (24 * 60 * 60 * 1000));
        alert(`⚠️ Premium Already Active!

You have ${daysLeft} day(s) remaining.`);
        return;
    }
    appData.adsWatched++;
    if (appData.adsWatched >= REWARD_AD_CONFIG.adsRequired) {
        appData.premiumExpiry = Date.now() + (REWARD_AD_CONFIG.premiumDays * 24 * 60 * 60 * 1000);
        appData.premiumStatus = 'ad-premium';
        appData.adsWatched = 0;
        alert(`🎉 PREMIUM UNLOCKED!

${REWARD_AD_CONFIG.premiumDays} days of premium!`);
    } else {
        alert(`🎁 Ad Watched!

${appData.adsWatched}/${REWARD_AD_CONFIG.adsRequired} ads`);
    }
    saveData();
    updateDisplay();
}

function saveData() {
    localStorage.setItem('nexus_appData_' + USER_ID, JSON.stringify(appData));
}

function loadData() {
    const saved = localStorage.getItem('nexus_appData_' + USER_ID);
    if (saved) {
        try { appData = JSON.parse(saved); } catch (e) { console.log('Load error'); }
    }
    checkMidnightReset();
    updateDisplay();
}

function initApp() {
    console.log('🎮 NEXUS Starting...');
    const addBtn = document.getElementById('addTaskBtn');
    if (addBtn) addBtn.addEventListener('click', addTask);
    const input = document.getElementById('taskInput');
    if (input) input.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => switchCategory(parseInt(btn.dataset.category)));
    });
    const list = document.getElementById('taskList');
    if (list) {
        list.addEventListener('click', e => {
            const id = parseInt(e.target.dataset.id);
            if (e.target.classList.contains('task-checkbox')) toggleTask(id);
            else if (e.target.classList.contains('delete-btn') && confirm('Delete?')) deleteTask(id);
            else if (e.target.classList.contains('edit-btn')) editTask(id);
        });
    }
    const adBtn = document.getElementById('watchAdBtn');
    if (adBtn) adBtn.addEventListener('click', watchRewardAd);
    loadData();
    setInterval(checkMidnightReset, 60000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
        }
