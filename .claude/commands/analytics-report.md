# Generate Kanye Ranker Analytics Report

Please generate a comprehensive Google Analytics report for the Kanye Ranker app.

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

2. **Connect to Google Analytics**
   - Use the analytics-mcp server to access GA4 property ID: 498617351
   - Use the appropriate date range based on report type

2. **Gather Key Metrics**
   - User metrics: Total users, sessions, new vs returning
   - Engagement: Total comparisons, completion rates, skip rates
   - Feature usage: Previews, exports, shares, feedback
   - Geographic and device distribution
   - Top performing content (albums/songs)
   - User flow and behavior patterns

3. **Adjust for Test Traffic**
   - Exclude Santa Clara test traffic from calculations
   - Note both raw and adjusted metrics where applicable

4. **Create Report File**
   - Check if analytics-reports directory structure exists (only create if missing)
   - Organize by report type in subfolders:
     - Daily: `analytics-reports/daily/YYYY-MM-DD-daily.md`
     - Weekly: `analytics-reports/weekly/YYYY-MM-DD-weekly.md`
     - Biweekly: `analytics-reports/biweekly/YYYY-MM-DD-biweekly.md`
     - Monthly: `analytics-reports/monthly/YYYY-MM-DD-monthly.md`
   - Use today's date for the filename
   - Include report type in filename
   - Include all sections from the baseline report template

5. **Report Sections to Include**
   - Executive Summary
   - Key Performance Indicators (KPIs)
   - User Behavior Analysis
   - Content Performance
   - Technical Performance
   - Opportunities & Insights
   - Comparison to Previous Report (if exists)
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