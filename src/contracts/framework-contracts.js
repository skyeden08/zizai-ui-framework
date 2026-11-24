export const FOUNDATION_PHASES = Object.freeze({
  IDLE: "idle",
  INITIALIZED: "initialized",
  RUNNING: "running",
  DISPOSED: "disposed",
});

export const FOUNDATION_EVENTS = Object.freeze({
  LIFECYCLE_CHANGED: "zizai:ui:lifecycle-changed",
  BRIDGE_SIGNAL: "zizai:ui:bridge-signal",
});

/**
 * 驗證基礎框架協調器是否符合第一階段最小介面契約。
 * @param {object} instance
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateFoundationContract(instance) {
  const requiredMethods = ["getPhase", "init", "start", "dispose", "connectBridge"];
  if (!instance || typeof instance !== "object") {
    return { valid: false, missing: requiredMethods };
  }
  const missing = requiredMethods.filter((method) => typeof instance[method] !== "function");
  return { valid: missing.length === 0, missing };
}

/**
 * 建立最小連接介面（供框架與外部/平台端透過明確介面溝通，不接管平台內容與運作）。
 * @param {object} [options]
 * @param {(payload: { type: string, detail?: unknown }) => void} [options.onSignal]
 */
export function createHostBridge(options = {}) {
  let connected = false;
  let target = null;
  const onSignal = typeof options.onSignal === "function" ? options.onSignal : null;

  return {
    connect(nextTarget = null) {
      target = nextTarget;
      connected = true;
      return true;
    },
    disconnect() {
      target = null;
      connected = false;
      return true;
    },
    isConnected() {
      return connected;
    },
    getTarget() {
      return target;
    },
    emitSignal(type, detail = undefined) {
      if (!connected || typeof type !== "string" || type.trim() === "") {
        return false;
      }
      if (onSignal) {
        onSignal({ type, detail });
      }
      return true;
    },
  };
}

