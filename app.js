// ==================== INITIALIZATION ====================

window.addEventListener('DOMContentLoaded', () => {
    loadData(() => {
        updateStreak();
        renderTasks();
        updateStats();
        checkAchievements();
    });
});