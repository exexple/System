// ============================================================
// ACHIEVEMENTS MODULE
// ============================================================
// Handles achievement checking, unlocking, and display
/**
	Check for newly unlocked achievements
*/
function checkAchievements() {
const data = State.getData();
const newlyUnlocked = [];
ACHIEVEMENTS_LIST.forEach(achievement => {
if (!data.unlockedAchievements.includes(achievement.id)) {
if (achievement.check(data)) {
State.addAchievement(achievement.id);
newlyUnlocked.push(achievement);
}
}
});
// Show notifications for new achievements
newlyUnlocked.forEach((ach, index) => {
setTimeout(() => {
showModal(
<strong>${ach.name}</strong><br><br>${ach.desc},
"ACHIEVEMENT UNLOCKED! 🎉",
ach.icon
);
}, index * 300);
});
if (newlyUnlocked.length > 0) {
saveData();
}
}
/**
	Render achievements panel
*/
function renderAchievements() {
const panel = document.getElementById('achievementsList');
if (!panel) return;
const data = State.getData();
panel.innerHTML = '';
ACHIEVEMENTS_LIST.forEach(achievement => {
const unlocked = data.unlockedAchievements.includes(achievement.id);
 const achDiv = document.createElement('div');
 achDiv.className = `achievement-item ${unlocked ? 'unlocked' : 'locked'}`;
 
 achDiv.innerHTML = `
     <div class="ach-icon">${unlocked ? achievement.icon : '🔒'}</div>
     <div class="ach-info">
         <div class="ach-name">${achievement.name}</div>
         <div class="ach-desc">${achievement.desc}</div>
     </div>
 `;
 
 panel.appendChild(achDiv);

});
}
/**
	Toggle achievements panel visibility
*/
function toggleAchievementsPanel() {
const panel = document.getElementById('achievementsPanel');
if (!panel) return;
if (panel.style.display === 'none' || !panel.style.display) {
panel.style.display = 'block';
renderAchievements();
} else {
panel.style.display = 'none';
}
}
/**
	Show a motivational notification
*/
function showMotivationalNotification() {
const now = Date.now();
const lastTime = State.get('lastMotivationTime') || 0;
const twoHours = 2 * 60 * 60 * 1000;
if (now - lastTime >= twoHours && State.get('tasks').length > 0) {
const message = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
showModal(message, "STAY MOTIVATED! 💪", "⭐");
State.update({ lastMotivationTime: now });
saveData();
}
}
/**
	Show isekai-style greeting
*/
function showIsekaiGreeting() {
const greeting = ISEKAI_GREETINGS[Math.floor(Math.random() * ISEKAI_GREETINGS.length)];
showModal(greeting, "WELCOME HERO! ⚔️", "🌟");
}