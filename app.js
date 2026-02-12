/ ============================================================
// APP MODULE
// ============================================================
// Application initialization and event binding
/**
	Update UI with current state
*/
function renderUI() {
const data = State.getData();
// Points
const pointsEl = document.getElementById('totalPoints');
if (pointsEl) pointsEl.textContent = formatPoints(data.totalPoints || 0);
// Level & Rank
const level = calculateLevel(data.totalPoints || 0);
const rankIndex = calculateRank(level);
const rankName = RANKS[rankIndex] || RANKS[0];
const levelEl = document.getElementById('levelDisplay');
const rankEl = document.getElementById('rankDisplay');
if (levelEl) levelEl.textContent = level;
if (rankEl) rankEl.textContent = rankName;
// Streak
const streakEl = document.getElementById('streakCount');
if (streakEl) streakEl.textContent = data.streakDays || 0;
// Premium badge
const isPremium = data.premiumStatus === 'premium' &&
data.premiumExpiry &&
data.premiumExpiry > Date.now();
const premiumEl = document.getElementById('premiumBadge');
if (premiumEl) premiumEl.style.display = isPremium ? 'block' : 'none';
// Ads watched
const adsCountEl = document.getElementById('adsWatchedCount');
if (adsCountEl) adsCountEl.textContent = data.adsWatched || 0;
// Progress bar
const progress = getCurrentLevelProgress(data.totalPoints || 0);
const progressBar = document.getElementById('progressBar');
if (progressBar) progressBar.style.width = ${progress.percent}%;
const progressText = document.getElementById('progressText');
if (progressText) {
progressText.textContent = ${Math.floor(progress.current)}/${progress.required};
}
// Render rank-up challenge if active
renderRankUpChallenge();
}
/**
	Initialize the application
*/
function initApp() {
console.log('🎮 Initializing Atherion...');
// Initialize Firebase
initFirebase();
// Load saved data
loadData(() => {
console.log('✅ Data loaded');
 // Check for day changes
 checkMidnightReset();
 updateStreak();
 
 // Initial render
 renderUI();
 renderTasks();
 checkAchievements();
 
 // Show greeting on first visit
 const data = State.getData();
 if (!data.lastVisit) {
     showIsekaiGreeting();
 }
 
 console.log('🚀 Atherion ready!');

});
// Set up event listeners
setupEventListeners();
}
/**
	Set up all event listeners
*/
function setupEventListeners() {
// Add task button
const addTaskBtn = document.getElementById('addTaskBtn');
if (addTaskBtn) {
addTaskBtn.addEventListener('click', addTask);
}
// Task input - Enter key
const taskInput = document.getElementById('taskInput');
if (taskInput) {
taskInput.addEventListener('keypress', (e) => {
if (e.key === 'Enter') {
addTask();
}
});
}
// Category buttons
document.querySelectorAll('.category-btn').forEach(btn => {
btn.addEventListener('click', () => {
const category = parseInt(btn.dataset.category);
switchCategory(category);
});
});
// Watch ad button
const watchAdBtn = document.getElementById('watchAdBtn');
if (watchAdBtn) {
watchAdBtn.addEventListener('click', watchAd);
}
// Achievements button
const achievementsBtn = document.getElementById('achievementsBtn');
if (achievementsBtn) {
achievementsBtn.addEventListener('click', toggleAchievementsPanel);
}
// Motivational notifications every 2 hours
setInterval(showMotivationalNotification, 2 * 60 * 60 * 1000);
}
// Initialize app when DOM is ready
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', initApp);
} else {
initApp();
}