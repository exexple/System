// ==================== STREAK SYSTEM ====================

function updateStreak() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('lastVisitDate');

    if (today === lastVisit) {
        // Already visited today, do nothing
        return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (lastVisit === yesterday.toDateString()) {
        // Visited yesterday, increment streak
        appData.streakDays = (appData.streakDays || 0) + 1;
    } else {
        // Missed a day (or new user), reset to 1
        appData.streakDays = 1;
    }

    localStorage.setItem('lastVisitDate', today);
    appData.lastVisit = today;
    saveData();
}