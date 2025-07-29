// Kanye-themed messages for various parts of the app
const KanyeMessages = {
    // Loading state messages
    loading: [
        "Finding your Stronger opinions...",
        "Bound 2 find your favorites...",
        "Loading All of the Lights...",
        "Through the Wire to your results...",
        "Touching the Sky with data...",
        "Can't Tell Me Nothing, still loading...",
        "Power-ing up your rankings...",
        "Flashing Lights while we prepare..."
    ],
    
    // Comparison screen motivational messages
    comparison: [
        "Can't Tell Me Nothing about my taste",
        "Touch the Sky with your picks",
        "Find your Stronger opinion",
        "All of the Lights on this choice",
        "Bound 2 make a decision",
        "Through the Wire of choices",
        "Good Life, Better Rankings",
        "Power through these picks",
        "Heartless? Make a choice anyway",
        "Runaway with your preference"
    ],
    
    // Progress milestone messages
    milestones: {
        25: "Halfway to Graduation 🎓",
        50: "Through the Wire to your results",
        75: "Almost touched the Sky",
        100: "My Beautiful Dark Twisted Ranking complete"
    },
    
    // Results page headers
    results: {
        songHeader: "My Beautiful Dark Twisted Ranking",
        albumHeader: "The Life of Your Albums",
        shareHeader: "Runaway with these results"
    },
    
    // Social share messages
    shareMessages: [
        "I just found my Stronger opinions on Kanye Ranker",
        "Can't Tell Me Nothing - here's my top 10",
        "Touched the Sky with my Kanye rankings",
        "My Beautiful Dark Twisted Ranking is complete",
        "Through the Wire to find my favorite Ye songs",
        "All of the Lights on my top tracks",
        "Power ranking complete - check my Kanye top 10",
        "Bound 2 share my Kanye rankings"
    ],
    
    // Skip button alternative text
    skipMessages: [
        "Can't decide? Skip it",
        "Pass on this one",
        "Next matchup",
        "Different battle"
    ],
    
    // Done button messages based on comparison count
    doneMessages: {
        early: "Graduate Early - Show Results",
        medium: "I'm Good - Show Results", 
        late: "Finish Strong - Show Results"
    },
    
    // Get random message from array
    getRandom(messageArray) {
        return messageArray[Math.floor(Math.random() * messageArray.length)];
    },
    
    // Get milestone message
    getMilestone(count) {
        const milestones = Object.keys(this.milestones)
            .map(Number)
            .sort((a, b) => a - b);
        
        for (let milestone of milestones) {
            if (count === milestone) {
                return this.milestones[milestone];
            }
        }
        return null;
    },
    
    // Get done button text based on progress
    getDoneButtonText(count) {
        if (count < 30) return this.doneMessages.early;
        if (count < 60) return this.doneMessages.medium;
        return this.doneMessages.late;
    },
    
    // Get random message by category
    getRandomMessage(category) {
        switch(category) {
            case 'loading':
                return this.getRandom(this.loading);
            case 'comparison':
                return this.getRandom(this.comparison);
            case 'share':
                return this.getRandom(this.shareMessages);
            case 'skip':
                return this.getRandom(this.skipMessages);
            case 'resultsHeader':
                return "Your Yeezy Hall of Fame";
            case 'resultsSubtitle':
                const subtitles = [
                    "The waves have spoken...",
                    "Can't Tell Me Nothing about these rankings",
                    "You touched the Sky with these picks",
                    "Your Beautiful Dark Twisted Ranking",
                    "Stronger opinions revealed"
                ];
                return this.getRandom(subtitles);
            case 'start':
                return "Welcome to the Good Life - let's find your favorites";
            case 'milestone':
                const milestoneMessages = [
                    "Keep going strong",
                    "You're doing amazing, sweetie",
                    "That's that crack music",
                    "Everything I'm not made me everything I am",
                    "Now throw your hands up in the sky"
                ];
                return this.getRandom(milestoneMessages);
            case 'lateGame':
                const lateGameMessages = [
                    "Almost at Graduation 🎓",
                    "Can you believe we're here?",
                    "The marathon continues",
                    "Finish your breakfast",
                    "One more round, champion"
                ];
                return this.getRandom(lateGameMessages);
            default:
                return "Keep it loopy";
        }
    }
};

// Make available globally
window.KanyeMessages = KanyeMessages;