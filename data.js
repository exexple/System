// ==================== DATA MODEL ====================

let appData = {
    tasks: [],
    totalPoints: 0,
    streakDays: 0,
    lifetimeTasksCompleted: 0,
    unlockedAchievements: [],
    isPremium: false,
    premiumUntil: null,
    rewardAdsWatched: 0,
    lastVisit: null
};

// ==================== USER INITIALIZATION ====================

let userId = localStorage.getItem('userId');
if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('userId', userId);
}

const userRef = database.ref('users/' + userId);

// ==================== CONSTANTS ====================

const RANKS = ['E', 'EE', 'EEE', 'D', 'DD', 'DDD', 'C', 'CC', 'CCC', 'B', 'BB', 'BBB', 'A', 'AA', 'AAA', 'S', 'SS', 'SSS'];

const PRIORITY_POINTS = { high: 100, medium: 50, low: 30 };

const PRIORITY_PENALTIES = { high: 50, medium: 25, low: 15 };

const REWARD_AD_CONFIG = { adsRequired: 10, premiumDays: 7 };