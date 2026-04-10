import crypto from "node:crypto";
import {
  intro,
  outro,
  text,
  password,
  confirm,
  isCancel,
  cancel,
  note,
  log,
} from "@clack/prompts";
import {
  readConfig,
  addDatabase,
  removeDatabase,
  type DatabaseEntry,
} from "./config.ts";

function handleCancel<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel("Operation cancelled.");
    process.exit(0);
  }
  return value;
}

export function help(): void {
  console.log(`
 ClickHouse MCP - ClickHouse database management

 Usage:
   bun src/index.ts <command> [args]

 Commands:
   register          Register a new ClickHouse database interactively
   list              List all registered databases
   delete <id>       Remove a database by ID
   help              Show this help

 MCP Server:
   bun src/index.ts  (no arguments)
                     Start the MCP server using DB_ID and ALLOW_WRITE from the environment
 `);
}

export async function register(): Promise<void> {
  intro("Register ClickHouse database");

  const name = handleCancel(
    await text({ message: "Database name", placeholder: "e.g. Production" }),
  );

  const host = handleCancel(
    await text({
      message: "Host",
      placeholder: "http://localhost",
      defaultValue: "http://localhost",
    }),
  );

  const portStr = handleCancel(
    await text({
      message: "Port",
      placeholder: "8123",
      defaultValue: "8123",
    }),
  );
  const port = parseInt(portStr, 10);

  const database = handleCancel(
    await text({
      message: "Database",
      placeholder: "default",
      defaultValue: "default",
    }),
  );

  const username = handleCancel(
    await text({
      message: "Username",
      placeholder: "default",
      defaultValue: "default",
    }),
  );

  const pwd = handleCancel(
    await password({ message: "Password" }),
  );

  const id = crypto.randomUUID();

  const entry: DatabaseEntry = {
    name,
    host,
    port,
    username,
    password: pwd,
    database,
  };

  addDatabase(id, entry);

  note(id, "Registered database ID");
  outro("Database registered successfully!");
}

export async function list(): Promise<void> {
  const config = readConfig();
  const entries = Object.entries(config.databases);

  if (entries.length === 0) {
    log.warn("No databases registered.");
    return;
  }

  intro("Registered databases");

  for (const [id, db] of entries) {
    note(
      [
        `Name:     ${db.name}`,
        `Host:     ${db.host}`,
        `Port:     ${db.port}`,
        `Database: ${db.database}`,
        `Username: ${db.username}`,
      ].join("\n"),
      id,
    );
  }

  outro(`${entries.length} database(s) found.`);
}

export async function deleteCmd(id: string): Promise<void> {
  if (!id) {
    log.error("Usage: bun src/index.ts delete <id>");
    process.exit(1);
  }

  const config = readConfig();
  const entry = config.databases[id];

  if (!entry) {
    log.error(`Database with ID "${id}" not found.`);
    process.exit(1);
  }

  intro(`Delete database "${entry.name}"`);

  const shouldDelete = handleCancel(
    await confirm({
      message: `Are you sure you want to remove "${entry.name}" (${id})?`,
    }),
  );

  if (!shouldDelete) {
    cancel("Operation cancelled.");
    process.exit(0);
  }

  removeDatabase(id);
  outro("Database removed successfully!");
}
