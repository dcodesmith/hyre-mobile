#!/usr/bin/env node
/**
 * Updates .env for development.
 * Default: hosted API on fly.io.
 * Pass --local for localhost:3000 (iOS simulator reaches it directly;
 * Android emulator via `adb reverse tcp:3000`, run by the start scripts).
 *
 * Usage: node scripts/setup-simulator-env.js [--local]
 * Or: pnpm run setup:simulator
 */
const fs = require("node:fs");
const path = require("node:path");

const HOSTED_API_URL = "https://hyre-worker-nestjs.fly.dev";
const LOCAL_API_URL = "http://localhost:3000";

const useLocalApi = process.argv.includes("--local");
const apiUrl = useLocalApi ? LOCAL_API_URL : HOSTED_API_URL;
const envPath = path.join(__dirname, "..", ".env");

const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";

function setEnvValue(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  return `${content.trimEnd()}${content.trim() ? "\n" : ""}${line}\n`;
}

let content = setEnvValue(existing, "EXPO_PUBLIC_API_BASE_URL", apiUrl);
content = setEnvValue(content, "EXPO_PUBLIC_TRUSTED_ORIGIN", apiUrl);

fs.writeFileSync(envPath, content);
console.log(`Configured simulator API and trusted origin: ${apiUrl}`);
console.log("Start Expo with 'pnpm start:simulators' for changes to take effect.");
