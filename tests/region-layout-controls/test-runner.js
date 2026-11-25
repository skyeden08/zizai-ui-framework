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
  handle.setPointerCapture = () => {};
  handle.dispatchEvent(pointer("pointerdown", pointerId, startX));
  handle.dispatchEvent(pointer("pointermove", pointerId, endX));
  handle.dispatchEvent(pointer("pointerup", pointerId, endX));
}

function trackWidths(container) {
  return getComputedStyle(container)
    .gridTemplateColumns
    .trim()
    .split(/\s+/)
    .map((value) => Number.parseFloat(value));
}

function regionControls(region) {
  return {
    toggle: region.element.shadowRoot.querySelector('[data-role="collapse-toggle"]'),
    content: region.element.shadowRoot.querySelector("#region-content"),
    handle: region.element.shadowRoot.querySelector('[data-role="resize-handle"]')
  };
}

try {
  defineElement("zizai-layout-container", LayoutContainer);
  defineElement("zizai-top-region", TopRegion);
  defineElement("zizai-left-region", LeftRegion);
  defineElement("zizai-middle-region", MiddleRegion);
  defineElement("zizai-right-region", RightRegion);

  const container = document.createElement("zizai-layout-container");
  fixture.replaceChildren(container);

  const definitions = [
    { id: "top-region", tag: "zizai-top-region", constructor: TopRegion },
    { id: "left-region", tag: "zizai-left-region", constructor: LeftRegion },
    { id: "middle-region", tag: "zizai-middle-region", constructor: MiddleRegion },
    { id: "right-region", tag: "zizai-right-region", constructor: RightRegion }
  ];

  const mounted = definitions.map(({ id, tag }) => {
    const element = document.createElement(tag);
    container.append(element);
    const api = id === "top-region" ? null : container.connectRegion(element);
    return { id, element, api };
  });

  const regions = mounted.filter(({ id }) => id !== "top-region");
  const requests = [];
  container.addEventListener("zizai:region-request", (event) => {
    requests.push(event.detail);
  });

  const top = mounted.find(({ id }) => id === "top-region");
  record(
    "上方區不加入本項收合及寬度調整操作",
    !top.element.shadowRoot.querySelector('[data-role="collapse-toggle"]') &&
      !top.element.shadowRoot.querySelector('[data-role="resize-handle"]') &&
      !Object.prototype.hasOwnProperty.call(top.element, "containerInterface") &&
      !container.getCoordinationSnapshot().some((state) => state.regionId === "top-region")
  );

  record(
    "左、中、右三區各自具備收合觸發、內容區及拖曳調整入口",
    regions.every((region) => {
      const controls = regionControls(region);
      return controls.toggle instanceof HTMLButtonElement &&
        controls.content instanceof HTMLElement &&
        controls.handle instanceof HTMLElement;
    })
  );

  record(
    "三區初始開合狀態由各區自身持有",
    regions.every((region) => {
      const controls = regionControls(region);
      return controls.toggle.getAttribute("aria-expanded") === "true" &&
        controls.content.hidden === false;
    })
  );

  for (const region of regions) {
    const controls = regionControls(region);
    const siblings = regions.filter((item) => item !== region);
    const siblingBefore = siblings.map((item) => {
      const state = regionControls(item);
      return {
        expanded: state.toggle.getAttribute("aria-expanded"),
        hidden: state.content.hidden
      };
    });

    const requestStart = requests.length;
    controls.toggle.click();
    const collapseRequest = requests[requestStart];

    const localCollapsed =
      controls.toggle.getAttribute("aria-expanded") === "false" &&
      controls.content.hidden === true &&
      collapseRequest?.regionId === region.id &&
      collapseRequest?.kind === "region-state" &&
      collapseRequest?.request?.collapsed === true;

    const siblingsUnchanged = siblings.every((item, index) => {
      const state = regionControls(item);
      return state.toggle.getAttribute("aria-expanded") === siblingBefore[index].expanded &&
        state.content.hidden === siblingBefore[index].hidden;
    });

    record(
      `${region.id} 由自身觸發收合並經單向介面通知容器`,
      localCollapsed,
      `最近請求來源：${collapseRequest?.regionId ?? "無"}；接收：容器；類型：${collapseRequest?.kind ?? "無"}`
    );
    record(
      `${region.id} 收合不改變其他區域的開合狀態`,
      siblingsUnchanged
    );

    const expandStart = requests.length;
    controls.toggle.click();
    const expandRequest = requests[expandStart];
    record(
      `${region.id} 可由自身再次展開並保留自身狀態`,
      controls.toggle.getAttribute("aria-expanded") === "true" &&
        controls.content.hidden === false &&
        expandRequest?.regionId === region.id &&
        expandRequest?.kind === "region-state" &&
        expandRequest?.request?.collapsed === false
    );
  }

  for (const [index, region] of regions.entries()) {
    const controls = regionControls(region);
    const beforeTracks = trackWidths(container);
    const beforeSnapshot = container.getCoordinationSnapshot();
    const beforeSiblingStates = regions
      .filter((item) => item !== region)
      .map((item) => {
        const state = regionControls(item);
        return {
          id: item.id,
          expanded: state.toggle.getAttribute("aria-expanded"),
          hidden: state.content.hidden
        };
      });

    const startWidth = region.element.getBoundingClientRect().width;
    const delta = 24;
    const isRight = region.id === "right-region";
    const startX = 200;
    const endX = isRight ? startX - delta : startX + delta;
    const requestStart = requests.length;

    drag(controls.handle, 100 + index, startX, endX);

    const request = requests[requestStart];
    const afterTracks = trackWidths(container);
    const afterSnapshot = container.getCoordinationSnapshot();
    const trackIndex = index;
    const expectedWidth = startWidth + delta;

    const targetTrackChanged =
      Math.abs(afterTracks[trackIndex] - expectedWidth) < 1;
    const siblingTracksUnchanged = beforeTracks.every((width, track) =>
      track === trackIndex || Math.abs(afterTracks[track] - width) < 1
    );

    const siblingsStateUnchanged = beforeSiblingStates.every((before) => {
      const sibling = regions.find((item) => item.id === before.id);
      const state = regionControls(sibling);
      return state.toggle.getAttribute("aria-expanded") === before.expanded &&
        state.content.hidden === before.hidden;
    });

    const onlySourceWidthRequest = afterSnapshot.every((state) => {
      if (state.regionId === region.id) {
        return Math.abs(state.spaceRequest?.width - expectedWidth) < 1;
      }
      const before = beforeSnapshot.find((entry) => entry.regionId === state.regionId);
      return JSON.stringify(state.spaceRequest) === JSON.stringify(before?.spaceRequest);
    });

    record(
      `${region.id} 拖曳由自身觸發，容器依寬度請求調整對應版面軌道`,
      request?.regionId === region.id &&
        request?.kind === "space" &&
        targetTrackChanged,
      `來源：${request?.regionId ?? "無"}；接收：容器；請求寬度：${request?.request?.width ?? "無"}`
    );
    record(
      `${region.id} 調寬不改變其他區域的寬度軌道、請求或內部狀態`,
      siblingTracksUnchanged && onlySourceWidthRequest && siblingsStateUnchanged
    );
  }

  const sourcePaths = [
    ["left-region.js", "../../src/components/left-region.js"],
    ["middle-region.js", "../../src/components/middle-region.js"],
    ["right-region.js", "../../src/components/right-region.js"],
    ["layout-container.js", "../../src/components/layout-container.js"],
    ["top-region.js", "../../src/components/top-region.js"],
    ["open-close.js", "../../src/capabilities/open-close.js"],
    ["drag-adjustment.js", "../../src/capabilities/drag-adjustment.js"],
    ["region-container-interface.js", "../../src/interfaces/region-container-interface.js"]
  ];

  const sourceEntries = await Promise.all(sourcePaths.map(async ([name, path]) => {
    const response = await fetch(new URL(path, import.meta.url));
    if (!response.ok) throw new Error(`無法讀取 ${name}：HTTP ${response.status}`);
    return [name, await response.text()];
  }));
  const source = new Map(sourceEntries);

  record(
    "三區均組裝既有開合能力 bindOpenClose，未另寫開合事件機制",
    ["left-region.js", "middle-region.js", "right-region.js"].every((name) =>
      source.get(name).includes('from "../capabilities/open-close.js"') &&
      source.get(name).includes("bindOpenClose({")
    )
  );

  record(
    "三區均組裝既有拖曳能力 bindDragAdjustment，未另寫指標事件機制",
    ["left-region.js", "middle-region.js", "right-region.js"].every((name) =>
      source.get(name).includes('from "../capabilities/drag-adjustment.js"') &&
      source.get(name).includes("bindDragAdjustment({")
    )
  );

  record(
    "既有開合能力仍由 bindOpenClose 管理觸發連接及無障礙狀態同步",
    source.get("open-close.js").includes("export function bindOpenClose") &&
      source.get("open-close.js").includes("syncOpenCloseState(trigger, nextExpanded)")
  );

  record(
    "既有拖曳能力仍只回報位移，未接管寬度或版面",
    source.get("drag-adjustment.js").includes("export function bindDragAdjustment") &&
      source.get("drag-adjustment.js").includes("deltaX: event.clientX - startX") &&
      source.get("drag-adjustment.js").includes("onDrag(result)")
  );

  record(
    "沿用第 6 項既有單向介面，未增加區域對容器的連接方法",
    source.get("region-container-interface.js").includes("requestSpace(spaceRequest)") &&
      source.get("region-container-interface.js").includes("requestRegionState(stateRequest)") &&
      !source.get("region-container-interface.js").includes("commandRegion")
  );

  record(
    "容器只更新自身 Grid 空間配置，不直接操作區域內部狀態或控制項",
    source.get("layout-container.js").includes("#applyRegionLayout()") &&
      source.get("layout-container.js").includes('setProperty("grid-template-columns"') &&
      !/region\.(?:shadowRoot|hidden|setAttribute|removeAttribute)/.test(source.get("layout-container.js")) &&
      !source.get("layout-container.js").includes("aria-expanded")
  );

  record(
    "區域只透過既有 containerInterface 發送收合狀態與寬度請求",
    ["left-region.js", "middle-region.js", "right-region.js"].every((name) =>
      source.get(name).includes("this.containerInterface?.requestRegionState") &&
      source.get(name).includes("this.containerInterface?.requestSpace")
    )
  );

  record(
    "本項未設定左、中、右區的最小、最大或預設寬度數值",
    !["left-region.js", "middle-region.js", "right-region.js", "layout-container.js"]
      .some((name) => /(?:MIN|MAX|DEFAULT)_?(?:REGION_)?WIDTH|(?:min|max)-width:\s*\d+(?:px|rem)/i.test(source.get(name)))
  );

  record(
    "操作請求只由區域送往容器，沒有新增區域間控制連接",
    requests.length > 0 &&
      requests.every((request) =>
        ["left-region", "middle-region", "right-region"].includes(request.regionId)
      ) &&
      regions.every(({ element }) =>
        !Object.prototype.hasOwnProperty.call(element, "peerRegion") &&
        !Object.prototype.hasOwnProperty.call(element, "regionController")
      )
  );

  lines.push("");
  lines.push(`總計：${passed + failed} 項；通過：${passed}；未通過：${failed}`);
  results.textContent = lines.join("\n");
  results.dataset.status = failed === 0 ? "passed" : "failed";
} catch (error) {
  failed += 1;
  results.textContent = `測試中止：${error instanceof Error ? error.message : String(error)}`;
  results.dataset.status = "failed";
}
