import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const CONFIG_DIR = path.join(os.homedir(), ".clickhouse-mcp-vault");
const KEY_PATH = path.join(CONFIG_DIR, ".key");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.enc");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

export interface DatabaseEntry {
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface Config {
  databases: Record<string, DatabaseEntry>;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function getOrCreateKey(): Buffer {
  ensureConfigDir();
  if (fs.existsSync(KEY_PATH)) {
    return Buffer.from(fs.readFileSync(KEY_PATH));
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(KEY_PATH, key);
  fs.chmodSync(KEY_PATH, 0o600);
  return key;
}

function encrypt(data: string, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(data, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

function decrypt(blob: Buffer, key: Buffer): string {
  const iv = blob.subarray(0, IV_LENGTH);
  const authTag = blob.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = blob.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

export function readConfig(): Config {
  const key = getOrCreateKey();
  if (!fs.existsSync(CONFIG_PATH)) {
    return { databases: {} };
  }
  const blob = fs.readFileSync(CONFIG_PATH);
  const json = decrypt(blob, key);
  return JSON.parse(json) as Config;
}

export function writeConfig(config: Config): void {
  const key = getOrCreateKey();
  const json = JSON.stringify(config, null, 2);
  const blob = encrypt(json, key);
  fs.writeFileSync(CONFIG_PATH, blob);
}

export function getDatabase(id: string): DatabaseEntry | undefined {
  const config = readConfig();
  return config.databases[id];
}

export function addDatabase(id: string, entry: DatabaseEntry): void {
  const config = readConfig();
  config.databases[id] = entry;
  writeConfig(config);
}

export function removeDatabase(id: string): boolean {
  const config = readConfig();
  if (!config.databases[id]) return false;
  delete config.databases[id];
  writeConfig(config);
  return true;
}
