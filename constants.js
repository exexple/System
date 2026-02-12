/ ============================================================
// CONSTANTS MODULE
// ============================================================
// Game balance configuration and initial state
const RANKS = ["E", "EE", "EEE", "D", "DD", "DDD", "C", "CC", "CCC", "B", "BB", "BBB", "A", "AA", "AAA", "S", "SS", "SSS"];
const PRIORITY_POINTS = {
high: 100,
medium: 50,
low: 30
};
const PRIORITY_PENALTIES = {
high: 50,
medium: 25,
low: 15
};
const REWARD_AD_CONFIG = {
adsRequired: 10,
premiumDays: 7
};
// Achievement definitions
const ACHIEVEMENTS_LIST = [
{
id: "firsttask",
name: "First Step",
desc: "Complete your first task",
icon: "🎯",
check: (data) => data.lifetimeTasksCompleted >= 1
},
{
id: "streak3",
name: "3-Day Streak",
desc: "Maintain a 3-day streak",
icon: "🔥",
check: (data) => data.streakDays >= 3
},
{
id: "streak7",
name: "7-Day Streak",
desc: "Maintain a 7-day streak",
icon: "⚡",
check: (data) => data.streakDays >= 7
},
{
id: "streak30",
name: "30-Day Streak",
desc: "Maintain a 30-day streak",
icon: "👑",
check: (data) => data.streakDays >= 30
},
{
id: "task50",
name: "Task Master",
desc: "Complete 50 tasks",
icon: "💪",
check: (data) => data.lifetimeTasksCompleted >= 50
},
{
id: "task100",
name: "Century Club",
desc: "Complete 100 tasks",
icon: "🏆",
check: (data) => data.lifetimeTasksCompleted >= 100
},
{
id: "task500",
name: "Legend",
desc: "Complete 500 tasks",
icon: "⭐",
check: (data) => data.lifetimeTasksCompleted >= 500
},
{
id: "rankd",
name: "D-Rank Adventurer",
desc: "Reach D Rank",
icon: "🛡️",
check: (data) => data.rank >= 3
},
{
id: "rankc",
name: "C-Rank Hero",
desc: "Reach C Rank",
icon: "⚔️",
check: (data) => data.rank >= 6
},
{
id: "rankb",
name: "B-Rank Champion",
desc: "Reach B Rank",
icon: "🗡️",
check: (data) => data.rank >= 9
}
];
const ISEKAI_GREETINGS = [
"Welcome, Adventurer! Your journey in this new world begins now!",
"Greetings, Hero! The gods have chosen you for greatness!",
"You've been summoned! Time to level up your skills!",
"Another day, another quest! Ready to conquer your tasks?",
"Rise and shine, Champion! Your destiny awaits!",
"Welcome back, Brave Soul! Let's achieve legendary status today!"
];
const MOTIVATIONAL_MESSAGES = [
"Every completed task brings you closer to S-Rank!",
"Keep grinding! Legendary heroes are made through daily effort!",
"Your determination is your greatest weapon!",
"Small victories lead to epic achievements!",
"You're on fire! Keep that momentum going!",
"Remember: Even the strongest heroes started at E-Rank!"
];
// Initial application state
const INITIAL_APP_DATA = {
totalPoints: 0,
level: 0,
rank: 0,
tasks: [],
premiumStatus: "free",
premiumExpiry: null,
adsWatched: 0,
lifetimeTasksCompleted: 0,
streakDays: 0,
lastVisit: null,
lastResetDate: null,
unlockedAchievements: [],
hasActiveRankChallenge: false,
rankUpChallenge: null,
rankLockedUntilChallenge: false,
lastMotivationTime: null
};