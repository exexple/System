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

// ==================== STYLED MODAL SYSTEM ====================
function showModal(message, title = 'Info', icon = '', subtitle = '') {
  let modal = document.getElementById('customModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'customModal';
    modal.style = "position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(12,13,24,0.8);z-index:10000;display:flex;align-items:center;justify-content:center";
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div style="background:#1a1d2e;padding:30px;border-radius:15px;border:3px solid #ffd700;box-shadow:0 0 30px rgba(255,215,0,0.5);text-align:center;max-width:300px;animation:popIn 0.3s ease">
      <div style="font-size:40px;margin-bottom:15px">${icon}</div>
      <h2 style="color:#ffd700;margin:10px 0;font-size:24px">${title}</h2>
      <p style="color:#e0e0e0;margin:10px 0;font-size:16px">${message}</p>
      ${subtitle ? `<p style="color:#90EE90;margin:5px 0;font-weight:bold">${subtitle}</p>` : ''}
      <button onclick="document.getElementById('customModal').style.display='none'" style="background:#ffd700;color:#000;border:none;padding:12px 30px;border-radius:8px;font-weight:bold;cursor:pointer;margin-top:20px;font-size:16px">OK</button>
    </div>
  `;
  modal.style.display = 'flex';
}

// ==================== ACHIEVEMENT MODAL SYSTEM ====================
function showAchievementModal(achievementName, achievementDesc) {
  showModal(
    achievementDesc,
    '🏆 ACHIEVEMENT UNLOCKED',
    '🎉',
    achievementName
  );
}

// ==================== LOAD DATA FROM LOCALSTORAGE ====================
function loadAppData() {
  const saved = localStorage.getItem('appData');
  if (saved) {
    appData = JSON.parse(saved);
    // ENSURE ACHIEVEMENTS ARE LOADED
    if (!appData.achievements) {
      appData.achievements = {};
    }
    return;
  }
  initializeAppData();
}

function initializeAppData() {
  appData = {
    tasks: [],
    totalPoints: 0,
    currentRankIndex: 0,
    streakDays: 0,
    lastTaskDate: null,
    lifetimeTasksCompleted: 0,
    unlockedAchievements: {},
    threeDayStreakUnlocked: false,
    fiftyTasksUnlocked: false,
    achievements: {} // Initialize achievements object
  };
}

let appData = {};

// Load data on page load
window.addEventListener('load', () => {
  loadAppData();
  renderTasks();
  updateStats();
  updateRankDisplay();
  updateStreakDisplay();
});

// ==================== SAVE DATA TO LOCALSTORAGE ====================
function saveAppData() {
  localStorage.setItem('appData', JSON.stringify(appData));
}

// ==================== TASK MANAGEMENT ====================
function addTask(text, priority = 'medium') {
  if (!text.trim()) return;
  const task = {
    id: Date.now(),
    text: text.trim(),
    priority: priority,
    isDone: false,
    doneTimestamp: null,
    createdAt: Date.now()
  };
  appData.tasks.push(task);
  saveAppData();
  renderTasks();
  document.getElementById('taskInput').value = '';
}

function deleteTask(index) {
  appData.tasks.splice(index, 1);
  saveAppData();
  renderTasks();
}

function renderTasks() {
  const container = document.getElementById('taskList');
  if (!container) return;
  container.innerHTML = '';
  
  const filter = document.getElementById('taskFilter')?.value || 'active';
  let filtered = appData.tasks;
  
  if (filter === 'active') {
    filtered = appData.tasks.filter(t => !t.isDone);
  } else if (filter === 'done') {
    filtered = appData.tasks.filter(t => t.isDone);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = '📝 No tasks yet. Add one!';
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
      updateStreakOnTaskComplete();
      check3DayStreakChallenge();
    }
    
    task.doneTimestamp = Date.now();
    appData.totalPoints += PRIORITY_POINTS[task.priority];
    
    // FIX #1: PROPER TASK COMPLETE MODAL WITH ALL PARAMETERS
    showModal(
      'Task completed!',
      'TASK COMPLETE',
      '✅',
      `+${PRIORITY_POINTS[task.priority]} points earned`
    );
    
    // CHECK ACHIEVEMENTS AFTER COMPLETING TASK
    checkAchievements();
  } else {
    if (task.doneTimestamp) {
      appData.totalPoints -= PRIORITY_POINTS[task.priority];
      task.doneTimestamp = null;
    }
  }
  
  saveAppData();
  renderTasks();
  updateStats();
}

// ==================== ACHIEVEMENT SYSTEM ====================
function checkAchievements() {
  // Achievement 1: First Quest (Complete first task)
  if (appData.lifetimeTasksCompleted === 1 && !appData.achievements.firstQuest) {
    appData.achievements.firstQuest = true;
    showAchievementModal('First Quest', 'Complete your first task');
    saveAppData();
  }
  
  // Achievement 2: 50 Tasks (Complete 50 tasks)
  if (appData.lifetimeTasksCompleted === 50 && !appData.achievements.fiftyTasks) {
    appData.achievements.fiftyTasks = true;
    showAchievementModal('Task Master', 'Complete 50 tasks');
    saveAppData();
  }
  
  // Achievement 3: 3-Day Streak
  if (appData.streakDays === 3 && !appData.achievements.threeDayStreak) {
    appData.achievements.threeDayStreak = true;
    showAchievementModal('Streak Master', 'Maintain a 3-day streak');
    saveAppData();
  }
  
  // Add more achievements as needed
}

// ==================== STREAK MANAGEMENT ====================
function updateStreakOnTaskComplete() {
  const today = new Date().toDateString();
  const lastDate = appData.lastTaskDate ? new Date(appData.lastTaskDate).toDateString() : null;
  
  if (lastDate !== today) {
    if (lastDate === new Date(Date.now() - 86400000).toDateString()) {
      appData.streakDays++;
    } else {
      appData.streakDays = 1;
    }
    appData.lastTaskDate = today;
    updateStreakDisplay();
  }
}

function check3DayStreakChallenge() {
  if (appData.streakDays === 3 && !appData.threeDayStreakUnlocked) {
    appData.threeDayStreakUnlocked = true;
    // This will also be caught by checkAchievements()
  }
}

function updateStreakDisplay() {
  const element = document.getElementById('streakCount');
  if (element) {
    element.textContent = appData.streakDays || 0;
  }
}

// ==================== STATS & RANK ====================
function updateStats() {
  const pointsEl = document.getElementById('totalPoints');
  const completedEl = document.getElementById('completedTasks');
  
  if (pointsEl) pointsEl.textContent = appData.totalPoints || 0;
  if (completedEl) completedEl.textContent = appData.lifetimeTasksCompleted || 0;
  
  saveAppData();
}

function updateRankDisplay() {
  const rankEl = document.getElementById('currentRank');
  if (rankEl && RANKS[appData.currentRankIndex]) {
    rankEl.textContent = RANKS[appData.currentRankIndex];
  }
}

// ==================== UI EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('addTaskBtn');
  const prioritySelect = document.getElementById('prioritySelect');
  const filterBtn = document.getElementById('taskFilter');
  
  if (addBtn) {
    addBtn.onclick = () => {
      const input = document.getElementById('taskInput');
      const priority = prioritySelect?.value || 'medium';
      addTask(input.value, priority);
    };
  }
  
  if (filterBtn) {
    filterBtn.onchange = renderTasks;
  }
});

// ==================== UTILITY FUNCTIONS ====================
function getUnlockedAchievements() {
  return Object.keys(appData.achievements || {}).filter(key => appData.achievements[key] === true);
}

function displayAchievementsMenu() {
  const unlockedCount = getUnlockedAchievements().length;
  console.log(`Unlocked Achievements: ${unlockedCount}`);
  // Render achievement menu based on unlocked achievements
}
