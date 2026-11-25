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

  window.__rightRegionTestLines = lines;
  window.__rightRegionTestCompleted = completed;

  const render = (message = "") => {
    if (!results) {
      window.__rightRegionReportError?.("找不到結果容器 #results");
      return;
    }
    const summary = `已完成：${completed} 項；通過：${passed}；未通過：${failed}`;
    results.textContent = [...lines, summary, message].filter(Boolean).join("\n");
    results.dataset.status = message.startsWith("ERROR") ? "error" : "running";
    window.__rightRegionTestCompleted = completed;
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

    const [{ LayoutContainer }, { RightRegion }] = await Promise.all([
      import("../../src/components/layout-container.js"),
      import("../../src/components/right-region.js")
    ]);

    if (!customElements.get("zizai-layout-container")) {
      customElements.define("zizai-layout-container", LayoutContainer);
    }
    if (!customElements.get("zizai-right-region")) {
      customElements.define("zizai-right-region", RightRegion);
    }

    const container = document.createElement("zizai-layout-container");
    const region = document.createElement("zizai-right-region");
    container.append(region);
    fixture.append(container);

    const checks = [
      {
        name: "右側區可獨立載入並建立自身呈現邊界",
        run: () =>
          region.shadowRoot instanceof ShadowRoot &&
          region.shadowRoot.querySelector("section.surface[aria-label='右側區（共視區）']") !== null
      },
      {
        name: "右側區具有自身的中性內容掛載入口與尚未建立提示",
        run: () =>
          region.shadowRoot.querySelector("slot") !== null &&
          region.shadowRoot.querySelector(".placeholder")?.textContent === "右側區內容尚未建立"
      },
      {
        name: "右側區可作為獨立區域組裝於容器",
        run: () =>
          container.querySelector(":scope > zizai-right-region") === region &&
          container.shadowRoot.querySelector("slot") !== null
      },
      {
        name: "右側區自身呈現及內部操作獨立於容器",
        run: () => {
          const control = document.createElement("button");
          control.type = "button";
          control.textContent = "區域內部操作測試";
          const output = document.createElement("output");
          output.textContent = "0";
          region.append(control, output);

          let regionHandled = 0;
          let containerHandled = 0;
          let valueObservedByContainer = null;

          control.addEventListener("click", () => {
            regionHandled += 1;
            output.textContent = String(regionHandled);
          });
          container.addEventListener("click", () => {
            containerHandled += 1;
            valueObservedByContainer = output.textContent;
          });

          const event = new MouseEvent("click", {
            bubbles: true,
            composed: true,
            cancelable: true
          });
          control.dispatchEvent(event);

          const assigned = region.shadowRoot.querySelector("slot").assignedElements();
          const failures = [];
          if (!assigned.includes(control) || !assigned.includes(output)) {
            failures.push("內部操作測試元素未由右側區自身掛載入口呈現");
          }
          if (regionHandled !== 1 || output.textContent !== "1") {
            failures.push("右側區內部操作未自行執行並更新自身測試狀態");
          }
          if (containerHandled !== 1) {
            failures.push("容器未觀察到冒泡事件");
          }
          if (valueObservedByContainer !== "1") {
            failures.push("容器處理事件時未觀察到右側區已更新的狀態");
          }
          if (event.defaultPrevented) {
            failures.push("事件遭容器或其他處理者取消");
          }
          return { passed: failures.length === 0, detail: failures.join("；") };
        }
      },
      {
        name: "容器未持有或接管右側區內容與內部操作狀態",
        run: () => {
          const output = region.querySelector("output");
          return output?.textContent === "1" &&
            container.shadowRoot.querySelector("output") === null &&
            !container.hasAttribute("data-operation-state");
        }
      },
      {
        name: "未提前建立下拉選單標頭、常用工具列或共視內容區",
        run: () =>
          region.shadowRoot.querySelector(
            "[data-dropdown-header], [data-common-toolbar], [data-shared-content], .dropdown-header, .common-toolbar, .shared-content"
          ) === null &&
          !/下拉選單標頭|常用工具列|共視內容區/.test(region.shadowRoot.textContent)
      },
      {
        name: "未提前建立裝置／情境適配或中間區跨區連接",
        run: () => {
          const styles = [...region.shadowRoot.querySelectorAll("style")]
            .map((style) => style.textContent)
            .join("\n");
          return !styles.includes("@media") &&
            region.shadowRoot.querySelector(
              "[data-device], [data-responsive], [data-conversation-bridge], [slot='conversation']"
            ) === null &&
            !region.hasAttribute("data-device") &&
            !region.hasAttribute("data-responsive");
        }
      },
      {
        name: "未提前建立收合、寬度調整或獨立捲動行為",
        run: () => {
          const style = getComputedStyle(region);
          return region.getAttribute("aria-expanded") === null &&
            region.shadowRoot.querySelector("[aria-expanded], [data-resize-handle]") === null &&
            !["auto", "scroll"].includes(style.overflowX) &&
            !["auto", "scroll"].includes(style.overflowY);
        }
      }
    ];

    for (const check of checks) {
      try {
        const result = check.run();
        if (result && typeof result === "object" && "passed" in result) {
          record(check.name, Boolean(result.passed), result.detail || "");
        } else {
          record(check.name, Boolean(result));
        }
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
  window.__rightRegionReportError?.(
    error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  );
}
