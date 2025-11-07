// ==================== ATHERION PHASE A - WORKING VERSION ====================
const firebaseConfig = {
  apiKey: "AIzaSyAle5y1wcHMMyDxu-ppPkMfM5hFQNKahOQ",
  authDomain: "routine-planner-daf33.firebaseapp.com",
  databaseURL: "https://routine-planner-daf33-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "routine-planner-daf33",
  storageBucket: "routine-planner-daf33.appspot.com",  // FIXED: Changed from .firebasestorage.app
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
  rankUpChallengeProgress: 0,  // NEW: Track challenge progress
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
  const greeting = ISEKAI_GREETINGS[Math.floor(Math.random() * ISEKAI_GREETINGS.length)];
  alert(greeting);
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
  appData.rankUpChallengeProgress = 0;  // FIXED: Initialize progress
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

// ==================== ANTI-CHEAT: Check if challenge is completed ====================
function isChallengeCompleted() {
  if (!appData.rankUpChallenge) return false;
  const challenge = appData.rankUpChallenge.toLowerCase();

  if (challenge.includes('complete 3 high-priority tasks')) {
    const highDone = appData.tasks.filter(t =>
      t.priority === 'high' && t.isDone &&
      new Date(t.doneTimestamp).toDateString() === new Date().toDateString()
    ).length;
    return highDone >= 3;
  }
  if (challenge.includes('earn 200 points')) {
    const earned = appData.tasks.filter(t =>
      t.isDone && new Date(t.doneTimestamp).toDateString() === new Date().toDateString()
    ).reduce((sum, t) => sum + PRIORITY_POINTS[t.priority], 0);
    return earned >= 200;
  }
  if (challenge.includes('complete all tasks in one category')) {
    const tasks = appData.tasks.filter(t => t.category === currentCategory);
    return tasks.length && tasks.every(t => t.isDone);
  }
  if (challenge.includes('maintain a 3-day streak')) {
    let streak = 0;
    for (let i = 0; i < 3; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      if (appData.tasks.some(t => t.isDone && new Date(t.doneTimestamp).toDateString() === dateStr)) {
        streak++;
      }
    }
    return streak >= 3;
  }
  if (challenge.includes('complete 5 tasks')) {
    const doneToday = appData.tasks.filter(t => t.isDone && new Date(t.doneTimestamp).toDateString() === new Date().toDateString()).length;
    return doneToday >= 5;
  }
  return false;
}

// FIXED: Added completion handler for rank up challenge
function completeRankUpChallenge() {
  if (!appData.hasActiveRankChallenge) return;
  
  const currentLevel = calculateLevel(appData.totalPoints);
  const nextRankIndex = Math.floor(currentLevel / 10) + 1;
  
  // Clear the challenge
  appData.hasActiveRankChallenge = false;
  appData.rankUpChallenge = null;
  appData.rankUpChallengeProgress = 0;
  
  // Award bonus points to push to next rank
  const pointsNeeded = getPointsPerRank(nextRankIndex - 1) - (appData.totalPoints % getPointsPerRank(nextRankIndex - 1));
  appData.totalPoints += pointsNeeded + 100; // Extra 100 bonus
  
  saveData();
  renderUI();
  renderRankUpChallenge();
  
  // Show success message
  alert(`🎉 RANK UP CHALLENGE COMPLETED!
⚔️ You've advanced to ${RANKS[nextRankIndex]} Rank!
💎 Bonus: +${pointsNeeded + 100} points!`);
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
      <div class="ach-icon">${unlocked ? ach.icon : '🔒'}</div>
      <div class="ach-info">
        <div class="ach-name">${ach.name}</div>
        <div class="ach-desc">${ach.desc}</div>
      </div>
    `;
    panel.appendChild(achDiv);
  });
}

function toggleAchievementsPanel() {
  const panel = document.getElementById('achievementsPanel');
  if (panel.style.display === 'none' || !panel.style.display) {
    panel.style.display = 'block';
    renderAchievements();
  } else {
    panel.style.display = 'none';
  }
}

function showRankUpModal() {
  alert(`🎖️ RANK UP CHALLENGE AVAILABLE!

You're at Level 9! Complete the challenge to rank up to ${RANKS[Math.floor(calculateLevel(appData.totalPoints) / 10) + 1]}!

Challenge: ${appData.rankUpChallenge}

✅ Accept to begin!`);
}

// ==================== RENDER & UI ====================
function renderUI() {
  // Points
  document.getElementById('totalPoints').textContent = formatPoints(appData.totalPoints);
  
  // Level & Rank
  const level = calculateLevel(appData.totalPoints);
  const rank = calculateRank(level);
  document.getElementById('levelDisplay').textContent = level;
  document.getElementById('rankDisplay').textContent = rank;
  
  // Premium Badge
  const isPremium = appData.premiumStatus === 'premium' && (!appData.premiumExpiry || appData.premiumExpiry > Date.now());
  document.getElementById('premiumBadge').style.display = isPremium ? 'block' : 'none';
  
  // Progress Bar
  const progress = getCurrentLevelProgress(appData.totalPoints);
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = progress.percent + '%';
  }
  const progressText = document.getElementById('progressText');
  if (progressText) {
    progressText.textContent = `${progress.current}/${progress.required}`;
  }
  
  // Render tasks
  renderTasks();
  renderRankUpChallenge();
}

function renderTasks() {
  const container = document.getElementById('tasksContainer');
  if (!container) return;
  
  const filtered = appData.tasks.filter(t => t.category === currentCategory);
  container.innerHTML = '';
  
  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">No tasks yet. Add one!</p>';
    return;
  }
  
  filtered.forEach((task, idx) => {
    const realIdx = appData.tasks.indexOf(task);
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item ${task.isDone ? 'done' : ''} priority-${task.priority}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.isDone;
    checkbox.onchange = () => toggleTask(realIdx);
    
    const label = document.createElement('label');
    label.textContent = task.text;
    
    const pointsBadge = document.createElement('span');
    pointsBadge.className = 'task-points';
    pointsBadge.textContent = `+${PRIORITY_POINTS[task.priority]}`;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.className = 'delete-btn';
    deleteBtn.onclick = () => deleteTask(realIdx);
    
    taskDiv.appendChild(checkbox);
    taskDiv.appendChild(label);
    taskDiv.appendChild(pointsBadge);
    taskDiv.appendChild(deleteBtn);
    container.appendChild(taskDiv);
  });
}

function toggleTask(index) {
  const task = appData.tasks[index];
  if (!task) return;
  
  task.isDone = !task.isDone;
  if (task.isDone) {
    task.doneTimestamp = Date.now();
    appData.totalPoints += PRIORITY_POINTS[task.priority];
    alert(`✅ Task completed! +${PRIORITY_POINTS[task.priority]} points`);
    checkAchievements();
    checkRankUp();
  } else {
    task.doneTimestamp = null;
    appData.totalPoints -= PRIORITY_POINTS[task.priority];
  }
  saveData();
  renderUI();
}

function deleteTask(index) {
  if (confirm('Delete this task?')) {
    appData.tasks.splice(index, 1);
    saveData();
    renderUI();
  }
}

function addTask() {
  const input = document.getElementById('taskInput');
  const prioritySelect = document.getElementById('prioritySelect');
  if (!input || !prioritySelect) return;
  
  const text = input.value.trim();
  if (!text) {
    alert('⚠️ Task cannot be empty!');
    return;
  }
  
  appData.tasks.push({
    text,
    priority: prioritySelect.value,
    category: currentCategory,
    isDone: false,
    doneTimestamp: null
  });
  
  input.value = '';
  saveData();
  renderUI();
}

function switchCategory(cat) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.cat-btn')[cat - 1].classList.add('active');
  renderUI();
}

// ==================== DATA PERSISTENCE ====================
function saveData() {
  localStorage.setItem('atherion_data', JSON.stringify(appData));
  if (USER_ID) {
    database.ref('users/' + USER_ID).set(appData).catch(err => console.error('Firebase save error:', err));
  }
}

function loadData() {
  const local = localStorage.getItem('atherion_data');
  if (local) {
    appData = { ...appData, ...JSON.parse(local) };
  }
  if (USER_ID) {
    database.ref('users/' + USER_ID).once('value').then(snapshot => {
      if (snapshot.exists()) {
        appData = { ...appData, ...snapshot.val() };
        localStorage.setItem('atherion_data', JSON.stringify(appData));
        renderUI();
      }
    }).catch(err => console.error('Firebase load error:', err));
  }
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  checkMidnightReset();
  renderUI();
  showIsekaiGreeting();
  setInterval(showMotivationalNotification, 30 * 60 * 1000);
  
  // Event listeners
  document.getElementById('addTaskBtn')?.addEventListener('click', addTask);
  document.getElementById('taskInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
  });
  
  // FIXED: Add click handler for rank up challenge completion WITH ANTI-CHEAT
  document.getElementById('rankUpChallengeBox')?.addEventListener('click', () => {
    if (!appData.hasActiveRankChallenge) return;

    if (!isChallengeCompleted()) {
      alert(`❌ CHALLENGE NOT COMPLETED!

You must finish this challenge first:

"${appData.rankUpChallenge}"

🎖️ Complete the task to rank up!`);
      return;
    }

    if (confirm(`Complete Rank Up Challenge?

"${appData.rankUpChallenge}"

Click OK when you've completed it!`)) {
      completeRankUpChallenge();
    }
  });
});
