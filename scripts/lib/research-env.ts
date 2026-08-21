import { existsSync, readFileSync } from "node:fs";

const DEFAULT_RADAR_URL = "https://i-yuri.com";
let devVarsLoaded = false;

export function parseDevVars(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

export function loadResearchEnv(): void {
  if (devVarsLoaded) return;
  devVarsLoaded = true;
  const path = process.env.YURI_DEV_VARS_PATH?.trim() || ".dev.vars";
  if (!existsSync(path)) return;
  for (const [name, value] of Object.entries(parseDevVars(readFileSync(path, "utf8")))) {
    if (!process.env[name]?.trim()) process.env[name] = value;
  }
}

export function requiredResearchEnv(name: string): string {
  loadResearchEnv();
  const aliases = name === "YURI_ADMIN_TOKEN" ? ["YURI_ADMIN_TOKEN", "ADMIN_TOKEN"] : [name];
  for (const alias of aliases) {
    const value = process.env[alias]?.trim();
    if (value) return value;
  }
  if (name === "YURI_RADAR_URL") return process.env.ADMIN_ORIGIN?.trim() || DEFAULT_RADAR_URL;
  throw new Error(`${name} is required`);
}
