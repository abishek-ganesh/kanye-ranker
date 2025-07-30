# Google Analytics 4 Dashboard Setup Guide

This guide will help you set up a comprehensive dashboard in Google Analytics 4 to track all key metrics for the Kanye Ranker app.

## Prerequisites

1. Make sure GA4 is properly configured with your tracking ID (G-Z2S91E0R6Z)
2. Verify that events are being sent by checking the Realtime reports in GA4

## Custom Events Being Tracked

### Core Events
- `page_view` - Tracks navigation between screens
- `ranking_started` - When user starts ranking
- `song_compared` - Detailed comparison data
- `ranking_completed` - When user completes ranking
- `ranking_early_exit` - When user exits early

### Engagement Events
- `song_previewed` - When user previews a song
- `external_link_clicked` - YouTube/Lyrics clicks
- `comparison_skipped` - When user skips a comparison
- `feedback_submitted` - When user submits feedback
- `continue_ranking` - When user continues after results

### Export Events
- `songs_image_exported` - Top songs image export
- `albums_image_exported` - Top albums image export

### Performance Events
- `timing_complete` - App load time tracking
- `error_occurred` - Error tracking

## Step-by-Step Dashboard Setup

### 1. Create Custom Dimensions

Go to **Admin → Custom definitions → Custom dimensions** and create:

1. **Song Title** (Event scope)
   - Dimension name: Song Title
   - Event parameter: song_title

2. **Album Name** (Event scope)
   - Dimension name: Album Name
   - Event parameter: album_name

3. **Winner Song** (Event scope)
   - Dimension name: Winner Song
   - Event parameter: winner_song

4. **Top Album** (Event scope)
   - Dimension name: Top Album
   - Event parameter: top_album

5. **Comparison Number** (Event scope)
   - Dimension name: Comparison Number
   - Event parameter: comparison_number

### 2. Create Custom Metrics

Go to **Admin → Custom definitions → Custom metrics** and create:

1. **Time Taken Seconds** (Event scope)
   - Metric name: Time Taken Seconds
   - Event parameter: time_taken_seconds
   - Unit of measurement: Standard

2. **Completion Rate** (Event scope)
   - Metric name: Completion Rate
   - Event parameter: completion_rate
   - Unit of measurement: Standard

### 3. Create Custom Reports

#### A. User Flow Report
1. Go to **Reports → Create new report**
2. Name: "Kanye Ranker User Flow"
3. Add dimensions:
   - Page title
   - Event name
4. Add metrics:
   - Event count
   - Users
   - Average engagement time

#### B. Song Performance Report
1. Create new report: "Song Performance"
2. Add dimensions:
   - Winner Song (custom dimension)
   - Album Name (custom dimension)
3. Add metrics:
   - Event count
   - Users
4. Filter by event name = "song_compared"

#### C. Album Rankings Report
1. Create new report: "Album Performance"
2. Add dimensions:
   - Top Album (custom dimension)
3. Add metrics:
   - Event count
   - Users
4. Filter by event name = "album_rankings_generated"

#### D. Conversion Funnel Report
1. Create new report: "Ranking Completion Funnel"
2. Use Funnel exploration
3. Steps:
   - Step 1: ranking_started
   - Step 2: comparison_made (≥20 times)
   - Step 3: ranking_completed OR ranking_early_exit
   - Step 4: songs_image_exported OR albums_image_exported

### 4. Create Dashboard Cards

Go to **Reports → Library → Create new collection** and add:

#### Card 1: Real-time Activity
- Type: Scorecard
- Metric: Active users (last 30 minutes)

#### Card 2: Daily Active Users
- Type: Line chart
- Dimension: Date
- Metric: Active users

#### Card 3: Top Songs
- Type: Table
- Dimension: Winner Song
- Metric: Event count
- Filter: Event name = "song_compared"

#### Card 4: User Engagement
- Type: Scorecard grid
- Metrics:
  - Average engagement time per session
  - Average comparisons per user
  - Completion rate

#### Card 5: Preview Engagement
- Type: Pie chart
- Dimension: Event name
- Metric: Event count
- Filter: Event name in ("song_previewed", "external_link_clicked")

#### Card 6: Device Breakdown
- Type: Donut chart
- Dimension: Device category
- Metric: Users

### 5. Set Up Audiences

Create audiences for remarketing and analysis:

1. **Engaged Users**
   - Users who completed at least 50 comparisons

2. **Power Users**
   - Users who exported results
   - Users who used continue ranking

3. **Mobile Users**
   - Device category = mobile
   - Engaged for > 5 minutes

### 6. Configure Alerts

Set up custom alerts for:

1. **Error Spike Alert**
   - When error_occurred events > 100 per hour

2. **Traffic Spike Alert**
   - When hourly users increase by > 200%

3. **Low Completion Alert**
   - When completion rate drops below 30%

## Recommended GA4 Explorations

### 1. Path Analysis
- Start with: page_view (Landing Page)
- Explore paths through ranking_started → comparisons → results

### 2. Segment Overlap
- Compare users who:
  - Preview songs vs don't preview
  - Complete ranking vs early exit
  - Export results vs don't export

### 3. Cohort Analysis
- Track retention of users over time
- Compare completion rates by acquisition date

### 4. User Lifetime
- Track total comparisons per user
- Identify most engaged song preferences

## Key Metrics to Monitor

### Daily KPIs
- Daily Active Users (DAU)
- Average session duration
- Completion rate
- Top winning songs/albums

### Weekly Analysis
- User retention rate
- Feature adoption (previews, exports)
- Error rates
- Device/browser distribution

### Monthly Reviews
- User growth trends
- Album popularity shifts
- Seasonal patterns
- Performance metrics

## Debugging & Validation

### 1. Use DebugView
- Enable debug mode in browser console:
  ```javascript
  gtag('config', 'G-Z2S91E0R6Z', { 'debug_mode': true });
  ```

### 2. Verify Events in Realtime
- Go to Reports → Realtime
- Check "Event count by Event name"

### 3. Common Issues
- If events aren't showing: Check browser ad blockers
- If custom dimensions are empty: Wait 24-48 hours for processing
- If funnels show 0%: Verify event parameter names match exactly

## Advanced Tracking Ideas

1. **Heatmap Integration**
   - Track click coordinates on song cards
   - Identify UI interaction patterns

2. **Session Recording**
   - Integrate with tools like Hotjar
   - Use GA4 user ID for correlation

3. **A/B Testing**
   - Test different comparison counts
   - Experiment with UI layouts
   - Track via custom event parameters

## Export Configuration

To export data for further analysis:

1. Set up BigQuery integration (Admin → BigQuery linking)
2. Create scheduled exports for:
   - Daily event data
   - User properties
   - Custom dimensions

3. Use BigQuery for:
   - Advanced song preference analysis
   - User clustering
   - Predictive modeling