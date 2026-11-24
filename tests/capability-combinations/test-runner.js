import { bindOpenClose } from "../../src/capabilities/open-close.js";
import { bindDropdown } from "../../src/capabilities/dropdown.js";
import { bindDragAdjustment } from "../../src/capabilities/drag-adjustment.js";

const summary = document.querySelector("#test-summary");
const results = document.querySelector("#test-results");

const capabilityNames = {
  appearance: "共用外觀",
  openClose: "開合",
  dropdown: "下拉選單",
  drag: "拖曳調整"
};

const matrix = [
  ["A-OC", ["appearance", "openClose"]],
  ["A-DD", ["appearance", "dropdown"]],
  ["A-DA", ["appearance", "drag"]],
  ["OC-DD", ["openClose", "dropdown"]],
  ["OC-DA", ["openClose", "drag"]],
  ["DD-DA", ["dropdown", "drag"]],
  ["A-OC-DD", ["appearance", "openClose", "dropdown"]],
  ["A-OC-DA", ["appearance", "openClose", "drag"]],
  ["A-DD-DA", ["appearance", "dropdown", "drag"]],
  ["OC-DD-DA", ["openClose", "dropdown", "drag"]],
  ["A-OC-DD-DA", ["appearance", "openClose", "dropdown", "drag"]]
];

let totalPassed = 0;
let totalFailed = 0;
let casePassed = 0;
let caseFailed = 0;

function createPointerEvent(type, pointerId, clientX) {
  return new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId,
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
    clientX
  });
}

function runCase(caseId, capabilities) {
  const caseItem = document.createElement("li");
  caseItem.className = "case";
  caseItem.dataset.caseId = caseId;

  const heading = document.createElement("div");
  heading.className = "case-heading";
  const title = document.createElement("strong");
  title.textContent = `${caseId}：${capabilities.map((key) => capabilityNames[key]).join(" + ")}`;
  const status = document.createElement("span");
  status.className = "case-status";
  status.textContent = "執行中";
  heading.append(title, status);

  const checks = document.createElement("ul");
  checks.className = "case-checks";
  caseItem.append(heading, checks);
  results.append(caseItem);

  let localPassed = 0;
  let localFailed = 0;
  const bindings = [];
  const callbackCounts = { openClose: 0, dropdown: 0, drag: 0 };
  const fixture = document.createElement("section");
  fixture.className = "fixture";
  fixture.dataset.fixtureFor = caseId;
  fixture.setAttribute("aria-label", `${caseId} 獨立測試情境`);
  caseItem.append(fixture);

  function record(category, description, condition, connectionPoint = "本組合使用位置") {
    const item = document.createElement("li");
    item.dataset.result = condition ? "pass" : "fail";
    item.textContent = `${condition ? "通過" : "未通過"}：${category}｜${description}${condition ? "" : `｜定位：${caseId}／${connectionPoint}`}`;
    checks.append(item);
    if (condition) {
      localPassed += 1;
      totalPassed += 1;
    } else {
      localFailed += 1;
      totalFailed += 1;
    }
  }

  const state = {
    openExpanded: false,
    dropdownExpanded: false,
    selected: "",
    width: 160,
    dragStartWidth: 160
  };

  let openTrigger;
  let openContent;
  let dropdownTrigger;
  let dropdownMenu;
  let dropdownOption;
  let dragHandle;
  let dragPanel;
  let appearanceProbe;

  if (capabilities.includes("appearance")) {
    appearanceProbe = document.createElement("div");
    appearanceProbe.className = "appearance-probe";
    appearanceProbe.textContent = `${caseId} 共用外觀使用位置`;
    fixture.append(appearanceProbe);
  }

  if (capabilities.includes("openClose")) {
    openTrigger = document.createElement("button");
    openTrigger.type = "button";
    openTrigger.textContent = "切換開合內容";
    openContent = document.createElement("div");
    openContent.className = "probe-panel";
    openContent.textContent = `${caseId} 開合內容由使用位置持有`;
    openContent.hidden = true;
    fixture.append(openTrigger, openContent);

    bindings.push(bindOpenClose({
      trigger: openTrigger,
      getExpanded: () => state.openExpanded,
      onExpandedChange(nextExpanded) {
        callbackCounts.openClose += 1;
        state.openExpanded = nextExpanded;
        openContent.hidden = !nextExpanded;
      }
    }));
  }

  if (capabilities.includes("dropdown")) {
    dropdownTrigger = document.createElement("button");
    dropdownTrigger.type = "button";
    dropdownTrigger.textContent = "切換下拉選單";
    dropdownMenu = document.createElement("div");
    dropdownMenu.className = "probe-panel";
    dropdownMenu.hidden = true;
    dropdownOption = document.createElement("button");
    dropdownOption.type = "button";
    dropdownOption.dataset.dropdownOption = `${caseId}-option`;
    dropdownOption.textContent = `${caseId} 自有選項`;
    dropdownMenu.append(dropdownOption);
    fixture.append(dropdownTrigger, dropdownMenu);

    bindings.push(bindDropdown({
      trigger: dropdownTrigger,
      menu: dropdownMenu,
      getExpanded: () => state.dropdownExpanded,
      onExpandedChange(nextExpanded) {
        callbackCounts.dropdown += 1;
        state.dropdownExpanded = nextExpanded;
        dropdownMenu.hidden = !nextExpanded;
      },
      onSelect(value) {
        callbackCounts.dropdown += 1;
        state.selected = value;
        state.dropdownExpanded = false;
        dropdownMenu.hidden = true;
        dropdownTrigger.setAttribute("aria-expanded", "false");
      }
    }));
  }

  if (capabilities.includes("drag")) {
    const dragRow = document.createElement("div");
    dragRow.className = "drag-row";
    dragPanel = document.createElement("div");
    dragPanel.className = "probe-panel";
    dragPanel.style.width = `${state.width}px`;
    dragPanel.textContent = `${caseId} 拖曳使用位置內容`;
    dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "drag-handle";
    dragHandle.setAttribute("aria-label", "拖曳調整寬度");
    // The browser normally provides pointer capture. A deterministic stub is used
    // only because this runner dispatches synthetic pointer events.
    dragHandle.setPointerCapture = () => {};
    dragRow.append(dragPanel, dragHandle);
    fixture.append(dragRow);

    bindings.push(bindDragAdjustment({
      handle: dragHandle,
      onDragStart() {
        state.dragStartWidth = state.width;
      },
      onDrag({ deltaX }) {
        callbackCounts.drag += 1;
        state.width = state.dragStartWidth + deltaX;
        dragPanel.style.width = `${state.width}px`;
      }
    }));
  }

  const originalOpenContent = openContent?.textContent;
  const originalDropdownContent = dropdownMenu?.textContent;
  const originalDragContent = dragPanel?.textContent;

  // Initial state is supplied and retained by this usage position.
  if (capabilities.includes("openClose")) {
    record("狀態", "開合初始狀態由使用位置持有", !state.openExpanded && openContent.hidden && openTrigger.getAttribute("aria-expanded") === "false", "開合 trigger ↔ 使用位置狀態／內容");
  }
  if (capabilities.includes("dropdown")) {
    record("狀態", "下拉開合及選取狀態由使用位置持有", !state.dropdownExpanded && state.selected === "" && dropdownMenu.hidden && dropdownTrigger.getAttribute("aria-expanded") === "false", "下拉 trigger/menu ↔ 使用位置狀態");
  }
  if (capabilities.includes("drag")) {
    record("狀態", "拖曳寬度由使用位置持有", state.width === 160 && dragPanel.style.width === "160px", "拖曳回呼 ↔ 使用位置寬度");
  }

  // Exercise each capability's own event path.
  if (capabilities.includes("openClose")) openTrigger.click();
  if (capabilities.includes("dropdown")) {
    dropdownTrigger.click();
    dropdownOption.click();
  }
  if (capabilities.includes("drag")) {
    dragHandle.dispatchEvent(createPointerEvent("pointerdown", 100 + matrix.findIndex(([id]) => id === caseId), 20));
    dragHandle.dispatchEvent(createPointerEvent("pointermove", 100 + matrix.findIndex(([id]) => id === caseId), 45));
    dragHandle.dispatchEvent(createPointerEvent("pointerup", 100 + matrix.findIndex(([id]) => id === caseId), 45));
  }

  // Verify that each interaction stayed inside its own capability boundary.
  if (capabilities.includes("openClose")) {
    record("事件／狀態", "開合 click 只更新自身狀態及 aria-expanded", state.openExpanded && !openContent.hidden && openTrigger.getAttribute("aria-expanded") === "true", "開合 click ↔ 開合回呼");
  }
  if (capabilities.includes("dropdown")) {
    record("事件／狀態", "下拉 click 與選項事件只更新自身選取及開合狀態", state.selected === `${caseId}-option` && !state.dropdownExpanded && dropdownMenu.hidden && dropdownTrigger.getAttribute("aria-expanded") === "false", "下拉 trigger/menu click ↔ 下拉回呼");
  }
  if (capabilities.includes("drag")) {
    record("事件／狀態", "pointer 事件只回報位移並由使用位置套用寬度", state.width === 185 && dragPanel.style.width === "185px", "拖曳把手 pointerdown/move/up ↔ 拖曳回呼");
  }
  if (capabilities.includes("appearance")) {
    const actualColor = getComputedStyle(appearanceProbe).color;
    const actualBackground = getComputedStyle(appearanceProbe).backgroundColor;
    record("樣式", "共用 CSS Variables 可在組合使用位置套用", Boolean(actualColor && actualBackground && actualBackground !== "rgba(0, 0, 0, 0)"), "styles/variables.css ↔ 使用位置樣式");
  } else {
    record("樣式", "本組合未包含共用外觀，無跨能力樣式連接", true, "不適用");
  }

  const contentUnchanged =
    (!openContent || openContent.textContent === originalOpenContent) &&
    (!dropdownMenu || dropdownMenu.querySelector("[data-dropdown-option]")?.textContent === originalDropdownContent) &&
    (!dragPanel || dragPanel.textContent === originalDragContent);
  record("內容", "能力互動未改寫其他使用位置自行提供的內容", contentUnchanged, "能力回呼 ↔ 使用位置內容");

  const callbacksBeforeCleanup = { ...callbackCounts };
  for (const cleanup of bindings) cleanup();

  if (openTrigger) openTrigger.click();
  if (dropdownTrigger) dropdownTrigger.click();
  if (dropdownOption) dropdownOption.click();
  if (dragHandle) {
    const pointerId = 500 + matrix.findIndex(([id]) => id === caseId);
    dragHandle.dispatchEvent(createPointerEvent("pointerdown", pointerId, 10));
    dragHandle.dispatchEvent(createPointerEvent("pointermove", pointerId, 30));
    dragHandle.dispatchEvent(createPointerEvent("pointerup", pointerId, 30));
  }

  const lifecycleUnchanged =
    callbackCounts.openClose === callbacksBeforeCleanup.openClose &&
    callbackCounts.dropdown === callbacksBeforeCleanup.dropdown &&
    callbackCounts.drag === callbacksBeforeCleanup.drag;
  record("生命週期", "各能力連接可獨立解除，解除後事件不再呼叫原回呼", lifecycleUnchanged, "各能力 bind 回傳的 cleanup ↔ 各自元素事件");

  caseItem.dataset.status = localFailed === 0 ? "passed" : "failed";
  status.dataset.status = caseItem.dataset.status;
  status.textContent = localFailed === 0
    ? `通過（${localPassed}/${localPassed + localFailed}）`
    : `未通過（${localPassed}/${localPassed + localFailed}，${localFailed} 項失敗）`;
  if (localFailed === 0) casePassed += 1;
  else caseFailed += 1;

  fixture.remove();
}

try {
  for (const [caseId, capabilities] of matrix) runCase(caseId, capabilities);
  summary.textContent = `測試結束：${casePassed}/${matrix.length} 組合通過；檢查 ${totalPassed} 項通過、${totalFailed} 項未通過。`;
  summary.dataset.testStatus = totalFailed === 0 ? "passed" : "failed";
  summary.dataset.casePassed = String(casePassed);
  summary.dataset.caseFailed = String(caseFailed);
} catch (error) {
  summary.textContent = `測試中止：${error instanceof Error ? error.message : String(error)}`;
  summary.dataset.testStatus = "failed";
  const item = document.createElement("li");
  item.dataset.result = "fail";
  item.textContent = summary.textContent;
  results.append(item);
}
