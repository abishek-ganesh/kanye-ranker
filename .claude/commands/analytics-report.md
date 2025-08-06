# Generate Kanye Ranker Analytics Report (GA4 + Clarity)

Please generate a comprehensive analytics report combining Google Analytics 4 and Microsoft Clarity insights for the Kanye Ranker app.

Report period: $ARGUMENTS (defaults to 'daily' if not specified)

## Instructions:

1. **Determine Report Period**
   - Parse $ARGUMENTS for: daily, weekly, biweekly, or monthly
   - Default to 'daily' if no argument provided
   - Date ranges:
     - daily: yesterday to today (last 24 hours)
     - weekly: last 7 days 
     - biweekly: last 14 days
     - monthly: last 30 days

2. **Connect to Analytics Sources**
   - Google Analytics: Use analytics-mcp server for GA4 property ID: 498617351
   - Microsoft Clarity: Use clarity-kanye MCP (last 1-3 days only)
   - Use the appropriate date range based on report type

3. **User Analysis (Priority #1)**
   - **Total Users & Sessions**
     - Total unique users (GA4 + Clarity comparison)
     - New vs returning users
     - Sessions per user
   - **Geographic Distribution**
     - Users by country/region
     - Users by state/city (focus on US traffic)
     - Language preferences
   - **Device & Technology Profile**
     - Device categories (mobile/desktop/tablet)
     - Operating systems (iOS/Android/Windows/Mac)
     - Browser distribution
     - Screen resolutions

4. **User Behavior Analysis (Priority #2)**
   - **Engagement Metrics (from Clarity)**
     - Scroll depth patterns
     - Engagement time distribution
     - Rage clicks and dead clicks
     - Popular interaction areas
   - **App Usage Patterns (from GA4)**
     - Total comparisons made
     - Completion rates vs early exits
     - Feature usage: previews, exports, shares
     - Session duration and pages per session

5. **Content & Performance**
   - Top performing albums/songs
   - User flow through the app
   - Technical performance metrics
   - Error rates and issues

6. **Adjust for Test Traffic**
   - Exclude Santa Clara test traffic from calculations
   - Note both raw and adjusted metrics where applicable

7. **Create Report File**
   - Check if analytics-reports directory structure exists (only create if missing)
   - Organize by report type in subfolders:
     - Daily: `analytics-reports/daily/YYYY-MM-DD-daily.md`
     - Weekly: `analytics-reports/weekly/YYYY-MM-DD-weekly.md`
     - Biweekly: `analytics-reports/biweekly/YYYY-MM-DD-biweekly.md`
     - Monthly: `analytics-reports/monthly/YYYY-MM-DD-monthly.md`
   - Use today's date for the filename
   - Include report type in filename

8. **Report Sections to Include**
   - Executive Summary (combined GA4 + Clarity insights)
   - User Profile Analysis (who are the users)
   - User Behavior Insights (what they do)
   - Engagement Quality Metrics (Clarity-specific)
   - Content Performance
   - Technical Performance
   - Cross-Platform Insights (GA4 vs Clarity discrepancies)
   - Opportunities & Recommendations
   - Data Collection Notes

6. **Special Considerations**
   - Compare to previous report if one exists from last week
   - Calculate week-over-week growth percentages
   - Highlight significant changes or trends
   - Note any data anomalies or tracking issues

## Example Usage:
- `/project:analytics-report` - Generate daily report (default)
- `/project:analytics-report daily` - Explicitly generate daily report
- `/project:analytics-report weekly` - Generate weekly report (last 7 days)
- `/project:analytics-report biweekly` - Generate biweekly report (last 14 days)
- `/project:analytics-report monthly` - Generate monthly report (last 30 days)

## Report Organization:
Reports will be saved in subfolders by type:
```
analytics-reports/
├── daily/
│   ├── 2025-08-04-daily.md
│   └── 2025-08-05-daily.md
├── weekly/
│   ├── 2025-08-04-weekly.md
│   └── 2025-08-11-weekly.md
├── biweekly/
│   └── 2025-08-04-biweekly.md
└── monthly/
    └── 2025-08-04-monthly.md
```

After generating the report, provide a brief summary of key findings and growth metrics.