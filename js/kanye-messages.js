// Kanye-themed messages for various parts of the app
const KanyeMessages = {
    // Loading state messages
    loading: [
        "Finding your stronger opinions...",
        "Bound 2 find your favorites...",
        "Loading all of the lights...",
        "Through the wire to your results...",
        "Touching the sky with data...",
        "Power-ing up your rankings...",
        "Flashing lights while we prepare...",
        "Can't tell me nothing, loading everything...",
        "Welcome to the good life of rankings...",
        "Runaway to your results...",
        "Following God to your favorites...",
        "Ultralight beaming your data...",
        "On sight with your rankings...",
        "Heartless calculations in progress...",
        "Diamonds from Sierra Leone... loading...",
        "Blood on the leaves... of your brackets...",
        "No church in the wild... just pure rankings..."
    ],
    
    // Comparison screen motivational messages
    comparison: [
        "Touch the sky with your picks",
        "Find your stronger opinion",
        "All of the lights on this choice",
        "Bound 2 make a decision",
        "Through the wire of choices",  
        "Good life, better rankings",
        "Power through these picks",
        "Heartless? Make a choice anyway",
        "Runaway with your preference",
        "Jesus walks with your decisions",
        "Gold digger for the better track",
        "Champion your favorite",
        "Black skinhead energy needed",
        "Famous choices ahead",
        "Fade into your preference",
        "Ghost town population: your picks",
        "I wonder which you'll choose",
        "Flashing lights on this decision",
        "Dark fantasy or bright reality?",
        "Lift yourself to the better song"
    ],
    
    // Progress milestone messages
    milestones: {
        10: "Slow jamz, but we're getting there",
        25: "Halfway to Graduation 🎓",
        40: "Family business of ranking continues",
        50: "Through the Wire to your results",
        60: "Homecoming to your favorites soon",
        75: "Almost touched the Sky",
        90: "Last call before results",
        100: "My Beautiful Dark Twisted Ranking complete",
        125: "Ultralight beam of comparisons",
        150: "Saint Pablo level dedication"
    },
    
    // Results page headers
    results: {
        songHeader: "My Beautiful Dark Twisted Ranking",
        albumHeader: "The Life of Your Albums",
        alternativeSongHeaders: [
            "Graduation Day: Your Top Songs",
            "Late Registration of Favorites",
            "The College Dropout's Playlist",
            "808s & Your Heartbreaks",
            "Yeezus Has Risen: Top Tracks",
            "Kids See Your Top Songs",
            "Donda's Children: Your Picks"
        ],
        alternativeAlbumHeaders: [
            "Watch the Throne of Albums",
            "Cruel Summer Album Rankings",
            "Jesus Is King of Your Albums",
            "Ye Album Hierarchy",
            "Vultures Circling Top Albums"
        ]
    },
    
    // Social share messages - removed per user request
    // shareMessages: [
    //     "I just found my Stronger opinions on Kanye Ranker",
    //     "Can't Tell Me Nothing - here's my top 10",
    //     "Touched the Sky with my Kanye rankings",
    //     "My Beautiful Dark Twisted Ranking is complete",
    //     "Through the Wire to find my favorite Ye songs",
    //     "All of the Lights on my top tracks",
    //     "Power ranking complete - check my Kanye top 10",
    //     "Bound 2 share my Kanye rankings"
    // ],
    
    // Skip button alternative text
    skipMessages: [
        "Can't decide? Skip it",
        "Pass on this one", 
        "Next matchup",
        "Different battle",
        "Gone til November on this one",
        "Send it up... to the next pair",
        "New slaves to different songs",
        "Spaceship to the next choice",
        "Drive slow past this one",
        "Say you will... skip"
    ],
    
    // Done button messages based on comparison count
    doneMessages: {
        early: "Graduate Early - Show Results",
        medium: "I'm Good - Show Results", 
        late: "Finish Strong - Show Results",
        veryEarly: "Dropout Now - Show Results",
        almostDone: "One More Hour - Show Results",
        marathon: "Ultramarathon Complete - Show Results"
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
        if (count < 10) return this.doneMessages.veryEarly;
        if (count < 30) return this.doneMessages.early;
        if (count < 60) return this.doneMessages.medium;
        if (count < 100) return this.doneMessages.late;
        if (count < 150) return this.doneMessages.almostDone;
        return this.doneMessages.marathon;
    },
    
    // Get random message by category
    getRandomMessage(category) {
        switch(category) {
            case 'loading':
                return this.getRandom(this.loading);
            case 'comparison':
                return this.getRandom(this.comparison);
            // case 'share': // Removed per user request
            //     return this.getRandom(this.shareMessages);
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
                    "Stronger opinions revealed",
                    "Everything I am is in these rankings",
                    "Celebration of your musical taste",
                    "Good morning to your top tracks",
                    "Welcome to heartbreak... for the songs that didn't make it",
                    "Amazing grace, your taste is validated",
                    "I love it - your personal classics",
                    "Wolves howl for your top picks",
                    "Praise God for these rankings",
                    "Moon walking through your favorites",
                    "Off the grid rankings revealed"
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
                    "Now throw your hands up in the sky",
                    "We major - keep ranking",
                    "Heard 'em say you're halfway there",
                    "Good night to the songs you've passed",
                    "Roses smell like progress",
                    "Addiction to ranking confirmed",
                    "School spirit says keep going",
                    "Big brother watching your progress",
                    "Diamonds are forever like these rankings",
                    "Hey mama, look at your progress",
                    "Two words: keep going"
                ];
                return this.getRandom(milestoneMessages);
            case 'lateGame':
                const lateGameMessages = [
                    "Almost at Graduation 🎓",
                    "Can you believe we're here?",
                    "The marathon continues",
                    "Finish your breakfast",
                    "One more round, champion",
                    "Late orchestration of your list",
                    "Can't look in my eyes - almost done",
                    "Homecoming approaching fast",
                    "The glory is near",
                    "See me now - you're almost there",
                    "Coldest winter ending soon",
                    "Bittersweet poetry of final picks",
                    "Street lights guiding you home",
                    "Gone but not forgotten - final stretch",
                    "Hold my liquor, we're almost done"
                ];
                return this.getRandom(lateGameMessages);
            default:
                return "Keep it loopy";
        }
    }
};

// Make available globally
window.KanyeMessages = KanyeMessages;