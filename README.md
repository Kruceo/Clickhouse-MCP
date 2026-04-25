# Clickhouse MCP Vault Vault

## First Steps 

You will need to register your Clickhouse Database, we need this to not pass any credential to the AI Agent, just a generic ID.

```bash
bunx clickhouse-mcp-vault register
```

It will return a UUID. Remember this.

## Opencode example

```json
// .config/opencode/opencode.jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "disabled_providers": [],
  "mcp": {
    "clickhouse-atplus": {
      "type": "local",
      "command": ["bunx", "clickhouse-mcp-vault"],
      "enabled": true,
      "environment": {
        "DB_ID": "c73c1049-977c-475f-8c00-4fad53ab119c",
      },
    },
  },
  "provider": {}
}
```

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
        "click-mcp"
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