# Generate Kanye Ranker Analytics Report

Please generate a comprehensive Google Analytics report for the Kanye Ranker app using the following parameters: $ARGUMENTS

## Instructions:

1. **Connect to Google Analytics**
   - Use the analytics-mcp server to access GA4 property ID: 498617351
   - Default to last 30 days unless a different date range is specified in arguments

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
   - Save to `analytics-reports/YYYY-MM-DD-report.md`
   - Use today's date for the filename
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
- `/project:analytics-report` - Generate report for last 30 days
- `/project:analytics-report last 7 days` - Generate weekly report
- `/project:analytics-report compare to 2025-08-04` - Generate with comparison to specific date

After generating the report, provide a brief summary of key findings and growth metrics.