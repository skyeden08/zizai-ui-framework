import { LayoutContainer } from "../../src/components/layout-container.js";
import { TopRegion } from "../../src/components/top-region.js";

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

async function run() {
  if (!customElements.get("zizai-layout-container")) {
    customElements.define("zizai-layout-container", LayoutContainer);
  }
  if (!customElements.get("zizai-top-region")) {
    customElements.define("zizai-top-region", TopRegion);
  }

  const container = document.createElement("zizai-layout-container");
  const region = document.createElement("zizai-top-region");
  container.append(region);
  fixture.append(container);

  record(
    "上方區可獨立註冊並建立 Shadow DOM",
    customElements.get("zizai-top-region") === TopRegion &&
      region.shadowRoot instanceof ShadowRoot
  );

  const projected = container.shadowRoot.querySelector("slot").assignedElements();
  record(
    "上方區透過容器既有插槽組裝，容器不改寫區域結構",
    projected.length === 1 &&
      projected[0] === region &&
      region.shadowRoot.querySelector("section[role='banner']") !== null
  );

  const regionStyle = getComputedStyle(region);
  record(
    "上方區固定於上方且不提供收合",
    regionStyle.position === "sticky" &&
      regionStyle.top === "0px" &&
      region.getAttribute("aria-expanded") === null &&
      region.shadowRoot.querySelector("button, summary, [aria-expanded]") === null
  );

  const placeholder = region.shadowRoot.querySelector("slot").assignedNodes().length === 0
    ? region.shadowRoot.querySelector(".placeholder")?.textContent
    : "";
  record(
    "未定義的橫幅內容只標示尚未建立",
    placeholder === "上方區內容尚未建立"
  );

  const internalControl = document.createElement("button");
  internalControl.type = "button";
  internalControl.textContent = "測試上方區內部操作";
  region.append(internalControl);

  let regionHandled = 0;
  let containerObserved = 0;
  let containerSawUnmodifiedEvent = false;
  region.addEventListener("click", () => {
    regionHandled += 1;
  });
  container.addEventListener("click", (event) => {
    containerObserved += 1;
    containerSawUnmodifiedEvent =
      event.target === internalControl &&
      event.defaultPrevented === false &&
      event.cancelBubble === false;
  });

  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  internalControl.dispatchEvent(event);

  record(
    "上方區自身呈現及內部操作獨立於容器",
    regionHandled === 1 &&
      containerObserved === 1 &&
      containerSawUnmodifiedEvent &&
      event.defaultPrevented === false &&
      event.cancelBubble === false
  );

  record(
    "容器未接管上方區內部內容與操作狀態",
    internalControl.textContent === "測試上方區內部操作" &&
      internalControl.disabled === false &&
      region.getAttribute("aria-expanded") === null &&
      container.getAttribute("aria-expanded") === null
  );

  const originalScrollY = window.scrollY;
  const regionDocumentTop = region.getBoundingClientRect().top + originalScrollY;
  window.scrollTo(0, Math.max(200, regionDocumentTop + 100));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const stickyTop = region.getBoundingClientRect().top;
  record(
    "實際捲動畫面時上方區維持在視窗頂端",
    Math.abs(stickyTop) < 1,
    `實測 top=${stickyTop}px`
  );
  window.scrollTo(0, originalScrollY);

  lines.push("");
  lines.push(`總計：${passed + failed} 項；通過：${passed}；未通過：${failed}`);
  results.textContent = lines.join("\\n");
  results.dataset.status = failed === 0 ? "passed" : "failed";
}

run();
