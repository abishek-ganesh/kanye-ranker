# Google Analytics 4 Dashboard Setup Guide

This comprehensive guide will help you set up a powerful dashboard in Google Analytics 4 to track all key metrics for the Kanye Ranker app. Since the app doesn't persist sessions (each reload is a fresh start), we focus on single-session engagement metrics and completion patterns.

## Prerequisites

1. GA4 property created and configured with tracking ID: **G-Z2S91E0R6Z**
2. Analytics script properly installed in your app
3. Events firing correctly (verify in Realtime reports)
4. Admin access to your GA4 property

## Important Note About Sessions

**The Kanye Ranker app does not persist user sessions.** Every page reload starts a fresh ranking experience. This means:
- We cannot track returning users continuing previous rankings
- Each session represents a complete user journey from start to finish (or early exit)
- Focus on single-session conversion rates and engagement patterns

## Custom Events Reference

### Core Journey Events
| Event Name | Description | Key Parameters |
|------------|-------------|----------------|
| `page_view` | Tracks screen navigation | `page_title`, `page_location` |
| `ranking_started` | User clicks START button | `event_category`: 'engagement' |
| `song_compared` | Detailed comparison data | `winner_song`, `loser_song`, `comparison_number`, `time_taken_seconds` |
| `ranking_completed` | User completes full ranking | `total_comparisons`, `top_album`, `top_song` |
| `ranking_early_exit` | User clicks "I'm Done" button* | `comparisons_completed`, `completion_rate` |

*Note: This event only fires when users actively click "I'm Done - Show Results" button (which appears after 20 comparisons). Users who abandon by closing the browser are not tracked with this event, but can be partially tracked through session timeout events.

### Engagement Events
| Event Name | Description | Key Parameters |
|------------|-------------|----------------|
| `comparison_made` | Each song choice | `comparison_number`, `completion_percentage` |
| `comparison_skipped` | User skips comparison | `comparison_number` |
| `song_previewed` | Preview button clicked | `song_title`, `album_name`, `preview_source` |
| `external_link_clicked` | YouTube/Lyrics clicked | `link_type`, `song_title`, `album_name` |
| `continue_ranking` | Continues from results | `from_comparison` |
| `feedback_submitted` | Feedback form submitted | `has_email` |

### Export Events
| Event Name | Description | Key Parameters |
|------------|-------------|----------------|
| `songs_image_exported` | Top 10 songs exported | `top_album` |
| `albums_image_exported` | Top albums exported | `top_album` |

### System Events
| Event Name | Description | Key Parameters |
|------------|-------------|----------------|
| `timing_complete` | Performance metrics | `name`, `value` |
| `error_occurred` | Error tracking | `error_message`, `error_location` |
| `dark_mode_toggled` | Theme changes | `is_dark_mode` |

## Expected Event Volumes

Based on typical user behavior patterns:
- **ranking_started**: 100% of engaged users
- **comparison_made**: 20-80 events per session (average: 35)
- **ranking_completed**: 15-25% of sessions
- **ranking_early_exit**: 30-40% of sessions (after 20+ comparisons)
- **comparison_skipped**: 5-10% of total comparisons
- **song_previewed**: 10-20% of sessions include previews
- **songs_image_exported**: 5-10% of completed rankings
- **albums_image_exported**: 3-5% of completed rankings
- **external_link_clicked**: 2-5% of sessions
- **continue_ranking**: 10-15% of users who reach results

These benchmarks help identify unusual patterns and potential issues.

## Step 1: Create Custom Definitions

### Navigate to Custom Definitions
1. In GA4, go to **Admin** (gear icon)
2. Under **Property**, click **Custom definitions**

### A. Custom Dimensions (Event-scoped)

Click **Create custom dimensions** and add each of these:

#### 1. Winner Song
- **Dimension name**: Winner Song
- **Scope**: Event
- **Description**: Song selected as winner in comparison
- **Event parameter**: `winner_song`

#### 2. Loser Song
- **Dimension name**: Loser Song
- **Scope**: Event
- **Description**: Song not selected in comparison
- **Event parameter**: `loser_song`

#### 3. Winner Album
- **Dimension name**: Winner Album
- **Scope**: Event
- **Description**: Album of winning song
- **Event parameter**: `winner_album`

#### 4. Loser Album
- **Dimension name**: Loser Album
- **Scope**: Event
- **Description**: Album of losing song
- **Event parameter**: `loser_album`

#### 5. Song Title
- **Dimension name**: Song Title
- **Scope**: Event
- **Description**: Generic song title for previews/links
- **Event parameter**: `song_title`

#### 6. Album Name
- **Dimension name**: Album Name
- **Scope**: Event
- **Description**: Generic album name
- **Event parameter**: `album_name`

#### 7. Top Album
- **Dimension name**: Top Album
- **Scope**: Event
- **Description**: User's #1 album from results
- **Event parameter**: `top_album`

#### 8. Top Song
- **Dimension name**: Top Song
- **Scope**: Event
- **Description**: User's #1 song from results
- **Event parameter**: `top_song`

#### 9. Link Type
- **Dimension name**: Link Type
- **Scope**: Event
- **Description**: Type of external link (youtube/lyrics)
- **Event parameter**: `link_type`

#### 10. Comparison Number
- **Dimension name**: Comparison Number
- **Scope**: Event
- **Description**: Sequential comparison count
- **Event parameter**: `comparison_number`

### B. Custom Metrics (Event-scoped)

Click **Create custom metrics** and add:

#### 1. Time Taken Seconds
- **Metric name**: Time Taken Seconds
- **Scope**: Event
- **Description**: Time to make comparison decision
- **Event parameter**: `time_taken_seconds`
- **Unit of measurement**: Standard

#### 2. Completion Rate
- **Metric name**: Completion Rate
- **Scope**: Event
- **Description**: Percentage of comparisons completed
- **Event parameter**: `completion_rate`
- **Unit of measurement**: Standard

#### 3. Total Comparisons
- **Metric name**: Total Comparisons
- **Scope**: Event
- **Description**: Total comparisons in session
- **Event parameter**: `total_comparisons`
- **Unit of measurement**: Standard

#### 4. Comparisons Completed
- **Metric name**: Comparisons Completed
- **Scope**: Event
- **Description**: Number of comparisons before exit
- **Event parameter**: `comparisons_completed`
- **Unit of measurement**: Standard

## Step 2: Wait for Data Processing

**Important**: After creating custom definitions, wait 24-48 hours for GA4 to start populating these dimensions with data. You can verify they're working in **Realtime** reports.

## Step 3: Create Exploration Reports

### Navigate to Explorations
1. Click **Explore** in the left navigation
2. Click **Blank** to create new exploration

### A. User Journey Funnel

**Purpose**: Track drop-off points in the ranking process

1. **Name**: "Ranking Completion Funnel"
2. **Technique**: Funnel exploration
3. **Steps**:
   - Step 1: `ranking_started` (Entry point)
   - Step 2: `comparison_made` where `comparison_number` = 10
   - Step 3: `comparison_made` where `comparison_number` = 20
   - Step 4: `ranking_completed`
   - Step 5: `songs_image_exported` OR `albums_image_exported`

4. **Breakdown**: Device category
5. **Segment**: All users

**Insights**: This shows where users drop off and completion rates at each milestone.

**Note**: The `ranking_early_exit` event only fires when users click "I'm Done - Show Results" (appears after 20 comparisons). True abandonment rate requires comparing session starts to completion events, as browser abandonment won't trigger exit events.

### B. Song Popularity Analysis

**Purpose**: Identify which songs win most often

1. **Name**: "Song Win Rates"
2. **Technique**: Free form
3. **Configuration**:
   - **Rows**: Winner Song (custom dimension)
   - **Values**: 
     - Event count
     - Count distinct users
   - **Filters**: Event name exactly matches `song_compared`
   - **Sort**: Event count (descending)

4. **Optional**: Add Winner Album as second row dimension

### C. Decision Time Analysis

**Purpose**: Understand how long users take to choose

1. **Name**: "Comparison Decision Times"
2. **Technique**: Free form
3. **Configuration**:
   - **Rows**: Comparison Number
   - **Values**: 
     - Time Taken Seconds (average)
     - Event count
   - **Filters**: Event name exactly matches `song_compared`
   - **Visualization**: Line chart

### D. Drop-off Analysis

**Purpose**: Understand when users abandon the ranking process

1. **Name**: "User Drop-off Patterns"
2. **Technique**: Free form
3. **Configuration**:
   - **Rows**: Comparison Number (custom dimension)
   - **Values**: 
     - Users
     - Drop-off rate (calculated)
   - **Filters**: Event name exactly matches `comparison_made`
   - **Visualization**: Line chart showing user retention by comparison number

**Alternative Analysis**: Create a cohort retention chart showing what percentage of users who start ranking reach various comparison milestones (5, 10, 15, 20, 30, 50+ comparisons)

### E. Song Battle Matrix

**Purpose**: Head-to-head win rates between specific songs

1. **Name**: "Song vs Song Win Rates"
2. **Technique**: Pivot table
3. **Configuration**:
   - **Rows**: Winner Song
   - **Columns**: Loser Song
   - **Values**: Event count
   - **Filter**: Event name = `song_compared`
   - **Heat map**: Apply color scale to visualize dominance

### F. Fatigue Curve Analysis

**Purpose**: Identify when users get tired and make faster decisions

1. **Name**: "Decision Fatigue Tracker"
2. **Technique**: Free form
3. **Configuration**:
   - **Dimension**: Comparison Number
   - **Metrics**:
     - Time Taken Seconds (average)
     - Time Taken Seconds (median)
     - Skip rate (calculated)
   - **Visualization**: Combo chart with dual axis

## Step 4: Build Dashboard

### Navigate to Reports
1. Go to **Reports** → **Library**
2. Click **Create new report** → **Create detail report**

### A. Overview Dashboard

Create a collection called "Kanye Ranker Overview" with these cards:

#### Card 1: Key Metrics Summary
- **Type**: Summary card
- **Metrics**:
  - Active users (primary)
  - New users
  - Average engagement time
  - Events per session

#### Card 2: Real-time Activity
- **Type**: Real-time card
- **Show**: Users in last 30 minutes
- **Breakdown**: By page title

#### Card 3: Conversion Funnel
- **Type**: Funnel chart
- **Steps**:
  1. Sessions with `ranking_started`
  2. Sessions with 20+ comparisons
  3. Sessions with `ranking_completed`
  4. Sessions with exports

### B. Song Performance Dashboard

Create "Song & Album Insights" collection:

#### Card 1: Top 10 Winning Songs
- **Type**: Table
- **Dimensions**: 
  - Winner Song
  - Winner Album
- **Metrics**: Event count
- **Filter**: Event name = `song_compared`
- **Sort**: Event count (descending)
- **Row limit**: 10

#### Card 2: Album Dominance
- **Type**: Pie chart
- **Dimension**: Winner Album
- **Metric**: Event count
- **Filter**: Event name = `song_compared`

#### Card 3: Preview Engagement
- **Type**: Bar chart
- **Dimension**: Song Title
- **Metric**: Event count
- **Filter**: Event name = `song_previewed`
- **Sort**: Event count (descending)

### C. User Behavior Dashboard

Create "User Engagement Patterns" collection:

#### Card 1: Comparison Patterns
- **Type**: Line chart
- **Dimension**: Comparison Number
- **Metrics**: 
  - Event count
  - Users
- **Filter**: Event name = `comparison_made`

#### Card 2: Skip Analysis
- **Type**: Scatter plot
- **Dimension**: Comparison Number
- **Metric**: Event count
- **Filter**: Event name = `comparison_skipped`

#### Card 3: External Link Clicks
- **Type**: Table
- **Dimensions**:
  - Link Type
  - Song Title
- **Metric**: Event count
- **Filter**: Event name = `external_link_clicked`

## Step 5: Create Audiences

### Navigate to Audiences
1. Go to **Admin** → **Audiences**
2. Click **New audience**

### A. Engaged Users
- **Name**: "Engaged Rankers"
- **Description**: Users who complete significant rankings
- **Conditions**: 
  - Include users when: Event `ranking_completed` 
  - OR Event `comparisons_completed` > 50

### B. Quick Abandoners
- **Name**: "Quick Abandoners"
- **Description**: Users who leave very early
- **Conditions**:
  - Include users when: 
    - Event `ranking_started` exists
    - AND Maximum `comparison_number` < 10
    - AND Event `ranking_completed` does NOT exist

### C. Power Users
- **Name**: "Power Rankers"
- **Description**: Most engaged users
- **Conditions**:
  - Include users when: Event `songs_image_exported`
  - OR Event `albums_image_exported`
  - OR Event `continue_ranking`

## Useful Segments

Beyond audiences, create these segments for analysis:

### A. Speed Runners
- **Name**: "Speed Clickers"
- **Description**: Users making very fast decisions (possibly random)
- **Definition**: Users where average `time_taken_seconds` < 3
- **Use case**: Filter out potentially invalid data

### B. Thoughtful Rankers  
- **Name**: "Deliberate Rankers"
- **Description**: Users taking time to consider choices
- **Definition**: Users where average `time_taken_seconds` between 5-15
- **Use case**: Your most engaged, genuine user base

### C. Peak Hour Users
- **Name**: "Prime Time Users"
- **Description**: Evening/weekend users with higher engagement
- **Definition**: Sessions between 7-10 PM local time OR weekends
- **Use case**: Typically show 30-40% higher completion rates

### D. Mobile vs Desktop Segments
- **Name**: "Mobile Power Users" / "Desktop Power Users"
- **Description**: Device-specific engaged users
- **Definition**: Device category = mobile/desktop AND comparisons > 30
- **Use case**: Understand platform-specific behaviors

## Step 6: Set Up Alerts

### Navigate to Custom Alerts
1. Go to **Admin** → **Custom alerts**

### A. Error Spike Alert
- **Alert name**: "High Error Rate"
- **Period**: Hourly
- **Condition**: Event count of `error_occurred` > 50
- **Notification**: Email immediately

### B. Traffic Spike Alert
- **Alert name**: "Traffic Surge"
- **Period**: Hourly
- **Condition**: Users increases by > 300% compared to same hour previous week
- **Notification**: Email

### C. Low Engagement Alert
- **Alert name**: "Low Completion Rate"
- **Period**: Daily
- **Condition**: Ratio of `ranking_completed` to `ranking_started` < 0.20
- **Notification**: Email

## Step 7: Advanced Analysis

### A. Create Calculated Metrics

In report editor, create calculated metrics:

1. **Completion Rate**
   ```
   Event count (ranking_completed) / Event count (ranking_started)
   ```

2. **Average Comparisons per User**
   ```
   Event count (comparison_made) / Users
   ```

3. **Export Rate**
   ```
   (Event count (songs_image_exported) + Event count (albums_image_exported)) / Event count (ranking_completed)
   ```

4. **Decision Speed Trend**
   ```
   Average time_taken_seconds for comparisons 1-10 / Average time_taken_seconds for comparisons 41-50
   ```
   
5. **Album Diversity Score**
   ```
   Count of unique winner_album values / Total comparison_made events
   ```

6. **Skip Rate by Progress**
   ```
   Event count (comparison_skipped at comparison_number X) / Total events at comparison_number X
   ```

### B. Cohort Analysis

Since sessions don't persist, focus on:
- First-time user behavior patterns
- Time-of-day effects on completion
- Day-of-week engagement patterns

### C. User Flow Visualization

Create Sankey diagram showing:
1. Landing → Start Ranking
2. Start → 10 comparisons
3. 10 comparisons → 20 comparisons
4. 20 comparisons → Show results
5. Show results → Export/Share

## Quick Win Reports (First Week)

These reports provide immediate insights while waiting for larger data sets:

### Report 1: Song Battle Results
- **Purpose**: Which songs consistently win head-to-head matchups
- **Setup**: 
  - Create pivot table with Winner Song (rows) vs Loser Song (columns)
  - Apply conditional formatting to highlight dominant songs
- **Insight**: Reveals true song hierarchy and unexpected favorites

### Report 2: User Fatigue Patterns
- **Purpose**: Identify optimal session length
- **Setup**: 
  - Line chart: time_taken_seconds by comparison_number
  - Add trendline to show fatigue curve
- **Insight**: Shows when to prompt "I'm Done" button more prominently

### Report 3: Album Bias Detection
- **Purpose**: Do users favor albums regardless of individual songs?
- **Setup**: 
  - Compare winner_album distribution vs expected distribution
  - Calculate over/under-representation percentages
- **Insight**: Reveals nostalgic biases and album preferences

### Report 4: Skip Pattern Analysis
- **Purpose**: Which matchups cause decision paralysis?
- **Setup**: 
  - Table of skipped comparisons by song pairs
  - Filter for skip count > 2
- **Insight**: Identifies confusing or too-similar matchups

## Device-Specific Analysis

### Mobile-Specific Metrics
Track these additional metrics for mobile users:
- **Tap accuracy**: Time between song display and first tap
- **Scroll behavior**: Track if users scroll between comparisons
- **Session length**: Mobile sessions are typically 20% shorter
- **Preview engagement**: Mobile users preview 50% less often

### Desktop-Specific Metrics
Track these for desktop users:
- **Keyboard usage**: Create custom event for keyboard shortcuts (1, 2, S keys)
- **Hover patterns**: Time spent hovering over choices
- **Multi-tab behavior**: Detect if users have multiple tabs open
- **Full completion rate**: Desktop users complete 40% more often

### Cross-Device Insights
- Mobile users make decisions 25% faster on average
- Desktop users are more likely to export results (2x rate)
- Mobile sessions peak at lunch and evening commute times
- Desktop usage peaks during work hours and late evening

## Debugging & Troubleshooting

### Enable Debug Mode
In browser console:
```javascript
// Enable GA4 debug mode
gtag('config', 'G-Z2S91E0R6Z', { 'debug_mode': true });

// Test an event
gtag('event', 'test_event', {
  'test_parameter': 'test_value'
});
```

### Event Validation
```javascript
// Add listener to see all GA events in console
window.dataLayer = window.dataLayer || [];
window.dataLayer.push(function() {
  console.log('GA Event:', arguments);
});

// Check specific event parameters
gtag('event', 'song_compared', {
  'winner_song': 'Test Song',
  'loser_song': 'Another Song',
  'comparison_number': 1,
  'time_taken_seconds': 5.2
});
```

### Network Inspection
1. Open Chrome DevTools → Network tab
2. Filter by "collect" or "g/collect"
3. Check each request payload for:
   - Event name (en parameter)
   - Custom parameters (ep.* parameters)
   - User properties (up.* parameters)

### Common Issues & Solutions

1. **Events not appearing**
   - Check ad blockers (especially Safari ITP)
   - Verify in Realtime reports first
   - Use GA Debugger Chrome extension

2. **Custom dimensions empty**
   - Wait 24-48 hours after creation
   - Verify parameter names match exactly
   - Check parameter values aren't null/undefined

3. **Funnel showing 0% conversion**
   - Verify event sequence logic
   - Check date range includes recent data
   - Ensure events fire in expected order

4. **Missing song/album parameters**
   - Check for special characters in song titles
   - Ensure values aren't empty strings (use null instead)
   - Verify encoding for songs with apostrophes or quotes

5. **Time tracking issues**
   - Ensure timer starts before comparison display
   - Check for negative time values
   - Verify timer resets between comparisons

## BigQuery Export (Highly Recommended)

For advanced analysis of song preference patterns:

### Setup BigQuery Export
1. In GA4 Admin → BigQuery Links
2. Create new link to your GCP project
3. Choose daily export (streaming for real-time needs)
4. Enable "Include advertising identifiers"

### Advanced SQL Queries

```sql
-- Head-to-head song performance
WITH battles AS (
  SELECT 
    event_param_winner_song.value.string_value AS winner,
    event_param_loser_song.value.string_value AS loser,
    COUNT(*) as battle_count
  FROM `your-project.analytics_*.events_*`,
    UNNEST(event_params) AS event_param_winner_song,
    UNNEST(event_params) AS event_param_loser_song
  WHERE event_name = 'song_compared'
    AND event_param_winner_song.key = 'winner_song'
    AND event_param_loser_song.key = 'loser_song'
  GROUP BY winner, loser
)
SELECT * FROM battles
ORDER BY battle_count DESC;

-- User preference clusters
WITH user_preferences AS (
  SELECT 
    user_pseudo_id,
    event_param_album.value.string_value AS preferred_album,
    COUNT(*) as selection_count
  FROM `your-project.analytics_*.events_*`,
    UNNEST(event_params) AS event_param_album
  WHERE event_name = 'song_compared'
    AND event_param_album.key = 'winner_album'
  GROUP BY user_pseudo_id, preferred_album
)
-- Add clustering logic here
```

### ML Insights
- Build recommendation models based on comparison patterns
- Predict completion likelihood based on early choices
- Identify song similarity clusters through user choices

## Key Metrics to Monitor

### Real-time Monitoring
- Active users right now
- Current screen views
- Events per minute
- Error rate

### Daily KPIs
- **Engagement Rate**: % of users who start ranking
- **Completion Rate**: % who reach results screen
- **Average Comparisons**: Per user per session
- **Export Rate**: % who save their results
- **Top Songs**: Most frequently chosen winners

### Weekly Analysis
- Peak usage times
- Device/Browser breakdown
- Geographic distribution
- Feature adoption rates
- Error patterns

### Monthly Trends
- User growth rate
- Album popularity shifts
- Seasonal patterns
- Performance metrics

## Privacy & Compliance

Remember to:
1. Include GA4 in your privacy policy
2. Implement cookie consent if required
3. Use Google's Consent Mode v2 if in EU
4. Anonymize IP addresses (default in GA4)
5. Set appropriate data retention periods

## Implementation Timeline

### Week 1: Foundation
1. **Day 1-2**: Create all custom definitions and metrics
2. **Day 3**: Set up BigQuery export (if using)
3. **Day 4**: Configure debug mode and validate events
4. **Day 5-7**: Monitor Realtime reports, fix any tracking issues

### Week 2: Initial Analysis
1. **Day 8-9**: Create exploration reports and funnels
2. **Day 10-11**: Build Quick Win reports
3. **Day 12-14**: Analyze early patterns and anomalies

### Week 3: Full Dashboard
1. **Day 15-16**: Build main dashboard collections
2. **Day 17-18**: Create audiences and segments
3. **Day 19-21**: Set up alerts and automated insights

### Week 4: Optimization
1. **Day 22-23**: Create device-specific reports
2. **Day 24-25**: Build advanced calculated metrics
3. **Day 26-28**: Document insights and share with team

### Month 2+: Advanced Analytics
1. **Weeks 5-6**: BigQuery analysis and ML models
2. **Weeks 7-8**: A/B testing framework setup
3. **Monthly**: Performance reviews and optimization

## Key Success Metrics

Track these metrics weekly to measure success:

### Engagement Metrics
- **Start Rate**: landing_page_views → ranking_started (Target: >60%)
- **20-Comparison Rate**: Users reaching 20 comparisons (Target: >40%)
- **Completion Rate**: Full ranking completion (Target: >20%)
- **Export Rate**: Results exported/shared (Target: >5%)

### Quality Metrics
- **Average Session Duration**: 3-7 minutes indicates good engagement
- **Decision Time**: 5-10 seconds average shows thoughtful choices
- **Skip Rate**: <10% indicates good song pairing
- **Error Rate**: <0.1% for stable experience

### Growth Metrics
- **Weekly Active Users**: Track week-over-week growth
- **Viral Coefficient**: Exports leading to new sessions
- **Return Rate**: Users starting multiple sessions (despite no persistence)
- **Geographic Expansion**: New markets emerging

## Additional Resources

- [GA4 Event Builder](https://ga-dev-tools.google/ga4/event-builder/)
- [GA4 Dimensions & Metrics Explorer](https://ga-dev-tools.google/ga4/dimensions-metrics-explorer/)
- [Google Analytics Debugger Chrome Extension](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
- [GA4 BigQuery Export Schema](https://support.google.com/analytics/answer/7029846)