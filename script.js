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
    currentRank: 0,
    hasActiveRankChallenge: false,
    rankUpChallenge: null, 
    achievements: [],
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
    renderRankUpChallenge();
    renderAchievements();
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
        triggerGreeting();
    });
}

window.onload = loadData;

// ==================== RANK-UP MODAL CHALLENGES ====================
const RANK_UP_THRESHOLDS = {
  'E': 100,
  'EE': 300,
  'EEE': 600,
  'D': 1000,
  'DD': 1500,
  'DDD': 2200,
  'C': 3000,
  'CC': 4000,
  'CCC': 5200,
  'B': 6500,
  'BB': 8000,
  'BBB': 9500,
  'A': 11200,
  'AA': 13000,
  'AAA': 15000,
  'S': 17500,
  'SS': 20000,
  'SSS': 25000
};

const RANK_UP_CHALLENGES = {
  mini: [
    "Complete 3 tasks in the next hour",
    "Maintain a 5-task streak today",
    "Score 300+ points in one session"
  ],
  streak: [
    "Complete tasks for 7 consecutive days",
    "Achieve a 10-task daily streak",
    "Maintain 5 activity points for 3 days"
  ],
  bonus: [
    "Complete all tasks for a bonus 50 points",
    "Reach 1000 cumulative points",
    "Unlock the next rank tier"
  ]
};

function generateRankUpChallenge() {
    const challenges = RANK_UP_CHALLENGES.mini;
    const randomIndex = Math.floor(Math.random() * challenges.length);
    const selectedChallenge = challenges[randomIndex];
    
    // Store in appData so it persists
    appData.rankUpChallenge = selectedChallenge;
    appData.hasActiveRankChallenge = true;
    
    return selectedChallenge;
}
    // Get next rank (if at highest, return null)
    const nextRankIndex = currentRankIndex + 1;
    if (nextRankIndex >= RANKS.length) return null;
    
    // Get challenge for next rank
    const challenge = RANK_UP_CHALLENGES[RANKS[nextRankIndex]] || "No challenge available";
    
    // Return challenge object that can be used in app state
    return {
        rank: RANKS[nextRankIndex],
        challenge,
        hasActiveRankChallenge: true
    };
}

function checkForRankUp() {
    const currentRankIndex = RANKS.indexOf(appData.currentRank);
    if (currentRankIndex === -1) return; // Already at max rank
    
    const nextThreshold = RANK_UP_THRESHOLDS[RANKS[currentRankIndex + 1]];
    
    if (appData.totalPoints >= nextThreshold && !appData.hasActiveRankChallenge) {
        generateRankUpChallenge();  // Generate the challenge
        saveData();  // Save it
    }
}

// Only rank up after completing the challenge
function completeRankChallenge() {
    appData.currentRank++;
    appData.hasActiveRankChallenge = false;
    showMaskedNotification('rankup');
    saveData();
}
}

function showRankUpModal(newRank) {
  const modal = document.getElementById('rankUpModal');
  const title = document.getElementById('rankUpTitle');
  const message = document.getElementById('rankUpMessage');
  const challenge = document.getElementById('rankUpChallenge');
  
  title.textContent = `⚡ RANK UP TO ${newRank}! ⚡`;
  message.textContent = `You have ascended! Welcome to Rank ${newRank}!`;
  
  // Random challenge
  const challengeTypes = ['mini', 'streak', 'bonus'];
  const randomType = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
  const randomChallenge = RANK_UP_CHALLENGES[randomType][
    Math.floor(Math.random() * RANK_UP_CHALLENGES[randomType].length)
  ];
  
  challenge.innerHTML = `<strong>🎯 Challenge:</strong><br>${randomChallenge}`;
  
  modal.style.display = 'flex';
}

function closeRankUpModal() {
  document.getElementById('rankUpModal').style.display = 'none';
}

function acceptRankUpChallenge() {
  closeRankUpModal();
  showNotification('Challenge Accepted! Your destiny awaits...', 'success');
}

// Call rank check after task completion
function completeTask(index) {
  // ... existing complete task logic ...
  appData.totalPoints += points;
    checkAchievements();
  checkForRankUp(); // Add this line
  // ... rest of logic ...
}

function addAchievement(achievementName) {
    if (!appData.achievements) {
        appData.achievements = [];
    }
    
    // Don't add duplicates
    if (!appData.achievements.includes(achievementName)) {
        appData.achievements.push(achievementName);
        saveData();
        updateDisplay();  // This will refresh and show the achievement
    }
}

// DISPLAY RANK UP CHALLENGE
function renderRankUpChallenge() {
    const challengeBox = document.getElementById('rankUpChallengeBox');
    const challengeText = document.getElementById('rankUpChallengeText');
    
    if (appData.hasActiveRankChallenge && appData.rankUpChallenge) {
        challengeBox.style.display = 'block';
        challengeText.textContent = appData.rankUpChallenge;
    } else {
        challengeBox.style.display = 'none';
    }
}

// DISPLAY ACHIEVEMENTS
function renderAchievements() {
    const achievementsList = document.getElementById('achievementsList');
    
    if (appData.achievements && appData.achievements.length > 0) {
        // Clear previous list
        achievementsList.innerHTML = '';
        
        // Loop through each achievement and display it
        appData.achievements.forEach(achievement => {
            const achievementDiv = document.createElement('div');
            achievementDiv.className = 'achievement-item';
            achievementDiv.textContent = achievement;
            achievementsList.appendChild(achievementDiv);
        });
    } else {
        achievementsList.innerHTML = '<p style="color: gray;">No achievements yet</p>';
    }
}

// ==================== ACHIEVEMENTS & STREAK TRACKING ====================
const ACHIEVEMENTS = [
  { id: 'first_task', icon: '✅', name: 'First Step', desc: 'Complete 1 task' },
  { id: 'task_master', icon: '⭐', name: 'Task Master', desc: 'Complete 50 tasks' },
  { id: 'streak_7', icon: '🔥', name: 'On Fire', desc: '7-day streak' },
  { id: 'streak_30', icon: '🚀', name: 'Unstoppable', desc: '30-day streak' },
  { id: 'points_1000', icon: '💎', name: 'Point Collector', desc: 'Earn 1000 points' },
  { id: 'all_categories', icon: '🎯', name: 'Balanced', desc: 'Complete all categories' },
  { id: 'premium_user', icon: '👑', name: 'Elite', desc: 'Get premium' },
  { id: 'rank_s', icon: '👹', name: 'S-Rank God', desc: 'Reach S rank' }
];

if (!appData.achievements) appData.achievements = {};
if (!appData.streaks) appData.streaks = {
  current: 0,
  longest: 0,
  lastCompletedDate: null
};

function updateStreaks() {
  const today = new Date().toDateString();
  const lastDate = appData.streaks.lastCompletedDate;
  
  if (lastDate !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastDate === yesterday.toDateString()) {
      appData.streaks.current++;
    } else if (lastDate !== today) {
      appData.streaks.current = 1;
    }
    
    appData.streaks.lastCompletedDate = today;
    appData.streaks.longest = Math.max(appData.streaks.longest, appData.streaks.current);
  }
}

function checkAchievements() {
  // First task
  if (appData.tasks.length >= 1) unlockAchievement('first_task');
  
  // Task master
  const completedTasks = appData.tasks.filter(t => t.completed).length;
  if (completedTasks >= 50) unlockAchievement('task_master');
  
  // Streaks
  if (appData.streaks.current >= 7) unlockAchievement('streak_7');
  if (appData.streaks.current >= 30) unlockAchievement('streak_30');
  
  // Points
  if (appData.totalPoints >= 1000) unlockAchievement('points_1000');
  
  // Premium
  if (appData.premiumStatus !== 'free') unlockAchievement('premium_user');
  
  // Rank S
  if (appData.currentRank === 'S' || appData.currentRank === 'SS' || appData.currentRank === 'SSS') {
    unlockAchievement('rank_s');
  }
}

function unlockAchievement(achId) {
  if (!appData.achievements[achId]) {
    appData.achievements[achId] = { unlocked: true, unlockedDate: new Date().toISOString() };
    const ach = ACHIEVEMENTS.find(a => a.id === achId);
    if (ach) showNotification(`🏆 Achievement Unlocked: ${ach.name}!`, 'success');
    saveData();
  }
}

function toggleAchievementsPanel() {
  const panel = document.getElementById('achievementsPanel');
  panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
  if (panel.style.display !== 'none') renderAchievements();
}

function closeAchievementsPanel() {
  document.getElementById('achievementsPanel').style.display = 'none';
}

function renderAchievements() {
  const streakContainer = document.getElementById('streakContainer');
  const achievementsContainer = document.getElementById('achievementsContainer');
  
  // Render streaks
  streakContainer.innerHTML = `
    <div class="streak-item">
      <div class="streak-count">${appData.streaks.current}</div>
      <div class="streak-label">Current Streak</div>
    </div>
    <div class="streak-item">
      <div class="streak-count">${appData.streaks.longest}</div>
      <div class="streak-label">Longest Streak</div>
    </div>
  `;
  
  // Render achievements
  achievementsContainer.innerHTML = ACHIEVEMENTS.map(ach => {
    const unlocked = appData.achievements[ach.id];
    return `
      <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${ach.icon}</div>
        <div class="achievement-name">${ach.name}</div>
        <div class="achievement-desc">${ach.desc}</div>
      </div>
    `;
  }).join('');
}

// ==================== MOTIVATIONAL NOTIFICATIONS (ISEKAI THEME) ====================
const ISEKAI_MESSAGES = {
  greetings: [
    { icon: '👹', title: 'Welcome Back, Summoned One!', text: 'Your destiny awaits. Begin your trials today!' },
    { icon: '⚡', title: 'Power Awakens!', text: 'Channel your inner strength. Complete tasks to grow stronger!' },
    { icon: '🔮', title: 'Fate Calls...', text: 'The heavens watch your progress. Rise to greatness!' },
    { icon: '🌙', title: 'Moonlight Guidance', text: 'In this new world, your will shapes reality. Act with purpose!' }
  ],
  taskCompletion: [
    { icon: '✨', title: 'Quest Complete!', text: 'One step closer to godhood. Keep going!' },
    { icon: '⚔️', title: 'Victory!', text: 'Your power grows with each trial. Onwards!' },
    { icon: '💪', title: 'Strength Increased!', text: 'Every completed quest forges your legend!' },
    { icon: '🎯', title: 'On Target!', text: 'Your will bends reality. Continue this path!' }
  ],
  streaks: [
    { icon: '🔥', title: 'Burning Streak!', text: 'Your momentum is unstoppable. 3 more to reach the heavens!' },
    { icon: '⭐', title: 'Celestial Bond', text: 'The stars align with your efforts! Keep the flame alive!' },
    { icon: '🚀', title: 'Ascension Imminent!', text: 'Your power rivals the gods. Do not falter now!' }
  ],
  levelUp: [
    { icon: '👑', title: 'Rank Ascension!', text: 'You transcend your former self. A new era begins!' },
    { icon: '⚡', title: 'Divine Breakthrough!', text: 'The heavens recognize your power. Fear no mortal!' },
    { icon: '🌟', title: 'Legend Rising!', text: 'Your name shall echo through dimensions. Claim your throne!' }
  ],
  motivational: [
    { icon: '💎', title: 'Diamond Will', text: 'Even the mightiest face trials. Your resolve is your strength.' },
    { icon: '🎭', title: 'Script Your Fate', text: 'In this world, destiny is written by your actions!' },
    { icon: '🔗', title: 'Bonds Matter', text: 'Your achievements inspire worlds. Never surrender!' }
  ]
};

function showNotification(message, type = 'info', title = 'Atherion') {
  const container = document.getElementById('notificationContainer');
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const icons = { success: '✓', warning: '⚠', info: 'ℹ', error: '✕' };
  
  notification.innerHTML = `
    <div class="notification-icon">${icons[type]}</div>
    <div class="notification-content">
      <div class="notification-title">${title}</div>
      <div class="notification-message">${message}</div>
    </div>
    <div class="notification-close" onclick="this.parentElement.remove()">×</div>
  `;
  
  container.appendChild(notification);
  
  setTimeout(() => notification.remove(), 5000);
}

function showIsekaiNotification(messageType) {
  const messages = ISEKAI_MESSAGES[messageType] || [];
  if (messages.length === 0) return;
  
  const msg = messages[Math.floor(Math.random() * messages.length)];
  const container = document.getElementById('notificationContainer');
  const notification = document.createElement('div');
  notification.className = 'notification info';
  
  notification.innerHTML = `
    <div class="notification-icon">${msg.icon}</div>
    <div class="notification-content">
      <div class="notification-title">${msg.title}</div>
      <div class="notification-message">${msg.text}</div>
    </div>
    <div class="notification-close" onclick="this.parentElement.remove()">×</div>
  `;
  
  container.appendChild(notification);
  
  setTimeout(() => notification.remove(), 6000);
}

// Trigger on app load
function triggerGreeting() {
  showIsekaiNotification('greetings');
}

// Call on task completion
function onTaskCompleted() {
  showIsekaiNotification('taskCompletion');
  updateStreaks();
  checkAchievements();
  checkForRankUp();
}

// Call periodically for motivation
function triggerMotivationalNotification() {
  const hour = new Date().getHours();
  if ((hour === 9 || hour === 17 || hour === 21) && appData.premiumStatus !== 'free') {
    showIsekaiNotification('motivational');
  }
}

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
