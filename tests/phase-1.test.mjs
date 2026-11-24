import test from "node:test";
import assert from "node:assert/strict";

import {
  FOUNDATION_PHASES,
  validateFoundationContract,
  createHostBridge,
} from "../src/contracts/framework-contracts.js";
import { createUiFoundation } from "../src/core/ui-foundation.js";
import {
  ZizaiFoundationShell,
  createFoundationShellClass,
  registerFoundationShell,
} from "../src/components/zizai-foundation-shell.js";
import { bootstrapPhase1 } from "../src/main.js";

test("契約檢核：createUiFoundation 符合第一階段最小介面契約", () => {
  const foundation = createUiFoundation();
  const result = validateFoundationContract(foundation);
  assert.equal(result.valid, true);
  assert.deepEqual(result.missing, []);
  assert.equal(foundation.getPhase(), FOUNDATION_PHASES.IDLE);
});

test("生命週期與連接介面：init -> start -> sendSignal -> dispose", () => {
  const signals = [];
  const bridge = createHostBridge({
    onSignal: (sig) => signals.push(sig),
  });
  const foundation = createUiFoundation({ bridge });

  assert.equal(foundation.getBridge(), bridge);
  assert.equal(foundation.init(), FOUNDATION_PHASES.INITIALIZED);
  assert.equal(foundation.start("host-ref"), FOUNDATION_PHASES.RUNNING);
  assert.equal(bridge.isConnected(), true);
  assert.equal(bridge.getTarget(), "host-ref");

  const sent = foundation.sendSignal("ping", { source: "test" });
  assert.equal(sent, true);
  assert.equal(signals.length, 1);
  assert.deepEqual(signals[0], { type: "ping", detail: { source: "test" } });

  assert.equal(foundation.dispose(), FOUNDATION_PHASES.DISPOSED);
  assert.equal(bridge.isConnected(), false);
  assert.equal(foundation.sendSignal("after-dispose"), false);
  assert.throws(() => foundation.init(), /disposed/);
});

test("Bridge 連接一致性：未在 running 狀態時不發送訊號，dispose 後原 Bridge 斷線", () => {
  const received = [];
  const customBridge = createHostBridge({
    onSignal: (payload) => received.push(payload),
  });
  const foundation = createUiFoundation({ bridge: customBridge });

  assert.equal(foundation.sendSignal("before-start"), false);
  assert.equal(received.length, 0);

  foundation.start("platform-host");
  assert.equal(customBridge.isConnected(), true);
  assert.equal(foundation.sendSignal("ready", { phase: 1 }), true);
  assert.equal(received.length, 1);

  foundation.dispose();
  assert.equal(customBridge.isConnected(), false);
  assert.equal(customBridge.getTarget(), null);
});

test("啟動組裝：在無瀏覽器 DOM 環境下仍可完成核心啟動並回報狀態", () => {
  const { foundation, shellElement } = bootstrapPhase1({
    document: null,
    customElements: null,
  });

  assert.equal(foundation.getPhase(), FOUNDATION_PHASES.RUNNING);
  assert.equal(shellElement, null);
  foundation.dispose();
  assert.equal(foundation.getPhase(), FOUNDATION_PHASES.DISPOSED);
});

test("Node 環境載入與元件基底建立：不因 HTMLElement 未定義而失敗", () => {
  assert.equal(typeof ZizaiFoundationShell, "function");
  const ShellClass = createFoundationShellClass();
  const instance = new ShellClass();
  instance.connectedCallback();
  instance.setPhaseLabel("running");
  assert.equal(instance.getPhaseLabel(), "running");
  assert.match(instance.shadowRoot.innerHTML, /ZIZAI UI Framework/);
  assert.match(instance.shadowRoot.innerHTML, /Status: running/);
});

test("模擬 CustomElements 登錄與元件基本狀態", () => {
  const registryMap = new Map();
  const mockRegistry = {
    define(name, ctor) {
      registryMap.set(name, ctor);
    },
    get(name) {
      return registryMap.get(name);
    },
  };

  assert.equal(registerFoundationShell(mockRegistry), true);
  assert.equal(mockRegistry.get("zizai-foundation-shell"), ZizaiFoundationShell);
  assert.equal(registerFoundationShell(mockRegistry), true);
  assert.equal(registryMap.size, 1);
});

