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

  window.__middleRegionTestLines = lines;
  window.__middleRegionTestCompleted = completed;

  const render = (message = "") => {
    if (!results) {
      window.__middleRegionReportError?.("找不到結果容器 #results");
      return;
    }
    const summary = `已完成：${completed} 項；通過：${passed}；未通過：${failed}`;
    results.textContent = [...lines, summary, message].filter(Boolean).join("\n");
    results.dataset.status = message.startsWith("ERROR")
      ? "error"
      : "running";
    window.__middleRegionTestCompleted = completed;
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

    const [{ LayoutContainer }, { MiddleRegion }] = await Promise.all([
      import("../../src/components/layout-container.js"),
      import("../../src/components/middle-region.js")
    ]);

    if (!customElements.get("zizai-layout-container")) {
      customElements.define("zizai-layout-container", LayoutContainer);
    }
    if (!customElements.get("zizai-middle-region")) {
      customElements.define("zizai-middle-region", MiddleRegion);
    }

    const container = document.createElement("zizai-layout-container");
    const region = document.createElement("zizai-middle-region");
    container.append(region);
    fixture.append(container);

    const checks = [
      {
        name: "中間區可獨立載入並建立自身呈現邊界",
        run: () =>
          region.shadowRoot instanceof ShadowRoot &&
          region.shadowRoot.querySelector("main[aria-label='中間區對話方塊']") !== null
      },
      {
        name: "中間區具有獨立的對話呈現掛載位置",
        run: () =>
          region.shadowRoot.querySelector("slot[name='conversation']") !== null &&
          region.shadowRoot.querySelector(".conversation .placeholder")?.textContent === "對話內容尚未建立"
      },
      {
        name: "中間區具有獨立的對話輸入掛載位置",
        run: () =>
          region.shadowRoot.querySelector("slot[name='input']") !== null &&
          region.shadowRoot.querySelector(".input-area .placeholder")?.textContent === "對話輸入操作尚未建立"
      },
      {
        name: "中間區可作為獨立區域組裝於容器",
        run: () =>
          container.querySelector(":scope > zizai-middle-region") === region &&
          container.shadowRoot.querySelector("slot") !== null
      },
      {
        name: "中間區自身呈現及內部操作獨立於容器",
        run: () => {
          const control = document.createElement("button");
          control.type = "button";
          control.slot = "input";
          control.textContent = "區域內部操作測試";
          const output = document.createElement("output");
          output.slot = "input";
          output.textContent = "0";
          region.append(control, output);

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

          const assigned = region.shadowRoot
            .querySelector("slot[name='input']")
            .assignedElements();

          return assigned.includes(control) &&
            assigned.includes(output) &&
            regionHandled === 1 &&
            output.textContent === "1" &&
            containerHandled === 1 &&
            !containerChangedEvent &&
            !event.defaultPrevented;
        }
      },
      {
        name: "容器未持有或接管中間區對話內容與內部操作狀態",
        run: () => {
          const output = region.querySelector("output");
          return output?.textContent === "1" &&
            container.shadowRoot.querySelector("output") === null &&
            region.shadowRoot.querySelector("output") === null;
        }
      },
      {
        name: "本項未提前建立依剩餘空間調整的行為",
        run: () => {
          const style = getComputedStyle(region);
          const surface = region.shadowRoot.querySelector(".surface");
          return style.flexGrow === "0" &&
            style.flexBasis === "auto" &&
            region.style.height === "" &&
            !["auto", "scroll"].includes(style.overflowY) &&
            surface?.hasAttribute("data-fill-remaining-space") === false &&
            region.shadowRoot.querySelector("[data-resize-handle]") === null;
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
  window.__middleRegionReportError?.(
    error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  );
}
