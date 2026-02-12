// ============================================================
// STATE MANAGEMENT MODULE
// ============================================================
// Centralized state management to prevent direct mutations
const State = (function() {
let appData = { ...INITIAL_APP_DATA };
return {
    /**
     * Get a copy of the current state (prevents external mutation)
     */
    getData() {
        return { ...appData };
    },
    
    /**
     * Get a specific property
     */
    get(key) {
        return appData[key];
    },
    
    /**
     * Set the entire state (used for loading saved data)
     */
    setData(newData) {
        appData = { ...INITIAL_APP_DATA, ...newData };
    },
    
    /**
     * Update specific properties
     */
    update(updates) {
        appData = { ...appData, ...updates };
    },
    
    /**
     * Add points
     */
    addPoints(points) {
        appData.totalPoints = Math.max(0, (appData.totalPoints || 0) + points);
    },
    
    /**
     * Remove points
     */
    removePoints(points) {
        appData.totalPoints = Math.max(0, (appData.totalPoints || 0) - points);
    },
    
    /**
     * Add a task
     */
    addTask(task) {
        appData.tasks.push(task);
    },
    
    /**
     * Update a task
     */
    updateTask(index, updates) {
        if (appData.tasks[index]) {
            appData.tasks[index] = { ...appData.tasks[index], ...updates };
        }
    },
    
    /**
     * Delete a task
     */
    deleteTask(index) {
        appData.tasks.splice(index, 1);
    },
    
    /**
     * Get tasks for current category
     */
    getTasksByCategory(category) {
        return appData.tasks.filter(t => t.category === category);
    },
    
    /**
     * Increment lifetime tasks completed
     */
    incrementLifetimeTasksCompleted() {
        appData.lifetimeTasksCompleted = (appData.lifetimeTasksCompleted || 0) + 1;
    },
    
    /**
     * Add unlocked achievement
     */
    addAchievement(achievementId) {
        if (!appData.unlockedAchievements.includes(achievementId)) {
            appData.unlockedAchievements.push(achievementId);
        }
    }
};

})();