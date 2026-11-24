import {
  bindOpenClose,
  syncOpenCloseState
} from "../../src/capabilities/open-close.js";
import { TestBasicUnit } from "../../src/components/test-basic-unit.js";

const summary = document.querySelector("#test-summary");
const results = document.querySelector("#test-results");
const independentTrigger = document.querySelector("#independent-trigger");
const independentPanel = document.querySelector("#independent-panel");
const combinedTrigger = document.querySelector("#combined-trigger");
const combinedPanel = document.querySelector("#combined-panel");

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  const item = document.createElement("li");
  item.dataset.result = condition ? "pass" : "fail";
  item.textContent = `${condition ? "通過" : "未通過"}：${name}${detail ? `（${detail}）` : ""}`;
  results.append(item);
  if (condition) passed += 1;
  else failed += 1;
}

try {
  let independentExpanded = false;
  let combinedExpanded = false;

  const independentBinding = bindOpenClose({
    trigger: independentTrigger,
    getExpanded: () => independentExpanded,
    onExpandedChange(nextExpanded) {
      independentExpanded = nextExpanded;
      independentPanel.hidden = !nextExpanded;
    }
  });

  const combinedBinding = bindOpenClose({
    trigger: combinedTrigger,
    getExpanded: () => combinedExpanded,
    onExpandedChange(nextExpanded) {
      combinedExpanded = nextExpanded;
      combinedPanel.hidden = !nextExpanded;
    }
  });

  if (!customElements.get("zizai-test-basic-unit")) {
    customElements.define("zizai-test-basic-unit", TestBasicUnit);
  }
  const existingUnit = document.createElement("zizai-test-basic-unit");
  document.querySelector("#existing-unit").append(existingUnit);

  check(
    "測試頁直接使用能力模組，不依賴平台啟動入口",
    !document.querySelector('script[src*="/src/main.js"]')
  );
  check(
    "各使用位置初始狀態由自身提供",
    !independentExpanded &&
      !combinedExpanded &&
      independentTrigger.getAttribute("aria-expanded") === "false" &&
      combinedTrigger.getAttribute("aria-expanded") === "false"
  );

  independentExpanded = true;
  independentPanel.hidden = false;
  syncOpenCloseState(independentTrigger, independentExpanded);
  check(
    "使用位置可在自行更新狀態後同步無障礙狀態",
    independentTrigger.getAttribute("aria-expanded") === "true"
  );
  independentExpanded = false;
  independentPanel.hidden = true;
  syncOpenCloseState(independentTrigger, independentExpanded);

  const originalIndependentContent = independentPanel.textContent;
  independentTrigger.click();
  check(
    "獨立使用位置可自行切換開啟，並由使用位置呈現內容",
    independentExpanded &&
      independentPanel.hidden === false &&
      independentTrigger.getAttribute("aria-expanded") === "true"
  );

  independentTrigger.click();
  check(
    "獨立使用位置可自行切換關閉",
    !independentExpanded &&
      independentPanel.hidden === true &&
      independentTrigger.getAttribute("aria-expanded") === "false"
  );

  combinedTrigger.click();
  const combinedBackground = getComputedStyle(combinedPanel).backgroundColor;
  check(
    "開合能力與共用外觀組合使用時均正常",
    combinedExpanded &&
      combinedPanel.hidden === false &&
      combinedTrigger.getAttribute("aria-expanded") === "true" &&
      combinedBackground !== "rgba(0, 0, 0, 0)"
  );

  check(
    "不同使用位置的操作狀態彼此獨立",
    combinedExpanded && !independentExpanded && independentPanel.hidden
  );
  check(
    "開合能力不接管或改寫使用位置的內容",
    independentPanel.textContent === originalIndependentContent &&
      combinedPanel.textContent.includes("自行持有的內容及狀態")
  );
  check(
    "既有基本單元可與開合及共用外觀並存",
    Boolean(existingUnit.shadowRoot?.querySelector('[data-role="test-basic-unit-content"]'))
  );

  independentBinding();
  const stateBeforeRemovedBindingClick = independentExpanded;
  independentTrigger.click();
  check(
    "能力連接可獨立移除，移除後不再接收操作",
    independentExpanded === stateBeforeRemovedBindingClick
  );

  let replacementExpanded = false;
  const replacementBinding = bindOpenClose({
    trigger: independentTrigger,
    getExpanded: () => replacementExpanded,
    onExpandedChange(nextExpanded) {
      replacementExpanded = nextExpanded;
      independentPanel.hidden = !nextExpanded;
    }
  });
  independentTrigger.click();
  check(
    "原連接移除後可替換為新的獨立連接",
    replacementExpanded &&
      independentPanel.hidden === false &&
      independentTrigger.getAttribute("aria-expanded") === "true"
  );

  replacementBinding();
  combinedBinding();

  summary.textContent = `測試結束：${passed} 項通過，${failed} 項未通過。`;
  summary.dataset.testStatus = failed === 0 ? "passed" : "failed";
} catch (error) {
  failed += 1;
  summary.textContent = `測試中止：${error instanceof Error ? error.message : String(error)}`;
  summary.dataset.testStatus = "failed";
  const item = document.createElement("li");
  item.dataset.result = "fail";
  item.textContent = summary.textContent;
  results.append(item);
}
