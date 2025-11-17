// ==================== ATHERION PHASE A+B - ENHANCED WITH STREAK & ACHIEVEMENTS ====================
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

// ==================== ACHIEVEMENTS LIST (Streak & Lifetime Milestones) ====================
const ACHIEVEMENTSLIST = [
  { id: 'first_task', name: '🎯 First Step', check: (data) => data.lifetimeTasksCompleted >= 1, message: 'First task completed! Keep going! 🚀' },
  { id: 'three_day_streak', name: '🔥 Three Day Streak', check: (data) => data.streakDays >= 3, message: '3-day streak! You\'re unstoppable! 🔥' },
  { id: 'seven_day_streak', name: '⭐ Seven Day Streak', check: (data) => data.streakDays >= 7, message: '7-day streak! Legendary! ⭐' },
  { id: 'thirty_day_streak', name: '👑 Thirty Day Streak', check: (data) => data.streakDays >= 30, message: '30-day streak! You\'re a master! 👑' },
  { id: 'fifty_tasks', name: '🎊 50 Tasks', check: (data) => data.lifetimeTasksCompleted >= 50, message: '50 lifetime tasks! Amazing dedication! 🎊' },
  { id: 'hundred_tasks', name: '💯 100 Tasks', check: (data) => data.lifetimeTasksCompleted >= 100, message: '100 lifetime tasks! You\'re unstoppable! 💯' },
  { id: 'five_hundred_tasks', name: '🏆 500 Tasks', check: (data) => data.lifetimeTasksCompleted >= 500, message: '500 lifetime tasks! Champion! 🏆' }
];

// ==================== ENHANCED MODAL SYSTEM WITH CONFIRMATION LOGIC ====================
function showModal(message, title = 'Info', buttons = ['OK'], onButtonClick = null) {
  let modal = document.getElementById('customModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'customModal';
    modal.style = "position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(12,13,24,0.8);z-index:10000;display:flex;align-items:center;justify-content:center";
    document.body.appendChild(modal);
  }

  let buttonsHTML = buttons.map((btn, idx) => {
    let btnClass = idx === 0 ? 'modal-btn-primary' : 'modal-btn-secondary';
    return `<button class="${btnClass}" onclick="handleModalButton(${idx}, ${onButtonClick ? true : false})">${btn}</button>`;
  }).join('');

  modal.innerHTML = `
    <div style="background:white;padding:30px;border-radius:10px;text-align:center;max-width:400px;box-shadow:0 4px 6px rgba(0,0,0,0.2)">
      <h2 style="margin:0 0 15px 0;color:#333">${title}</h2>
      <p style="margin:15px 0;color:#666;font-size:16px">${message}</p>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
        ${buttonsHTML}
      </div>
    </div>
  `;
  modal.style.display = 'flex';
  modal._currentCallback = onButtonClick;
  modal._currentButtons = buttons;
}

function handleModalButton(btnIdx) {
  const modal = document.getElementById('customModal');
  if (modal._currentCallback) {
    window[modal._currentCallback](btnIdx);
  }
  closeModal();
}

function closeModal() {
  const modal = document.getElementById('customModal');
  if (modal) modal.style.display = 'none';
}

// ==================== APP DATA WITH STREAK & LIFETIME TRACKING ====================
let appData = {
  tasks: [],
  totalPoints: 0,
  rank: 'E',
  lifetimeTasksCompleted: 0,  // NEW: Lifetime task counter
  streakDays: 0,               // NEW: Current streak
  lastTaskDate: null,          // NEW: Track last completed task date
  unlockedAchievements: [],    // NEW: Track unlocked achievements
  totalCompletedTasks: 0
};

// ==================== ACHIEVEMENT CHECKING ====================
function checkAchievements() {
  ACHIEVEMENTSLIST.forEach(achievement => {
    if (achievement.check(appData) && !appData.unlockedAchievements.includes(achievement.id)) {
      appData.unlockedAchievements.push(achievement.id);
      showModal(
        achievement.message,
        `🏆 Achievement Unlocked: ${achievement.name}`,
        ['Awesome!', 'Share']
      );
    }
  });
}

// ==================== STREAK TRACKING LOGIC ====================
function updateStreakData() {
  const today = new Date().toDateString();
  
  if (appData.lastTaskDate !== today) {
    if (!appData.lastTaskDate) {
      // First time tracking
      appData.streakDays = 1;
    } else {
      const lastDate = new Date(appData.lastTaskDate);
      const currentDate = new Date();
      const daysDiff = Math.floor((currentDate - lastDate) / 86400000);

      if (daysDiff === 1) {
        // Consecutive day - increment streak
        appData.streakDays++;
      } else if (daysDiff > 1) {
        // Missed days - reset streak
        appData.streakDays = 1;
      }
    }
    appData.lastTaskDate = today;
  }
}

// ==================== MAIN FUNCTIONS (All Original Logic Preserved) ====================
function renderTasks() {
  const container = document.getElementById('taskList');
  container.innerHTML = '';

  if (appData.tasks.length === 0) {
    container.innerHTML = '📝 No tasks yet. Add one!';
    return;
  }

  const filtered = appData.tasks;

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
      updateStreakData();
      checkAchievements();
    }
    task.doneTimestamp = Date.now();
    appData.totalPoints += PRIORITY_POINTS[task.priority];
    showModal(
      `Task completed! +${PRIORITY_POINTS[task.priority]} points\n\nLifetime: ${appData.lifetimeTasksCompleted} | Streak: ${appData.streakDays} days`,
      'Success! 🎉',
      ['Continue']
    );
  } else {
    appData.totalPoints -= PRIORITY_POINTS[task.priority];
    task.doneTimestamp = null;
    appData.lifetimeTasksCompleted--;
  }

  updateRank();
  saveData();
  renderTasks();
  renderStats();
}

function deleteTask(index) {
  const task = appData.tasks[index];
  const taskName = task.text;

  window.handleDeleteConfirm = function(btnIdx) {
    if (btnIdx === 0) {
      if (task.isDone && task.doneTimestamp) {
        appData.lifetimeTasksCompleted--;
        appData.totalPoints -= PRIORITY_POINTS[task.priority];
      }
      appData.tasks.splice(index, 1);
      updateRank();
      saveData();
      renderTasks();
      renderStats();
    }
  };

  showModal(
    `Delete "${taskName}"? This cannot be undone.`,
    'Confirm Delete',
    ['Yes, Delete', 'Cancel'],
    'handleDeleteConfirm'
  );
}

function addTask() {
  const input = document.getElementById('taskInput');
  const priority = document.getElementById('prioritySelect').value;
  const text = input.value.trim();

  if (!text) {
    showModal('Please enter a task!', 'Input Error', ['OK']);
    return;
  }

  appData.tasks.push({ text, priority, isDone: false, doneTimestamp: null });
  input.value = '';
  saveData();
  renderTasks();
}

function renderStats() {
  const totalCompletedTasks = appData.tasks.filter(t => t.isDone).length;
  document.getElementById('totalPoints').textContent = appData.totalPoints;
  document.getElementById('currentRank').textContent = appData.rank;
  document.getElementById('lifetimeCount').textContent = appData.lifetimeTasksCompleted;
  document.getElementById('streakCount').textContent = appData.streakDays;
  document.getElementById('completedCount').textContent = totalCompletedTasks;
}

function updateRank() {
  const rankIndex = Math.floor(appData.totalPoints / 500);
  appData.rank = RANKS[Math.min(rankIndex, RANKS.length - 1)];
}

function saveData() {
  localStorage.setItem('appData', JSON.stringify(appData));
  const userId = 'user_' + Date.now();
  database.ref(userId).set(appData).catch(e => console.log('Firebase sync: ' + e.message));
}

function loadData() {
  const stored = localStorage.getItem('appData');
  if (stored) {
    appData = JSON.parse(stored);
  }
  renderStats();
  renderTasks();
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('addTaskBtn').onclick = addTask;
  document.getElementById('taskInput').onkeypress = (e) => {
    if (e.key === 'Enter') addTask();
  };
  loadData();
});
