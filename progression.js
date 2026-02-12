// ============================================================
// PROGRESSION MODULE
// ============================================================
// Handles leveling, ranking, and challenge systems
/**
	Calculate points required per level in a rank
	@param {number} rankIndex - The rank index (0-17)
	@returns {number} Points per level
*/
function getPointsPerLevel(rankIndex) {
return 1000 + rankIndex * 150;
}
/**
	Calculate total points required for a rank (10 levels)
	@param {number} rankIndex - The rank index
	@returns {number} Total points for rank
*/
function getPointsPerRank(rankIndex) {
return getPointsPerLevel(rankIndex) * 10;
}
/**
	Calculate level from total points
	@param {number} points - Total points
	@returns {number} Current level (0-179)
*/
function calculateLevel(points) {
if (isNaN(points) || points == null || points < 0) {
return 0;
}
let rankIndex = 0;
let pointsUsed = 0;
for (let i = 0; i < RANKS.length; i++) {
const pointsForThisRank = getPointsPerRank(i);
if (pointsUsed + pointsForThisRank <= points) {
pointsUsed += pointsForThisRank;
rankIndex++;
} else {
break;
}
}
if (rankIndex >= RANKS.length) {
return RANKS.length * 10 - 1;
}
const remainingPoints = points - pointsUsed;
const pointsPerLevel = getPointsPerLevel(rankIndex);
if (pointsPerLevel <= 0) {
return rankIndex * 10;
}
const levelInRank = Math.floor(remainingPoints / pointsPerLevel);
const finalLevel = rankIndex * 10 + Math.min(levelInRank, 9);
return isNaN(finalLevel) ? 0 : finalLevel;
}
/**
	Calculate rank index from level
	@param {number} level - Current level
	@returns {number} Rank index (0-17)
*/
function calculateRank(level) {
if (isNaN(level) || level == null) {
return 0;
}
const rankIndex = Math.floor(level / 10);
return Math.min(rankIndex, RANKS.length - 1);
}
/**
	Get current level progress
	@param {number} points - Total points
	@returns {Object} Progress data
*/
function getCurrentLevelProgress(points) {
const level = calculateLevel(points);
const rankIndex = Math.floor(level / 10);
const pointsPerLevel = getPointsPerLevel(rankIndex);
let pointsUsedForPreviousRanks = 0;
for (let i = 0; i < rankIndex; i++) {
pointsUsedForPreviousRanks += getPointsPerRank(i);
}
const levelInRank = level % 10;
const pointsInCurrentLevel = points - pointsUsedForPreviousRanks - (levelInRank * pointsPerLevel);
return {
current: pointsInCurrentLevel,
required: pointsPerLevel,
percent: (pointsInCurrentLevel / pointsPerLevel) * 100
};
}
/**
	Check for rank up and trigger challenge if needed
*/
function checkRankUp() {
const data = State.getData();
const currentLevel = calculateLevel(data.totalPoints);
const potentialRankIndex = calculateRank(currentLevel);
// Update level
State.update({ level: currentLevel });
// If rank-locked, check if challenge is complete
if (data.rankLockedUntilChallenge) {
if (isChallengeCompleted()) {
State.update({
rankLockedUntilChallenge: false,
rankUpChallenge: null,
hasActiveRankChallenge: false,
rank: potentialRankIndex
});
showModal(
Challenge Completed! You are now <strong>Rank ${RANKS[potentialRankIndex]}</strong>!,
"RANK UP! 🎉",
"👑"
);
saveData();
renderUI();
}
return;
}
// Trigger rank-up challenge if qualified
if (potentialRankIndex > data.rank) {
State.update({ rankLockedUntilChallenge: true });
generateRankUpChallenge();
saveData();
renderRankUpChallenge();
return;
}
// Sync rank (handle demotion)
State.update({ rank: Math.min(data.rank, potentialRankIndex) });
saveData();
}
/**
	Generate a rank-up challenge
*/
function generateRankUpChallenge() {
const challenges = [
"Complete 3 high-priority tasks today",
"Earn 500 points without losing any",
"Complete all tasks in one category",
"Maintain a 3-day streak",
"Complete 5 tasks in a single day"
];
const challenge = challenges[Math.floor(Math.random() * challenges.length)];
State.update({
rankUpChallenge: challenge,
hasActiveRankChallenge: true,
rankLockedUntilChallenge: true
});
saveData();
renderRankUpChallenge();
showRankUpModal();
}
/**
	Render rank-up challenge box
*/
function renderRankUpChallenge() {
const box = document.getElementById('rankUpChallengeBox');
const text = document.getElementById('rankUpChallengeText');
if (!box || !text) return;
const data = State.getData();
if (data.hasActiveRankChallenge && data.rankUpChallenge) {
box.style.display = 'block';
text.textContent = data.rankUpChallenge;
} else {
box.style.display = 'none';
}
}
/**
	Show rank-up challenge modal
*/
function showRankUpModal() {
const data = State.getData();
const nextRankIndex = Math.floor(calculateLevel(data.totalPoints) / 10) + 1;
const nextRank = RANKS[Math.min(nextRankIndex, RANKS.length - 1)];
showModal(
A challenge has appeared to test your resolve!<br><br><strong style="color:#b19cd9">${data.rankUpChallenge}</strong>,
RANK UP CHALLENGE - ${nextRank} RANK,
"⚔️"
);
}
/**
	Check if current challenge is completed
	@returns {boolean}
*/
function isChallengeCompleted() {
const data = State.getData();
if (!data.rankUpChallenge) return false;
const challenge = data.rankUpChallenge.toLowerCase();
const today = new Date().toDateString();
// Complete 5 tasks today
if (challenge.includes('complete 5 tasks')) {
const completedToday = data.tasks.filter(t => {
if (!t.isDone || !t.doneTimestamp) return false;
return new Date(t.doneTimestamp).toDateString() === today;
}).length;
return completedToday >= 5;
}
// Maintain 3-day streak
if (challenge.includes('3-day streak')) {
return (data.streakDays || 0) >= 3;
}
// Earn 500 points
if (challenge.includes('earn 500 points')) {
const pointsToday = data.tasks
.filter(t => {
if (!t.isDone || !t.doneTimestamp) return false;
return new Date(t.doneTimestamp).toDateString() === today;
})
.reduce((sum, task) => sum + (PRIORITY_POINTS[task.priority] || 0), 0);
return pointsToday >= 500;
}
// Complete all tasks in one category
if (challenge.includes('complete all tasks in one category')) {
for (let cat = 1; cat <= 4; cat++) {
const relevantTasks = data.tasks.filter(t => t.category === cat);
if (relevantTasks.length > 0 && relevantTasks.every(t => t.isDone)) {
return true;
}
}
return false;
}
// Complete 3 high-priority tasks
if (challenge.includes('3 high-priority tasks')) {
const count = data.tasks.filter(t => {
return t.priority === 'high' &&
t.isDone &&
t.doneTimestamp &&
new Date(t.doneTimestamp).toDateString() === today;
}).length;
return count >= 3;
}
return false;
}
/**
	Update daily streak
*/
function updateStreak() {
const data = State.getData();
const today = new Date().toDateString();
const lastVisit = data.lastVisit;
if (today === lastVisit) {
return; // Already visited today
}
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
if (lastVisit === yesterday.toDateString()) {
// Visited yesterday, increment streak
State.update({
streakDays: (data.streakDays || 0) + 1,
lastVisit: today
});
} else {
// Missed a day, reset streak
State.update({
streakDays: 1,
lastVisit: today
});
}
saveData();
}
/**
	Check midnight reset and apply penalties
*/
function checkMidnightReset() {
const data = State.getData();
const today = new Date().toDateString();
if (data.lastResetDate !== today) {
let penalties = 0;
 data.tasks.forEach((task, index) => {
     if (!task.isDone) {
         const penalty = PRIORITY_PENALTIES[task.priority] || 0;
         penalties += penalty;
         State.removePoints(penalty);
     }
     // Reset task completion status
     State.updateTask(index, {
         isDone: false,
         doneTimestamp: null
     });
 });
 
 State.update({ lastResetDate: today });
 
 if (penalties > 0) {
     showModal(
         `You lost <strong style="color:#ff6b6b">${penalties} points</strong> for incomplete tasks.<br><br>Complete tasks daily to avoid penalties!`,
         "MIDNIGHT PENALTIES ⏰",
         "⚠️"
     );
 }
 
 saveData();

}
}
/**
	Format points for display
	@param {number} points
	@returns {string}
*/
function formatPoints(points) {
if (points >= 1000000) {
return (points / 1000000).toFixed(1).replace('.0', '') + 'M';
}
if (points >= 1000) {
return (points / 1000).toFixed(1).replace('.0', '') + 'k';
}
return points.toString();
}
/**
	Watch ad for premium
*/
function watchAd() {
const data = State.getData();
if (data.adsWatched >= REWARD_AD_CONFIG.adsRequired) {
showModal(
"You have already watched all 10 ads! 7 Days Premium is now active! ✨",
"PREMIUM UNLOCKED! 👑",
"🎉"
);
return;
}
State.update({ adsWatched: data.adsWatched + 1 });
const newAdsWatched = State.get('adsWatched');
if (newAdsWatched >= REWARD_AD_CONFIG.adsRequired) {
const premiumDuration = REWARD_AD_CONFIG.premiumDays * 24 * 60 * 60 * 1000;
State.update({
premiumStatus: 'premium',
premiumExpiry: Date.now() + premiumDuration
});
 showModal(
     "🎉 CONGRATULATIONS! You have unlocked 7 Days Premium!<br><br>Enjoy exclusive rewards and features, Hero! ✨",
     "7 DAYS PREMIUM UNLOCKED! 👑",
     "🏆"
 );

} else {
showModal(
Ad watched! ${newAdsWatched}/${REWARD_AD_CONFIG.adsRequired} ads completed.<br><br>Keep going! You're almost there! 💪,
"AD WATCHED 📺",
"✅"
);
}
saveData();
renderUI();
}