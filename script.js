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

// Save data to Firebase
function saveData() {
    database.ref('users/' + USER_ID).set({
        totalPoints: appData.totalPoints,
        tasks: appData.tasks,
        lastUpdated: Date.now()
    });
}

// ==================== DAILY RESET SYSTEM ====================
function resetDailyTasks() {
  const today = new Date().toDateString();
  const lastResetDate = localStorage.getItem('lastResetDate');
  
  if (lastResetDate !== today) {
    appData.tasks.forEach(task => {
      if (task.isDone) {
        task.isDone = false;
        task.penaltyCount = 0;
        task.createdAt = Date.now();
      }
    });
    
    localStorage.setItem('lastResetDate', today);
    console.log('Daily tasks reset!');
    saveData();
  }
}

// ==================== PENALTY SYSTEM ====================
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
}⁹

// Load data from Firebase
function loadData() {
    database.ref('users/' + USER_ID).once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            appData.totalPoints = data.totalPoints || 0;
            appData.tasks = data.tasks || [];
        }
        resetDailyTasks();  // ADD THIS LINE
    checkOverdueTasksAndApplyPenalties();  // ADD THIS LINE
    updateDisplay();
    saveData();  // ADD THIS LINE
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
    
    categoryTasks.forEach(task => {
        const taskDiv = document.createElement('div');
        taskDiv.className = `task-item ${task.isDone ? 'completed' : ''}`;
        taskDiv.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.isDone ? 'checked' : ''} data-id="${task.id}">
            <div class="task-content">
                <div class="task-name">${task.name}</div>
                <div class="task-points">+${task.points} points</div>
            </div>
            <div class="task-actions">
                <button class="edit-btn" data-id="${task.id}">Edit</button>
                <button class="delete-btn" data-id="${task.id}">Delete</button>
            </div>
        `;
        taskList.appendChild(taskDiv);
    });
}

// Add task
function addTask() {
    const nameInput = document.getElementById('taskInput');
    const pointsInput = document.getElementById('pointsInput');
    
    const name = nameInput.value.trim();
    const points = parseInt(pointsInput.value) || 10;
    
    if (!name) return;
    
    const task = {
        id: Date.now(),
        name,
        points,
        isDone: false,
        doneTimestamp: null,
        categoryId: currentCategory,
        createdAt: Date.now()
    };
    
    appData.tasks.push(task);
    saveData();
    updateDisplay();
    
    nameInput.value = '';
    pointsInput.value = '10';
}

// Toggle task
function toggleTask(id) {
    const task = appData.tasks.find(t => t.id === id);
    if (!task) return;
    
    const now = Date.now();
    
    if (!task.isDone) {
        task.isDone = true;
        task.doneTimestamp = now;
        appData.totalPoints += task.points;
        
        document.getElementById('totalPoints').classList.add('points-gained');
        setTimeout(() => {
            document.getElementById('totalPoints').classList.remove('points-gained');
        }, 500);
    } else {
        const hoursPassed = (now - task.doneTimestamp) / (1000 * 60 * 60);
        
        if (hoursPassed < 24) {
            appData.totalPoints -= task.points;
        }
        
        task.isDone = false;
        task.doneTimestamp = null;
    }
    
    saveData();
    updateDisplay();
}

// Delete task
function deleteTask(id) {
    const task = appData.tasks.find(t => t.id === id);
    if (!task) return;
    
    if (task.isDone && task.doneTimestamp) {
        const hoursPassed = (Date.now() - task.doneTimestamp) / (1000 * 60 * 60);
        if (hoursPassed < 24) {
            appData.totalPoints -= task.points;
        }
    }
    
    appData.tasks = appData.tasks.filter(t => t.id !== id);
    saveData();
    updateDisplay();
}

// Edit task
function editTask(id) {
    const task = appData.tasks.find(t => t.id === id);
    if (!task) return;
    
    const newName = prompt('Enter new task name:', task.name);
    if (newName && newName.trim()) {
        task.name = newName.trim();
    }
    
    const newPoints = prompt('Enter new points:', task.points);
    if (newPoints && !isNaN(newPoints)) {
        const pointsDiff = parseInt(newPoints) - task.points;
        task.points = parseInt(newPoints);
        
        if (task.isDone) {
            appData.totalPoints += pointsDiff;
        }
    }
    
    saveData();
    updateDisplay();
}

// Switch category
function switchCategory(categoryId) {
    currentCategory = categoryId;
    
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${categoryId}"]`).classList.add('active');
    
    renderTasks();
}

// Event listeners
document.getElementById('addTaskBtn').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        switchCategory(parseInt(btn.dataset.category));
    });
});

document.getElementById('taskList').addEventListener('click', (e) => {
    const id = parseInt(e.target.dataset.id);
    
    if (e.target.classList.contains('task-checkbox')) {
        toggleTask(id);
    } else if (e.target.classList.contains('delete-btn')) {
        if (confirm('Delete this task?')) {
            deleteTask(id);
        }
    } else if (e.target.classList.contains('edit-btn')) {
        editTask(id);
    }
});

// Initialize
loadData();

