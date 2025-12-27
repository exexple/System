// ==================== PREMIUM & REWARDS ====================

function watchRewardAd() {
    if (appData.isPremium) {
        showModal('You already have premium access!', '✨ Premium Active', '✨');
        return;
    }

    // Simulate ad watch
    appData.rewardAdsWatched = (appData.rewardAdsWatched || 0) + 1;
    saveData();

    if (appData.rewardAdsWatched >= REWARD_AD_CONFIG.adsRequired) {
        // Grant premium
        appData.isPremium = true;
        appData.premiumUntil = Date.now() + (REWARD_AD_CONFIG.premiumDays * 24 * 60 * 60 * 1000);
        appData.rewardAdsWatched = 0;
        saveData();

        showModal(
            `You've unlocked ${REWARD_AD_CONFIG.premiumDays} days of premium!

Enjoy ad-free experience!`,
            '🎁 Premium Unlocked!',
            '🎉'
        );
    } else {
        const remaining = REWARD_AD_CONFIG.adsRequired - appData.rewardAdsWatched;
        showModal(
            `Ad watched! ${remaining} more to unlock premium.`,
            '🎬 Thanks for watching!',
            '👍'
        );
    }
}