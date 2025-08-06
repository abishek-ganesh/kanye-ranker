# Kanye Ranker Scripts

This directory contains utility scripts for the Kanye Ranker project.

## MCP Configuration

The analytics tools are configured through MCP (Model Context Protocol) servers in Claude Code.

### Configuration Location
API tokens and server configurations are stored in:
```
~/.config/claude-code/mcp_servers.json
```

### Configured Services

| Service | MCP Server Name | Description |
|---------|-----------------|-------------|
| Microsoft Clarity | `clarity-kanye` | Kanye Ranker project analytics |
| Google Analytics | `analytics-mcp` | GA4 data access |

### Analytics Setup

The following analytics services are configured:
- **Google Analytics 4**: Property ID 498617351
- **Microsoft Clarity**: Project ID spowj2ipam

Both services are accessed through their respective MCP servers which handle authentication automatically.

## Security Notes

- API tokens are stored in the MCP configuration file
- The MCP config file should not be shared or committed to version control
- Tokens should have minimal required permissions
- Rotate tokens periodically for security

## Analytics Reports

For Claude Code users, the `/analytics-report` command automatically uses the configured MCP servers to generate comprehensive analytics reports combining GA4 and Clarity data.

Report types available:
- Daily: `/analytics-report` or `/analytics-report daily`
- Weekly: `/analytics-report weekly`
- Monthly: `/analytics-report monthly`

Reports are saved to the `analytics-reports/` directory (gitignored for privacy).