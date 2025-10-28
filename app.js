// Application State
const state = {
    totalPoints: 0,
    currentCategory: 1,
    tasks: [],
    taskIdCounter: 1
};

// Categories Configuration
const categories = [
    { id: 1, name: 'Study', color: '#9D00FF' },
    { id: 2, name: 'Physical Health', color: '#B24BF3' },
    { id: 3, name: 'Creativity', color: '#C77DFF' },
    { id: 4, name: 'Others', color: '#8B00E5' }
];

// Rank System
const rankSystem = [
    { minLevel: 0, rank: 'E' },
    { minLevel: 10, rank: 'EE' },
    { minLevel: 20, rank: 'EEE' },
    { minLevel: 30, rank: 'B' },
    { minLevel: 40, rank: 'BB' },
    { minLevel: 50, rank: 'BBB' },
    { minLevel: 60, rank: 'A' },
    { minLevel: 70, rank: 'AA' },
    { minLevel: 80, rank: 'AAA' },
    { minLevel: 90, rank: 'S' },
    { minLevel: 100, rank: 'SS' },
    { minLevel: 110, rank: 'SSS' }
];

// DOM Elements
const elements = {
    totalPoints: document.getElementById('totalPoints'),
    level: document.getElementById('level'),
    rank: document.getElementById('rank'),
    progressFill: document.getElementById('progressFill'),
    progressText: document.getElementById('progressText'),
    taskList: document.getElementById('taskList'),
    categoryTitle: document.getElementById('categoryTitle'),
    taskNameInput: document.getElementById('taskNameInput'),
    taskPointsInput: document.getElementById('taskPointsInput'),
    addTaskBtn: document.getElementById('addTaskBtn'),
    pointsAnimation: document.getElementById('pointsAnimation')
};

// Initialize App
function init() {
    setupEventListeners();
    updateUI();
    renderTasks();
}

// Setup Event Listeners
function setupEventListeners() {
    // Category buttons
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const categoryId = parseInt(btn.dataset.category);
            switchCategory(categoryId);
        });
    });

    // Add task button
    elements.addTaskBtn.addEventListener('click', addTask);

    // Enter key on inputs
    elements.taskNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    elements.taskPointsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
}

// Switch Category
function switchCategory(categoryId) {
    state.currentCategory = categoryId;
    
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (parseInt(btn.dataset.category) === categoryId) {
            btn.classList.add('active');
        }
    });

    // Update category title
    const category = categories.find(c => c.id === categoryId);
    elements.categoryTitle.textContent = category.name;

    // Render tasks for this category
    renderTasks();
}

// Add Task
function addTask() {
    const taskName = elements.taskNameInput.value.trim();
    const taskPoints = parseInt(elements.taskPointsInput.value) || 10;

    if (!taskName) {
        elements.taskNameInput.focus();
        return;
    }

    const task = {
        id: state.taskIdCounter++,
        name: taskName,
        points: taskPoints,
        categoryId: state.currentCategory,
        isDone: false,
        doneTimestamp: null,
        createdAt: new Date().toISOString()
    };

    state.tasks.push(task);

    // Clear inputs
    elements.taskNameInput.value = '';
    elements.taskPointsInput.value = '10';
    elements.taskNameInput.focus();

    // Update UI
    updateTaskCounts();
    renderTasks();
}

// Toggle Task Done/Undone
function toggleTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const now = new Date();

    if (task.isDone) {
        // Undoing a task
        if (task.doneTimestamp) {
            const doneTime = new Date(task.doneTimestamp);
            const hoursDiff = (now - doneTime) / (1000 * 60 * 60);

            // Only subtract points if within 24 hours
            if (hoursDiff < 24) {
                state.totalPoints -= task.points;
                showPointsAnimation(-task.points);
            }
        }
        task.isDone = false;
        task.doneTimestamp = null;
    } else {
        // Marking as done
        task.isDone = true;
        task.doneTimestamp = now.toISOString();
        state.totalPoints += task.points;
        showPointsAnimation(task.points);
    }

    updateUI();
    renderTasks();
}

// Delete Task
function deleteTask(taskId) {
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = state.tasks[taskIndex];
    
    // If task was done, don't subtract points when deleting
    // (This is a design choice - you could also subtract if preferred)
    
    state.tasks.splice(taskIndex, 1);
    
    updateTaskCounts();
    renderTasks();
}

// Edit Task
function editTask(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskElement) return;

    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    taskElement.classList.add('editing');

    const editForm = taskElement.querySelector('.task-edit-form');
    const editInput = editForm.querySelector('.task-edit-input');
    const editPoints = editForm.querySelector('.task-edit-points');

    editInput.value = task.name;
    editPoints.value = task.points;
    editInput.focus();
}

// Save Task Edit
function saveTaskEdit(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskElement) return;

    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const editForm = taskElement.querySelector('.task-edit-form');
    const editInput = editForm.querySelector('.task-edit-input');
    const editPoints = editForm.querySelector('.task-edit-points');

    const newName = editInput.value.trim();
    const newPoints = parseInt(editPoints.value) || 10;

    if (newName) {
        task.name = newName;
        task.points = newPoints;
        taskElement.classList.remove('editing');
        renderTasks();
    }
}

// Cancel Task Edit
function cancelTaskEdit(taskId) {
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (!taskElement) return;

    taskElement.classList.remove('editing');
}

// Calculate Level
function calculateLevel() {
    return Math.floor(state.totalPoints / 1000);
}

// Calculate Rank
function calculateRank(level) {
    for (let i = rankSystem.length - 1; i >= 0; i--) {
        if (level >= rankSystem[i].minLevel) {
            return rankSystem[i].rank;
        }
    }
    return 'E';
}

// Format Points for Display
function formatPoints(points) {
    if (points >= 1000) {
        return (points / 1000).toFixed(1) + 'k';
    }
    return points.toString();
}

// Update UI
function updateUI() {
    const level = calculateLevel();
    const rank = calculateRank(level);
    const pointsInLevel = state.totalPoints % 1000;
    const progressPercent = (pointsInLevel / 1000) * 100;

    elements.totalPoints.textContent = formatPoints(state.totalPoints);
    elements.level.textContent = level;
    elements.rank.textContent = rank;
    elements.progressFill.style.width = progressPercent + '%';
    elements.progressText.textContent = `${pointsInLevel} / 1000`;

    updateTaskCounts();
}

// Update Task Counts
function updateTaskCounts() {
    categories.forEach(category => {
        const count = state.tasks.filter(t => t.categoryId === category.id).length;
        const countElement = document.getElementById(`count-${category.id}`);
        if (countElement) {
            countElement.textContent = count;
        }
    });
}

// Render Tasks
function renderTasks() {
    const categoryTasks = state.tasks.filter(t => t.categoryId === state.currentCategory);

    if (categoryTasks.length === 0) {
        elements.taskList.innerHTML = '<div class="empty-state">No tasks yet. Add your first task above!</div>';
        return;
    }

    elements.taskList.innerHTML = categoryTasks.map(task => `
        <div class="task-item ${task.isDone ? 'completed' : ''}" data-task-id="${task.id}">
            <input 
                type="checkbox" 
                class="task-checkbox" 
                ${task.isDone ? 'checked' : ''}
                onchange="toggleTask(${task.id})"
            />
            <div class="task-content">
                <div class="task-name">${escapeHtml(task.name)}</div>
                <div class="task-edit-form">
                    <input type="text" class="task-edit-input" value="${escapeHtml(task.name)}" />
                    <input type="number" class="task-edit-points" value="${task.points}" min="1" />
                    <button class="task-btn" onclick="saveTaskEdit(${task.id})">Save</button>
                    <button class="task-btn" onclick="cancelTaskEdit(${task.id})">Cancel</button>
                </div>
                <div class="task-meta">
                    <span class="task-points">+${task.points} pts</span>
                    <span>${formatDate(task.createdAt)}</span>
                    ${task.isDone && task.doneTimestamp ? `<span>✓ ${formatDate(task.doneTimestamp)}</span>` : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-btn" onclick="editTask(${task.id})">Edit</button>
                <button class="task-btn delete-btn" onclick="deleteTask(${task.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Show Points Animation
function showPointsAnimation(points) {
    const sign = points >= 0 ? '+' : '';
    elements.pointsAnimation.textContent = `${sign}${points}`;
    elements.pointsAnimation.classList.add('show');

    setTimeout(() => {
        elements.pointsAnimation.classList.remove('show');
    }, 1000);
}

// Format Date
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}