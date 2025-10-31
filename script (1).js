// Constants and configurations
const RANKS = ['E', 'EE', 'EEE', 'D', 'DD', 'DDD', 'C', 'CC', 'CCC', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA', 'S', 'SS', 'SSS'];
const RANK_COLORS = {
    'E': '#A855F7', 'EE': '#A855F7', 'EEE': '#A855F7',
    'D': '#A855F7', 'DD': '#A855F7', 'DDD': '#A855F7',
    'C': '#06B6D4', 'CC': '#06B6D4', 'CCC': '#06B6D4',
    'B': '#06B6D4', 'BB': '#06B6D4', 'BBB': '#06B6D4',
    'A': '#FFD700', 'AA': '#FFD700', 'AAA': '#FFD700',
    'S': '#FFD700', 'SS': '#FFD700', 'SSS': '#FFD700'
};

const POINTS_PER_RANK = 1000; // Points needed per rank level
const PRIORITIES = {
    low: 30,
    medium: 50,
    high: 100
};

// State management
let state = {
    user: null,
    tasks: [],
    points: 0,
    rank: 'E',
    level: 1,
    streak: 0,
    premiumType: 'FREE', // FREE, AD_PREMIUM, PAID
    adsWatched: 0,
    aiQueriesLeft: 5,
    lastLogin: new Date().toDateString()
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadState();
    checkMidnightReset();
    setupEventListeners();
    renderUI();
    checkPremiumStatus();
    showAds();
});

// Event Listeners Setup
function setupEventListeners() {
    document.getElementById('add-task-btn').addEventListener('click', addTask);
    document.getElementById('watch-ad-btn').addEventListener('click', watchAd);
    document.getElementById('buy-premium-btn').addEventListener('click', buyPremium);
    
    // Category tabs
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', () => switchCategory(tab.dataset.category));
    });
}

// User Data Management
function initializeNewUser() {
    showModal('user-setup-modal');
    document.getElementById('user-setup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        state.user = {
            name: formData.get('name'),
            age: formData.get('age'),
            height: formData.get('height'),
            weight: formData.get('weight'),
            gender: formData.get('gender'),
            interests: formData.getAll('interests'),
            freeTime: formData.get('free-time'),
            dietary: formData.get('dietary'),
            lifestyle: formData.get('lifestyle')
        };
        generatePersonalizedPlans();
        saveState();
        hideModal('user-setup-modal');
        showNotification('Welcome to Atherton!', 'success');
    });
}

// Task Management
function addTask() {
    const taskInput = document.getElementById('task-input');
    const priority = document.getElementById('priority-select').value;
    
    if (!taskInput.value.trim()) {
        showNotification('Task cannot be empty!', 'error');
        return;
    }

    const task = {
        id: Date.now(),
        text: taskInput.value,
        priority: priority,
        points: PRIORITIES[priority],
        completed: false,
        createdAt: new Date()
    };

    state.tasks.push(task);
    saveState();
    renderTasks();
    taskInput.value = '';
    showNotification('Task added successfully!', 'success');
}

function toggleTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    if (task.completed) {
        addPoints(task.points);
        checkRankUp();
    } else {
        removePoints(task.points);
    }
    
    saveState();
    renderUI();
}

// Points and Ranking System
function addPoints(points) {
    state.points += points;
    checkRankUp();
    saveState();
    renderPoints();
}

function removePoints(points) {
    state.points = Math.max(0, state.points - points);
    saveState();
    renderPoints();
}

function formatPoints(points) {
    if (points >= 1000000) return `${(points/1000000).toFixed(1)}M`;
    if (points >= 1000) return `${(points/1000).toFixed(1)}k`;
    return points.toString();
}

function checkRankUp() {
    const currentRankIndex = RANKS.indexOf(state.rank);
    const pointsNeeded = (currentRankIndex * 10 + state.level) * POINTS_PER_RANK;
    
    if (state.points >= pointsNeeded) {
        if (state.level < 10) {
            state.level++;
        } else {
            if (currentRankIndex < RANKS.length - 1) {
                state.rank = RANKS[currentRankIndex + 1];
                state.level = 1;
                showBonusChallenge();
            }
        }
        saveState();
        showNotification('Rank Up Available!', 'success');
    }
}

function showBonusChallenge() {
    const challenge = generateBonusChallenge();
    showModal('bonus-challenge-modal', {
        challenge: challenge,
        onComplete: () => {
            completeBonusChallenge();
        }
    });
}

// Premium Features
function watchAd() {
    if (state.premiumType === 'PAID') {
        showNotification('You are already on paid premium!', 'info');
        return;
    }

    // Simulate ad viewing
    showModal('ad-modal');
    setTimeout(() => {
        hideModal('ad-modal');
        state.adsWatched++;
        
        if (state.adsWatched >= 10 && state.premiumType === 'FREE') {
            state.premiumType = 'AD_PREMIUM';
            state.aiQueriesLeft = 8;
            showNotification('Congratulations! You\'ve unlocked Ad Premium!', 'success');
        }
        
        saveState();
        showAds();
    }, 5000);
}

function buyPremium() {
    // Simulate payment processing
    showModal('payment-modal');
    document.getElementById('payment-form').addEventListener('submit', (e) => {
        e.preventDefault();
        state.premiumType = 'PAID';
        state.aiQueriesLeft = 20;
        saveState();
        hideModal('payment-modal');
        showNotification('Welcome to Premium!', 'success');
        showAds();
    });
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.getElementById('notifications-container').appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// Storage Management
function saveState() {
    localStorage.setItem('atherton_state', JSON.stringify(state));
}

function loadState() {
    const savedState = localStorage.getItem('atherton_state');
    if (savedState) {
        state = JSON.parse(savedState);
    } else {
        initializeNewUser();
    }
}

// Midnight Reset and Penalties
function checkMidnightReset() {
    const today = new Date().toDateString();
    if (state.lastLogin !== today) {
        const uncompletedTasks = state.tasks.filter(task => !task.completed).length;
        if (uncompletedTasks > 0) {
            const penalty = Math.floor(state.points * 0.5 * (uncompletedTasks / state.tasks.length));
            removePoints(penalty);
            showNotification(`Daily Reset: -${penalty} points penalty for uncompleted tasks!`, 'warning');
            state.streak = 0;
        } else {
            state.streak++;
            showNotification(`Perfect day! Streak: ${state.streak}`, 'success');
        }
        
        // Reset tasks
        state.tasks.forEach(task => task.completed = false);
        state.lastLogin = today;
        saveState();
    }
}

// Ad Management
function showAds() {
    const topBanner = document.getElementById('banner-ad-top');
    const bottomBanner = document.getElementById('banner-ad-bottom');
    
    switch(state.premiumType) {
        case 'FREE':
            topBanner.style.height = '90px';
            bottomBanner.style.height = '90px';
            setupInterstitialAds();
            break;
        case 'AD_PREMIUM':
            topBanner.style.height = '50px';
            bottomBanner.style.height = '50px';
            break;
        case 'PAID':
            topBanner.style.display = 'none';
            bottomBanner.style.display = 'none';
            break;
    }
}

function setupInterstitialAds() {
    if (state.premiumType !== 'FREE') return;
    
    setInterval(() => {
        showModal('interstitial-ad-modal');
        setTimeout(() => hideModal('interstitial-ad-modal'), 3000);
    }, 20 * 60 * 1000); // 20 minutes
}

// UI Rendering
function renderUI() {
    renderTasks();
    renderPoints();
    renderRank();
    renderPremiumStatus();
}

function renderTasks() {
    const tasksList = document.getElementById('tasks-list');
    tasksList.innerHTML = '';
    
    state.tasks.forEach(task => {
        const taskElement = createTaskElement(task);
        tasksList.appendChild(taskElement);
    });
}

function createTaskElement(task) {
    const div = document.createElement('div');
    div.className = `task-item ${task.completed ? 'completed' : ''} priority-${task.priority}`;
    div.innerHTML = `
        <input type="checkbox" ${task.completed ? 'checked' : ''}>
        <span class="task-text">${task.text}</span>
        <span class="task-points">+${task.points}</span>
    `;
    
    div.querySelector('input').addEventListener('change', () => toggleTask(task.id));
    return div;
}

function renderPoints() {
    document.getElementById('points-display').textContent = formatPoints(state.points);
}

function renderRank() {
    const rankDisplay = document.getElementById('rank-display');
    rankDisplay.textContent = `${state.rank}-${state.level}`;
    rankDisplay.style.color = RANK_COLORS[state.rank];
}

function renderPremiumStatus() {
    document.getElementById('premium-status').textContent = state.premiumType;
    document.getElementById('ai-queries').textContent = `AI Queries Left: ${state.aiQueriesLeft}`;
}

// Helper Functions
function generatePersonalizedPlans() {
    if (!state.user) return;
    
    const plans = {
        workout: generateWorkoutPlan(),
        meal: generateMealPlan(),
        daily: generateDailyPlan()
    };
    
    state.plans = plans;
    saveState();
}

function generateWorkoutPlan() {
    // Generate based on user.lifestyle, user.freeTime, etc.
    return {
        monday: ['Exercise A', 'Exercise B'],
        // ... other days
    };
}

function generateMealPlan() {
    // Generate based on user.dietary, etc.
    return {
        breakfast: ['Option 1', 'Option 2'],
        // ... other meals
    };
}

function generateDailyPlan() {
    // Generate based on user.interests, priorities, etc.
    return {
        morning: ['Task 1', 'Task 2'],
        // ... other times
    };
}

function generateBonusChallenge() {
    const challenges = [
        'Complete 5 high-priority tasks in one day',
        'Maintain a 3-day perfect streak',
        'Complete 10 tasks of any priority'
    ];
    return challenges[Math.floor(Math.random() * challenges.length)];
}

function checkPremiumStatus() {
    // Check premium expiry
    if (state.premiumType !== 'FREE') {
        const premiumExpiry = localStorage.getItem('premium_expiry');
        if (premiumExpiry && new Date() > new Date(premiumExpiry)) {
            state.premiumType = 'FREE';
            state.aiQueriesLeft = 5;
            saveState();
            showNotification('Premium has expired. Reverting to free tier.', 'warning');
            showAds();
        }
    }
}

// Modal Management
function showModal(modalId, data = {}) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'block';
        if (data.challenge) {
            modal.querySelector('.challenge-text').textContent = data.challenge;
            modal.querySelector('.complete-btn').onclick = data.onComplete;
        }
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}