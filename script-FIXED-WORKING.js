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
    buttonHTML = buttons.map((btn, idx) => `<button id="modalBtn${idx}" style="padding:10px 20px;margin:5px;cursor:pointer;background:#007bff;color:#fff;border:none;border-radius:5px">${btn.label}</button>`).join('');
  }

  modal.innerHTML = `
    <div style="background:#1a1a2e;color:#ccc;padding:30px;border-radius:10px;max-width:400px;box-shadow:0 0 20px rgba(0,0,0,0.5)">
      <h2 style="color:#fff;margin-bottom:15px">${title} ${icon}</h2>
      <p style="line-height:1.6">${message}</p>
      <div style="text-align:center;margin-top:20px">
        ${buttonHTML || '<button id="modalClose" style="padding:10px 20px;cursor:pointer;background:#28a745;color:#fff;border:none;border-radius:5px">OK</button>'}
      </div>
    </div>
  `;

  modal.style.display = 'flex';

  // Attach button handlers
  if (buttons && Array.isArray(buttons)) {
    buttons.forEach((btn, idx) => {
      const btnEl = document.getElementById(`modalBtn${idx}`);
      if (btnEl && btn.action) {
        btnEl.onclick = () => {
          modal.style.display = 'none';
          btn.action();
        };
      }
    });
  } else {
    const closeBtn = document.getElementById('modalClose');
    if (closeBtn) {
      closeBtn.onclick = () => {
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
  { id: 'first_task', name: 'Getting Started', desc: 'Complete your first task!', icon: '⭐', check: (data) => data.lifetimeTasksCompleted > 0 },
  { id: 'task_master_50', name: 'Task Master', desc: 'Complete 50 tasks!', icon: '👑', check: (data) => data.lifetimeTasksCompleted >= 50 },
  { id: 'streak_7', name: 'On Fire', desc: 'Maintain a 7-day streak!', icon: '🔥', check: (data) => data.streakDays >= 7 },
  { id: 'streak_30', name: 'Unstoppable', desc: 'Maintain a 30-day streak!', icon: '⚡', check: (data) => data.streakDays >= 30 }
];

function saveAppData() {
  localStorage.setItem('atherian_data', JSON.stringify(appData));
  if (USER_ID) {
    database.ref(`users/${USER_ID}`).set(appData).catch(() => {});
  }
}

function loadAppData() {
  const saved = localStorage.getItem('atherian_data');
  if (saved) {
    try {
      appData = { ...appData, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to parse saved data:', e);
    }
  }
}

// ==================== HELPER FUNCTIONS ====================

function addTask() {
  const taskInput = document.getElementById('taskInput');
  const prioritySelect = document.getElementById('prioritySelect');

  if (!taskInput || !prioritySelect) return;

  const taskText = taskInput.value.trim();
  const priority = prioritySelect.value;

  if (!taskText) {
    showModal('Please enter a task!', '⚠️ Alert');
    return;
  }

  const task = {
    id: Date.now(),
    text: taskText,
    priority: priority,
    completed: false,
    createdAt: new Date().toISOString()
  };

  appData.tasks.push(task);
  saveAppData();
  taskInput.value = '';
  prioritySelect.value = 'medium';
  renderTasks();
}

function deleteTask(taskId) {
  appData.tasks = appData.tasks.filter(t => t.id !== taskId);
  saveAppData();
  renderTasks();
}

function completeTask(taskId) {
  const task = appData.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = true;
    const points = PRIORITY_POINTS[task.priority] || 0;
    appData.totalPoints += points;
    appData.lifetimeTasksCompleted += 1;
    appData.totalTasksCompleted += 1;
    checkStreak();
    checkAchievements();
    saveAppData();
    renderTasks();
  }
}

function checkStreak() {
  const today = new Date().toDateString();
  if (appData.lastTaskDate !== today) {
    appData.lastTaskDate = today;
    appData.streakDays += 1;
  }
}

function checkAchievements() {
  ACHIEVEMENTSLIST.forEach(achievement => {
    if (!appData.achievements.includes(achievement.id) && achievement.check(appData)) {
      appData.achievements.push(achievement.id);
      showModal(`🎉 Achievement Unlocked: ${achievement.name}\n${achievement.desc}`, 'Achievement!', '✨');
    }
  });
}

function renderTasks() {
  const taskList = document.getElementById('taskList');
  if (!taskList) return;

  taskList.innerHTML = appData.tasks.map(task => `
    <div style="background:#2a2a3e;padding:15px;margin:10px 0;border-radius:8px;display:flex;justify-content:space-between;align-items:center">
      <div>
        <strong style="color:#fff">${task.text}</strong>
        <p style="color:#888;margin:5px 0">Priority: ${task.priority} | ${task.completed ? '✅ Completed' : '⏳ Pending'}</p>
      </div>
      <div>
        ${!task.completed ? `<button onclick="completeTask(${task.id})" style="padding:8px 15px;margin:5px;background:#28a745;color:#fff;border:none;cursor:pointer;border-radius:5px">Complete</button>` : ''}
        <button onclick="deleteTask(${task.id})" style="padding:8px 15px;margin:5px;background:#dc3545;color:#fff;border:none;cursor:pointer;border-radius:5px">Delete</button>
      </div>
    </div>
  `).join('');
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  loadAppData();
  renderTasks();

  const addBtn = document.getElementById('addTaskBtn');
  if (addBtn) {
    addBtn.addEventListener('click', addTask);
  }
});
