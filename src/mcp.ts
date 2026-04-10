import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@clickhouse/client";
import { z } from "zod";
import { getDatabase } from "./config.ts";

export async function startMcp(): Promise<void> {
  const dbId = process.env.DB_ID;
  if (!dbId) {
    console.error("Error: DB_ID environment variable is required for MCP server mode.");
    process.exit(1);
  }

  const entry = getDatabase(dbId);
  if (!entry) {
    console.error(`Error: No database registered with ID "${dbId}". Run 'bun src/index.ts list' to see registered databases.`);
    process.exit(1);
  }

  const allowWrite = process.env.ALLOW_WRITE === "true";

  const client = createClient({
    url: `${entry.host}:${entry.port}`,
    database: entry.database,
    username: entry.username,
    password: entry.password,
  });

  const READ_KEYWORDS = new Set([
    "SELECT",
    "SHOW",
    "DESCRIBE",
    "EXPLAIN",
    "WITH",
  ]);

  function isReadOnlyQuery(sql: string): boolean {
    const firstWord = sql.trim().split(/\s+/)[0]?.toUpperCase();
    return READ_KEYWORDS.has(firstWord ?? "");
  }

  const server = new McpServer({
    name: "clickhouse",
    version: "0.0.0",
  });

  server.tool(
    "query",
    "Execute a SQL query on ClickHouse",
    { query: z.string() },
    async ({ query }) => {
      if (!isReadOnlyQuery(query) && !allowWrite) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Write queries are not allowed. Set ALLOW_WRITE=true to enable INSERT, ALTER, DROP, CREATE, DELETE, TRUNCATE, OPTIMIZE, and other modification queries.",
            },
          ],
          isError: true,
        };
      }

      try {
        if (isReadOnlyQuery(query)) {
          const result = await client.query({
            query,
            format: "JSONEachRow",
          });
          const rows = await result.json();
          return {
            content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
          };
        } else {
          await client.exec({ query });
          return {
            content: [{ type: "text" as const, text: "Query executed successfully." }],
          };
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `ClickHouse error: ${message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "list_databases",
    "List all databases in ClickHouse",
    {},
    async () => {
      try {
        const result = await client.query({
          query: "SHOW DATABASES",
          format: "JSONEachRow",
        });
        const rows = await result.json();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `ClickHouse error: ${message}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "list_tables",
    "List tables in a ClickHouse database",
    { database: z.string().optional() },
    async ({ database: db }) => {
      const targetDb = db || entry.database;
      try {
        const result = await client.query({
          query: "SELECT name, engine, total_rows, total_bytes FROM system.tables WHERE database = {db:String}",
          query_params: { db: targetDb },
          format: "JSONEachRow",
        });
        const rows = await result.json();
        return {
          content: [{ type: "text" as const, text: JSON.stringify(rows, null, 2) }],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text" as const, text: `ClickHouse error: ${message}` }],
          isError: true,
        };
      }
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
