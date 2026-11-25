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
  if (condition) {
    passed += 1;
    lines.push(`PASS  ${name}`);
  } else {
    failed += 1;
    lines.push(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function defineElement(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor);
}

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

const regions = definitions.map(({ id, tag }) => {
  const element = document.createElement(tag);
  container.append(element);
  const api = container.connectRegion(element);
  return { id, element, api };
});

record(
  "四區均各自建立 Shadow DOM 呈現邊界",
  regions.every(({ element }) => element.shadowRoot instanceof ShadowRoot)
);

record(
  "四區呈現結構各自存在，容器未將區域內部節點納入自身 Shadow DOM",
  regions.every(({ element }) => element.shadowRoot.querySelector("*") !== null) &&
  container.shadowRoot.querySelectorAll("*").length === 2 &&
  container.shadowRoot.querySelector("slot") !== null
);

const crossRegionEvents = [];
const regionEventCounts = new Map(regions.map(({ id }) => [id, 0]));

for (const receiver of regions) {
  receiver.element.addEventListener("zizai:test-region-operation", (event) => {
    const eventPath = event.composedPath();
    const source = regions.find(({ element }) => eventPath.includes(element));
    const sourceId = source?.id ?? event.detail?.owner ?? "unknown-source";

    if (sourceId === receiver.id) {
      regionEventCounts.set(receiver.id, regionEventCounts.get(receiver.id) + 1);
      return;
    }

    crossRegionEvents.push({
      source: sourceId,
      receiver: receiver.id,
      eventType: event.type
    });
  });
}

let containerObservedOperations = 0;
container.addEventListener("zizai:test-region-operation", () => {
  containerObservedOperations += 1;
});

const containerAttributesBefore = Array.from(container.attributes)
  .map(({ name, value }) => `${name}=${value}`)
  .sort()
  .join("|");
const initialCoordinationSnapshot = JSON.stringify(container.getCoordinationSnapshot());

const operationResults = [];
for (const region of regions) {
  const localButton = document.createElement("button");
  localButton.type = "button";
  localButton.textContent = `${region.id} local operation`;
  let locallyHandled = false;

  localButton.addEventListener("click", () => {
    locallyHandled = true;
    localButton.dataset.owner = region.id;
  });

  region.element.shadowRoot.append(localButton);

  const click = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    composed: true
  });
  localButton.dispatchEvent(click);

  operationResults.push({
    id: region.id,
    locallyHandled,
    localOwner: localButton.dataset.owner,
    defaultPrevented: click.defaultPrevented,
    localNodeContained: region.element.shadowRoot.contains(localButton)
  });

  const internalEvent = new CustomEvent("zizai:test-region-operation", {
    bubbles: true,
    composed: true,
    detail: { owner: region.id }
  });
  localButton.dispatchEvent(internalEvent);
}

for (const result of operationResults) {
  record(
    `${result.id} 內部操作由自身處理且操作節點留在自身呈現邊界`,
    result.locallyHandled &&
    result.localOwner === result.id &&
    result.defaultPrevented === false &&
    result.localNodeContained
  );
}

const crossRegionDetail = crossRegionEvents.length
  ? crossRegionEvents.map(({ source, receiver, eventType }) =>
      "來源：" + source + "；接收者：" + receiver + "；事件：" + eventType
    ).join(" | ")
  : "未發現來源區域與接收區域不同的事件";

record(
  "四區內部操作不觸發其他區域的操作處理",
  crossRegionEvents.length === 0,
  crossRegionDetail
);

record(
  "容器未攔截或取消區域內部操作，也未改寫區域操作結果",
  operationResults.every(({ defaultPrevented }) => !defaultPrevented) &&
  container.getAttribute("data-region-operation") === null &&
  container.style.length === 0 &&
  containerAttributesBefore === Array.from(container.attributes)
    .map(({ name, value }) => `${name}=${value}`)
    .sort()
    .join("|") &&
  JSON.stringify(container.getCoordinationSnapshot()) === initialCoordinationSnapshot
);

record(
  "區域內部操作事件未形成區域間傳播或控制",
  crossRegionEvents.length === 0,
  crossRegionDetail
);

record(
  "區域內部事件可正常冒泡至容器（不作為區域間耦合判定）",
  containerObservedOperations === regions.length,
  "容器接收 " + containerObservedOperations + "/" + regions.length + " 次事件"
);

const regionSourcePaths = [
  "top-region.js",
  "left-region.js",
  "middle-region.js",
  "right-region.js"
];
const sourceEntries = await Promise.all(regionSourcePaths.map(async (filename) => {
  const url = new URL(`../../src/components/${filename}`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`無法讀取 ${filename}：HTTP ${response.status}`);
  return [filename, await response.text()];
}));
const sourceByFile = new Map(sourceEntries);

const peerDefinitions = {
  "top-region.js": ["zizai-left-region", "zizai-middle-region", "zizai-right-region", "LeftRegion", "MiddleRegion", "RightRegion"],
  "left-region.js": ["zizai-top-region", "zizai-middle-region", "zizai-right-region", "TopRegion", "MiddleRegion", "RightRegion"],
  "middle-region.js": ["zizai-top-region", "zizai-left-region", "zizai-right-region", "TopRegion", "LeftRegion", "RightRegion"],
  "right-region.js": ["zizai-top-region", "zizai-left-region", "zizai-middle-region", "TopRegion", "LeftRegion", "MiddleRegion"]
};

const noPeerReferences = Array.from(sourceByFile.entries()).every(([filename, source]) =>
  peerDefinitions[filename].every((peerName) => !source.includes(peerName)) &&
  !/^\s*import\s.+from\s+["'][^"']*(?:top|left|middle|right)-region\.js["']/m.test(source)
);

record(
  "四區原始碼未直接匯入或引用其他區域",
  noPeerReferences
);

const noContainerControl = Array.from(sourceByFile.values()).every((source) =>
  !source.includes("containerInterface") &&
  !source.includes("zizai:region-request") &&
  !source.includes("zizai:test-region-operation")
);

record(
  "四區原始碼未直接操作容器介面或集中式協調事件",
  noContainerControl
);

record(
  "容器與四區僅透過既有區域至容器介面連接，未建立區域間介面",
  regions.every(({ api }) =>
    Object.keys(api).sort().join(",") === "requestRegionState,requestSpace"
  ) &&
  new Set(regions.map(({ api }) => api)).size === 4 &&
  regions.every(({ element }) =>
    !Object.prototype.hasOwnProperty.call(element, "peerRegion") &&
    !Object.prototype.hasOwnProperty.call(element, "regionController")
  )
);

lines.push("");
lines.push(`總計：${passed + failed} 項；通過：${passed}；未通過：${failed}`);
results.textContent = lines.join("\n");
results.dataset.status = failed === 0 ? "passed" : "failed";
