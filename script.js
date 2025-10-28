// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAle5y1wcHMMyDxu-ppPkMfM5hFQNKahOQ",
  authDomain: "routine-planner-daf33.firebaseapp.com",
  databaseURL: "https://routine-planner-daf33-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "routine-planner-daf33",
  storageBucket: "routine-planner-daf33.firebasestorage.app",
  messagingSenderId: "62028696155",
  appId: "1:62028696155:web:5e6b1896e0f60eacb40d7e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Get or create unique user ID for each person
let USER_ID = localStorage.getItem('nexus_user_id');
if (!USER_ID) {
    USER_ID = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('nexus_user_id', USER_ID);
}

// App Data Structure
let appData = {
    totalPoints: 0,
    tasks: []
};

let currentCategory = 1;

// ==================== CORE FUNCTIONS ====================

// Firebase Data - Load from database
function loadData() {
    database.ref('users/' + USER_ID).once('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            appData.totalPoints = data.totalPoints || 0;
            appData.tasks = data.tasks || [];
        }
        resetDailyTasks();  // Reset tasks if new day
        checkOverdueTasksAndApplyPenalties();  // Apply penalties for overdue tasks
        updateDisplay();
        saveData();
    });
}

// Firebase Data - Save to database
function saveData() {
    database.ref('users/' + USER_ID).set(appData);
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
                task.penaltyCount = 0; // Reset penalty counter
                task.createdAt = Date.now(); // Reset creation time for new day
            }
        });
        
        // Save the reset date
        localStorage.setItem('lastResetDate', today);
        
        console.log('Daily tasks reset at midnight!');
        saveData(); // Save the reset tasks to Firebase
    }
}

// ==================== PENALTY SYSTEM ====================

// Check for overdue tasks and apply penalties
function checkOverdueTasksAndApplyPenalties() {
    const now = Date.now();
    const PENALTY_POINTS = 50;
    const PENALTY_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    appData.tasks.forEach(task => {
        // Only check incomplete tasks
        if (!task.isDone && task.createdAt) {
            const timeSinceLastReset = now - task.createdAt;
            
            // Check if task is overdue (more than 24 hours old)
            if (timeSinceLastReset > PENALTY_INTERVAL) {
                // Calculate how many days overdue
                const daysOverdue = Math.floor(timeSinceLastReset / PENALTY_INTERVAL);
                
                // Initialize penalty count if needed
                if (!task.penaltyCount) {
                    task.penaltyCount = 0;
                }
                
                // Apply penalties for new overdue days
                if (daysOverdue > task.penaltyCount) {
                    const newPenalties = daysOverdue - task.penaltyCount;
                    const totalPenalty = newPenalties * PENALTY_POINTS;
                    
                    appData.totalPoints -= totalPenalty;
                    task.penaltyCount = daysOverdue;
                    
                    console.log(`Penalty: -${totalPenalty} points for "${task.name}" (${daysOverdue} day(s) overdue)`);
                }
            }
        }
    });
}

// ==================== UI UPDATE FUNCTIONS ====================

// Update the entire display
function updateDisplay() {
    updateProgressHeader();
    displayTasks();
}

// Update progress header (points, level, rank)
function updateProgressHeader() {
    const pointsElement = document.querySelector('.stat-value:nth-of-type(1)');
    const levelElement = document.querySelector('.stat-value:nth-of-type(2)');
    const rankElement = document.querySelector('.stat-value:nth-of-type(3)');
    const progressBar = document.querySelector('.progress-bar');
    const progressText = document.querySelector('.progress-text');
    
    const level = calculateLevel(appData.totalPoints);
    const rank = calculateRank(level);
    const pointsInLevel = appData.totalPoints % 1000;
    
    if (pointsElement) pointsElement.textContent = appData.totalPoints;
    if (levelElement) levelElement.textContent = level;
    if (rankElement) {
        rankElement.textContent = rank;
        rankElement.className = 'stat-value rank';
    }
    
    if (progressBar) {
        const progressPercentage = (pointsInLevel / 1000) * 100;
        progressBar.style.width = progressPercentage + '%';
    }
    if (progressText) {
        progressText.textContent = pointsInLevel + '/' + 1000;
    }
}

// Display tasks based on selected category
function displayTasks() {
    const taskList = document.querySelector('.task-list');
    if (!taskList) return;
    
    taskList.innerHTML = '';
    
    const filteredTasks = appData.tasks.filter(task => task.category === currentCategory);
    
    filteredTasks.forEach((task, index) => {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item' + (task.isDone ? ' completed' : '');
        
        taskItem.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.isDone ? 'checked' : ''} 
                   onchange="toggleTask(${index})">
            <div class="task-content">
                <div class="task-name">${task.name}</div>
                <div class="task-points">${task.points} points</div>
            </div>
            <div class="task-actions">
                <button class="edit-btn" onclick="editTask(${index})">Edit</button>
                <button class="delete-btn" onclick="deleteTask(${index})">Delete</button>
            </div>
        `;
        
        taskList.appendChild(taskItem);
    });
    
    // Update category task counts
    updateCategoryTaskCounts();
}

// Update category button counts
function updateCategoryTaskCounts() {
    const categories = [
        { id: 1, name: 'Study' },
        { id: 2, name: 'Physical Health' },
        { id: 3, name: 'Creativity' },
        { id: 4, name: 'Others' }
    ];
    
    categories.forEach(cat => {
        const count = appData.tasks.filter(t => t.category === cat.id).length;
        const btn = document.querySelector(`[onclick*="switchCategory(${cat.id})"]`);
        if (btn) {
            const countSpan = btn.querySelector('.task-count');
            if (countSpan) {
                countSpan.textContent = count;
            }
        }
    });
}

// ==================== TASK MANAGEMENT FUNCTIONS ====================

// Add a new task
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
        category: currentCategory,
        createdAt: Date.now(),
        penaltyCount: 0
    };
    
    appData.tasks.push(newTask);
    saveData();
    displayTasks();
    
    taskInput.value = '';
    pointsInput.value = '10';
}

// Toggle task completion
function toggleTask(index) {
    const allTasksInCategory = appData.tasks.filter(t => t.category === currentCategory);
    const taskIndex = appData.tasks.indexOf(allTasksInCategory[index]);
    
    if (taskIndex !== -1) {
        const task = appData.tasks[taskIndex];
        if (!task.isDone) {
            appData.totalPoints += task.points;
            task.isDone = true;
        } else {
            appData.totalPoints -= task.points;
            task.isDone = false;
        }
        saveData();
        updateDisplay();
    }
}

// Edit a task
function editTask(index) {
    const allTasksInCategory = appData.tasks.filter(t => t.category === currentCategory);
    const taskIndex = appData.tasks.indexOf(allTasksInCategory[index]);
    
    if (taskIndex !== -1) {
        const newName = prompt('Edit task name:', appData.tasks[taskIndex].name);
        if (newName !== null && newName.trim() !== '') {
            appData.tasks[taskIndex].name = newName;
            saveData();
            displayTasks();
        }
    }
}

// Delete a task
function deleteTask(index) {
    const allTasksInCategory = appData.tasks.filter(t => t.category === currentCategory);
    const taskIndex = appData.tasks.indexOf(allTasksInCategory[index]);
    
    if (taskIndex !== -1) {
        if (confirm('Are you sure you want to delete this task?')) {
            appData.tasks.splice(taskIndex, 1);
            saveData();
            displayTasks();
        }
    }
}

// ==================== CATEGORY SWITCHING ====================

// Switch category
function switchCategory(categoryId) {
    currentCategory = categoryId;
    
    // Update active button
    const categoryBtns = document.querySelectorAll('.category-btn');
    categoryBtns.forEach(btn => btn.classList.remove('active'));
    event.target.closest('.category-btn').classList.add('active');
    
    displayTasks();
}

// ==================== LEVEL & RANK CALCULATION ====================

// Calculate level based on points
function calculateLevel(points) {
    return Math.floor(points / 1000) + 1;
}

// Calculate rank based on level
function calculateRank(level) {
    const rankTitles = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    const rankIndex = Math.floor((level - 1) / 10);
    return rankTitles[Math.min(rankIndex, rankTitles.length - 1)] + ' ' + ((level - 1) % 10 + 1);
}

// ==================== INSTALL BUTTON (PWA) ====================

let deferredPrompt;
const installBtn = document.getElementById('installBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button
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

// ==================== INITIALIZE APP ====================

// Load data when page loads
window.addEventListener('load', () => {
    loadData();
});
