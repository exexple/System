// IndexedDB configuration
const DB_NAME = 'routinePlannerDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';
let db;

// Initialize IndexedDB
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

// Save data to IndexedDB
function saveData() {
    if (!db) return;
    
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const data = {
        id: 1,
        totalPoints: appData.totalPoints,
        tasks: appData.tasks
    };
    
    store.put(data);
}

// Load data from IndexedDB
function loadData() {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject('Database not initialized');
            return;
        }
        
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(1);
        
        request.onsuccess = () => {
            if (request.result) {
                appData.totalPoints = request.result.totalPoints || 0;
                appData.tasks = request.result.tasks || [];
            }
            resolve();
        };
        
        request.onerror = () => reject(request.error);
    });
}

// Data structure
let appData = {
    totalPoints: 0,
    tasks: []
};

let currentCategory = 1;

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
    
    // Update task counts
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
        // Mark as done
        task.isDone = true;
        task.doneTimestamp = now;
        appData.totalPoints += task.points;
        
        // Animation
        document.getElementById('totalPoints').classList.add('points-gained');
        setTimeout(() => {
            document.getElementById('totalPoints').classList.remove('points-gained');
        }, 500);
    } else {
        // Mark as undone
        const hoursPassed = (now - task.doneTimestamp) / (1000 * 60 * 60);
        
        if (hoursPassed < 24) {
            // Within 24 hours - subtract points
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
    
    // If task was done within 24 hours, return points
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
        
        // Adjust total points if task is already done
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

// Initialize app
async function initApp() {
    try {
        await initDB();
        await loadData();
        updateDisplay();
    } catch (error) {
        console.error('Error initializing app:', error);
        updateDisplay();
    }
}

initApp();