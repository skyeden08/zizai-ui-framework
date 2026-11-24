import { bindDragAdjustment } from "../../src/capabilities/drag-adjustment.js";
import { bindOpenClose } from "../../src/capabilities/open-close.js";
import { bindDropdown } from "../../src/capabilities/dropdown.js";

const summary = document.querySelector("#test-summary");
const results = document.querySelector("#test-results");
const panelA = document.querySelector("#panel-a");
const panelB = document.querySelector("#panel-b");
const handleA = document.querySelector("#handle-a");
const handleB = document.querySelector("#handle-b");
const combinedPanel = document.querySelector("#combined-panel");
const combinedHandle = document.querySelector("#combined-handle");
const openCloseTrigger = document.querySelector("#open-close-trigger");
const openCloseContent = document.querySelector("#open-close-content");
const dropdownTrigger = document.querySelector("#dropdown-trigger");
const dropdownMenu = document.querySelector("#dropdown-menu");

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

function pointer(type, pointerId, clientX) {
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

function drag(handle, pointerId, startX, endX) {
  handle.dispatchEvent(pointer("pointerdown", pointerId, startX));
  const middleX = startX + (endX - startX) / 2;
  handle.dispatchEvent(pointer("pointermove", pointerId, middleX));
  handle.dispatchEvent(pointer("pointermove", pointerId, endX));
  handle.dispatchEvent(pointer("pointerup", pointerId, endX));
}

try {
  // Test-only pointer capture stubs allow deterministic synthetic pointer events.
  for (const handle of [handleA, handleB, combinedHandle]) {
    handle.setPointerCapture = () => {};
  }

  // Width values and style changes belong to each usage position, not the capability.
  let widthA = 180;
  let widthB = 240;
  let combinedWidth = 200;
  let dragStartWidthA = widthA;
  let dragStartWidthB = widthB;
  let dragStartCombinedWidth = combinedWidth;
  let expanded = false;
  let dropdownExpanded = false;
  let dragAEvents = 0;
  let dragBEvents = 0;
  let oldCallbackEvents = 0;

  const bindingA = bindDragAdjustment({
    handle: handleA,
    onDragStart() { dragStartWidthA = widthA; },
    onDrag({ deltaX }) {
      dragAEvents += 1;
      widthA = dragStartWidthA + deltaX;
      panelA.style.width = `${widthA}px`;
      document.querySelector("#width-a").textContent = `${widthA}px`;
    }
  });
  const bindingB = bindDragAdjustment({
    handle: handleB,
    onDragStart() { dragStartWidthB = widthB; },
    onDrag({ deltaX }) {
      dragBEvents += 1;
      widthB = dragStartWidthB + deltaX;
      panelB.style.width = `${widthB}px`;
      document.querySelector("#width-b").textContent = `${widthB}px`;
    }
  });
  const combinedBinding = bindDragAdjustment({
    handle: combinedHandle,
    onDragStart() { dragStartCombinedWidth = combinedWidth; },
    onDrag({ deltaX }) {
      combinedWidth = dragStartCombinedWidth + deltaX;
      combinedPanel.style.width = `${combinedWidth}px`;
      document.querySelector("#combined-width").textContent = `${combinedWidth}px`;
    }
  });
  const openCloseBinding = bindOpenClose({
    trigger: openCloseTrigger,
    getExpanded: () => expanded,
    onExpandedChange(next) {
      expanded = next;
      openCloseContent.hidden = !next;
    }
  });
  const dropdownBinding = bindDropdown({
    trigger: dropdownTrigger,
    menu: dropdownMenu,
    getExpanded: () => dropdownExpanded,
    onExpandedChange(next) {
      dropdownExpanded = next;
      dropdownMenu.hidden = !next;
    },
    onSelect() {}
  });

  check(
    "測試頁直接載入能力模組，不依賴平台啟動入口",
    !document.querySelector('script[src*="/src/main.js"]')
  );
  check(
    "兩個以上使用位置各自提供不同寬度狀態",
    widthA === 180 && widthB === 240 &&
      panelA.style.width === "180px" && panelB.style.width === "240px"
  );

  drag(handleA, 11, 100, 135);
  check(
    "拖曳 A 後由 A 自行保存並套用新寬度",
    widthA === 215 && panelA.style.width === "215px" &&
      document.querySelector("#width-a").textContent === "215px"
  );
  check(
    "拖曳 A 不改變 B 的寬度及狀態",
    widthB === 240 && panelB.style.width === "240px" && dragBEvents === 0
  );

  drag(handleB, 12, 300, 340);
  check(
    "拖曳 B 後由 B 自行保存並套用新寬度",
    widthB === 280 && panelB.style.width === "280px" &&
      document.querySelector("#width-b").textContent === "280px"
  );
  check(
    "拖曳 B 不改變 A 已保存的寬度",
    widthA === 215 && panelA.style.width === "215px"
  );

  const passiveTarget = document.createElement("div");
  passiveTarget.style.width = "321px";
  const passiveHandle = document.createElement("button");
  passiveHandle.setPointerCapture = () => {};
  let reportedDelta = 0;
  const passiveBinding = bindDragAdjustment({
    handle: passiveHandle,
    onDrag({ deltaX }) { reportedDelta = deltaX; }
  });
  drag(passiveHandle, 17, 10, 35);
  check(
    "能力只回報拖曳位移，不直接改寫被調整對象的寬度或位置",
    reportedDelta === 25 && passiveTarget.style.width === "321px"
  );
  passiveBinding();

  openCloseTrigger.click();
  dropdownTrigger.click();
  drag(combinedHandle, 13, 400, 425);
  check(
    "拖曳能力與開合、下拉選單及共用外觀組合時互不干擾",
    combinedWidth === 225 && expanded && !openCloseContent.hidden &&
      dropdownExpanded && !dropdownMenu.hidden &&
      getComputedStyle(combinedPanel).backgroundColor !== "rgba(0, 0, 0, 0)"
  );

  let endedAsCancelled = false;
  const cancelHandle = document.createElement("button");
  cancelHandle.setPointerCapture = () => {};
  const cancelBinding = bindDragAdjustment({
    handle: cancelHandle,
    onDrag() {},
    onDragEnd(result) { endedAsCancelled = result.cancelled; }
  });
  cancelHandle.dispatchEvent(pointer("pointerdown", 14, 50));
  cancelHandle.dispatchEvent(pointer("pointercancel", 14, 50));
  check(
    "指標取消時結束當次拖曳，不留下作用中的手勢",
    endedAsCancelled
  );
  cancelBinding();

  bindingA();
  const aBeforeRemovedDrag = widthA;
  const aEventsBeforeRemovedDrag = dragAEvents;
  drag(handleA, 15, 100, 160);
  check(
    "連接可獨立移除，移除後拖曳不再呼叫舊回呼",
    widthA === aBeforeRemovedDrag && dragAEvents === aEventsBeforeRemovedDrag
  );

  let replacementDelta = 0;
  const replacementBinding = bindDragAdjustment({
    handle: handleA,
    onDrag({ deltaX }) { replacementDelta = deltaX; }
  });
  drag(handleA, 16, 200, 230);
  check(
    "舊連接移除後可替換為新連接，只有新回呼接收位移",
    replacementDelta === 30 &&
      widthA === aBeforeRemovedDrag &&
      dragAEvents === aEventsBeforeRemovedDrag
  );

  replacementBinding();
  bindingB();
  combinedBinding();
  openCloseBinding();
  dropdownBinding();

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
