// ==================== FIREBASE CONFIGURATION ====================

const firebaseConfig = {
    apiKey: "AIzaSyAle5y1wcHMMyDxu-ppPkMfM5hFQNKahOQ",
    authDomain: "routine-planner-daf33.firebaseapp.com",
    databaseURL: "https://routine-planner-daf33-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "routine-planner-daf33",
    storageBucket: "routine-planner-daf33.appspot.com",
    messagingSenderId: "62028696155",
    appId: "1:62028696155:web:5e6b1896e0f60eacb40d7e"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ==================== FIREBASE SYNC ====================

function saveData() {
    userRef.set(appData)
        .catch((error) => console.error("Firebase save error:", error));
}

function loadData(callback) {
    userRef.once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                appData = snapshot.val();
                checkPremiumExpiry();
            } else {
                // New user: Initialize default data
                appData = {
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
                saveData();
            }
            callback();
        })
        .catch((error) => {
            console.error("Firebase load error:", error);
            callback();
        });
}

function checkPremiumExpiry() {
    if (appData.isPremium && appData.premiumUntil) {
        if (Date.now() > appData.premiumUntil) {
            appData.isPremium = false;
            appData.premiumUntil = null;
            saveData();
        }
    }
}