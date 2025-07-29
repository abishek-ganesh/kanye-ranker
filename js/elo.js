class EloRating {
    constructor(k = 32) {
        this.k = k;
        this.comparisons = [];
        this.skipCount = {};
        this.songComparisons = new Map(); // Track comparisons per song
    }

    getExpectedScore(ratingA, ratingB) {
        return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    }

    updateRatings(ratingA, ratingB, scoreA, songIdA, songIdB) {
        const expectedA = this.getExpectedScore(ratingA, ratingB);
        const expectedB = this.getExpectedScore(ratingB, ratingA);
        
        // Dynamic K-factor based on comparison count
        const kA = this.getDynamicK(songIdA);
        const kB = this.getDynamicK(songIdB);
        
        const newRatingA = ratingA + kA * (scoreA - expectedA);
        const newRatingB = ratingB + kB * ((1 - scoreA) - expectedB);
        
        return {
            newRatingA: Math.round(newRatingA),
            newRatingB: Math.round(newRatingB)
        };
    }
    
    getDynamicK(songId) {
        const count = this.getComparisonCount(songId);
        
        // High volatility for new songs
        if (count < 3) return 48;
        
        // Medium volatility for somewhat tested songs
        if (count < 7) return 32;
        
        // Low volatility for well-tested songs
        return 16;
    }

    recordComparison(songIdA, songIdB, winnerId, timestamp = Date.now()) {
        this.comparisons.push({
            songIdA,
            songIdB,
            winnerId,
            timestamp
        });
    }

    recordSkip(songIdA, songIdB) {
        const key = [songIdA, songIdB].sort().join('-');
        this.skipCount[key] = (this.skipCount[key] || 0) + 1;
    }

    hasBeenCompared(songIdA, songIdB) {
        return this.comparisons.some(comp => 
            (comp.songIdA === songIdA && comp.songIdB === songIdB) ||
            (comp.songIdA === songIdB && comp.songIdB === songIdA)
        );
    }

    getComparisonCount(songId) {
        return this.comparisons.filter(comp => 
            comp.songIdA === songId || comp.songIdB === songId
        ).length;
    }
    
    getCompletedComparisons() {
        return this.comparisons.length;
    }

    getWinRate(songId) {
        const relevantComparisons = this.comparisons.filter(comp => 
            comp.songIdA === songId || comp.songIdB === songId
        );
        
        if (relevantComparisons.length === 0) return 0;
        
        const wins = relevantComparisons.filter(comp => comp.winnerId === songId).length;
        return wins / relevantComparisons.length;
    }

    getRecentComparisons(songId, limit = 5) {
        return this.comparisons
            .filter(comp => comp.songIdA === songId || comp.songIdB === songId)
            .slice(-limit);
    }

    getSkipCount(songIdA, songIdB) {
        const key = [songIdA, songIdB].sort().join('-');
        return this.skipCount[key] || 0;
    }

    shouldSkipPairing(songIdA, songIdB, maxSkips = 3) {
        return this.getSkipCount(songIdA, songIdB) >= maxSkips;
    }

    exportData() {
        return {
            comparisons: this.comparisons,
            skipCount: this.skipCount,
            k: this.k
        };
    }

    importData(data) {
        this.comparisons = data.comparisons || [];
        this.skipCount = data.skipCount || {};
        this.k = data.k || 32;
    }
    
    getRatingConfidence(songId) {
        const comparisonCount = this.getComparisonCount(songId);
        const winRate = this.getWinRate(songId);
        
        // Confidence factors:
        // 1. Number of comparisons (more = higher confidence)
        // 2. Win rate consistency (extreme win rates with many comparisons = high confidence)
        // 3. Recency of comparisons
        
        // Base confidence from comparison count
        let confidence = Math.min(comparisonCount / 10, 1.0) * 0.6; // Max 60% from count
        
        // Add confidence from win rate consistency
        if (comparisonCount >= 5) {
            // Very high or very low win rates indicate clear ranking
            const winRateExtremity = Math.abs(winRate - 0.5) * 2; // 0 to 1
            confidence += winRateExtremity * 0.3; // Max 30% from win rate
        }
        
        // Add recency factor
        const recentComparisons = this.getRecentComparisons(songId, 3);
        if (recentComparisons.length > 0) {
            const mostRecent = recentComparisons[recentComparisons.length - 1];
            const ageInComparisons = this.comparisons.length - this.comparisons.indexOf(mostRecent);
            const recencyScore = Math.max(0, 1 - (ageInComparisons / 50)); // Decay over 50 comparisons
            confidence += recencyScore * 0.1; // Max 10% from recency
        }
        
        return Math.min(confidence, 1.0); // Cap at 100%
    }
    
    getAverageOpponentRating(songId, songRatings) {
        const relevantComparisons = this.comparisons.filter(comp => 
            comp.songIdA === songId || comp.songIdB === songId
        );
        
        if (relevantComparisons.length === 0) return 1500;
        
        let totalRating = 0;
        let count = 0;
        
        relevantComparisons.forEach(comp => {
            const opponentId = comp.songIdA === songId ? comp.songIdB : comp.songIdA;
            const opponentRating = songRatings.get(opponentId) || 1500;
            totalRating += opponentRating;
            count++;
        });
        
        return count > 0 ? totalRating / count : 1500;
    }
    
    removeComparison(songIdA, songIdB) {
        // Remove the comparison from history
        this.comparisons = this.comparisons.filter(comp => 
            !((comp.songIdA === songIdA && comp.songIdB === songIdB) ||
              (comp.songIdA === songIdB && comp.songIdB === songIdA))
        );
        
        // Remove skip count if any
        const key = [songIdA, songIdB].sort().join('-');
        delete this.skipCount[key];
    }
    
    reset() {
        this.comparisons = [];
        this.skipCount = {};
    }
}

// Make class available globally
window.EloRating = EloRating;