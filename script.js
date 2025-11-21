// =========================================
// 1. INITIAL DATA & CONFIG
// =========================================
const RANKS = ["E", "EE", "EEE", "D", "DD", "DDD", "C", "CC", "CCC", "B", "BB", "BBB", "A", "AA", "AAA", "S", "SS", "SSS"];
const PRIORITY_POINTS = { high: 100, medium: 50, low: 30 };

// Default State
let appData = {
  totalPoints: 0,
  points: 0, // Sometimes used interchangeably, ensuring both exist
  level: 1,
  rank: 0, // Index in RANKS array
  streakDays: 0,
  lastVisit: null,
  tasks: [],
  lifetimeTasksCompleted: 0,
  achievements: [],
  rankLockedUntilChallenge: false,
  rankUpChallenge: null,
  premiumStatus: 'free',
  premiumExpiry: null
};

// Config
const USER_ID = "user_001"; // Replace with real auth logic if needed
let currentCategory = 1; // 1=Study, 2=Health, etc.

// Firebase Refs (Mock or Real)
const database = typeof firebase !== 'undefined' ? firebase.database() : {
  ref: () => ({
    once: () => Promise.resolve({ exists: () => false }),
    set: () => Promise.resolve()
  })
};

// =========================================
// 2. CORE FUNCTIONS (Load/Save/Calc)
// =========================================

function loadData() {
  const local = localStorage.getItem('atherion_data');
  
  if (local) {
    try {
      // Deep merge to ensure tasks array is preserved
      const parsed = JSON.parse(local);
      appData = { ...appData, ...parsed };
      
      // Safety check: ensure tasks is an array
      if (!Array.isArray(appData.tasks)) appData.tasks = [];
      
      renderUI();
      renderTasks();
    } catch (e) {
      console.error('Error parsing local data:', e);
    }
  }

  // Firebase Sync (Optional - prioritizing local for responsiveness)
  if (USER_ID && typeof firebase !== 'undefined') {
    database.ref('users/' + USER_ID).once('value').then(snapshot => {
      if (snapshot.exists()) {
        const serverData = snapshot.val();
        // Only overwrite if server has more points (simple conflict resolution)
        if (serverData.totalPoints > appData.totalPoints) {
            appData = { ...appData, ...serverData };
            if (!Array.isArray(appData.tasks)) appData.tasks = [];
            saveData(); // Update local to match server
            renderUI();
            renderTasks();
        }
      }
    }).catch(err => console.error('Firebase load error:', err));
  }
  
  // Initial Checks
  checkStreak();
  updateRank(); // Sync rank with points on load
}

function saveData() {
  // 1. Save to LocalStorage (Sync, Immediate)
  localStorage.setItem('atherion_data', JSON.stringify(appData));
  
  // 2. Save to Firebase (Async, Background)
  if (USER_ID && typeof firebase !== 'undefined') {
    database.ref('users/' + USER_ID).set(appData).catch(err => console.error('Firebase save error:', err));
  }
}

// Dynamic Points Calculation (Your Custom Logic)
function getPointsPerLevel(rankIndex) {
    return 1000 + (rankIndex * 150); 
}

function calculateLevel(points) {
    let level = 1;
    let required = getPointsPerLevel(appData.rank);
    // Simplified level calc based on your logic
    return Math.floor(points / required) + 1;
}

function calculateRank(points) {
    // Iterate through ranks to find where points fit
    let rankIndex = 0;
    let accumulatedPoints = 0;
    
    for (let i = 0; i < RANKS.length; i++) {
        let pointsForThisRank = 10 * getPointsPerLevel(i); // 10 levels per rank
        if (points < accumulatedPoints + pointsForThisRank) {
            return i;
        }
        accumulatedPoints += pointsForThisRank;
        rankIndex = i;
    }
    return rankIndex; // Cap at max rank
}

// =========================================
// 3. TASK MANAGEMENT (Fixes are here)
// =========================================

function addTask() {
  const input = document.getElementById('taskInput');
  const prioritySel = document.getElementById('prioritySelect');
  const text = input.value.trim();
  
  if (!text) return showModal("Please enter a task name!");

  const newTask = {
    id: Date.now().toString(), // Unique ID
    text: text,
    priority: prioritySel.value,
    category: currentCategory,
    isDone: false,
    createdAt: Date.now()
  };

  appData.tasks.push(newTask);
  saveData();
  renderTasks();
  input.value = ''; // Clear input
}

function toggleTask(index) {
  // Direct access to ensure we are modifying the real array
  if (!appData.tasks[index]) return;

  // Toggle State
  appData.tasks[index].isDone = !appData.tasks[index].isDone;
  const task = appData.tasks[index]; // Reference for reading

  if (task.isDone) {
    // Add Timestamp
    if (!task.doneTimestamp) {
       appData.tasks[index].doneTimestamp = Date.now();
    }
    
    // Add Points
    const pointsEarned = PRIORITY_POINTS[task.priority] || 0;
    appData.totalPoints = (appData.totalPoints || 0) + pointsEarned;
    
    // Validations
    try {
        appData.lifetimeTasksCompleted++;
        updateStreak(); // Your streak logic
        
        // Feedback
        showModal(`Task completed!<br><br>+${pointsEarned} points earned!`, 'TASK COMPLETE', '✅');
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
        audio.play().catch(e => {}); 

        checkAchievements();
        checkRankUp(); 
    } catch (error) {
        console.error("Logic Error:", error);
    }

  } else {
    // Undo
    appData.tasks[index].doneTimestamp = null;
    const pointsLost = PRIORITY_POINTS[task.priority] || 0;
    appData.totalPoints = Math.max(0, (appData.totalPoints || 0) - pointsLost);
  }

  // CRITICAL: Save and Render
  saveData();
  renderUI();
  renderTasks();
}

function deleteTask(index) {
    const modalId = 'customDeleteModal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modalHTML = `
      <div id="${modalId}" style="position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index: 10000;">
        <div style="background:#1e1e2e; border:2px solid #FF4444; border-radius:15px; padding:30px; text-align:center; max-width:350px;">
          <div style="font-size: 40px; margin-bottom:15px;">🗑️</div>
          <h2 style="color:#FF4444; margin:0 0 10px 0;">Delete Task?</h2>
          <div style="display: flex; gap: 15px; justify-content: center; margin-top:20px;">
            <button id="btnDeleteNo" style="padding: 10px 30px; background:#444; color:white; border:none; border-radius:8px; cursor:pointer;">Cancel</button>
            <button id="btnDeleteYes" style="padding: 10px 30px; background:#FF4444; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:bold;">Delete</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('btnDeleteNo').onclick = function() {
        document.getElementById(modalId).remove();
    };

    document.getElementById('btnDeleteYes').onclick = function() {
        document.getElementById(modalId).remove();
        appData.tasks.splice(index, 1); // Remove from array
        saveData(); // Save
        renderTasks(); // Render
        renderUI(); // Update stats
        showModal("Task deleted successfully.", "DELETED", "🗑️");
    };
}

// =========================================
// 4. RANK & CHALLENGE LOGIC (Your Custom System)
// =========================================

function checkRankUp() {
    const points = appData.totalPoints;
    const potentialRankIndex = calculateRank(points);
    const currentLevel = calculateLevel(points);

    appData.level = currentLevel;

    // If locked, check for unlock
    if (appData.rankLockedUntilChallenge) {
        if (isChallengeCompleted()) {
            appData.rankLockedUntilChallenge = false;
            appData.rankUpChallenge = null;
            appData.rank = potentialRankIndex; // Grant Rank
            showModal(`🎉 Challenge Completed! You are now Rank ${RANKS[appData.rank]}!`);
            saveData();
            renderUI();
        }
        return;
    }

    // If qualified for higher rank -> LOCK
    if (potentialRankIndex > appData.rank) {
        appData.rankLockedUntilChallenge = true;
        generateRankUpChallenge();
        showModal(`⚠️ RANK UP BLOCKED! Complete the challenge to reach Rank ${RANKS[potentialRankIndex]}`);
        renderRankUpChallenge();
        saveData(); // Save the lock state
        return;
    }

    // Sync if no lock needed
    appData.rank = Math.min(appData.rank, potentialRankIndex);
    saveData();
}

function generateRankUpChallenge() {
    const challenges = [
        "Complete 3 high-priority tasks today",
        "Earn 200 points without losing any", 
        "Complete all tasks in one category",
        "Maintain a 3-day streak", 
        "Complete 5 tasks in a single day"
    ];
    appData.rankUpChallenge = challenges[Math.floor(Math.random() * challenges.length)];
    appData.dailyTaskCountForChallenge = 0; // Reset counter
}

function isChallengeCompleted() {
    if (!appData.rankUpChallenge) return false;
    const challenge = appData.rankUpChallenge.toLowerCase();
    const today = new Date().toDateString();

    // "Complete 5 tasks in a single day"
    if (challenge.includes("complete 5 tasks")) {
        const completedToday = appData.tasks.filter(t => {
            if (!t.isDone || !t.doneTimestamp) return false;
            return new Date(t.doneTimestamp).toDateString() === today;
        }).length;
        return completedToday >= 5;
    }

    // "Maintain a 3-day streak"
    if (challenge.includes("streak")) {
        return (appData.streakDays || 0) >= 3;
    }

    // "Earn 200 points"
    if (challenge.includes("earn") && challenge.includes("points")) {
        const target = parseInt(challenge.match(/\d+/)[0]) || 200;
        const pointsToday = appData.tasks
            .filter(t => t.isDone && t.doneTimestamp && new Date(t.doneTimestamp).toDateString() === today)
            .reduce((sum, t) => sum + (PRIORITY_POINTS[t.priority] || 0), 0);
        return pointsToday >= target;
    }

    // "Complete 3 high-priority tasks"
    if (challenge.includes("high-priority")) {
        const highDone = appData.tasks.filter(t => {
            return t.isDone && t.doneTimestamp && 
                   new Date(t.doneTimestamp).toDateString() === today && 
                   t.priority === 'high';
        }).length;
        return highDone >= 3;
    }

    return false;
}

function renderRankUpChallenge() {
    const box = document.getElementById('rankUpChallengeBox');
    const txt = document.getElementById('rankUpChallengeText');
    if (appData.rankLockedUntilChallenge && appData.rankUpChallenge) {
        if (box) box.style.display = 'block';
        if (txt) txt.textContent = appData.rankUpChallenge;
    } else {
        if (box) box.style.display = 'none';
    }
}

// =========================================
// 5. STREAK LOGIC (Simplified)
// =========================================

function checkStreak() {
    updateStreak(); // Use the robust one
}

function updateStreak() {
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('lastVisitDate'); // Use pure local storage for date

    if (today === lastVisit) return; // Already visited today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastVisit === yesterday.toDateString()) {
        appData.streakDays = (appData.streakDays || 0) + 1;
    } else {
        appData.streakDays = 1; // Reset if missed a day
    }

    localStorage.setItem('lastVisitDate', today);
    appData.lastVisit = today;
    saveData();
}

// =========================================
// 6. UI RENDERING
// =========================================

function renderUI() {
    // Update Header Stats
    const pointsEl = document.getElementById('totalPoints');
    const rankEl = document.getElementById('rankDisplay');
    const streakEl = document.getElementById('streakCount');
    const levelEl = document.getElementById('levelDisplay');
    const progressEl = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    if (pointsEl) pointsEl.textContent = appData.totalPoints;
    if (rankEl) rankEl.textContent = RANKS[appData.rank] || "E";
    if (streakEl) streakEl.textContent = appData.streakDays || 0;
    if (levelEl) levelEl.textContent = appData.level || 1;

    // Progress Bar
    const pointsPerLevel = getPointsPerLevel(appData.rank);
    // Simple logic: Just modulo points for bar width
    const currentBarPoints = appData.totalPoints % pointsPerLevel; 
    const percentage = Math.min(100, (currentBarPoints / pointsPerLevel) * 100);
    
    if (progressEl) progressEl.style.width = `${percentage}%`;
    if (progressText) progressText.textContent = `${currentBarPoints}/${pointsPerLevel}`;

    renderRankUpChallenge();
}

function renderTasks() {
  const container = document.getElementById('tasksContainer');
  if (!container) return;
  
  const filtered = appData.tasks.filter(t => t.category == currentCategory); // Loose equality for safety
  container.innerHTML = '';
  
  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">📝 No tasks yet. Add one!</p>';
    return;
  }
  
  filtered.forEach((task) => {
    // Find REAL index in the main array
    const realIdx = appData.tasks.indexOf(task);
    
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item ${task.isDone ? 'done' : ''} priority-${task.priority}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.isDone;
    checkbox.onchange = () => toggleTask(realIdx); // Pass REAL index
    
    const label = document.createElement('label');
    label.textContent = task.text;
    
    const pointsBadge = document.createElement('span');
    pointsBadge.className = 'task-points';
    pointsBadge.textContent = `+${PRIORITY_POINTS[task.priority]}`;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.className = 'delete-btn';
    deleteBtn.onclick = () => deleteTask(realIdx); // Pass REAL index
    
    taskDiv.appendChild(checkbox);
    taskDiv.appendChild(label);
    taskDiv.appendChild(pointsBadge);
    taskDiv.appendChild(deleteBtn);
    
    container.appendChild(taskDiv);
  });
}

function switchCategory(catId) {
    currentCategory = catId;
    // Update buttons
    document.querySelectorAll('.category-btn').forEach((btn, idx) => {
        if ((idx + 1) == catId) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    renderTasks();
}

function showModal(msg, title = "NOTIFICATION", icon = "✨") {
    // Basic reusable modal
    const modalHTML = `
      <div id="tempModal" style="position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index: 10000;">
        <div style="background:#1e1e2e; border:2px solid #FFD700; border-radius:15px; padding:30px; text-align:center; max-width:350px; box-shadow: 0 0 25px rgba(255, 215, 0, 0.3);">
          <div style="font-size: 40px; margin-bottom:15px;">${icon}</div>
          <h2 style="color:#FFD700; margin:0 0 10px 0;">${title}</h2>
          <p style="color:#ccc; font-size:16px;">${msg}</p>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    setTimeout(() => {
        const el = document.getElementById('tempModal');
        if(el) el.remove();
    }, 2000);
}

// Achievements Stub
function checkAchievements() {
    // Add your achievement logic here
}

// =========================================
// 7. INITIALIZATION
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // Event Listeners
    const addBtn = document.getElementById('addTaskBtn');
    if (addBtn) addBtn.onclick = addTask;
    
    // Render Initial Category
    switchCategory(1);
});
