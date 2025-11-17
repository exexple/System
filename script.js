// ==================== ATHERION PHASE A+B - FULLY WORKING WITH MODALS ====================
const firebaseConfig = {
  apiKey: "AIzaSyAle5y1wcHMMyDxu-ppPkMfM5hFQNKahOQ",
  authDomain: "routine-planner-daf33.firebaseapp.com",
  databaseURL: "https://routine-planner-daf33-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "routine-planner-daf33",
  storageBucket: "routine-planner-daf33.appspot.com",
  messagingSenderId: "62028696155",
  appId: "1:62028696155:web:5e6b1896e0f60eacb40d7e"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const RANKS = ['E', 'EE', 'EEE', 'D', 'DD', 'DDD', 'C', 'CC', 'CCC', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA', 'S', 'SS', 'SSS'];
const PRIORITY_POINTS = { high: 100, medium: 50, low: 30 };
const PRIORITY_PENALTIES = { high: 50, medium: 25, low: 15 };
const REWARD_AD_CONFIG = { adsRequired: 10, premiumDays: 7 };

// ==================== ACHIEVEMENT SYSTEM ====================
const ACHIEVEMENTS = [
  { id: 'first_task', name: '🎯 First Step', check: (d) => d.lifetimeTasksCompleted >= 1, msg: 'First task completed! 🚀' },
  { id: 'streak_3', name: '🔥 3-Day Streak', check: (d) => d.streakDays >= 3, msg: '3-day streak! Unstoppable! 🔥' },
  { id: 'streak_7', name: '⭐ 7-Day Streak', check: (d) => d.streakDays >= 7, msg: '7-day streak! Legendary! ⭐' },
  { id: 'streak_30', name: '👑 30-Day Streak', check: (d) => d.streakDays >= 30, msg: '30-day streak! Master! 👑' },
  { id: 'task_50', name: '🎊 50 Tasks', check: (d) => d.lifetimeTasksCompleted >= 50, msg: '50 tasks! Amazing! 🎊' },
  { id: 'task_100', name: '💯 100 Tasks', check: (d) => d.lifetimeTasksCompleted >= 100, msg: '100 tasks! 💯' },
  { id: 'task_500', name: '🏆 500 Tasks', check: (d) => d.lifetimeTasksCompleted >= 500, msg: '500 tasks! Champion! 🏆' }
];

function checkAchievements() {
  ACHIEVEMENTS.forEach(ach => {
    if (ach.check(appData) && !appData.unlockedAchievements.includes(ach.id)) {
      appData.unlockedAchievements.push(ach.id);
      showModal(ach.msg, `🏆 ${ach.name}`, '🏆');
    }
  });
}

function updateStreak() {
  const today = new Date().toDateString();
  if (appData.lastTaskDate !== today) {
    if (!appData.lastTaskDate) {
      appData.streakDays = 1;
    } else {
      const last = new Date(appData.lastTaskDate);
      const now = new Date();
      const diff = Math.floor((now - last) / 86400000);
      if (diff === 1) appData.streakDays++;
      else if (diff > 1) appData.streakDays = 1;
    }
    appData.lastTaskDate = today;
  }
}


// ==================== STYLED MODAL SYSTEM ====================
function showModal(message, title = 'Info', icon = '') {
  let modal = document.getElementById('customModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'customModal';
    modal.style = "position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(12,13,24,0.8);z-index:10000;display:flex;align-items:center;justify-content:center";
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div id="customModalBox" style="background:#222;border:3px solid gold;color:#fff;border-radius:12px;max-width:90vw;width:330px;margin:auto;padding:28px;text-align:center;box-shadow:0 0 30px gold"><div style="font-size:32px;margin-bottom:10px">${icon}</div><div style="font-size:19px;font-weight:bold;margin-bottom:10px;color:gold">${title}</div><div style="margin:15px 0;color:#adf;line-height:1.6">${message}</div><button onclick="closeModal()" style="margin-top:12px;padding:10px 48px;background:gold;color:#1a1d25;border:none;border-radius:7px;font-size:16px;font-weight:bold;cursor:pointer">OK</button></div>`;
  modal.style.display = "flex";
}

function closeModal() {
  let modal = document.getElementById('customModal');
  if (modal) modal.style.display = "none";
}

// ==================== ISEKAI GREETINGS & MOTIVATIONAL MESSAGES ====================
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
  { id: 'task_50', name: 'Quest Veteran', desc: 'Complete 50 tasks', icon: '⚔️', check: (data) => data.lifetimeTasksCompleted >= 50 },
];

let appData = {
  totalPoints: 0,
  tasks: [],
  premiumStatus: 'free',
  premiumExpiry: null,
  adsWatched: 0,
  aiQueriesUsedToday: 0,
  lastAiResetDate: null,
  lastResetDate: null,
  currentRank: 0,
  lifetimeTasksCompleted: 0,
  streakDays: 0,
  lastTaskDate: null,
  unlockedAchievements: [],
  hasActiveRankChallenge: false,
  rankUpChallenge: null,
  rankUpChallengeProgress: 0,
  achievements: [],
  lastMotivationTime: null,
  rankLockedUntilChallenge: false
};

let currentCategory = 1;

let USER_ID = localStorage.getItem('atherion_user_id');
if (!USER_ID) {
  USER_ID = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  localStorage.setItem('atherion_user_id', USER_ID);
}

function watchAd() {
  if (appData.adsWatched >= REWARD_AD_CONFIG.adsRequired) {
    showModal('You have already watched all 10 ads! 7 Days Premium is now active! 👑', 'PREMIUM UNLOCKED', '🎉');
    return;
  }
  appData.adsWatched++;
  const adsCountEl = document.getElementById('adsWatchedCount');
  if (adsCountEl) {
    adsCountEl.textContent = appData.adsWatched;
  }
  if (appData.adsWatched >= REWARD_AD_CONFIG.adsRequired) {
    appData.premiumStatus = 'premium';
    const premiumDuration = REWARD_AD_CONFIG.premiumDays * 24 * 60 * 60 * 1000;
    appData.premiumExpiry = Date.now() + premiumDuration;
    showModal('🎉 CONGRATULATIONS! You have unlocked 7 Days Premium!<br><br>Enjoy exclusive rewards and features, Hero! ⭐', '7 DAYS PREMIUM', '🏆');
    saveData();
    renderUI();
  } else {
    showModal(`Ad watched! ${appData.adsWatched}/${REWARD_AD_CONFIG.adsRequired} ads completed.<br><br>Keep going! You're almost there! 🚀`, 'AD WATCHED', '📺');
    saveData();
  }
}

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

function checkMidnightReset() {
  const today = new Date().toDateString();
  if (appData.lastResetDate !== today) {
    console.log('🌅 New day! Applying penalties...');
    let penalties = 0;
    appData.tasks.forEach(task => {
      if (!task.isDone) {
        const pen = PRIORITY_PENALTIES[task.priority];
        appData.totalPoints = Math.max(0, appData.totalPoints - pen);
        penalties += pen;
      }
      task.isDone = false;
      task.doneTimestamp = null;
    });
    appData.lastResetDate = today;
    if (penalties > 0) {
      showModal(`You lost <strong style="color:#ff6b6b">${penalties} points</strong> for incomplete tasks.<br><br>💡 Complete tasks daily to avoid penalties!`, 'MIDNIGHT PENALTIES', '⚠️');
    }
    saveData();
  }
}

function formatPoints(points) {
  if (points >= 1000000) return (points / 1000000).toFixed(1).replace('.0', '') + 'M';
  if (points >= 1000) return (points / 1000).toFixed(1).replace('.0', '') + 'k';
  return points.toString();
}

function showIsekaiGreeting() {
  const greeting = ISEKAI_GREETINGS[Math.floor(Math.random() * ISEKAI_GREETINGS.length)];
  showModal(greeting, 'WELCOME HERO', '✨');
}

function showMotivationalNotification() {
  const now = Date.now();
  const lastTime = appData.lastMotivationTime || 0;
  const twoHours = 2 * 60 * 60 * 1000;
  if (now - lastTime > twoHours && appData.tasks.length > 0) {
    const message = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    showModal(message, 'STAY MOTIVATED', '💥');
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
      setTimeout(() => {
        showModal(`<strong>${ach.name}</strong><br><br>${ach.desc}`, 'ACHIEVEMENT UNLOCKED', ach.icon);
      }, 200);
    });
  }
}

function checkRankUp() {
  const currentLevel = calculateLevel(appData.totalPoints);
  const currentRankIndex = Math.floor(currentLevel / 10);
  if ((currentLevel % 10) === 9 && currentRankIndex < (RANKS.length - 1) && !appData.rankLockedUntilChallenge) {
    if (!appData.hasActiveRankChallenge) {
      generateRankUpChallenge();
    }
  }
}

function generateRankUpChallenge() {
  const challenges = ["Complete 3 high-priority tasks today","Earn 200 points without losing any","Complete all tasks in one category","Maintain a 3-day streak","Complete 5 tasks in a single day"];
  const challenge = challenges[Math.floor(Math.random() * challenges.length)];
  appData.rankUpChallenge = challenge;
  appData.hasActiveRankChallenge = true;
  appData.rankLockedUntilChallenge = true;
  appData.rankUpChallengeProgress = 0;
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

function showRankUpModal() {
  const nextRankIndex = Math.floor(calculateLevel(appData.totalPoints) / 10) + 1;
  const nextRank = RANKS[Math.min(nextRankIndex, RANKS.length - 1)];
  showModal(`A challenge has appeared to test your resolve!<br><br><strong style="color:#b19cd9">${appData.rankUpChallenge}</strong>`, `RANK UP CHALLENGE - ${nextRank} RANK`, '⚡');
}

function isChallengeCompleted() {
  if (!appData.rankUpChallenge) return false;
  const challenge = appData.rankUpChallenge.toLowerCase();
  if (challenge.includes('complete 3 high-priority tasks')) {
    const highDone = appData.tasks.filter(t => t.priority === 'high' && t.isDone && new Date(t.doneTimestamp).toDateString() === new Date().toDateString()).length;
    return highDone >= 3;
  }
  if (challenge.includes('earn 200 points')) {
    const earned = appData.tasks.filter(t => t.isDone && new Date(t.doneTimestamp).toDateString() === new Date().toDateString()).reduce((sum, t) => sum + PRIORITY_POINTS[t.priority], 0);
    return earned >= 200;
  }
  if (challenge.includes('complete all tasks in one category')) {
    const tasks = appData.tasks.filter(t => t.category === currentCategory);
    return tasks.length > 0 && tasks.every(t => t.isDone);
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

function completeRankUpChallenge() {
  if (!appData.hasActiveRankChallenge) return;
  const currentLevel = calculateLevel(appData.totalPoints);
  const nextRankIndex = Math.floor(currentLevel / 10) + 1;
  appData.hasActiveRankChallenge = false;
  appData.rankUpChallenge = null;
  appData.rankUpChallengeProgress = 0;
  appData.rankLockedUntilChallenge = false;
  const pointsNeeded = getPointsPerRank(nextRankIndex - 1) - (appData.totalPoints % getPointsPerRank(nextRankIndex - 1));
  appData.totalPoints += pointsNeeded + 100;
  saveData();
  renderUI();
  renderRankUpChallenge();
  showModal(`🎉 CHALLENGE COMPLETED!<br><br>You've advanced to <strong>${RANKS[nextRankIndex]}</strong> Rank!<br><br>💎 Bonus: +${pointsNeeded + 100} points!`, 'RANK UP!', '🏆');
}

function renderAchievements() {
  const panel = document.getElementById('achievementsList');
  if (!panel) return;
  panel.innerHTML = '';
  ACHIEVEMENTS_LIST.forEach(ach => {
    const unlocked = appData.achievements.includes(ach.id);
    const achDiv = document.createElement('div');
    achDiv.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
    achDiv.innerHTML = `<div class="ach-icon">${unlocked ? ach.icon : '🔒'}</div><div class="ach-info"><div class="ach-name">${ach.name}</div><div class="ach-desc">${ach.desc}</div></div>`;
    panel.appendChild(achDiv);
  });
}

function toggleAchievementsPanel() {
  const panel = document.getElementById('achievementsPanel');
  if (!panel) return;
  if (panel.style.display === 'none' || !panel.style.display) {
    panel.style.display = 'block';
    renderAchievements();
  } else {
    panel.style.display = 'none';
  }
}

function renderUI() {
  const pointsEl = document.getElementById('totalPoints');
  if (pointsEl) pointsEl.textContent = formatPoints(appData.totalPoints);
  const level = calculateLevel(appData.totalPoints);
  const rank = calculateRank(level);
  const levelEl = document.getElementById('levelDisplay');
  const rankEl = document.getElementById('rankDisplay');
  if (levelEl) levelEl.textContent = level;
  if (rankEl) rankEl.textContent = rank;
  const isPremium = appData.premiumStatus === 'premium' && (!appData.premiumExpiry || appData.premiumExpiry > Date.now());
  const premiumEl = document.getElementById('premiumBadge');
  if (premiumEl) {
    premiumEl.style.display = isPremium ? 'block' : 'none';
  }
  const adsCountEl = document.getElementById('adsWatchedCount');
  if (adsCountEl) {
    adsCountEl.textContent = appData.adsWatched || 0;
  }
  const progress = getCurrentLevelProgress(appData.totalPoints);
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = progress.percent + '%';
  }
  const progressText = document.getElementById('progressText');
  if (progressText) {
    progressText.textContent = `${Math.floor(progress.current)}/${progress.required}`;
  }
  renderTasks();
  renderRankUpChallenge();
}

function renderTasks() {
  const container = document.getElementById('tasksContainer');
  if (!container) return;
  const filtered = appData.tasks.filter(t => t.category === currentCategory);
  container.innerHTML = '';
  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">📝 No tasks yet. Add one!</p>';
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
    if (task.isDone && !task.doneTimestamp) {
      appData.lifetimeTasksCompleted++;
      updateStreak();
      checkAchievements();
    }
    task.doneTimestamp = Date.now();
    appData.totalPoints += PRIORITY_POINTS[task.priority];
    showModal(`Task completed!<br><br>+${PRIORITY_POINTS[task.priority]} points earned!`, 'TASK COMPLETE', '✅');
    checkAchievements();
    checkRankUp();
  } else {
    task.doneTimestamp = null;
    appData.totalPoints = Math.max(0, appData.totalPoints - PRIORITY_POINTS[task.priority]);
  }
  saveData();
  renderUI();
}

function confirmDelete(message, onConfirm) {
    showModal(
        `<div>${message}</div>
         <div style="margin-top:16px;">
            <button onclick="closeModal();window._confirmDeleteHandler(true)">Yes</button>
            <button onclick="closeModal();window._confirmDeleteHandler(false)" style="margin-left:8px;">No</button>
         </div>`,
        'Delete Task',
        '🗑️'
    );
    window._confirmDeleteHandler = function(confirmed) {
        if (confirmed && typeof onConfirm === 'function') onConfirm();
        window._confirmDeleteHandler = null;
    }
}

function deleteTask(index) {
    confirmDelete("Delete this task?", function() {
        appData.tasks.splice(index, 1);
        saveData();
        updateDisplay();
    });
}

function addTask() {
  const input = document.getElementById('taskInput');
  const prioritySelect = document.getElementById('prioritySelect');
  if (!input || !prioritySelect) return;
  const text = input.value.trim();
  if (!text) {
    showModal('Task cannot be empty!<br><br>Please enter a task name.', 'INVALID TASK', '⚠️');
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
  document.querySelectorAll('.category-btn').forEach((btn, idx) => {
    btn.classList.toggle('active', idx + 1 === cat);
  });
  renderUI();
}

function saveData() {
  localStorage.setItem('atherion_data', JSON.stringify(appData));
  if (USER_ID) {
    database.ref('users/' + USER_ID).set(appData).catch(err => console.error('Firebase save error:', err));
  }
}

function loadData() {
  const local = localStorage.getItem('atherion_data');
  if (local) {
    try {
      appData = { ...appData, ...JSON.parse(local) };
    } catch (e) {
      console.error('Error parsing local data:', e);
    }
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

document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Initializing Atherion...');
  loadData();
  checkMidnightReset();
  renderUI();
  showIsekaiGreeting();
  setInterval(showMotivationalNotification, 30 * 60 * 1000);
  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', addTask);
  }
  const taskInput = document.getElementById('taskInput');
  if (taskInput) {
    taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTask();
    });
  }
  const achievementsBtn = document.getElementById('achievementsOpenBtn');
  if (achievementsBtn) {
    achievementsBtn.addEventListener('click', toggleAchievementsPanel);
  }
  const rankUpBox = document.getElementById('rankUpChallengeBox');
  if (rankUpBox) {
    rankUpBox.addEventListener('click', () => {
      if (!appData.hasActiveRankChallenge) return;
      if (!isChallengeCompleted()) {
        showModal(`You must finish this challenge first!<br><br><strong>"${appData.rankUpChallenge}"</strong>`, 'CHALLENGE NOT COMPLETED', '❌');
        return;
      }
      completeRankUpChallenge();
    });
  }
  console.log('✅ Atherion fully initialized!');
});
