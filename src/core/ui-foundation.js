import { FOUNDATION_PHASES, createHostBridge } from "../contracts/framework-contracts.js";

function isValidBridge(candidate) {
  return (
    Boolean(candidate) &&
    typeof candidate === "object" &&
    typeof candidate.connect === "function" &&
    typeof candidate.disconnect === "function"
  );
}

/**
 * 第一階段基礎框架核心協調器：
 * 僅管理基礎框架生命週期與最小連接協調，不持有認知，不接管平台內容與運作。
 */
export function createUiFoundation(config = {}) {
  let phase = FOUNDATION_PHASES.IDLE;
  let bridge = isValidBridge(config?.bridge)
    ? config.bridge
    : createHostBridge({
        onSignal: (signal) => {
          if (typeof config?.onBridgeSignal === "function") {
            config.onBridgeSignal(signal);
          }
        },
      });
  const listeners = new Set();

  function setPhase(nextPhase) {
    const prevPhase = phase;
    phase = nextPhase;
    for (const listener of listeners) {
      listener({ prevPhase, nextPhase: phase });
    }
  }

  return {
    getPhase() {
      return phase;
    },

    onPhaseChange(listener) {
      if (typeof listener !== "function") {
        return () => {};
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    init(initOptions = {}) {
      if (phase === FOUNDATION_PHASES.DISPOSED) {
        throw new Error("Cannot initialize a disposed UI foundation instance.");
      }
      if (phase === FOUNDATION_PHASES.IDLE) {
        if (isValidBridge(initOptions?.bridge)) {
          bridge = initOptions.bridge;
        }
        setPhase(FOUNDATION_PHASES.INITIALIZED);
      }
      return phase;
    },

    start(startTarget = null) {
      if (phase === FOUNDATION_PHASES.DISPOSED) {
        throw new Error("Cannot start a disposed UI foundation instance.");
      }
      if (phase === FOUNDATION_PHASES.IDLE) {
        this.init();
      }
      if (phase === FOUNDATION_PHASES.INITIALIZED) {
        bridge.connect(startTarget);
        setPhase(FOUNDATION_PHASES.RUNNING);
      }
      return phase;
    },

    connectBridge(nextBridge) {
      if (!isValidBridge(nextBridge)) {
        throw new Error("Invalid bridge provided to connectBridge.");
      }
      bridge = nextBridge;
      return bridge;
    },

    getBridge() {
      return bridge;
    },

    sendSignal(type, detail = undefined) {
      if (phase !== FOUNDATION_PHASES.RUNNING) {
        return false;
      }
      if (typeof bridge.emitSignal !== "function") {
        return false;
      }
      return bridge.emitSignal(type, detail);
    },

    dispose() {
      if (phase !== FOUNDATION_PHASES.DISPOSED) {
        bridge.disconnect();
        listeners.clear();
        setPhase(FOUNDATION_PHASES.DISPOSED);
      }
      return phase;
    },
  };
}

