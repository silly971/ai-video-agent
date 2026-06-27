import { app, safeStorage } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import {
  createDefaultState,
  migrateAgentState,
  type AgentState,
} from "../src/shared/schema.js";

const ENCRYPTED_PREFIX = "safe:";

function defaultStorePath() {
  return path.join(app.getPath("userData"), "agent-state.json");
}

function encryptSecret(value: string) {
  if (!value || value.startsWith(ENCRYPTED_PREFIX)) return value;
  if (safeStorage.isEncryptionAvailable()) {
    return `${ENCRYPTED_PREFIX}${safeStorage.encryptString(value).toString("base64")}`;
  }
  return value;
}

function decryptSecret(value: string) {
  if (!value?.startsWith(ENCRYPTED_PREFIX)) return value;
  const payload = value.slice(ENCRYPTED_PREFIX.length);
  if (!safeStorage.isEncryptionAvailable()) return "";
  return safeStorage.decryptString(Buffer.from(payload, "base64"));
}

function mapSecrets(state: AgentState, fn: (value: string) => string): AgentState {
  return {
    ...state,
    settings: {
      ...state.settings,
      newApi: {
        ...state.settings.newApi,
        apiKey: fn(state.settings.newApi.apiKey),
      },
      seedance: {
        ...state.settings.seedance,
        apiKey: fn(state.settings.seedance.apiKey),
      },
    },
  };
}

export async function loadState(customPath?: string): Promise<AgentState> {
  const filePath = customPath ?? defaultStorePath();
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return mapSecrets(migrateAgentState(JSON.parse(raw)), decryptSecret);
  } catch {
    return createDefaultState();
  }
}

export async function saveState(state: AgentState, customPath?: string) {
  const filePath = customPath ?? defaultStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const encrypted = mapSecrets(state, encryptSecret);
  await fs.writeFile(filePath, `${JSON.stringify(encrypted, null, 2)}\n`, "utf-8");
}
