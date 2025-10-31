/**
 * NEXUS - SELF-DEVELOPMENT RANK-UP APP
 * Phase A: Task Management + Dynamic Points System
 * Version: 2.0 (Dynamic +150 points per rank)
 * Created: Oct 31, 2025
 */

// ============================================================================
// IMPORTS - Import rankSystem.js functions
// ============================================================================
import {
    calculateRankAndLevel,
    getPointsPerLevel,
    getPointsNeededForRank,
    formatNumber,
    RANKS,
    RANK_COLORS
} from './rankSystem.js';

// ============================================================================
// GLOBAL STATE
// ============================================================================

let tasks = [];
let userPoints = 0;
let userPremiumAds = 0;
let isPremium = false;
let streakDays = 0;
let lastLoginDate = new Date().toDateString();

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 NEXUS App Loading...');
    
    // Load data
    loadFromLocalStorage();
    
    // Initialize UI
    renderTasks();
    updateUserDisplay();
    setupEventListeners();
    checkMidnightPenalty();
    
    console.log('✅ NEXUS Ready! Points:', userPoints, 'Tasks:', tasks.length);
});

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Add task button
    document.getElementById('add-task-btn')?.addEventListener('click', showAddTaskModal);
    
    // Task input - Enter key
    document.getElementById('new-task-name')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });
    
    // Add task button in modal
    document.getElementById('confirm-add-task')?.addEventListener('click', addTask);
    
    // Category buttons
    document.querySelectorAll('[data-category]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('[data-category]').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            filterTasksByCategory(e.target.dataset.category);
        });
    });
    
    // Watch ad button
    document.getElementById('watch-ad-btn')?.addEventListener('click', watchAd);
    
    // Premium features
    document.getElementById('claim-premium')?.addEventListener('click', claimPremiumReward);
}

// ============================================================================
// TASK MANAGEMENT
// ============================================================================

function showAddTaskModal() {
    // Show modal UI
    const modal = document.getElementById('add-task-modal');
    if (modal) modal.style.display = 'block';
    document.getElementById('new-task-name').focus();
}

function addTask() {
    const taskName = document.getElementById('new-task-name')?.value.trim();
    const priority = document.getElementById('priority-select')?.value || 'medium';
    const category = document.getElementById('category-select')?.value || 'learning';
    
    if (!taskName) {
        showNotification('Task name cannot be empty!', 'error');
        return;
    }
    
    const task = {
        id: Date.now(),
        name: taskName,
        priority: priority,
        category: category,
        completed: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        points: getPointsForPriority(priority)
    };
    
    tasks.push(task);
    
    // Clear input
    document.getElementById('new-task-name').value = '';
    
    // Close modal
    const modal = document.getElementById('add-task-modal');
    if (modal) modal.style.display = 'none';
    
    // Update UI
    renderTasks();
    saveToLocalStorage();
    
    showNotification(`✅ Task added: ${taskName}`, 'success');
}

function getPointsForPriority(priority) {
    const pointMap = {
        'high': 100,
        'medium': 50,
        'low': 30
    };
    return pointMap[priority] || 50;
}

function toggleTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Get old stats before update
    const oldStats = calculateRankAndLevel(userPoints);
    
    // Toggle completion
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    
    // Update points
    if (task.completed) {
        userPoints += task.points;
    } else {
        userPoints -= task.points;
        userPoints = Math.max(0, userPoints);
    }
    
    // Get new stats after update
    const newStats = calculateRankAndLevel(userPoints);
    
    // Check for rank up
    if (newStats.rank !== oldStats.rank) {
        triggerRankUpAnimation(oldStats.rank, newStats.rank);
    }
    
    // Update display
    renderTasks();
    updateUserDisplay();
    saveToLocalStorage();
    
    console.log(`Task ${task.completed ? 'completed' : 'uncompleted'}: ${task.name}`);
}

function deleteTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // If completed, remove points
    if (task.completed) {
        userPoints -= task.points;
        userPoints = Math.max(0, userPoints);
    }
    
    // Remove from array
    tasks = tasks.filter(t => t.id !== taskId);
    
    // Update display
    renderTasks();
    updateUserDisplay();
    saveToLocalStorage();
    
    showNotification('Task deleted', 'info');
}

function editTask(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newName = prompt('Edit task name:', task.name);
    if (newName && newName.trim()) {
        task.name = newName.trim();
        renderTasks();
        saveToLocalStorage();
        showNotification('Task updated', 'success');
    }
}

function renderTasks() {
    const currentCategory = document.querySelector('[data-category].active')?.dataset.category || 'all';
    let filteredTasks = tasks;
    
    if (currentCategory !== 'all') {
        filteredTasks = tasks.filter(t => t.category === currentCategory);
    }
    
    const taskList = document.getElementById('task-list');
    if (!taskList) return;
    
    // Sort by completion status and priority
    filteredTasks.sort((a, b) => {
        if (a.completed === b.completed) {
            const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.completed ? 1 : -1;
    });
    
    taskList.innerHTML = filteredTasks.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''} priority-${task.priority}">
            <input 
                type="checkbox" 
                ${task.completed ? 'checked' : ''} 
                onchange="toggleTask(${task.id})"
                class="task-checkbox"
            />
            <div class="task-content">
                <span class="task-name">${escapeHtml(task.name)}</span>
                <span class="task-points">+${task.points} pts</span>
            </div>
            <div class="task-actions">
                <button onclick="editTask(${task.id})" class="btn-small">✏️ Edit</button>
                <button onclick="deleteTask(${task.id})" class="btn-small">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
    
    // Show empty state
    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<p class="empty-state">No tasks. Create one to get started! 🚀</p>';
    }
}

function filterTasksByCategory(category) {
    renderTasks();
}

// ============================================================================
// RANK & POINTS SYSTEM (Dynamic +150 per rank)
// ============================================================================

function updateUserDisplay() {
    // Calculate current stats
    const stats = calculateRankAndLevel(userPoints);
    
    // Update rank display
    const rankElement = document.getElementById('rank-display');
    if (rankElement) {
        rankElement.textContent = `${stats.rank} - Level ${stats.level}`;
        rankElement.style.color = stats.color;
    }
    
    // Update total level
    const totalLevelElement = document.getElementById('total-level');
    if (totalLevelElement) {
        totalLevelElement.textContent = `Total Level: ${stats.totalLevel}/180`;
    }
    
    // Update points display
    const pointsElement = document.getElementById('points-display');
    if (pointsElement) {
        pointsElement.textContent = `${formatNumber(stats.totalPoints)} points`;
    }
    
    // Update progress bars
    const levelProgressBar = document.getElementById('level-progress-bar');
    if (levelProgressBar) {
        levelProgressBar.style.width = stats.progressInLevelPercent + '%';
    }
    
    const rankProgressBar = document.getElementById('rank-progress-bar');
    if (rankProgressBar) {
        rankProgressBar.style.width = stats.progressInRankPercent + '%';
    }
    
    // Update next level cost
    const nextLevelElement = document.getElementById('next-level-cost');
    if (nextLevelElement) {
        nextLevelElement.textContent = `Next Level: ${formatNumber(stats.pointsNeededForNextLevel)} pts (${formatNumber(stats.pointsPerLevelRequired)} required)`;
    }
    
    // Update rank badge
    const rankBadge = document.getElementById('rank-badge');
    if (rankBadge) {
        rankBadge.textContent = stats.rank;
        rankBadge.style.backgroundColor = stats.color;
    }
    
    // Update ad counter
    const adCounterElement = document.getElementById('ad-counter');
    if (adCounterElement) {
        adCounterElement.textContent = `${userPremiumAds}/10`;
    }
    
    // Update premium status
    const premiumStatusElement = document.getElementById('premium-status');
    if (premiumStatusElement) {
        premiumStatusElement.textContent = isPremium ? '👑 PREMIUM' : 'Free';
        premiumStatusElement.style.color = isPremium ? '#FFD700' : '#999';
    }
    
    console.log('Display Updated:', stats);
}

function triggerRankUpAnimation(oldRank, newRank) {
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'rank-up-notification';
    notification.innerHTML = `
        <div class="rank-up-content">
            <h2>🎉 RANK UP! 🎉</h2>
            <p><span style="color: ${RANK_COLORS[oldRank]}">${oldRank}</span> → <span style="color: ${RANK_COLORS[newRank]}">${newRank}</span></p>
            <p>Congratulations! You've reached ${newRank}!</p>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animation
    notification.style.animation = 'slideInUp 0.5s ease-out';
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutDown 0.5s ease-in';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
    
    // Sound effect (optional)
    playSound('levelup');
}

// ============================================================================
// PREMIUM SYSTEM
// ============================================================================

function watchAd() {
    if (isPremium) {
        showNotification('You already have premium! 👑', 'info');
        return;
    }
    
    userPremiumAds++;
    
    if (userPremiumAds >= 10) {
        isPremium = true;
        userPremiumAds = 0;
        showNotification('🎉 You unlocked Premium! +50% to rewards!', 'success');
    } else {
        showNotification(`Ad watched (${userPremiumAds}/10)`, 'info');
    }
    
    updateUserDisplay();
    saveToLocalStorage();
}

function claimPremiumReward() {
    if (!isPremium) {
        showNotification('Watch 10 ads to unlock premium rewards!', 'warning');
        return;
    }
    
    const baseReward = 500;
    const bonus = Math.floor(baseReward * 1.5); // 50% bonus for premium
    
    const oldStats = calculateRankAndLevel(userPoints);
    
    // Add bonus points
    userPoints += bonus;
    
    const newStats = calculateRankAndLevel(userPoints);
    
    // Check for rank up
    if (newStats.rank !== oldStats.rank) {
        triggerRankUpAnimation(oldStats.rank, newStats.rank);
    }
    
    showNotification(`💎 Premium Reward: +${formatNumber(bonus)} points!`, 'success');
    
    updateUserDisplay();
    saveToLocalStorage();
}

// ============================================================================
// MIDNIGHT PENALTY SYSTEM
// ============================================================================

function checkMidnightPenalty() {
    const today = new Date().toDateString();
    
    if (lastLoginDate !== today) {
        // It's a new day - apply penalty
        applyMidnightPenalty();
        lastLoginDate = today;
    }
}

function applyMidnightPenalty() {
    const uncompletedCount = tasks.filter(t => !t.completed).length;
    const penalty = uncompletedCount * 100;
    
    if (uncompletedCount === 0) {
        showNotification('✅ Perfect day! No penalties!', 'success');
        streakDays++;
        return;
    }
    
    const oldStats = calculateRankAndLevel(userPoints);
    
    // Apply penalty
    userPoints -= penalty;
    userPoints = Math.max(0, userPoints);
    
    // Reset tasks
    tasks.forEach(t => t.completed = false);
    
    // Reset streak
    streakDays = 0;
    
    const newStats = calculateRankAndLevel(userPoints);
    
    // Show penalty notification
    showNotification(
        `⚠️ Midnight Penalty: -${formatNumber(penalty)} points
${uncompletedCount} uncompleted tasks`,
        'warning'
    );
    
    updateUserDisplay();
    renderTasks();
    saveToLocalStorage();
}

// ============================================================================
// STORAGE (LocalStorage)
// ============================================================================

function saveToLocalStorage() {
    const data = {
        tasks: tasks,
        userPoints: userPoints,
        userPremiumAds: userPremiumAds,
        isPremium: isPremium,
        streakDays: streakDays,
        lastLoginDate: lastLoginDate,
        lastUpdated: new Date().toISOString(),
        systemVersion: 2 // Dynamic points system
    };
    
    try {
        localStorage.setItem('nexusAppData', JSON.stringify(data));
        console.log('✅ Data saved to localStorage');
    } catch (error) {
        console.error('❌ Error saving to localStorage:', error);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('nexusAppData');
        
        if (!saved) {
            console.log('No saved data found. Starting fresh.');
            return;
        }
        
        const data = JSON.parse(saved);
        
        // Load data
        tasks = data.tasks || [];
        userPoints = data.userPoints || 0;
        userPremiumAds = data.userPremiumAds || 0;
        isPremium = data.isPremium || false;
        streakDays = data.streakDays || 0;
        lastLoginDate = data.lastLoginDate || new Date().toDateString();
        
        console.log('✅ Data loaded from localStorage');
        console.log('Loaded:', { tasks: tasks.length, points: userPoints, premium: isPremium });
    } catch (error) {
        console.error('❌ Error loading from localStorage:', error);
    }
}

// ============================================================================
// UTILITIES
// ============================================================================

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : type === 'warning' ? '#ff9800' : '#2196F3'};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function playSound(soundName) {
    // Optional: Add sound effects
    try {
        const sounds = {
            'levelup': new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAAA=')
        };
        if (sounds[soundName]) {
            sounds[soundName].play().catch(() => {});
        }
    } catch (e) {
        // Sound failed, ignore
    }
}

// ============================================================================
// DEBUG FUNCTIONS (for testing)
// ============================================================================

function debugTestRanks() {
    console.log('=== RANK SYSTEM TEST ===');
    const testPoints = [0, 10000, 21500, 50000, 100000, 200000, 300000, 409500];
    testPoints.forEach(points => {
        const stats = calculateRankAndLevel(points);
        console.log(`Points: ${formatNumber(points)} → Rank: ${stats.rank}, Level: ${stats.level}, Total: ${stats.totalLevel}`);
    });
}

function debugAddPoints(amount) {
    userPoints += amount;
    updateUserDisplay();
    saveToLocalStorage();
    console.log(`Added ${amount} points. Total: ${userPoints}`);
}

function debugResetData() {
    if (confirm('Are you sure? This will delete all data!')) {
        tasks = [];
        userPoints = 0;
        userPremiumAds = 0;
        isPremium = false;
        streakDays = 0;
        localStorage.removeItem('nexusAppData');
        location.reload();
    }
}

// ============================================================================
// EXPORT (for testing)
// ============================================================================

window.nexusDebug = {
    testRanks: debugTestRanks,
    addPoints: debugAddPoints,
    resetData: debugResetData
};

console.log('🎮 NEXUS Debug Commands Available:');
console.log('- nexusDebug.testRanks() - Test rank system');
console.log('- nexusDebug.addPoints(100) - Add points');
console.log('- nexusDebug.resetData() - Reset all data');
