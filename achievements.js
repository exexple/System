// ==================== ACHIEVEMENT SYSTEM ====================

const ACHIEVEMENTS = [
    { id: 'first_task', name: '🎯 First Step', check: (d) => d.lifetimeTasksCompleted >= 1, msg: 'First task completed! 🚀' },
    { id: 'streak_3', name: '🔥 3-Day Streak', check: (d) => d.streakDays >= 3, msg: '3-day streak! Unstoppable! 🔥' },
    { id: 'streak_7', name: '⭐ 7-Day Streak', check: (d) => d.streakDays >= 7, msg: '7-day streak! Legendary! ⭐' },
    { id: 'streak_30', name: '👑 30-Day Streak', check: (d) => d.streakDays >= 30, msg: '30-day streak! Master! 👑' },
    { id: 'task_50', name: '🎊 50 Tasks', check: (d) => d.lifetimeTasksCompleted >= 50, msg: '50 tasks! Amazing! 🎊' },
    { id: 'task_100', name: '💯 100 Tasks', check: (d) => d.lifetimeTasksCompleted >= 100, msg: '100 tasks! 💯' },
    { id: 'task_500', name: '🏆 500 Tasks', check: (d) => d.lifetimeTasksCompleted >= 500, msg: '500 tasks! Champion! 🏆' }
];

function checkAchievements() {
    ACHIEVEMENTS.forEach(ach => {
        if (ach.check(appData) && !appData.unlockedAchievements.includes(ach.id)) {
            appData.unlockedAchievements.push(ach.id);
            showModal(ach.msg, `🏆 ${ach.name}`, '🏆');
        }
    });
}

function showAchievements() {
    const unlocked = ACHIEVEMENTS.filter(a => appData.unlockedAchievements.includes(a.id));
    const locked = ACHIEVEMENTS.filter(a => !appData.unlockedAchievements.includes(a.id));

    let message = '<div style="text-align:left;max-height:300px;overflow-y:auto">';
    
    if (unlocked.length > 0) {
        message += '<strong style="color:#32b8c6">🏆 Unlocked:</strong><br>';
        unlocked.forEach(a => {
            message += `<div style="padding:8px;margin:4px 0;background:#1a1c2e;border-radius:6px">${a.name}</div>`;
        });
    }

    if (locked.length > 0) {
        message += '<br><strong style="color:#888">🔒 Locked:</strong><br>';
        locked.forEach(a => {
            message += `<div style="padding:8px;margin:4px 0;background:#13151f;border-radius:6px;color:#666">${a.name}</div>`;
        });
    }

    message += '</div>';

    showModal(message, 'Your Achievements', '🏆');
}