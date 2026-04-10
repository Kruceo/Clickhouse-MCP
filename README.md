# Clickhouse MCP

## First Steps 

You will need to register your Clickhouse Database, we need this to not pass any credential to the AI Agent, just a generic ID.

```bash
bunx kruceo/clickhouse-mcp register
```

It will return a UUID. Remember this.

## Kilo Code example

```json
// .kilo/kilo.json
{
  "$schema": "https://app.kilo.ai/config.json",
  "mcp": {
    "clickhouse": {
      "type": "local",
      "command": [
        "bunx",
        "kruceo/clickhouse-mcp"
      ],
      "environment": {
        "ALLOW_WRITE": true,
        // Here you will put your returned UUID
        "DB_ID": "aa4f2ac6-38bb-4fcb-810e-1a35511a093a"
      }
    }
  }
}
```