import type { AgentBridge } from "../../electron/preload";

declare global {
  interface Window {
    agent: AgentBridge;
  }
}

export {};
