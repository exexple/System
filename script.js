// Initialize Firebase
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

// Data structure
let appData = {
  totalPoints: 0,
  tasks: []
};

let currentCategory = 1;

// Get or create unique user ID
let USER_ID = localStorage.getItem('nexus_user_id');
if (!USER_ID) {
  USER_ID = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  localStorage.setItem('nexus_user_id', USER_ID);
}

// ==================== DAILY RESET SYSTEM ====================
// Reset all tasks at midnight (daily recurring tasks)
function resetDailyTasks() {
  const today = new Date().toDateString();
  const lastResetDate = localStorage.getItem('lastResetDate');
  
  // Check if we haven't reset today yet
  if (lastResetDate !== today) {
    // Reset all tasks to incomplete
    appData.tasks.forEach(task => {
      if (task.isDone) {
        task.isDone = false;
        task.penaltyCount = 0;
        task.createdAt = Date.now();
      }
    });
    
    // Save the reset date
    localStorage.setItem('lastResetDate', today);
    
    console.log('Daily tasks reset at midnight!');
    saveData();
  }
}

// ==================== PENALTY SYSTEM ====================
// Check for overdue tasks and apply penalties
function checkOverdueTasksAndApplyPenalties() {
  const now = Date.now();
  const PENALTY_POINTS = 50;
  const PENALTY_INTERVAL = 24 * 60 * 60 * 1000;
  
  appData.tasks.forEach(task => {
    if (!task.isDone && task.createdAt) {
      const timeSinceLastReset = now - task.createdAt;
      
      if (timeSinceLastReset > PENALTY_INTERVAL) {
        const daysOverdue = Math.floor(timeSinceLastReset / PENALTY_INTERVAL);
        
        if (!task.penaltyCount) {
          task.penaltyCount = 0;
        }
        
        if (daysOverdue > task.penaltyCount) {
          const newPenalties = daysOverdue - task.penaltyCount;
          const totalPenalty = newPenalties * PENALTY_POINTS;
          
          appData.totalPoints -= totalPenalty;
          task.penaltyCount = daysOverdue;
          
          console.log(`Penalty: -${totalPenalty} points for "${task.name}"`);
        }
      }
    }
  });
}

// Save data to Firebase
function saveData() {
  database.ref('users/' + USER_ID).set({
    totalPoints: appData.totalPoints,
    tasks: appData.tasks,
    lastUpdated: Date.now()
  });
}

// Load data from Firebase
function loadData() {
  database.ref('users/' + USER_ID).once('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      appData.totalPoints = data.totalPoints || 0;
      appData.tasks = data.tasks || [];
    }
    resetDailyTasks();
    checkOverdueTasksAndApplyPenalties();
    updateDisplay();
  });
}

// Calculate level and rank
function calculateLevel(points) {
  return Math.floor(points / 1000);
}

function calculateRank(level) {
  const rankIndex = Math.floor(level / 10);
  const ranks = ['E', 'EE', 'EEE', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA', 'S', 'SS', 'SSS'];
  return ranks[Math.min(rankIndex, ranks.length - 1)];
}

// Update display
function updateDisplay() {
  const level = calculateLevel(appData.totalPoints);
  const rank = calculateRank(level);
  const pointsInLevel = appData.totalPoints % 1000;
  const progress = (pointsInLevel / 1000) * 100;

  document.getElementById('totalPoints').textContent = appData.totalPoints.toLocaleString();
  document.getElementById('level').textContent = level;
  document.getElementById('rank').textContent = rank;
  document.getElementById('progressBar').style.width = `${progress}%`;
  document.getElementById('progressText').textContent = `${pointsInLevel}/1000`;

  for (let i = 1; i <= 4; i++) {
    const count = appData.tasks.filter(t => t.categoryId === i).length;
    document.getElementById(`count-${i}`).textContent = count;
  }

  renderTasks();
}

// Render tasks
function renderTasks() {
  const taskList = document.getElementById('taskList');
  const categoryTasks = appData.tasks.filter(t => t.categoryId === currentCategory);

  taskList.innerHTML = '';

  categoryTasks.forEach((task, index) => {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item ${task.isDone ? 'completed' : ''}`;
    taskDiv.innerHTML = `
      <input type="checkbox" class="task-checkbox" ${task.isDone ? 'checked' : ''} onchange="toggleTask(${appData.tasks.indexOf(task)})">
      <div class="task-content">
        <div class="task-name">${task.name}</div>
        <div class="task-points">${task.points} points</div>
      </div>
      <div class="task-actions">
        <button class="edit-btn" onclick="editTask(${appData.tasks.indexOf(task)})">Edit</button>
        <button class="delete-btn" onclick="deleteTask(${appData.tasks.indexOf(task)})">Delete</button>
      </div>
    `;
    taskList.appendChild(taskDiv);
  });
}

// Add task
function addTask() {
  const taskInput = document.getElementById('taskInput');
  const pointsInput = document.getElementById('pointsInput');

  if (taskInput.value.trim() === '') {
    alert('Please enter a task name');
    return;
  }

  const newTask = {
    name: taskInput.value,
    points: parseInt(pointsInput.value) || 10,
    isDone: false,
    categoryId: currentCategory,
    createdAt: Date.now(),
    penaltyCount: 0
  };

  appData.tasks.push(newTask);
  saveData();
  updateDisplay();

  taskInput.value = '';
  pointsInput.value = '10';
}

// Toggle task
function toggleTask(index) {
  const task = appData.tasks[index];
  if (task.isDone) {
    appData.totalPoints -= task.points;
    task.isDone = false;
  } else {
    appData.totalPoints += task.points;
    task.isDone = true;
  }
  saveData();
  updateDisplay();
}

// Edit task
function editTask(index) {
  const task = appData.tasks[index];
  const newName = prompt('Edit task name:', task.name);
  if (newName !== null && newName.trim() !== '') {
    task.name = newName;
    saveData();
    updateDisplay();
  }
}

// Delete task
function deleteTask(index) {
  if (confirm('Delete this task?')) {
    appData.tasks.splice(index, 1);
    saveData();
    updateDisplay();
  }
}

// Switch category
function switchCategory(categoryId) {
  currentCategory = categoryId;
  
  const categoryBtns = document.querySelectorAll('.category-btn');
  categoryBtns.forEach((btn, idx) => {
    if (idx + 1 === categoryId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  renderTasks();
}

// ==================== INSTALL BUTTON (PWA) ====================

let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  if (installBtn) {
    installBtn.style.display = 'block';
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      return;
    }
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('App installed');
    }
    
    deferredPrompt = null;
    if (installBtn) installBtn.style.display = 'none';
  });
}

// ==================== SERVICE WORKER REGISTRATION ====================

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./service-worker.js')
    .then(registration => console.log('Service Worker registered'))
    .catch(error => console.log('Service Worker registration failed:', error));
}

// ==================== EVENT LISTENERS ====================

// Add task button
document.getElementById('addTaskBtn').addEventListener('click', addTask);

// Category buttons
document.querySelectorAll('.category-btn').forEach((btn, index) => {
  btn.addEventListener('click', () => switchCategory(index + 1));
});

// ==================== INITIALIZE APP ====================

window.addEventListener('load', () => {
  loadData();
});
