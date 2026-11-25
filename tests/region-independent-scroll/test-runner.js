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

function record(name, condition, detail = "") {
  lines.push(`${condition ? "PASS" : "FAIL"}  ${name}${condition || !detail ? "" : " — " + detail}`);
  if (condition) passed += 1;
  else failed += 1;
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

function maxScroll(viewport) {
  return Math.max(0, viewport.scrollHeight - viewport.clientHeight);
}

try {
  defineElement("zizai-layout-container", LayoutContainer);
  defineElement("zizai-top-region", TopRegion);
  defineElement("zizai-left-region", LeftRegion);
  defineElement("zizai-middle-region", MiddleRegion);
  defineElement("zizai-right-region", RightRegion);

  const container = document.createElement("zizai-layout-container");
  container.style.height = "100%";
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
    "左、中、右區各自具有獨立的內容垂直捲動視窗",
    scrollers.every(({ viewport }) =>
      viewport instanceof HTMLElement &&
      getComputedStyle(viewport).overflowY === "auto" &&
      maxScroll(viewport) > 0
    )
  );

  for (const target of scrollers) {
    for (const item of scrollers) item.viewport.scrollTop = 0;
    const targetMax = maxScroll(target.viewport);
    target.viewport.scrollTop = targetMax * 0.3;
    const targetPosition = target.viewport.scrollTop;
    const targetMoved = targetMax > 0 && targetPosition > 0;
    const othersStayed = scrollers
      .filter((item) => item !== target)
      .every((item) => item.viewport.scrollTop === 0);
    record(
      `${target.id} 捲動只改變自身位置`,
      targetMoved && othersStayed,
      `自身 scrollTop=${targetPosition.toFixed(2)}；其他區維持 0；可捲動範圍=${targetMax.toFixed(2)}`
    );
  }

  const leftViewport = left.shadowRoot.querySelector(".region-content");
  const middleViewport = middle.shadowRoot.querySelector(".region-content");
  const rightViewport = right.shadowRoot.querySelector(".region-content");
  const simultaneousTargets = [
    { viewport: leftViewport, ratio: 0.2 },
    { viewport: middleViewport, ratio: 0.45 },
    { viewport: rightViewport, ratio: 0.7 }
  ];
  const simultaneousRanges = simultaneousTargets.map(({ viewport }) => maxScroll(viewport));
  simultaneousTargets.forEach(({ viewport, ratio }) => {
    viewport.scrollTop = maxScroll(viewport) * ratio;
  });
  const simultaneousPositions = simultaneousTargets.map(({ viewport }) => viewport.scrollTop);
  const positionsAreDistinct = new Set(simultaneousPositions.map((value) => Math.round(value * 100) / 100)).size === 3;

  record(
    "三區可同時保有彼此獨立的捲動位置",
    simultaneousRanges.every((range) => range > 0) &&
      simultaneousPositions.every((position) => position > 0) &&
      positionsAreDistinct,
    `實際位置：左=${simultaneousPositions[0].toFixed(2)}、中=${simultaneousPositions[1].toFixed(2)}、右=${simultaneousPositions[2].toFixed(2)}；各區依自身可捲動範圍設定比例`
  );

  const containerRect = container.getBoundingClientRect();
  const initialRects = [left, middle, right].map((region) => region.getBoundingClientRect());
  const initialRatios = initialRects.map((rect) => rect.width / containerRect.width);
  record(
    "初始版面依 2:4:4 比例分配三區寬度",
    Math.abs(initialRatios[0] - 0.2) <= 0.02 &&
      Math.abs(initialRatios[1] - 0.4) <= 0.02 &&
      Math.abs(initialRatios[2] - 0.4) <= 0.02,
    `實際比例：${initialRatios.map((ratio) => (ratio * 10).toFixed(2)).join(":")}`
  );

  const middleRootChildren = Array.from(middle.shadowRoot.childNodes);
  const middleContentChildren = Array.from(middleViewport.childNodes);

  const leftRequest = left.containerInterface.requestSpace({ width: 180 });
  const rightRequest = right.containerInterface.requestSpace({ width: 220 });
  const leftRect = left.getBoundingClientRect();
  const middleRect = middle.getBoundingClientRect();
  const rightRect = right.getBoundingClientRect();
  const resizedContainerRect = container.getBoundingClientRect();
  const expectedMiddleWidth = resizedContainerRect.width - leftRect.width - rightRect.width;
  const geometryTolerance = 2;

  record(
    "沿用左右區既有寬度請求後，中間區取得其餘可用寬度",
    leftRequest.accepted === true &&
      rightRequest.accepted === true &&
      Math.abs(leftRect.width - 180) <= geometryTolerance &&
      Math.abs(rightRect.width - 220) <= geometryTolerance &&
      middleRect.width > 0 &&
      Math.abs(middleRect.width - expectedMiddleWidth) <= geometryTolerance,
    `容器=${resizedContainerRect.width.toFixed(1)}px；左=${leftRect.width.toFixed(1)}px；中=${middleRect.width.toFixed(1)}px；右=${rightRect.width.toFixed(1)}px`
  );

  const middleRequest = middle.containerInterface.requestSpace({ width: 260 });
  record(
    "中間區也沿用第 9 項既有寬度請求調整 Grid 軌道",
    middleRequest.accepted === true &&
      Math.abs(middle.getBoundingClientRect().width - 260) <= geometryTolerance
  );

  record(
    "容器調整 Grid 軌道前後未改動中間區內部節點",
    middleRootChildren.length === middle.shadowRoot.childNodes.length &&
      middleRootChildren.every((node, index) => node === middle.shadowRoot.childNodes[index]) &&
      middleContentChildren.length === middleViewport.childNodes.length &&
      middleContentChildren.every((node, index) => node === middleViewport.childNodes[index])
  );

  const requestCountBeforeOperation = container.getCoordinationSnapshot()
    .reduce((total, item) => total + item.requestCount, 0);
  input.click();
  const requestCountAfterOperation = container.getCoordinationSnapshot()
    .reduce((total, item) => total + item.requestCount, 0);
  record(
    "中間區內部操作由中間區自身處理，不觸發容器協調請求",
    middleOperationCount === 1 &&
      requestCountAfterOperation === requestCountBeforeOperation
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
    "三區沿用第 9 項既有開合及拖曳能力",
    ["left-region.js", "middle-region.js", "right-region.js"].every((name) =>
      source.get(name).includes("bindOpenClose({") &&
      source.get(name).includes("bindDragAdjustment({")
    )
  );

  record(
    "三區沿用第 9 項既有 requestSpace／requestRegionState 單向介面",
    ["left-region.js", "middle-region.js", "right-region.js"].every((name) =>
      source.get(name).includes("containerInterface?.requestSpace") &&
      source.get(name).includes("containerInterface?.requestRegionState")
    ) &&
    source.get("region-container-interface.js").includes('send("space", spaceRequest)') &&
    source.get("region-container-interface.js").includes('send("region-state", stateRequest)')
  );

  const containerSource = source.get("layout-container.js");
  record(
    "容器初始使用 2fr 4fr 4fr，請求後仍由 Grid 軌道分配",
    containerSource.includes("grid-template-columns: 2fr 4fr 4fr;") &&
      containerSource.includes('"left-region", "2fr"') &&
      containerSource.includes('"middle-region", "4fr"') &&
      containerSource.includes('"right-region", "4fr"') &&
      !containerSource.includes("ResizeObserver") &&
      !containerSource.includes("clientWidth") &&
      !containerSource.includes("scrollWidth")
  );

  record(
    "容器未直接存取或操作中間區內部呈現與內容",
    !/region\.(?:shadowRoot|textContent|innerHTML|hidden)|region-content/.test(containerSource)
  );

  lines.push("");
  lines.push(`總計：${passed + failed} 項；通過：${passed}；未通過：${failed}`);
  results.textContent = lines.join("\n");
  results.dataset.status = failed > 0 ? "failed" : "passed";
} catch (error) {
  failed += 1;
  results.textContent = `測試中止：${error instanceof Error ? error.message : String(error)}`;
  results.dataset.status = "failed";
}
