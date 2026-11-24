import {
  bindDropdown,
  syncDropdownState
} from "../../src/capabilities/dropdown.js";
import { bindOpenClose } from "../../src/capabilities/open-close.js";
import { TestBasicUnit } from "../../src/components/test-basic-unit.js";

const summary = document.querySelector("#test-summary");
const results = document.querySelector("#test-results");

const triggerA = document.querySelector("#trigger-a");
const menuA = document.querySelector("#menu-a");
const selectedAOutput = document.querySelector("#selected-a");
const triggerB = document.querySelector("#trigger-b");
const menuB = document.querySelector("#menu-b");
const selectedBOutput = document.querySelector("#selected-b");
const combinedTrigger = document.querySelector("#combined-trigger");
const combinedMenu = document.querySelector("#combined-menu");
const openCloseTrigger = document.querySelector("#open-close-trigger");
const openClosePanel = document.querySelector("#open-close-panel");

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
  // Each usage position owns its own content and all of its state.
  let expandedA = false;
  let selectedA = "";
  let expandedB = false;
  let selectedB = "";
  let combinedExpanded = false;
  let openCloseExpanded = false;
  let oldBindingCallbackCalls = 0;
  const contentABefore = menuA.innerHTML;
  const contentBBefore = menuB.innerHTML;

  const bindingA = bindDropdown({
    trigger: triggerA,
    menu: menuA,
    getExpanded: () => expandedA,
    onExpandedChange(nextExpanded) {
      oldBindingCallbackCalls += 1;
      expandedA = nextExpanded;
      menuA.hidden = !nextExpanded;
    },
    onSelect(value) {
      oldBindingCallbackCalls += 1;
      selectedA = value;
      selectedAOutput.textContent = value;
      expandedA = false;
      menuA.hidden = true;
      syncDropdownState(triggerA, expandedA);
    }
  });

  const bindingB = bindDropdown({
    trigger: triggerB,
    menu: menuB,
    getExpanded: () => expandedB,
    onExpandedChange(nextExpanded) {
      expandedB = nextExpanded;
      menuB.hidden = !nextExpanded;
    },
    onSelect(value) {
      selectedB = value;
      selectedBOutput.textContent = value;
      expandedB = false;
      menuB.hidden = true;
      syncDropdownState(triggerB, expandedB);
    }
  });

  const combinedBinding = bindDropdown({
    trigger: combinedTrigger,
    menu: combinedMenu,
    getExpanded: () => combinedExpanded,
    onExpandedChange(nextExpanded) {
      combinedExpanded = nextExpanded;
      combinedMenu.hidden = !nextExpanded;
    },
    onSelect() {}
  });

  const openCloseBinding = bindOpenClose({
    trigger: openCloseTrigger,
    getExpanded: () => openCloseExpanded,
    onExpandedChange(nextExpanded) {
      openCloseExpanded = nextExpanded;
      openClosePanel.hidden = !nextExpanded;
    }
  });

  if (!customElements.get("zizai-test-basic-unit")) {
    customElements.define("zizai-test-basic-unit", TestBasicUnit);
  }
  const existingUnit = document.createElement("zizai-test-basic-unit");
  document.querySelector("#existing-unit").append(existingUnit);

  check(
    "測試頁直接載入能力模組，不依賴平台啟動入口",
    !document.querySelector('script[src*="/src/main.js"]')
  );
  check(
    "兩個使用位置各自提供開合狀態並完成初始同步",
    !expandedA && !expandedB &&
      triggerA.getAttribute("aria-expanded") === "false" &&
      triggerB.getAttribute("aria-expanded") === "false" &&
      menuA.hidden && menuB.hidden
  );
  check(
    "兩個使用位置各自持有不同選項內容",
    menuA.textContent.includes("需求定位") &&
      !menuA.textContent.includes("專案資訊") &&
      menuB.textContent.includes("專案資訊") &&
      !menuB.textContent.includes("需求定位")
  );

  triggerA.click();
  check(
    "操作使用位置 A 只改變 A 自身開合狀態",
    expandedA && !menuA.hidden &&
      triggerA.getAttribute("aria-expanded") === "true"
  );
  check(
    "操作使用位置 A 不改變 B 的內容與狀態",
    !expandedB && menuB.hidden &&
      triggerB.getAttribute("aria-expanded") === "false" &&
      menuB.innerHTML === contentBBefore
  );

  triggerB.click();
  check(
    "使用位置 B 可獨立開啟，且 A 狀態不被接管",
    expandedB && !menuB.hidden && expandedA && !menuA.hidden
  );

  menuA.querySelector('[data-dropdown-option="架構確認"]').click();
  check(
    "A 的選項值交由 A 自行接收及保存",
    selectedA === "架構確認" &&
      selectedAOutput.textContent === "架構確認" &&
      !expandedA && menuA.hidden &&
      triggerA.getAttribute("aria-expanded") === "false"
  );
  check(
    "A 的選取不改變 B 自身的選項內容及選取狀態",
    selectedB === "" &&
      selectedBOutput.textContent === "尚未選取" &&
      menuB.innerHTML === contentBBefore &&
      expandedB && !menuB.hidden
  );

  menuB.querySelector('[data-dropdown-option="工作紀錄"]').click();
  check(
    "B 的選項值由 B 自行接收及保存",
    selectedB === "工作紀錄" &&
      selectedBOutput.textContent === "工作紀錄" &&
      !expandedB && menuB.hidden &&
      triggerB.getAttribute("aria-expanded") === "false"
  );

  combinedTrigger.click();
  openCloseTrigger.click();
  const combinedBackground = getComputedStyle(combinedMenu).backgroundColor;
  check(
    "下拉選單與共用外觀、既有開合能力組合時互不干擾",
    combinedExpanded && !combinedMenu.hidden &&
      combinedTrigger.getAttribute("aria-expanded") === "true" &&
      combinedBackground !== "rgba(0, 0, 0, 0)" &&
      openCloseExpanded && !openClosePanel.hidden &&
      openCloseTrigger.getAttribute("aria-expanded") === "true"
  );

  check(
    "下拉選單能力不改寫使用位置自行提供的選項內容",
    menuA.innerHTML === contentABefore &&
      menuB.innerHTML === contentBBefore
  );
  check(
    "既有基本單元可與下拉選單及其他能力並存",
    Boolean(existingUnit.shadowRoot?.querySelector('[data-role="test-basic-unit-content"]'))
  );

  bindingA();
  const expandedABeforeRemovalClick = expandedA;
  const oldCallbackCountBeforeRemovalClick = oldBindingCallbackCalls;
  triggerA.click();
  const selectedABeforeRemovalClick = selectedA;
  menuA.querySelector('[data-dropdown-option="需求定位"]').click();
  check(
    "連接可獨立移除，移除後觸發及選項事件均不再呼叫舊回呼",
    expandedA === expandedABeforeRemovalClick &&
      selectedA === selectedABeforeRemovalClick &&
      oldBindingCallbackCalls === oldCallbackCountBeforeRemovalClick
  );

  let replacementExpanded = false;
  let replacementSelection = "";
  const replacementBinding = bindDropdown({
    trigger: triggerA,
    menu: menuA,
    getExpanded: () => replacementExpanded,
    onExpandedChange(nextExpanded) {
      replacementExpanded = nextExpanded;
      menuA.hidden = !nextExpanded;
    },
    onSelect(value) {
      replacementSelection = value;
      replacementExpanded = false;
      menuA.hidden = true;
      syncDropdownState(triggerA, replacementExpanded);
    }
  });
  triggerA.click();
  menuA.querySelector('[data-dropdown-option="需求定位"]').click();
  check(
    "移除後可替換為新連接，僅新回呼接收操作",
    !replacementExpanded &&
      replacementSelection === "需求定位" &&
      menuA.hidden &&
      oldBindingCallbackCalls === oldCallbackCountBeforeRemovalClick
  );

  replacementBinding();
  bindingB();
  combinedBinding();
  openCloseBinding();

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
