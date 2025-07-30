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

*Note: This event only fires when users actively click "I'm Done - Show Results" button (which appears after 20 comparisons). Users who abandon by closing the browser are not tracked with this event.

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

**Note**: The `ranking_early_exit` event only fires when users click "I'm Done - Show Results" (appears after 20 comparisons). Users who abandon by closing the browser won't trigger this event, so they'll show as drop-offs between steps.

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

## Debugging & Troubleshooting

### Enable Debug Mode
In browser console:
```javascript
// Enable debug mode
gtag('config', 'G-Z2S91E0R6Z', { 'debug_mode': true });

// Test an event
gtag('event', 'test_event', {
  'test_parameter': 'test_value'
});
```

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

## Next Steps

1. **Week 1**: Set up all custom definitions and wait for data
2. **Week 2**: Create exploration reports and analyze initial patterns
3. **Week 3**: Build dashboards and set up alerts
4. **Week 4**: Create audiences and analyze user segments
5. **Monthly**: Review and optimize based on insights

## Additional Resources

- [GA4 Event Builder](https://ga-dev-tools.google/ga4/event-builder/)
- [GA4 Dimensions & Metrics Explorer](https://ga-dev-tools.google/ga4/dimensions-metrics-explorer/)
- [Google Analytics Debugger Chrome Extension](https://chrome.google.com/webstore/detail/google-analytics-debugger/jnkmfdileelhofjcijamephohjechhna)
- [GA4 BigQuery Export Schema](https://support.google.com/analytics/answer/7029846)