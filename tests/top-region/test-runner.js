const results = document.querySelector("#results");
const fixture = document.querySelector("#fixture");
let completed = 0;
let passed = 0;
let failed = 0;

function render(message = "") {
  const summary = `已完成：${completed} 項；通過：${passed}；未通過：${failed}`;
  results.textContent = [
    ...window.__topRegionTestLines,
    summary,
    message
  ].filter(Boolean).join("\n");
  results.dataset.status = message.startsWith("ERROR") ? "error" : "running";
  window.__topRegionTestCompleted = completed;
}

window.__topRegionTestLines = [];
window.__topRegionTestCompleted = 0;

function record(name, passedCondition, detail = "") {
  completed += 1;
  if (passedCondition) {
    passed += 1;
    window.__topRegionTestLines.push(`PASS  ${name}`);
  } else {
    failed += 1;
    window.__topRegionTestLines.push(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
  render();
}

function reportFatal(error) {
  const message = error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
  render(`ERROR  ${message}`);
  results.dataset.status = "error";
}

window.__topRegionTestReportFatal = reportFatal;

async function run() {
  if (!results) throw new Error("找不到結果容器 #results");
  if (!fixture) throw new Error("找不到測試掛載容器 #fixture");

  render("測試開始；正在載入必要元件…");

  // This test page imports only the layout container and the top-region component.
  const [{ LayoutContainer }, { TopRegion }] = await Promise.all([
    import("../../src/components/layout-container.js"),
    import("../../src/components/top-region.js")
  ]);

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

  const checks = [
    {
      name: "上方區自身呈現",
      run: () =>
        region.shadowRoot instanceof ShadowRoot &&
        region.shadowRoot.querySelector("section[role='banner']") !== null &&
        region.shadowRoot.querySelector(".placeholder")?.textContent === "上方區內容尚未建立"
    },
    {
      name: "上方區內部操作獨立於容器",
      run: () => {
        const control = document.createElement("button");
        control.type = "button";
        control.textContent = "上方區內部操作測試";
        region.append(control);

        let regionHandled = 0;
        let containerObserved = 0;
        let containerChangedEvent = false;
        region.addEventListener("click", () => { regionHandled += 1; });
        container.addEventListener("click", (event) => {
          containerObserved += 1;
          containerChangedEvent =
            event.defaultPrevented || event.cancelBubble || event.target !== control;
        });

        const event = new MouseEvent("click", { bubbles: true, cancelable: true });
        control.dispatchEvent(event);
        return regionHandled === 1 &&
          containerObserved === 1 &&
          !containerChangedEvent &&
          !event.defaultPrevented &&
          !event.cancelBubble;
      }
    },
    {
      name: "上方區固定且不提供收合",
      run: () => {
        const style = getComputedStyle(region);
        return style.position === "sticky" &&
          style.top === "0px" &&
          region.getAttribute("aria-expanded") === null &&
          region.shadowRoot.querySelector("button, summary, [aria-expanded]") === null;
      }
    },
    {
      name: "容器不接管上方區內容與狀態",
      run: () => {
        const control = region.querySelector("button");
        return control?.textContent === "上方區內部操作測試" &&
          control.disabled === false &&
          region.getAttribute("aria-expanded") === null &&
          container.getAttribute("aria-expanded") === null &&
          container.shadowRoot.querySelector("slot") !== null;
      }
    }
  ];

  for (const check of checks) {
    try {
      record(check.name, Boolean(check.run()));
    } catch (error) {
      record(check.name, false, error instanceof Error ? error.message : String(error));
    }
  }

  results.dataset.status = failed === 0 ? "passed" : "failed";
  render(`測試結束：${failed === 0 ? "全部通過" : "有項目未通過"}`);
}

run().catch(reportFatal);
