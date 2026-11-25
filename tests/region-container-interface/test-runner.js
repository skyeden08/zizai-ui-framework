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
  if (!customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

defineElement("zizai-layout-container", LayoutContainer);
defineElement("zizai-top-region", TopRegion);
defineElement("zizai-left-region", LeftRegion);
defineElement("zizai-middle-region", MiddleRegion);
defineElement("zizai-right-region", RightRegion);

const container = document.createElement("zizai-layout-container");
fixture.replaceChildren(container);

const regions = [
  { id: "top-region", tag: "zizai-top-region" },
  { id: "left-region", tag: "zizai-left-region" },
  { id: "middle-region", tag: "zizai-middle-region" },
  { id: "right-region", tag: "zizai-right-region" }
].map(({ id, tag }) => {
  const element = document.createElement(tag);
  container.append(element);
  const api = container.connectRegion(element);
  return { id, element, api };
});

record(
  "四個區域均可取得各自獨立的容器介面",
  regions.every(({ api }) =>
    api &&
    typeof api.requestSpace === "function" &&
    typeof api.requestRegionState === "function"
  ) &&
  new Set(regions.map(({ api }) => api)).size === 4
);

record(
  "介面只公開空間需求與區域層級狀態需求兩種請求",
  regions.every(({ api }) =>
    Object.keys(api).sort().join(",") === "requestRegionState,requestSpace"
  )
);

const received = [];
container.addEventListener("zizai:region-request", (event) => {
  received.push({
    detail: event.detail,
    bubbles: event.bubbles,
    composed: event.composed,
    target: event.target
  });
});

const spaceReceipts = regions.map(({ api }) =>
  api.requestSpace({ testToken: "space-request" })
);
const stateReceipts = regions.map(({ api }) =>
  api.requestRegionState({ testToken: "region-state-request" })
);

record(
  "各區域可向容器提出空間需求，容器收到正確來源與內容",
  received.filter(({ detail }) => detail.kind === "space").length === 4 &&
  regions.every(({ id }) =>
    received.some(({ detail, target }) =>
      detail.regionId === id &&
      detail.kind === "space" &&
      detail.request.testToken === "space-request" &&
      target === container
    )
  )
);

record(
  "各區域可向容器提出區域層級狀態需求",
  received.filter(({ detail }) => detail.kind === "region-state").length === 4 &&
  regions.every(({ id }) =>
    received.some(({ detail }) =>
      detail.regionId === id &&
      detail.kind === "region-state" &&
      detail.request.testToken === "region-state-request"
    )
  )
);

record(
  "請求方向限定為區域至容器，請求事件不向其他區域傳播",
  received.length === 8 &&
  received.every(({ bubbles, composed }) => !bubbles && !composed) &&
  spaceReceipts.every((receipt, index) =>
    receipt.accepted === true && receipt.regionId === regions[index].id
  ) &&
  stateReceipts.every((receipt, index) =>
    receipt.accepted === true && receipt.regionId === regions[index].id
  )
);

let siblingReceivedRequest = false;
regions[1].element.addEventListener("zizai:region-request", () => {
  siblingReceivedRequest = true;
});
regions[0].api.requestSpace({ testToken: "no-peer-link" });

record(
  "沒有建立區域與區域之間的請求連接",
  siblingReceivedRequest === false &&
  regions.every(({ api }) =>
    Object.keys(api).every((key) =>
      key === "requestSpace" || key === "requestRegionState"
    )
  )
);

const region = regions[2].element;
const initialShadowMarkup = region.shadowRoot.innerHTML;
const initialStyle = region.getAttribute("style");
const initialState = region.getAttribute("data-region-owned-state");
region.setAttribute("data-region-owned-state", "local-state");
const beforeRequestMarkup = region.shadowRoot.innerHTML;
const beforeRequestStyle = region.getAttribute("style");

regions[2].api.requestSpace({ testToken: "preserve-region-state" });
regions[2].api.requestRegionState({ testToken: "preserve-region-state" });

record(
  "容器經介面接收請求時未改寫區域內部呈現、內容或區域狀態",
  region.shadowRoot.innerHTML === beforeRequestMarkup &&
  region.getAttribute("style") === beforeRequestStyle &&
  region.getAttribute("data-region-owned-state") === "local-state" &&
  initialShadowMarkup === beforeRequestMarkup &&
  initialStyle === beforeRequestStyle &&
  initialState === null
);

const internalButton = document.createElement("button");
internalButton.type = "button";
internalButton.textContent = "區域內部操作";
let internalOperationHandled = false;
internalButton.addEventListener("click", () => {
  internalOperationHandled = true;
  internalButton.dataset.operationState = "handled-by-region";
});
region.shadowRoot.append(internalButton);

const internalClick = new MouseEvent("click", {
  bubbles: true,
  cancelable: true,
  composed: true
});
internalButton.dispatchEvent(internalClick);

record(
  "區域內部操作仍由區域自身處理，容器未攔截或取消",
  internalOperationHandled &&
  internalButton.dataset.operationState === "handled-by-region" &&
  internalClick.defaultPrevented === false
);

let invalidPayloadRejected = false;
try {
  regions[0].api.requestSpace("not-an-object");
} catch (error) {
  invalidPayloadRejected = error instanceof TypeError;
}

record(
  "介面拒絕非物件請求資料",
  invalidPayloadRejected
);

let nestedRegionRejected = false;
const nestedRegion = document.createElement("zizai-left-region");
regions[0].element.append(nestedRegion);
try {
  container.connectRegion(nestedRegion);
} catch (error) {
  nestedRegionRejected = error instanceof TypeError;
}

record(
  "容器只接受直接組裝於自身的區域，不接管區域內部巢狀內容",
  nestedRegionRejected
);

record(
  "容器自身呈現結構不包含區域內部節點",
  container.shadowRoot.querySelectorAll("*").length === 2 &&
  container.shadowRoot.querySelector("slot") !== null
);

lines.push("");
lines.push(`總計：${passed + failed} 項；通過：${passed}；未通過：${failed}`);
results.textContent = lines.join("\n");
results.dataset.status = failed === 0 ? "passed" : "failed";
