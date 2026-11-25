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

const regionDefinitions = [
  { id: "top-region", tag: "zizai-top-region" },
  { id: "left-region", tag: "zizai-left-region" },
  { id: "middle-region", tag: "zizai-middle-region" },
  { id: "right-region", tag: "zizai-right-region" }
];

const top = document.createElement("zizai-top-region");
container.append(top);

const regions = regionDefinitions
  .filter(({ id }) => id !== "top-region")
  .map(({ id, tag }) => {
    const element = document.createElement(tag);
    container.append(element);
    const api = container.connectRegion(element);
    return { id, element, api };
  });

const containerStyle = container.shadowRoot.querySelector("style").textContent;

record(
  "上方區不進入容器區域狀態協調",
  !Object.prototype.hasOwnProperty.call(top, "containerInterface") &&
  (() => {
    try {
      container.connectRegion(top);
      return false;
    } catch (error) {
      return error instanceof TypeError;
    }
  })()
);

record(
  "容器以單一版面配置安排上方區及左、中、右區",
  containerStyle.includes('"top top top"') &&
  containerStyle.includes('"left middle right"') &&
  containerStyle.includes("grid-template-columns: 2fr 4fr 4fr") &&
  containerStyle.includes("grid-template-rows: auto minmax(0, 1fr)") &&
  containerStyle.includes("display: contents")
);

record(
  "四個區域各自配置於容器指定位置",
  ["top", "left", "middle", "right"].every((area) =>
    containerStyle.includes(`grid-area: ${area}`)
  )
);

const initialSnapshot = container.getCoordinationSnapshot();
record(
  "容器只為左、中、右區建立區域層級協調紀錄",
  Object.isFrozen(initialSnapshot) &&
  initialSnapshot.length === 3 &&
  !initialSnapshot.some((state) => state.regionId === "top-region") &&
  initialSnapshot.every((state) =>
    state.spaceRequest === null &&
    state.regionStateRequest === null &&
    state.requestCount === 0
  )
);

for (const { id, api } of regions) {
  api.requestSpace({ marker: `${id}-space` });
  api.requestRegionState({ marker: `${id}-state` });
}

const coordinated = container.getCoordinationSnapshot();
record(
  "空間需求由容器保存於各自的區域紀錄",
  regions.every(({ id }) => {
    const state = coordinated.find((entry) => entry.regionId === id);
    return state?.spaceRequest?.marker === `${id}-space`;
  })
);

record(
  "區域層級狀態需求由容器保存於各自的區域紀錄",
  regions.every(({ id }) => {
    const state = coordinated.find((entry) => entry.regionId === id);
    return state?.regionStateRequest?.marker === `${id}-state`;
  })
);

record(
  "單一區域的新請求不覆蓋其他區域的協調狀態",
  coordinated.length === 3 &&
  coordinated.every((state) =>
    state.spaceRequest?.marker === `${state.regionId}-space` &&
    state.regionStateRequest?.marker === `${state.regionId}-state` &&
    state.requestCount === 2
  )
);

record(
  "容器對外提供的協調快照為唯讀",
  Object.isFrozen(coordinated) &&
  coordinated.every((state) => Object.isFrozen(state)) &&
  coordinated.every((state) => {
    try {
      state.requestCount = 999;
    } catch {}
    return state.requestCount === 2;
  })
);

const protectedRegion = regions[2].element;
protectedRegion.setAttribute("data-region-owned-state", "local-state");
protectedRegion.style.setProperty("--region-owned-value", "local");
const protectedShadowMarkup = protectedRegion.shadowRoot.innerHTML;
const protectedAttributes = Array.from(protectedRegion.attributes)
  .map((attribute) => [attribute.name, attribute.value].join("="))
  .sort()
  .join("|");
const protectedStyle = protectedRegion.getAttribute("style");

regions[2].api.requestSpace({ marker: "preserve-local-state" });
regions[2].api.requestRegionState({ marker: "preserve-local-state" });

record(
  "容器做跨區協調但未接管區域內部呈現、內容或操作",
  protectedRegion.shadowRoot.innerHTML === protectedShadowMarkup &&
  protectedRegion.getAttribute("data-region-owned-state") === "local-state" &&
  protectedRegion.getAttribute("style") === protectedStyle &&
  Array.from(protectedRegion.attributes)
    .map((attribute) => [attribute.name, attribute.value].join("="))
    .sort()
    .join("|") === protectedAttributes
);

record(
  "區域層級狀態未下放或改寫區域內部狀態",
  protectedRegion.getAttribute("data-container-region-state") === null &&
  protectedRegion.getAttribute("data-region-owned-state") === "local-state" &&
  protectedRegion.style.getPropertyValue("--region-owned-value") === "local" &&
  protectedRegion.shadowRoot.innerHTML === protectedShadowMarkup &&
  !Object.prototype.hasOwnProperty.call(protectedRegion, "coordinationState")
);

const internalButton = document.createElement("button");
internalButton.type = "button";
internalButton.textContent = "區域內部操作";
let internalOperationHandled = false;
internalButton.addEventListener("click", () => {
  internalOperationHandled = true;
  internalButton.dataset.operationState = "handled-by-region";
});
protectedRegion.shadowRoot.append(internalButton);
internalButton.dispatchEvent(new MouseEvent("click", {
  bubbles: true,
  cancelable: true,
  composed: true
}));

record(
  "區域內部操作仍由區域自身處理",
  internalOperationHandled &&
  internalButton.dataset.operationState === "handled-by-region"
);

const beforeSiblingRequest = [];
let siblingEventCount = 0;
regions[1].element.addEventListener("zizai:region-request", () => {
  siblingEventCount += 1;
});
regions[0].api.requestSpace({ marker: "no-sibling-event" });

record(
  "協調請求只到達容器，不建立區域間連接",
  siblingEventCount === 0 &&
  regions.every(({ api }) =>
    Object.keys(api).sort().join(",") === "requestRegionState,requestSpace"
  )
);

record(
  "容器只調整自身 Grid，不接管區域內部操作",
  containerStyle.includes("grid-template-columns: 2fr 4fr 4fr") &&
  containerStyle.includes("grid-template-rows: auto minmax(0, 1fr)") &&
  !/region\.(?:shadowRoot|hidden|setAttribute|removeAttribute)/.test(
    (await fetch("../../src/components/layout-container.js").then((response) => response.text()))
  )
);

lines.push("");
lines.push(`總計：${passed + failed} 項；通過：${passed}；未通過：${failed}`);
results.textContent = lines.join("\n");
results.dataset.status = failed === 0 ? "passed" : "failed";
