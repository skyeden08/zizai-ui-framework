import { LayoutContainer } from "../../src/components/layout-container.js";
import { TopRegion } from "../../src/components/top-region.js";
import { LeftRegion } from "../../src/components/left-region.js";
import { MiddleRegion } from "../../src/components/middle-region.js";
import { RightRegion } from "../../src/components/right-region.js";

const results = document.querySelector("#results");
const fixture = document.querySelector("#fixture");
const lines = [];
let passed = 0;
let failed = 0;
let pending = 0;

function record(name, condition, detail = "") {
  lines.push(`${condition ? "PASS" : "FAIL"}  ${name}${condition || !detail ? "" : " — " + detail}`);
  if (condition) passed += 1;
  else failed += 1;
}

function defer(name, reason) {
  lines.push(`待定  ${name} — ${reason}`);
  pending += 1;
}

function defineElement(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor);
}

function fillRegion(region, slotName = "") {
  for (let index = 0; index < 40; index += 1) {
    const paragraph = document.createElement("p");
    paragraph.textContent = `${region.localName} 測試內容 ${index + 1}：用於形成可捲動的長內容。`;
    if (slotName) paragraph.slot = slotName;
    region.append(paragraph);
  }
}

try {
  defineElement("zizai-layout-container", LayoutContainer);
  defineElement("zizai-top-region", TopRegion);
  defineElement("zizai-left-region", LeftRegion);
  defineElement("zizai-middle-region", MiddleRegion);
  defineElement("zizai-right-region", RightRegion);

  const container = document.createElement("zizai-layout-container");
  fixture.replaceChildren(container);

  const top = document.createElement("zizai-top-region");
  const left = document.createElement("zizai-left-region");
  const middle = document.createElement("zizai-middle-region");
  const right = document.createElement("zizai-right-region");

  fillRegion(left);
  fillRegion(middle, "conversation");
  fillRegion(right);

  const input = document.createElement("button");
  input.type = "button";
  input.slot = "input";
  input.textContent = "中間區自主操作測試";
  let middleOperationCount = 0;
  input.addEventListener("click", () => { middleOperationCount += 1; });
  middle.append(input);

  container.append(top, left, middle, right);
  for (const region of [top, left, middle, right]) container.connectRegion(region);

  const regions = [
    { id: "left-region", element: left },
    { id: "middle-region", element: middle },
    { id: "right-region", element: right }
  ];
  const scrollers = regions.map(({ id, element }) => ({
    id,
    element,
    viewport: element.shadowRoot.querySelector(".region-content")
  }));

  record(
    "左、中、右區各自具有獨立的內容捲動視窗",
    scrollers.every(({ viewport }) =>
      viewport instanceof HTMLElement &&
      getComputedStyle(viewport).overflowY === "auto" &&
      viewport.scrollHeight > viewport.clientHeight
    )
  );

  for (const target of scrollers) {
    for (const item of scrollers) item.viewport.scrollTop = 0;
    target.viewport.scrollTop = 48;
    const targetMoved = target.viewport.scrollTop > 0;
    const othersStayed = scrollers
      .filter((item) => item !== target)
      .every((item) => item.viewport.scrollTop === 0);
    record(
      `${target.id} 捲動只改變自身捲動位置`,
      targetMoved && othersStayed,
      `自身 scrollTop=${target.viewport.scrollTop}；其他區維持 0`
    );
  }

  const leftViewport = left.shadowRoot.querySelector(".region-content");
  const middleViewport = middle.shadowRoot.querySelector(".region-content");
  const rightViewport = right.shadowRoot.querySelector(".region-content");
  leftViewport.scrollTop = 31;
  middleViewport.scrollTop = 57;
  rightViewport.scrollTop = 83;
  record(
    "三區可同時保有彼此獨立的捲動位置",
    leftViewport.scrollTop === 31 &&
      middleViewport.scrollTop === 57 &&
      rightViewport.scrollTop === 83
  );

  const requestCountBefore = container.getCoordinationSnapshot()
    .reduce((total, item) => total + item.requestCount, 0);
  input.click();
  const requestCountAfter = container.getCoordinationSnapshot()
    .reduce((total, item) => total + item.requestCount, 0);
  record(
    "中間區內部操作由自身處理，不因操作而改變容器協調狀態",
    middleOperationCount === 1 && requestCountAfter === requestCountBefore
  );

  const sourcePaths = [
    ["left-region.js", "../../src/components/left-region.js"],
    ["middle-region.js", "../../src/components/middle-region.js"],
    ["right-region.js", "../../src/components/right-region.js"],
    ["layout-container.js", "../../src/components/layout-container.js"],
    ["region-container-interface.js", "../../src/interfaces/region-container-interface.js"],
    ["open-close.js", "../../src/capabilities/open-close.js"],
    ["drag-adjustment.js", "../../src/capabilities/drag-adjustment.js"]
  ];
  const sourceEntries = await Promise.all(sourcePaths.map(async ([name, path]) => {
    const response = await fetch(new URL(path, import.meta.url));
    if (!response.ok) throw new Error(`無法讀取 ${name}：HTTP ${response.status}`);
    return [name, await response.text()];
  }));
  const source = new Map(sourceEntries);

  record(
    "三區沿用第 9 項既有 bindOpenClose 與 bindDragAdjustment",
    ["left-region.js", "middle-region.js", "right-region.js"].every((name) =>
      source.get(name).includes("bindOpenClose({") &&
      source.get(name).includes("bindDragAdjustment({")
    )
  );

  record(
    "三區沿用既有單向介面 requestSpace 與 requestRegionState",
    ["left-region.js", "middle-region.js", "right-region.js"].every((name) =>
      source.get(name).includes("containerInterface?.requestSpace") &&
      source.get(name).includes("containerInterface?.requestRegionState")
    ) &&
    source.get("region-container-interface.js").includes('send("space", spaceRequest)') &&
    source.get("region-container-interface.js").includes('send("region-state", stateRequest)')
  );

  record(
    "容器仍只處理區域請求並調整自身版面，不直接操作區域內部",
    source.get("layout-container.js").includes("#receiveRegionRequest") &&
      source.get("layout-container.js").includes("#applyRegionLayout") &&
      !/region\.(?:shadowRoot|hidden|setAttribute|removeAttribute)/.test(source.get("layout-container.js"))
  );

  defer(
    "中間區取得左、右區配置後的剩餘水平空間",
    "規劃書未明定剩餘空間的具體計算方式；本次不自行選定算法，也不以靜態檢查代替實測。"
  );

  lines.push("");
  lines.push(`總計：${passed + failed + pending} 項；通過：${passed}；未通過：${failed}；待定：${pending}`);
  results.textContent = lines.join("\n");
  results.dataset.status = failed > 0 ? "failed" : pending > 0 ? "pending" : "passed";
} catch (error) {
  failed += 1;
  results.textContent = `測試中止：${error instanceof Error ? error.message : String(error)}`;
  results.dataset.status = "failed";
}
