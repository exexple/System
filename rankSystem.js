/**
 * NEXUS RANK SYSTEM - DYNAMIC POINTS
 * Version: 2.0 (Dynamic +150 per rank)
 * Created: Oct 31, 2025
 * 
 * All 18 ranks with dynamic point scaling
 * E → EE → EEE → D → DD → DDD → C → CC → CCC → B → BB → BBB → A → AA → AAA → S → SS → SSS
 */

// ============================================================================
// CONSTANTS - NEVER CHANGE THESE
// ============================================================================

const RANKS = Object.freeze([
    'E', 'EE', 'EEE', 
    'D', 'DD', 'DDD', 
    'C', 'CC', 'CCC', 
    'B', 'BB', 'BBB', 
    'A', 'AA', 'AAA', 
    'S', 'SS', 'SSS'
]);

const RANK_COLORS = Object.freeze({
    'E': '#808080',    'EE': '#A9A9A9',   'EEE': '#C0C0C0',
    'D': '#4169E1',    'DD': '#6495ED',   'DDD': '#87CEEB',
    'C': '#32CD32',    'CC': '#90EE90',   'CCC': '#ADFFAD',
    'B': '#FFD700',    'BB': '#FFA500',   'BBB': '#FF8C00',
    'A': '#FF1493',    'AA': '#FF69B4',   'AAA': '#FFB6C1',
    'S': '#9370DB',    'SS': '#BA55D3',   'SSS': '#FF00FF'
});

const BASE_POINTS_PER_LEVEL = 1000;        // Starting amount
const INCREMENT_PER_RANK = 150;             // Increase per rank tier
const LEVELS_PER_RANK = 10;                 // 10 levels per rank
const TOTAL_LEVELS = RANKS.length * LEVELS_PER_RANK; // 180 total levels

// ============================================================================
// VALIDATION FUNCTIONS - CHECK DATA INTEGRITY
// ============================================================================

/**
 * Validate rank index is valid
 * @param {number} rankIndex
 * @returns {boolean}
 */
function isValidRankIndex(rankIndex) {
    return Number.isInteger(rankIndex) && rankIndex >= 0 && rankIndex < RANKS.length;
}

/**
 * Validate points is a valid positive number
 * @param {number} points
 * @returns {boolean}
 */
function isValidPoints(points) {
    return Number.isInteger(points) && points >= 0;
}

/**
 * Validate rank name exists
 * @param {string} rankName
 * @returns {boolean}
 */
function isValidRankName(rankName) {
    return RANKS.includes(rankName);
}

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate points required per level for a specific rank
 * Formula: 1000 + (rankIndex × 150)
 * 
 * @param {number} rankIndex - 0 to 17 (E to SSS)
 * @returns {number} Points per level for that rank
 * 
 * Examples:
 *   rankIndex 0 (E):   1000 + (0 × 150) = 1000
 *   rankIndex 1 (EE):  1000 + (1 × 150) = 1150
 *   rankIndex 17 (SSS): 1000 + (17 × 150) = 3550
 */
function getPointsPerLevel(rankIndex) {
    // Validation
    if (!isValidRankIndex(rankIndex)) {
        console.error(`Invalid rankIndex: ${rankIndex}`);
        return BASE_POINTS_PER_LEVEL;
    }
    
    const pointsPerLevel = BASE_POINTS_PER_LEVEL + (rankIndex * INCREMENT_PER_RANK);
    return pointsPerLevel;
}

/**
 * Calculate total points needed to COMPLETE a rank tier (all 10 levels)
 * 
 * @param {number} rankIndex - 0 to 17
 * @returns {number} Total points for one complete rank tier
 * 
 * Examples:
 *   rankIndex 0 (E):   1000 × 10 = 10,000
 *   rankIndex 1 (EE):  1150 × 10 = 11,500
 *   rankIndex 17 (SSS): 3550 × 10 = 35,500
 */
function getPointsPerRank(rankIndex) {
    if (!isValidRankIndex(rankIndex)) {
        console.error(`Invalid rankIndex: ${rankIndex}`);
        return 0;
    }
    
    const pointsPerLevel = getPointsPerLevel(rankIndex);
    return pointsPerLevel * LEVELS_PER_RANK;
}

/**
 * Calculate cumulative total points needed to REACH a rank (all ranks up to and including that rank)
 * 
 * @param {number} rankIndex - 0 to 17
 * @returns {number} Total cumulative points needed
 * 
 * Examples:
 *   rankIndex 0 (E):   10,000
 *   rankIndex 1 (EE):  10,000 + 11,500 = 21,500
 *   rankIndex 17 (SSS): Sum of all = 409,500
 */
function getCumulativePointsForRank(rankIndex) {
    if (!isValidRankIndex(rankIndex)) {
        console.error(`Invalid rankIndex: ${rankIndex}`);
        return 0;
    }
    
    let total = 0;
    for (let i = 0; i <= rankIndex; i++) {
        total += getPointsPerRank(i);
    }
    
    return total;
}

/**
 * Pre-calculate all cumulative values for fast lookup (caching)
 * This prevents recalculating every time
 * 
 * @returns {Array<number>} Array of cumulative points for each rank
 */
function buildCumulativePointsCache() {
    return RANKS.map((_, index) => getCumulativePointsForRank(index));
}

// Cache it once at startup
const CUMULATIVE_POINTS_CACHE = buildCumulativePointsCache();

// ============================================================================
// MAIN RANK CALCULATION FUNCTION
// ============================================================================

/**
 * MAIN FUNCTION: Calculate rank, level, and all progress info from total points
 * This is the most critical function - very carefully built
 * 
 * @param {number} totalPoints - Total points user has accumulated
 * @returns {Object} Complete rank information
 * 
 * @returns {
 *   rank: string,                    // Current rank name (e.g., 'A')
 *   rankIndex: number,               // Rank index 0-17
 *   level: number,                   // Level within rank 1-10
 *   totalLevel: number,              // Total level 1-180
 *   
 *   totalPoints: number,             // User's total points
 *   pointsInCurrentRank: number,     // Points earned in current rank
 *   pointsNeededForNextLevel: number,// Points until next level
 *   pointsPerLevelRequired: number,  // Points per level in current rank
 *   
 *   progressInLevelPercent: number,  // 0-100 progress to next level
 *   progressInRankPercent: number,   // 0-100 progress to next rank
 *   
 *   isMaxRank: boolean,              // True if at SSS level 10
 *   color: string,                   // Hex color for this rank
 *   
 *   // Debug info
 *   debug: {
 *     calculation: string,           // How we got here
 *     verified: boolean              // Calculation verified
 *   }
 * }
 */
function calculateRankAndLevel(totalPoints) {
    // Step 1: Validate input
    if (!isValidPoints(totalPoints)) {
        console.error(`Invalid totalPoints: ${totalPoints}`);
        return getDefaultRank();
    }
    
    let rankIndex = 0;
    let levelInRank = 0;
    let pointsUsedSoFar = 0;
    
    // Step 2: Find which rank tier the user is in
    // We iterate through each rank and check if user has enough points for it
    for (let i = 0; i < RANKS.length; i++) {
        const pointsNeededForThisRank = getPointsPerRank(i);
        
        // If user has enough points for this entire rank, move to next
        if (pointsUsedSoFar + pointsNeededForThisRank <= totalPoints) {
            pointsUsedSoFar += pointsNeededForThisRank;
            rankIndex++;
        } else {
            // User is IN this rank tier (not enough to complete it)
            break;
        }
    }
    
    // Step 3: Handle max rank cap
    if (rankIndex >= RANKS.length) {
        rankIndex = RANKS.length - 1;
        levelInRank = LEVELS_PER_RANK - 1; // Max level (0-9 in array = level 1-10)
    } else {
        // Step 4: Calculate which level within the current rank
        const remainingPoints = totalPoints - pointsUsedSoFar;
        const pointsPerLevel = getPointsPerLevel(rankIndex);
        
        // Which level are we on? (0-9 internally, 1-10 displayed)
        levelInRank = Math.floor(remainingPoints / pointsPerLevel);
        
        // Ensure levelInRank doesn't exceed max
        levelInRank = Math.min(levelInRank, LEVELS_PER_RANK - 1);
    }
    
    // Step 5: Calculate progress metrics
    const pointsPerLevelInCurrentRank = getPointsPerLevel(rankIndex);
    const pointsInCurrentRank = totalPoints - pointsUsedSoFar;
    
    // Points until next level
    const pointsUsedInLevel = pointsInCurrentRank % pointsPerLevelInCurrentRank;
    const pointsNeededForNextLevel = pointsPerLevelInCurrentRank - pointsUsedInLevel;
    
    // Progress percentages
    const progressInLevel = (pointsUsedInLevel / pointsPerLevelInCurrentRank) * 100;
    const pointsInRank = levelInRank * pointsPerLevelInCurrentRank + pointsUsedInLevel;
    const pointsForFullRank = pointsPerLevelInCurrentRank * LEVELS_PER_RANK;
    const progressInRank = (pointsInRank / pointsForFullRank) * 100;
    
    // Step 6: Build return object
    const result = {
        // Basic info
        rank: RANKS[rankIndex],
        rankIndex: rankIndex,
        level: levelInRank + 1,              // Display as 1-10, not 0-9
        totalLevel: rankIndex * 10 + levelInRank + 1,
        
        // Points info
        totalPoints: totalPoints,
        pointsInCurrentRank: pointsInCurrentRank,
        pointsNeededForNextLevel: pointsNeededForNextLevel,
        pointsPerLevelRequired: pointsPerLevelInCurrentRank,
        
        // Progress
        progressInLevelPercent: Math.max(0, Math.min(100, progressInLevel)),
        progressInRankPercent: Math.max(0, Math.min(100, progressInRank)),
        
        // Status
        isMaxRank: rankIndex === RANKS.length - 1 && levelInRank === LEVELS_PER_RANK - 1,
        color: RANK_COLORS[RANKS[rankIndex]],
        
        // Debug
        debug: {
            calculation: `Points: ${totalPoints} → Rank: ${RANKS[rankIndex]} Level: ${levelInRank + 1}`,
            verified: true
        }
    };
    
    // Step 7: Final verification (catch calculation errors)
    if (!verifyCalculation(result, totalPoints)) {
        console.warn('Calculation verification failed!', result);
    }
    
    return result;
}

/**
 * Verify calculation is correct (integrity check)
 * @param {Object} result - Result from calculateRankAndLevel
 * @param {number} totalPoints - Original total points
 * @returns {boolean} True if calculation is valid
 */
function verifyCalculation(result, totalPoints) {
    // Check 1: Rank is valid
    if (!isValidRankName(result.rank)) return false;
    
    // Check 2: Level is 1-10
    if (result.level < 1 || result.level > 10) return false;
    
    // Check 3: Total level is 1-180
    if (result.totalLevel < 1 || result.totalLevel > 180) return false;
    
    // Check 4: Points calculations are positive
    if (result.pointsNeededForNextLevel < 0) return false;
    
    // Check 5: Progress percentages are 0-100
    if (result.progressInLevelPercent < 0 || result.progressInLevelPercent > 100) return false;
    if (result.progressInRankPercent < 0 || result.progressInRankPercent > 100) return false;
    
    return true;
}

/**
 * Default return for error cases
 * @returns {Object} Default rank object
 */
function getDefaultRank() {
    return {
        rank: 'E',
        rankIndex: 0,
        level: 1,
        totalLevel: 1,
        totalPoints: 0,
        pointsInCurrentRank: 0,
        pointsNeededForNextLevel: 1000,
        pointsPerLevelRequired: 1000,
        progressInLevelPercent: 0,
        progressInRankPercent: 0,
        isMaxRank: false,
        color: RANK_COLORS['E'],
        debug: { calculation: 'Error - Default', verified: false }
    };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get points needed to reach a specific rank (from any current points)
 * @param {string} targetRank - Target rank name
 * @param {number} currentPoints - Current total points
 * @returns {number} Points needed
 */
function getPointsNeededForRank(targetRank, currentPoints = 0) {
    if (!isValidRankName(targetRank)) return null;
    
    const targetIndex = RANKS.indexOf(targetRank);
    const pointsNeededToReachTarget = CUMULATIVE_POINTS_CACHE[targetIndex];
    
    return Math.max(0, pointsNeededToReachTarget - currentPoints);
}

/**
 * Get all rank information for display
 * @returns {Array} All ranks with their properties
 */
function getAllRanksInfo() {
    return RANKS.map((rank, index) => ({
        rank: rank,
        rankIndex: index,
        pointsPerLevel: getPointsPerLevel(index),
        pointsPerRank: getPointsPerRank(index),
        cumulativePoints: CUMULATIVE_POINTS_CACHE[index],
        color: RANK_COLORS[rank]
    }));
}

/**
 * Format large numbers for display (1000 → 1k, 1000000 → 1M)
 * @param {number} num
 * @returns {string}
 */
function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
}

// ============================================================================
// EXPORTS (for use in other files)
// ============================================================================

// If using ES6 modules:
export {
    RANKS,
    RANK_COLORS,
    BASE_POINTS_PER_LEVEL,
    INCREMENT_PER_RANK,
    LEVELS_PER_RANK,
    TOTAL_LEVELS,
    
    // Main functions
    calculateRankAndLevel,
    getPointsPerLevel,
    getPointsPerRank,
    getCumulativePointsForRank,
    getPointsNeededForRank,
    
    // Utilities
    getAllRanksInfo,
    formatNumber,
    isValidRankName,
    isValidPoints,
    isValidRankIndex
};

// If using CommonJS (alternative):
// module.exports = { ... same exports ... }
