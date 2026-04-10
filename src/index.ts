import { register, list, deleteCmd, help } from "./cli.ts";
import { startMcp } from "./mcp.ts";

const command = process.argv[2];

switch (command) {
  case "register":
    await register();
    break;
  case "list":
    await list();
    break;
  case "delete":
    await deleteCmd(process.argv[3] ?? "");
    break;
  case "help":
  case "--help":
  case "-h":
    help();
    break;
  default:
    await startMcp();
    break;
}
