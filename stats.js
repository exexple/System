// ==================== STATS DISPLAY ====================

function updateStats() {
    // Calculate current level based on totalPoints
    const basePointsPerLevel = 1000; // E rank starting requirement
    const rankIncrement = 150; // Additional points required per rank

    // ✅ FIX: Check if rank is locked due to active challenge
    let currentRankIndex = 0;
    let cumulativePoints = 0;
    
    if (appData.activeRankUpChallenge) {
        // Rank is LOCKED at the challenge's fromRank
        currentRankIndex = RANKS.indexOf(appData.activeRankUpChallenge.fromRank);
    } else {
        // Normal rank calculation when no challenge is active
        for (let i = 0; i < RANKS.length; i++) {
            const pointsForThisRank = basePointsPerLevel + (rankIncrement * i);
            const pointsForTenLevels = pointsForThisRank * 10; // 10 levels per rank

            if (appData.totalPoints < cumulativePoints + pointsForTenLevels) {
                currentRankIndex = i;
                break;
            }

            cumulativePoints += pointsForTenLevels;
            
            // If we've gone through all ranks, stay at SSS
            if (i === RANKS.length - 1) {
                currentRankIndex = i;
            }
        }
    }

    // Calculate current level within the rank (0-9)
    const pointsForThisRank = basePointsPerLevel + (rankIncrement * currentRankIndex);
    const pointsIntoCurrentRank = appData.totalPoints - cumulativePoints;
    const currentLevelInRank = Math.floor(pointsIntoCurrentRank / pointsForThisRank);
    
    // Calculate points needed for next level
    const pointsToNextLevel = pointsForThisRank - (pointsIntoCurrentRank % pointsForThisRank);

    // ✅ FIX: Display the rank STRING, not the index
    const displayRank = RANKS[currentRankIndex] || 'E'; // Default to 'E' if something goes wrong

    // Update UI
    document.getElementById('userPoints').innerText = appData.totalPoints || 0;
    document.getElementById('userLevel').innerText = currentLevelInRank;
    document.getElementById('userRank').innerText = displayRank; // ✅ FIXED - now shows "E", "EE", etc.
    document.getElementById('userStreak').innerText = appData.streakDays || 0;

    // Update progress bar
    const progressBar = document.querySelector('.progress-fill');
    const progressPercentage = (appData.totalPoints % pointsForThisRank) / pointsForThisRank * 100;
    progressBar.style.width = progressPercentage + '%';

    // Update progress text
    const progressText = document.querySelector('.progress-label');
    progressText.innerText = `${appData.totalPoints}/${appData.totalPoints + pointsToNextLevel}`;
}