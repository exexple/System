// ==================== ATHERION PHASE A+B - FULLY WORKING WITH MODALS (COMPLETE INTEGRATION) ====================
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

let USER_ID = null;

// ==================== ENHANCED STYLED MODAL SYSTEM WITH CONFIRMATION SUPPORT ====================
function showModal(message, title = 'Info', icon = '', buttons = null) {
  let modal = document.getElementById('customModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'customModal';
    modal.style = "position:fixed;left:0;top:0;width:100vw;height:100vh;background:rgba(12,13,24,0.8);z-index:10000;display:flex;align-items:center;justify-content:center";
    document.body.appendChild(modal);
  }

  let buttonHTML = '';
  if (buttons && Array.isArray(buttons) && buttons.length > 0) {
    buttonHTML = '<div style="display:flex;gap:10px;margin-top:20px;justify-content:center">';
    buttons.forEach((btn, idx) => {
      buttonHTML += `<button id="modalBtn_${idx}" style="padding:10px 20px;background:#2196F3;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold">${btn.text}</button>`;
    });
    buttonHTML += '</div>';
  } else {
    buttonHTML = '<div style="margin-top:20px;text-align:center"><button id="modalBtn_ok" style="padding:10px 30px;background:#2196F3;color:white;border:none;border-radius:4px;cursor:pointer;font-weight:bold">OK</button></div>';
  }

  modal.innerHTML = `
    <div style="background:#1a1a2e;color:#fff;border:1px solid #16213e;border-radius:8px;padding:30px;max-width:500px;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.3)">
      <div style="font-size:24px;margin-bottom:10px">${icon}</div>
      <h2 style="color:#4dd0e1;margin:10px 0;font-size:20px">${title}</h2>
      <p style="color:#ccc;margin:20px 0;line-height:1.6">${message}</p>
      ${buttonHTML}
    </div>
  `;

  modal.style.display = 'flex';

  if (buttons && Array.isArray(buttons) && buttons.length > 0) {
    buttons.forEach((btn, idx) => {
      const btnEl = document.getElementById(`modalBtn_${idx}`);
      if (btnEl) {
        btnEl.onclick = () => {
          if (btn.action && typeof btn.action === 'function') {
            btn.action();
          }
          modal.style.display = 'none';
        };
      }
    });
  } else {
    const okBtn = document.getElementById('modalBtn_ok');
    if (okBtn) {
      okBtn.onclick = () => {
        modal.style.display = 'none';
      };
    }
  }
}

// ==================== APP DATA & STORAGE ====================
let appData = {
  tasks: [],
  totalPoints: 0,
  streakDays: 0,
  lastTaskDate: null,
  achievements: [],
  lifetimeTasksCompleted: 0,
  totalTasksCompleted: 0
};

const ACHIEVEMENTSLIST = [
  {
    id: 'first_task',
    name: 'Getting Started',
    desc: 'Complete your first task!',
    icon: '🌟',
    check: (data) => data.lifetimeTasksCompleted >= 1
  },
  {
    id: 'task_master_50',
    name: 'Task Master',
    desc: 'Complete 50 tasks!',
    icon: '💪',
    check: (data) => data.lifetimeTasksCompleted >= 50
  },
  {
    id: 'streak_7',
    name: 'On Fire',
    desc: 'Maintain a 7-day streak!',
    icon: '🔥',
    check: (data) => data.streakDays >= 7
  },
  {
    id: 'streak_30',
    name: 'Unstoppable',
    desc: 'Maintain a 30-day streak!',
    icon: '⚡',
    check: (data) => data.streakDays >= 30
  }
];

function saveAppData() {
  localStorage.setItem('atherian_data', JSON.stringify(appData));
  if (USER_ID) {
    database.ref(`users/${USER_ID}`).set(appData);
  }
}

function loadAppData() {
  const saved = localStorage.getItem('atherian_data');
  if (saved) {
    try {
      appData = { ...appData, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Error parsing local data:', e);
    }
  }
}

// ==================== TASK MANAGEMENT ====================
function addTask() {
  const input = document.getElementById('taskInput');
  const priority = document.getElementById('prioritySelect').value;

  if (!input.value.trim()) {
    showModal('Please enter a task', 'Validation', '⚠️');
    return;
  }

  const newTask = {
    text: input.value,
    priority: priority,
    isDone: false,
    doneTimestamp: null
  };

  appData.tasks.push(newTask);
  updateStreak();
  checkAchievements();
  saveAppData();
  renderTasks();

  input.value = '';
  showModal('Task added successfully!', 'Success', '✅');
}

// ENHANCED: deleteTask now uses modal confirmation with buttons
function deleteTask(index) {
  const task = appData.tasks[index];
  if (!task) return;

  showModal(
    `Are you sure you want to delete "${task.text}"? This cannot be undone.`,
    'Confirm Delete',
    '⚠️',
    [
      {
        text: 'Cancel',
        action: () => {
          // Do nothing, modal closes
        }
      },
      {
        text: 'Delete',
        action: () => {
          appData.tasks.splice(index, 1);
          saveAppData();
          renderTasks();
          showModal('Task deleted', 'Deleted', '🗑️');
        }
      }
    ]
  );
}

function toggleTask(index) {
  const task = appData.tasks[index];
  if (!task) return;

  task.isDone = !task.isDone;

  if (task.isDone) {
    if (task.isDone && !task.doneTimestamp) {
      appData.lifetimeTasksCompleted++;
      appData.totalTasksCompleted++;
    }
    task.doneTimestamp = Date.now();
    appData.totalPoints += PRIORITY_POINTS[task.priority];
    showModal('Task completed! +' + PRIORITY_POINTS[task.priority] + ' points', 'Success', '✅');
  } else {
    if (task.doneTimestamp) {
      appData.totalPoints -= PRIORITY_POINTS[task.priority];
      appData.lifetimeTasksCompleted--;
      appData.totalTasksCompleted--;
    }
    task.doneTimestamp = null;
  }

  updateStreak();
  checkAchievements();
  saveAppData();
  renderTasks();
}

function renderTasks() {
  const container = document.getElementById('taskList');
  if (!container) return;

  container.innerHTML = '';

  const filterVal = document.getElementById('filterSelect')?.value || 'all';
  let filtered = appData.tasks;

  if (filterVal === 'done') {
    filtered = appData.tasks.filter(t => t.isDone);
  } else if (filterVal === 'pending') {
    filtered = appData.tasks.filter(t => !t.isDone);
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

// ==================== STREAK TRACKING & ACHIEVEMENTS ====================
function updateStreak() {
  const today = new Date().toDateString();
  const lastDate = appData.lastTaskDate ? new Date(appData.lastTaskDate).toDateString() : null;

  if (lastDate === today) {
    return;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastDate === yesterday.toDateString()) {
    appData.streakDays++;
  } else if (lastDate !== today) {
    appData.streakDays = 1;
  }

  appData.lastTaskDate = new Date().toISOString();
}

function checkAchievements() {
  ACHIEVEMENTSLIST.forEach((ach) => {
    if (!appData.achievements.includes(ach.id)) {
      if (ach.check(appData)) {
        appData.achievements.push(ach.id);
        showAchievementModal(ach.name, ach.desc, ach.icon);
        saveAppData();
      }
    }
  });
}

function showAchievementModal(name, desc, icon = '🏆') {
  showModal(`${desc}`, `🎉 Achievement Unlocked: ${name}`, icon);
}

// ==================== UI UPDATES ====================
function updateUI() {
  const pointsEl = document.getElementById('totalPoints');
  const streakEl = document.getElementById('streakCount');
  const lifetimeEl = document.getElementById('lifetimeCount');
  const rankEl = document.getElementById('currentRank');

  if (pointsEl) pointsEl.textContent = appData.totalPoints;
  if (streakEl) streakEl.textContent = appData.streakDays;
  if (lifetimeEl) lifetimeEl.textContent = appData.lifetimeTasksCompleted;

  const rankIndex = Math.min(Math.floor(appData.totalPoints / 200), RANKS.length - 1);
  if (rankEl) rankEl.textContent = RANKS[rankIndex];

  renderTasks();
}

// ==================== FIREBASE & DATA LOADING ====================
function loadData() {
  const local = localStorage.getItem('atherian_data');
  if (local) {
    try {
      appData = { ...appData, ...JSON.parse(local) };
    } catch (e) {
      console.error('Error parsing local data:', e);
    }
  }

  if (USER_ID) {
    database.ref(`users/${USER_ID}`).once('value').then(snapshot => {
      if (snapshot.exists()) {
        appData = { ...appData, ...snapshot.val() };
        localStorage.setItem('atherian_data', JSON.stringify(appData));
        renderUI();
      }
    }).catch(err => console.error('Firebase load error:', err));
  }
}

function renderUI() {
  updateUI();
  renderTasks();
}

// ==================== INITIALIZATION WITH EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Initializing Atherion...');
  
  loadData();
  updateUI();

  // Add Task Button
  const addTaskBtn = document.getElementById('addTaskBtn');
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', addTask);
  }

  // Task Input Enter Key
  const taskInput = document.getElementById('taskInput');
  if (taskInput) {
    taskInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addTask();
    });
  }

  // Filter Select
  const filterSelect = document.getElementById('filterSelect');
  if (filterSelect) {
    filterSelect.addEventListener('change', renderTasks);
  }

  // Priority Select
  const prioritySelect = document.getElementById('prioritySelect');
  if (prioritySelect) {
    prioritySelect.addEventListener('change', () => {
      // Priority selection changed
    });
  }

  console.log('✅ Atherion fully initialized!');
});
