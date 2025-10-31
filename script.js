// ==================== NEXUS: ISEKAI SYSTEM - PHASE A (FIXED - WITH RESET) ====================
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

// ==================== CONSTANTS ====================
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

// ==================== DATA ====================
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

// ==================== MIDNIGHT RESET & PENALTY ====================
function resetDailyTasks() {
    const today = new Date().toDateString();
    
    if (appData.lastResetDate !== today) {
        console.log('🌅 New day detected! Applying midnight reset...');
        
        // Apply penalties first
        applyMidnightPenalties();
        
        // Reset all tasks
        appData.tasks.forEach(task => {
            if (task.isDone) {
                task.isDone = false;
                task.doneTimestamp = null;
            }
        });
        
        appData.lastResetDate = today;
        console.log('✅ Daily reset complete!');
        saveData();
        updateDisplay();
    }
}

function applyMidnightPenalties() {
    const today = new Date().toDateString();
    let totalPenalty = 0;
    const penalizedTasks = [];
    
    appData.tasks.forEach(task => {
        if (!task.isDone) {
            const penalty = PRIORITY_PENALTIES[task.priority] || 25;
            appData.totalPoints -= penalty;
            totalPenalty += penalty;
            
            penalizedTasks.push({
                name: task.name,
                penalty: penalty,
                priority: task.priority
            });
            
            console.log(`⚠️ Penalty: -${penalty} for "${task.name}"`);
        }
    });
    
    if (totalPenalty > 0) {
        let message = `⚠️ MIDNIGHT PENALTIES!

Lost ${totalPenalty} points for incomplete tasks:

`;
        penalizedTasks.forEach(t => {
            const emoji = t.priority === 'high' ? '🔴' : t.priority === 'medium' ? '🟡' : '🟢';
            message += `${emoji} ${t.name}: -${t.penalty}
`;
        });
        message += '
💡 Complete tasks daily to avoid penalties!';
        
        setTimeout(() => alert(message), 1000);
    }
}

// ==================== UTILITY FUNCTIONS ====================
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

// ==================== DISPLAY FUNCTIONS ====================
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

// ==================== TASK FUNCTIONS ====================
function addTask() {
    const nameInput = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    
    if (!nameInput || !prioritySelect) return;
    
    const name = nameInput.value.trim();
    const priority = prioritySelect.value;
    
    if (!name) {
        alert('⚠️ Please enter a task name!');
        return;
    }
    
    const task = {
        id: Date.now(),
        name,
        priority,
        points: PRIORITY_POINTS[priority],
        isDone: false,
        categoryId: currentCategory,
        doneTimestamp: null,
        createdAt: Date.now()
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
        const hoursPassed = (Date.now() - task.doneTimestamp) / (1000 * 60 * 60);
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
    
    if (task.isDone) {
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
    
    document.querySelector(`[data-category="${categoryId}"]`)?.classList.add('active');
    renderTasks();
}

// ==================== PREMIUM & AD FUNCTIONS ====================
function watchRewardAd() {
    if (appData.premiumStatus === 'ad-premium' || appData.premiumStatus === 'paid') {
        const daysLeft = Math.ceil((appData.premiumExpiry - Date.now()) / (24 * 60 * 60 * 1000));
        alert(`⚠️ Premium Already Active!

You have ${daysLeft} day(s) remaining.

You can watch ads again after premium expires.`);
        return;
    }
    
    console.log('🎁 Reward ad shown');
    appData.adsWatched++;
    
    if (appData.adsWatched >= REWARD_AD_CONFIG.adsRequired) {
        grantAdPremium(REWARD_AD_CONFIG.premiumDays);
        appData.adsWatched = 0;
    } else {
        alert(`🎁 Reward Ad Watched!

Progress: ${appData.adsWatched}/${REWARD_AD_CONFIG.adsRequired} ads

Watch ${REWARD_AD_CONFIG.adsRequired - appData.adsWatched} more ads for ${REWARD_AD_CONFIG.premiumDays} days premium!`);
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
    if (appData.premiumStatus === 'paid') return 20;
    if (appData.premiumStatus === 'ad-premium') return 8;
    return 5;
}

// ==================== SAVE & LOAD ====================
function saveData() {
    localStorage.setItem('nexus_appData_' + USER_ID, JSON.stringify(appData));
    console.log('💾 Data saved');
}

function loadData() {
    const saved = localStorage.getItem('nexus_appData_' + USER_ID);
    if (saved) {
        try {
            appData = JSON.parse(saved);
        } catch (e) {
            console.log('Could not load saved data');
        }
    }
    
    // Check for midnight reset on load
    resetDailyTasks();
    updateDisplay();
}

// ==================== INITIALIZE APP ====================
function initializeApp() {
    console.log('🎮 NEXUS App Initializing...');
    
    // Add Task
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', addTask);
        console.log('✅ Add button bound');
    }
    
    // Task Input Enter
    const taskInput = document.getElementById('taskInput');
    if (taskInput) {
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });
    }
    
    // Category Buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchCategory(parseInt(btn.dataset.category));
        });
    });
    console.log('✅ Category buttons bound');
    
    // Task List
    const taskList = document.getElementById('taskList');
    if (taskList) {
        taskList.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            if (e.target.classList.contains('task-checkbox')) toggleTask(id);
            else if (e.target.classList.contains('delete-btn')) {
                if (confirm('Delete this task?')) deleteTask(id);
            }
            else if (e.target.classList.contains('edit-btn')) editTask(id);
        });
    }
    console.log('✅ Task list bound');
    
    // Watch Ad Button
    const watchAdBtn = document.getElementById('watchAdBtn');
    if (watchAdBtn) {
        watchAdBtn.addEventListener('click', watchRewardAd);
        console.log('✅ Ad button bound');
    }
    
    console.log('🎮 NEXUS Phase A Ready!');
    loadData();
    
    // Check for reset every minute
    setInterval(resetDailyTasks, 60000);
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
      }
