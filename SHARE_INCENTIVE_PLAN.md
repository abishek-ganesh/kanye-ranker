# Share Incentive System - Implementation Plan

## Overview
Implement a share incentive system that rewards users with extended rankings (songs 11-20 and albums 6-10) after they share their results on social media.

## Features to Implement

### 1. Locked Sections UI
- **Songs Section**: 
  - Show top 10 songs as normal
  - Add blurred/locked section below showing "Songs 11-20"
  - Display lock icon (🔒) with message: "Share to Unlock Your Full Top 20!"
  
- **Albums Section**:
  - Show top 5 albums as normal  
  - Add locked section for albums 6-10
  - Similar lock UI with message: "Share to See More Albums!"

### 2. Share Tracking System
- Use localStorage to track when user has shared
- Key: `kanye-ranker-has-shared`
- Set to `true` when any share button is clicked
- Persist across browser sessions
- Check on page load to show/hide extended rankings

### 3. Extended Rankings Display
After sharing, reveal:
- **Songs 11-20**: Full song list with album info
- **Albums 6-10**: Additional album rankings
- **Special Insights**:
  - "Your most underrated pick: [Song at #11]"
  - "Hidden gem at #15: [Song name]"
  - "Your deep cut favorite: [Lowest ranked song from top albums]"

### 4. Share Button Updates
- All share buttons trigger unlock:
  - Native "Share with Friends" 
  - X/Twitter
  - Facebook
  - Instagram
  - Reddit
- Add tracking code to `handleShare` function
- Show immediate visual feedback

### 5. Success Messaging
After sharing:
- Show success toast/modal: "Thanks for sharing! 🎉"
- Smooth scroll to newly revealed sections
- Highlight the extended rankings briefly
- Update button text to "Share Again!" 

### 6. Enhanced Share Messages
Update share text to include teasers:
- "My Top 10 Kanye songs are: [list]... and I just unlocked my #11-20! 🔓"
- "Just discovered my #11 song surprised me the most!"
- Add call-to-action: "Get your full rankings at kanyeranker.com"

## Technical Implementation

### Files to Modify
1. **share-integrated.js**:
   - Add share tracking logic
   - Update `handleShare` function
   - Create unlock functionality

2. **app.js** (or display logic):
   - Modify ranking display functions
   - Add conditional rendering for 11-20
   - Create locked section UI

3. **style.css**:
   - Add styles for locked sections
   - Blur effect for preview
   - Success animation styles

### Code Structure
```javascript
// Check if user has shared
function hasUserShared() {
  return localStorage.getItem('kanye-ranker-has-shared') === 'true';
}

// Track share action
function trackShare() {
  localStorage.setItem('kanye-ranker-has-shared', 'true');
  unlockExtendedRankings();
}

// Unlock and reveal extended rankings
function unlockExtendedRankings() {
  // Remove blur
  // Show songs 11-20
  // Show albums 6-10
  // Display insights
  // Animate reveal
}
```

## UI Mockup

```
TOP 10 SONGS
1. Song Name
2. Song Name
...
10. Song Name

[🔒 LOCKED SECTION - Blurred Background]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 Your Songs 11-20
Share to Unlock Your Full Rankings!
[Share with Friends] [X] [FB] [IG] [Reddit]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Blurred preview of 11-20]
```

## Success Metrics
- Increased share rate
- Users viewing extended rankings
- Repeat shares
- Social media engagement

## Future Enhancements
- Share streaks (unlock more with consecutive days)
- Friend comparison features
- Rare stats and achievements
- Custom share graphics for 11-20 rankings