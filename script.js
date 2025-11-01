// ==================== ATHERION PHASE A - WORKING VERSION ====================
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
let USER_ID = localStorage.getItem('atherion_user_id');
if (!USER_ID) {
    USER_ID = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('atherion_user_id', USER_ID);
}

// ============ DYNAMIC POINTS SYSTEM ============
// Points required per level increases by 150 for each rank
function getPointsPerLevel(rankIndex) {
    return 1000 + (rankIndex * 150);
}

function getPointsPerRank(rankIndex) {
    return getPointsPerLevel(rankIndex) * 10;
}

function calculateLevel(points) {
    let rankIndex = 0;
    let pointsUsed = 0;
    
    // Find which rank user is in
    for (let i = 0; i < RANKS.length; i++) {
        const pointsForThisRank = getPointsPerRank(i);
        if (pointsUsed + pointsForThisRank <= points) {
            pointsUsed += pointsForThisRank;
            rankIndex++;
        } else {
            break;
        }
    }
    
    // Calculate level within current rank
    if (rankIndex >= RANKS.length) {
        return (RANKS.length * 10) - 1; // Max level
    }
    
    const remainingPoints = points - pointsUsed;
    const pointsPerLevel = getPointsPerLevel(rankIndex);
    const levelInRank = Math.floor(remainingPoints / pointsPerLevel);
    
    return (rankIndex * 10) + Math.min(levelInRank, 9);
}

function calculateRank(level) {
    const rankIndex = Math.floor(level / 10);
    return RANKS[Math.min(rankIndex, RANKS.length - 1)];
}

function getCurrentLevelProgress(points) {
    const level = calculateLevel(points);
    const rankIndex = Math.floor(level / 10);
    const pointsPerLevel = getPointsPerLevel(rankIndex);
    
    let pointsUsedForPreviousRanks = 0;
    for (let i = 0; i < rankIndex; i++) {
        pointsUsedForPreviousRanks += getPointsPerRank(i);
    }
    
    const levelInRank = level % 10;
    const pointsInCurrentLevel = points - pointsUsedForPreviousRanks - (levelInRank * pointsPerLevel);
    
    return {
        current: pointsInCurrentLevel,
        required: pointsPerLevel,
        percent: (pointsInCurrentLevel / pointsPerLevel) * 100
    };
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
            alert(`⚠️ MIDNIGHT PENALTIES! Lost ${penalties} points for incomplete tasks. 💡 Complete tasks daily!`);
        }
        saveData();
    }
}

function formatPoints(points) {
    if (points >= 1000000) return (points / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (points >= 1000) return (points / 1000).toFixed(1).replace('.0', '') + 'k';
    return points.toString();
}

function updateDisplay() {
    const level = calculateLevel(appData.totalPoints);
    const rank = calculateRank(level);
    const progress = getCurrentLevelProgress(appData.totalPoints);

    document.getElementById('totalPoints').textContent = formatPoints(appData.totalPoints);
    document.getElementById('level').textContent = level;
    document.getElementById('rank').textContent = rank;

    const progressBar = document.getElementById('progressBar');
    if (progressBar) progressBar.style.width = `${progress.percent}%`;

    const progressText = document.getElementById('progressText');
    if (progressText) progressText.textContent = `${formatPoints(progress.current)}/${formatPoints(progress.required)}`;

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
        taskList.innerHTML = '<div class="no-tasks">No tasks yet. Add one to start! 🚀</div>';
        return;
    }

    categoryTasks.forEach(task => {
        const taskEl = document.createElement('div');
        taskEl.className = `task-item priority-${task.priority}${task.isDone ? ' completed' : ''}`;
        taskEl.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.isDone ? 'checked' : ''} onchange="toggleTask('${task.id}')">
            <div class="task-content">
                <div class="task-name">${task.name}</div>
                <div class="task-points">+${PRIORITY_POINTS[task.priority]} pts</div>
            </div>
            <div class="task-actions">
                <button class="edit-btn" onclick="editTask('${task.id}')">✏️</button>
                <button class="delete-btn" onclick="deleteTask('${task.id}')">🗑️</button>
            </div>
        `;
        taskList.appendChild(taskEl);
    });
}

function selectCategory(catId) {
    currentCategory = catId;
    document.querySelectorAll('.category-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx + 1 === catId);
    });
    renderTasks();
}

function addTask() {
    const input = document.getElementById('taskInput');
    const prioritySelect = document.getElementById('prioritySelect');
    const taskName = input.value.trim();

    if (!taskName) {
        alert('⚠️ Please enter a task name');
        return;
    }

    const newTask = {
        id: Date.now().toString(),
        name: taskName,
        priority: prioritySelect.value,
        categoryId: currentCategory,
        isDone: false,
        doneTimestamp: null
    };

    appData.tasks.push(newTask);
    input.value = '';
    saveData();
    updateDisplay();
}

function toggleTask(taskId) {
    const task = appData.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.isDone = !task.isDone;
    task.doneTimestamp = task.isDone ? Date.now() : null;

    if (task.isDone) {
        appData.totalPoints += PRIORITY_POINTS[task.priority];
    } else {
        appData.totalPoints -= PRIORITY_POINTS[task.priority];
    }

    saveData();
    updateDisplay();
}

function editTask(taskId) {
    const task = appData.tasks.find(t => t.id === taskId);
    if (!task) return;

    const newName = prompt('Edit task name:', task.name);
    if (newName && newName.trim()) {
        task.name = newName.trim();
        saveData();
        renderTasks();
    }
}

function deleteTask(taskId) {
    const task = appData.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.isDone) {
        appData.totalPoints -= PRIORITY_POINTS[task.priority];
    }

    appData.tasks = appData.tasks.filter(t => t.id !== taskId);
    saveData();
    updateDisplay();
}

function watchRewardAd() {
    if (appData.premiumStatus === 'paid') {
        alert('👑 You already have Premium!');
        return;
    }

    appData.adsWatched++;
    document.getElementById('adProgress').textContent = `${appData.adsWatched}/10 ads watched`;

    if (appData.adsWatched >= REWARD_AD_CONFIG.adsRequired) {
        appData.premiumStatus = 'ad-premium';
        appData.premiumExpiry = Date.now() + (REWARD_AD_CONFIG.premiumDays * 24 * 60 * 60 * 1000);
        appData.adsWatched = 0;
        alert('🎉 7-DAY PREMIUM UNLOCKED! Enjoy ad-free experience!');
    } else {
        alert(`✅ Ad watched! ${REWARD_AD_CONFIG.adsRequired - appData.adsWatched} more to unlock Premium!`);
    }

    saveData();
    updateDisplay();
}

function saveData() {
    database.ref(`users/${USER_ID}`).set(appData);
}

function loadData() {
    database.ref(`users/${USER_ID}`).once('value').then(snapshot => {
        if (snapshot.exists()) {
            appData = snapshot.val();
        } else {
            appData.lastResetDate = new Date().toDateString();
        }
        checkMidnightReset();
        updateDisplay();
    });
}

window.onload = loadData;

// --- PWA Service Worker & Install Prompt ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('service-worker.js');
  });
}

let deferredPrompt;
const installBtn = document.getElementById('install-btn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'block';
});
if (installBtn) {
  installBtn.addEventListener('click', function() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(() => {
        deferredPrompt = null;
        installBtn.style.display = 'none';
      });
    }
  });
}
