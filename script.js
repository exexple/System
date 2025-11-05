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

// ==================== PHASE B: ACHIEVEMENTS & CHALLENGES ====================
const ISEKAI_GREETINGS = [
    "⚔️ Welcome, Adventurer! Your journey in this new world begins now!",
    "🌟 Greetings, Hero! The gods have chosen you for greatness!",
    "✨ You've been summoned! Time to level up your skills!",
    "🎯 Another day, another quest! Ready to conquer your tasks?",
    "🔥 Rise and shine, Champion! Your destiny awaits!",
    "🏰 Welcome back, Brave Soul! Let's achieve legendary status today!"
];

const MOTIVATIONAL_MESSAGES = [
    "💪 Every completed task brings you closer to S-Rank!",
    "⭐ Keep grinding! Legendary heroes are made through daily effort!",
    "🎖️ Your determination is your greatest weapon!",
    "🌟 Small victories lead to epic achievements!",
    "⚡ You're on fire! Keep that momentum going!",
    "🏆 Remember: Even the strongest heroes started at E-Rank!"
];

const ACHIEVEMENTS_LIST = [
    { id: 'first_task', name: 'First Quest', desc: 'Complete your first task', icon: '⚔️', check: (data) => data.tasks.some(t => t.isDone) },
    { id: 'rank_d', name: 'D-Rank Adventurer', desc: 'Reach D Rank', icon: '🎖️', check: (data) => calculateLevel(data.totalPoints) >= 30 },
    { id: 'rank_c', name: 'C-Rank Hero', desc: 'Reach C Rank', icon: '🏅', check: (data) => calculateLevel(data.totalPoints) >= 60 },
    { id: 'rank_b', name: 'B-Rank Champion', desc: 'Reach B Rank', icon: '👑', check: (data) => calculateLevel(data.totalPoints) >= 90 },
    { id: 'points_1k', name: 'Point Collector', desc: 'Earn 1,000 points', icon: '💰', check: (data) => data.totalPoints >= 1000 },
    { id: 'points_10k', name: 'Point Master', desc: 'Earn 10,000 points', icon: '💎', check: (data) => data.totalPoints >= 10000 },
    { id: 'task_10', name: 'Quest Starter', desc: 'Complete 10 tasks', icon: '📜', check: (data) => data.tasks.filter(t => t.doneTimestamp).length >= 10 },
    { id: 'task_50', name: 'Quest Veteran', desc: 'Complete 50 tasks', icon: '⚔️', check: (data) => data.tasks.filter(t => t.doneTimestamp).length >= 50 }
];

// ==================== PHASE A CORE DATA ====================
let appData = {
    totalPoints: 0,
    tasks: [],
    premiumStatus: 'free',
    premiumExpiry: null,
    adsWatched: 0,
    aiQueriesUsedToday: 0,
    lastAiResetDate: null,
    lastResetDate: null,
    // PHASE B FIELDS:
    currentRank: 0,
    hasActiveRankChallenge: false,
    rankUpChallenge: null,
    achievements: [],
    lastMotivationTime: null
};

let currentCategory = 1;
let USER_ID = localStorage.getItem('atherion_user_id');
if (!USER_ID) {
    USER_ID = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('atherion_user_id', USER_ID);
}

// ============ DYNAMIC POINTS SYSTEM ============
function getPointsPerLevel(rankIndex) {
    return 1000 + (rankIndex * 150);
}

function getPointsPerRank(rankIndex) {
    return getPointsPerLevel(rankIndex) * 10;
}

function calculateLevel(points) {
    let rankIndex = 0;
    let pointsUsed = 0;
    for (let i = 0; i < RANKS.length; i++) {
        const pointsForThisRank = getPointsPerRank(i);
        if (pointsUsed + pointsForThisRank <= points) {
            pointsUsed += pointsForThisRank;
            rankIndex++;
        } else {
            break;
        }
    }
    if (rankIndex >= RANKS.length) {
        return (RANKS.length * 10) - 1;
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
    return { current: pointsInCurrentLevel, required: pointsPerLevel, percent: (pointsInCurrentLevel / pointsPerLevel) * 100 };
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

// ==================== PHASE B: DISPLAY FUNCTIONS ====================
function showIsekaiGreeting() {
  const greeting = GREETINGS[Math.floor(Math.random()*GREETINGS.length)];
  setGreeting(greeting);
  localStorage.setItem("lastGreetingDate", today);
}

function showMotivationalNotification() {
    const now = Date.now();
    const lastTime = appData.lastMotivationTime || 0;
    const twoHours = 2 * 60 * 60 * 1000;
    
    if (now - lastTime > twoHours && appData.tasks.length > 0) {
        const message = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
        alert(message);
        appData.lastMotivationTime = now;
        saveData();
    }
}

function checkAchievements() {
    let newAchievements = [];
    ACHIEVEMENTS_LIST.forEach(ach => {
        if (!appData.achievements.includes(ach.id) && ach.check(appData)) {
            appData.achievements.push(ach.id);
            newAchievements.push(ach);
        }
    });
    if (newAchievements.length > 0) {
        newAchievements.forEach(ach => {
            setTimeout(() => alert(`🎉 Achievement Unlocked: ${ach.icon} ${ach.name}!`), 100);
        });
    }
}

function checkRankUp() {
    const currentLevel = calculateLevel(appData.totalPoints);
    const currentRankIndex = Math.floor(currentLevel / 10);
    
    if (currentLevel % 10 === 9 && currentRankIndex < RANKS.length - 1) {
        if (!appData.hasActiveRankChallenge) {
            generateRankUpChallenge();
        }
    }
}

function generateRankUpChallenge() {
    const challenges = [
        "Complete 3 high-priority tasks today",
        "Earn 200 points without losing any",
        "Complete all tasks in one category",
        "Maintain a 3-day streak",
        "Complete 5 tasks in a single day"
    ];
    
    const challenge = challenges[Math.floor(Math.random() * challenges.length)];
    appData.rankUpChallenge = challenge;
    appData.hasActiveRankChallenge = true;
    saveData();
    renderRankUpChallenge();
    showRankUpModal();
}

function renderRankUpChallenge() {
    const box = document.getElementById('rankUpChallengeBox');
    const text = document.getElementById('rankUpChallengeText');
    
    if (!box || !text) return;
    
    if (appData.hasActiveRankChallenge && appData.rankUpChallenge) {
        box.style.display = 'block';
        text.textContent = appData.rankUpChallenge;
    } else {
        box.style.display = 'none';
    }
}

function renderAchievements() {
    const panel = document.getElementById('achievementsList');
    if (!panel) return;
    
    panel.innerHTML = '';
    ACHIEVEMENTS_LIST.forEach(ach => {
        const unlocked = appData.achievements.includes(ach.id);
        const achDiv = document.createElement('div');
        achDiv.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
        achDiv.innerHTML = `
            <span class="ach-icon">${unlocked ? ach.icon : '🔒'}</span>
            <div class="ach-info">
                <div class="ach-name">${ach.name}</div>
                <div class="ach-desc">${ach.desc}</div>
            </div>
        `;
        panel.appendChild(achDiv);
    });
}

function showRankUpModal() {
    const modal = document.getElementById('rankUpModal');
    const challengeText = document.getElementById('modalChallengeText');
    
    if (modal && challengeText) {
        challengeText.textContent = appData.rankUpChallenge;
        modal.style.display = 'flex';
    }
}

function acceptRankUpChallenge() {
    const modal = document.getElementById('rankUpModal');
    if (modal) modal.style.display = 'none';
    alert("⚔️ Challenge Accepted! Complete it to rank up!");
}

function toggleAchievementsPanel() {
    const panel = document.getElementById('achievementsPanel');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
}

// ==================== PHASE A: CORE FUNCTIONS ====================
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
    
    // PHASE B RENDERS:
    renderAchievements();
    renderRankUpChallenge();
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
        taskList.innerHTML = '<div class="no-tasks">📭 No tasks yet. Add one to begin your adventure!</div>';
        return;
    }
    
    categoryTasks.forEach((task, index) => {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item priority-${task.priority} ${task.isDone ? 'completed' : ''}`;
        const points = PRIORITY_POINTS[task.priority];
        
        taskDiv.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.isDone ? 'checked' : ''} 
                   onchange="toggleTask(${appData.tasks.indexOf(task)})">
            <div class="task-content">
                <div class="task-name">${task.name}</div>
                <div class="task-points">${task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'} +${points} points</div>
            </div>
            <div class="task-actions">
                <button class="edit-btn" onclick="editTask(${appData.tasks.indexOf(task)})">✏️</button>
                <button class="delete-btn" onclick="deleteTask(${appData.tasks.indexOf(task)})">🗑️</button>
            </div>
        `;
        taskList.appendChild(taskDiv);
    });
}

function addTask() {
    const input = document.getElementById('taskInput');
    const priority = document.getElementById('prioritySelect').value;
    
    if (input.value.trim() === '') {
        alert('⚠️ Task name cannot be empty!');
        return;
    }
    
    const task = {
        id: Date.now(),
        name: input.value.trim(),
        categoryId: currentCategory,
        priority: priority,
        isDone: false,
        doneTimestamp: null,
        createdAt: new Date().toISOString()
    };
    
    appData.tasks.push(task);
    saveData();
    updateDisplay();
    input.value = '';
}

function toggleTask(index) {
    const task = appData.tasks[index];
    task.isDone = !task.isDone;
    
    if (task.isDone) {
        const points = PRIORITY_POINTS[task.priority];
        appData.totalPoints += points;
        task.doneTimestamp = new Date().toISOString();
        
        // PHASE B: CHECK ACHIEVEMENTS AND RANK UP
        checkAchievements();
        checkRankUp();
        showMotivationalNotification();
    }
    
    saveData();
    updateDisplay();
}

function editTask(index) {
    const task = appData.tasks[index];
    const newName = prompt('Edit task name:', task.name);
    if (newName && newName.trim() !== '') {
        task.name = newName.trim();
        saveData();
        updateDisplay();
    }
}

function deleteTask(index) {
    if (confirm('Delete this task?')) {
        appData.tasks.splice(index, 1);
        saveData();
        updateDisplay();
    }
}

function switchCategory(catId) {
    currentCategory = catId;
    document.querySelectorAll('.category-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx + 1 === catId);
    });
    renderTasks();
}

// PREMIUM AND ADS
function watchAd() {
    appData.adsWatched += 1;
    document.getElementById('adsCount').textContent = appData.adsWatched;
    
    if (appData.adsWatched >= REWARD_AD_CONFIG.adsRequired) {
        appData.premiumStatus = 'ad-premium';
        appData.premiumExpiry = Date.now() + (REWARD_AD_CONFIG.premiumDays * 24 * 60 * 60 * 1000);
        appData.adsWatched = 0;
        updateDisplay();
        saveData();
        alert(`🎉 You got ${REWARD_AD_CONFIG.premiumDays} days of PREMIUM!`);
    } else {
        saveData();
    }
}

function checkPremiumExpiry() {
    if (appData.premiumStatus === 'ad-premium' && appData.premiumExpiry < Date.now()) {
        appData.premiumStatus = 'free';
        appData.premiumExpiry = null;
        saveData();
        alert('⏰ Your premium subscription has expired.');
    }
}

// DATA MANAGEMENT
function saveData() {
    database.ref(`users/${USER_ID}`).set(appData).catch(err => {
        console.error('Firebase save failed, using localStorage:', err);
        localStorage.setItem('atherion_data', JSON.stringify(appData));
    });
}

function loadData() {
    database.ref(`users/${USER_ID}`).once('value', snapshot => {
        if (snapshot.exists()) {
            appData = snapshot.val();
        } else {
            const stored = localStorage.getItem('atherion_data');
            if (stored) appData = JSON.parse(stored);
        }
        
        // PHASE B: Initialize achievements array
        if (!appData.achievements) appData.achievements = [];
        
        checkMidnightReset();
        checkPremiumExpiry();
        updateDisplay();
        
        // PHASE B: Show greeting on app load
        showIsekaiGreeting();
        
        // Start motivational notification timer
        setInterval(showMotivationalNotification, 30 * 60 * 1000);
    }).catch(err => {
        console.error('Firebase load failed, using localStorage:', err);
        const stored = localStorage.getItem('atherion_data');
        if (stored) appData = JSON.parse(stored);
        if (!appData.achievements) appData.achievements = [];
        
        checkMidnightReset();
        checkPremiumExpiry();
        updateDisplay();
        showIsekaiGreeting();
        setInterval(showMotivationalNotification, 30 * 60 * 1000);
    });
}

// START APP
window.addEventListener('load', loadData);
