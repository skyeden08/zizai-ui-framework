let started = false;

async function startTests() {
  if (started) return;
  started = true;

  const results = document.getElementById("results");
  const fixture = document.getElementById("fixture");
  const lines = [];
  let completed = 0;
  let passed = 0;
  let failed = 0;

  window.__leftRegionTestLines = lines;
  window.__leftRegionTestCompleted = completed;

  const render = (message = "") => {
    if (!results) {
      window.__leftRegionReportError?.("找不到結果容器 #results");
      return;
    }
    const summary = `已完成：${completed} 項；通過：${passed}；未通過：${failed}`;
    results.textContent = [...lines, summary, message].filter(Boolean).join("\\n");
    results.dataset.status = message.startsWith("ERROR")
      ? "error"
      : "running";
    window.__leftRegionTestCompleted = completed;
  };

  const record = (name, passedCondition, detail = "") => {
    completed += 1;
    if (passedCondition) {
      passed += 1;
      lines.push(`PASS  ${name}`);
    } else {
      failed += 1;
      lines.push(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
    }
    render();
  };

  try {
    if (!results) throw new Error("找不到結果容器 #results");
    if (!fixture) throw new Error("找不到測試掛載容器 #fixture");

    render("測試程式已啟動；正在載入必要元件…");

    const [{ LayoutContainer }, { LeftRegion }] = await Promise.all([
      import("../../src/components/layout-container.js"),
      import("../../src/components/left-region.js")
    ]);

    if (!customElements.get("zizai-layout-container")) {
      customElements.define("zizai-layout-container", LayoutContainer);
    }
    if (!customElements.get("zizai-left-region")) {
      customElements.define("zizai-left-region", LeftRegion);
    }

    const container = document.createElement("zizai-layout-container");
    const region = document.createElement("zizai-left-region");
    container.append(region);
    fixture.append(container);

    const checks = [
      {
        name: "左側區可獨立載入並建立自身呈現邊界",
        run: () =>
          region.shadowRoot instanceof ShadowRoot &&
          region.shadowRoot.querySelector("aside[aria-label='左側區']") !== null
      },
      {
        name: "左側區具有自身內容掛載位置與尚未建立提示",
        run: () =>
          region.shadowRoot.querySelector("slot") !== null &&
          region.shadowRoot.querySelector(".placeholder")?.textContent === "左側區內容尚未建立"
      },
      {
        name: "左側區可作為獨立區域組裝於容器",
        run: () =>
          container.querySelector(":scope > zizai-left-region") === region &&
          container.shadowRoot.querySelector("slot") !== null
      },
      {
        name: "左側區自身呈現及內部操作獨立於容器",
        run: () => {
          const surface = region.shadowRoot.querySelector(".surface");
          if (!surface) return false;

          const control = document.createElement("button");
          control.type = "button";
          control.textContent = "區域內部操作測試";
          const output = document.createElement("output");
          output.textContent = "0";
          surface.append(control, output);

          let regionHandled = 0;
          let containerHandled = 0;
          let containerChangedEvent = false;

          control.addEventListener("click", () => {
            regionHandled += 1;
            output.textContent = String(regionHandled);
          });
          container.addEventListener("click", (event) => {
            containerHandled += 1;
            containerChangedEvent =
              event.defaultPrevented || event.target !== region;
          });

          const event = new MouseEvent("click", {
            bubbles: true,
            composed: true,
            cancelable: true
          });
          control.dispatchEvent(event);

          return regionHandled === 1 &&
            output.textContent === "1" &&
            containerHandled === 1 &&
            !containerChangedEvent &&
            !event.defaultPrevented &&
            container.getAttribute("aria-expanded") === null &&
            region.getAttribute("aria-expanded") === null;
        }
      },
      {
        name: "容器未持有或接管左側區內部內容與操作狀態",
        run: () => {
          const output = region.shadowRoot.querySelector("output");
          return output?.textContent === "1" &&
            container.shadowRoot.querySelector("output") === null &&
            container.getAttribute("aria-expanded") === null &&
            region.getAttribute("aria-expanded") === null;
        }
      },
      {
        name: "本項未提前建立收合、寬度調整或捲動行為",
        run: () => {
          const style = getComputedStyle(region);
          return style.width === "" || style.width === "auto" ||
            (region.getAttribute("aria-expanded") === null &&
             region.shadowRoot.querySelector("[aria-expanded], [data-resize-handle]") === null);
        }
      }
    ];

    for (const check of checks) {
      try {
        record(check.name, Boolean(check.run()));
      } catch (error) {
        record(
          check.name,
          false,
          error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        );
      }
    }

    render(`測試結束：${failed === 0 ? "全部通過" : "有項目未通過"}`);
    results.dataset.status = failed === 0 ? "passed" : "failed";
  } catch (error) {
    const message = error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
    lines.push(`ERROR  ${message}`);
    render(`已中止；已完成 ${completed} 項`);
    results.dataset.status = "error";
  }
}

function launchWhenDomReady() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startTests, { once: true });
  } else {
    startTests();
  }
}

try {
  launchWhenDomReady();
} catch (error) {
  window.__leftRegionReportError?.(
    error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  );
}
