import { LayoutContainer } from "../../src/components/layout-container.js";

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

function makeContainer() {
  const container = new LayoutContainer();
  fixture.replaceChildren(container);
  return container;
}

if (!customElements.get("zizai-layout-container")) {
  customElements.define("zizai-layout-container", LayoutContainer);
}

const container = makeContainer();

record(
  "容器可註冊並建立 Shadow DOM",
  customElements.get("zizai-layout-container") === LayoutContainer &&
    container.shadowRoot instanceof ShadowRoot
);

const button = document.createElement("button");
button.type = "button";
button.textContent = "由使用位置管理的操作";
button.dataset.owner = "usage-position";
container.append(button);

record(
  "容器保留使用位置提供的內容與節點",
  container.querySelector("button") === button &&
    button.textContent === "由使用位置管理的操作" &&
    button.dataset.owner === "usage-position"
);

let callerHandledClick = false;
let receivedTarget = null;
button.addEventListener("click", (event) => {
  callerHandledClick = true;
  receivedTarget = event.target;
});
const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
button.dispatchEvent(clickEvent);

record(
  "區域內部操作仍由使用位置自行處理",
  callerHandledClick &&
    receivedTarget === button &&
    clickEvent.defaultPrevented === false &&
    clickEvent.cancelBubble === false
);

record(
  "容器未接管區域內容狀態或操作狀態",
  button.disabled === false &&
    button.getAttribute("aria-expanded") === null &&
    container.getAttribute("aria-expanded") === null &&
    container.style.cssText === ""
);

const originalShadowRoot = container.shadowRoot;
fixture.replaceChildren();
fixture.append(container);

record(
  "容器移除後重新掛載不重建或改寫內部內容",
  container.shadowRoot === originalShadowRoot &&
    container.querySelector("button") === button &&
    button.textContent === "由使用位置管理的操作"
);

lines.push("");
lines.push(`總計：${passed + failed} 項；通過：${passed}；未通過：${failed}`);
results.textContent = lines.join("\n");
results.dataset.status = failed === 0 ? "passed" : "failed";
