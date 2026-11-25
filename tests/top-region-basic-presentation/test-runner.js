let started = false;

async function startTests() {
  if (started) return;
  started = true;

  const results = document.getElementById("results");
  const app = document.getElementById("app");
  const lines = [];
  let completed = 0;
  let passed = 0;
  let failed = 0;

  window.__topBasicLines = lines;

  const render = (message = "") => {
    if (!results) {
      window.__topBasicReportError?.("找不到結果容器 #results");
      return;
    }
    results.textContent = [
      ...lines,
      `已完成：${completed} 項；通過：${passed}；未通過：${failed}`,
      message
    ].filter(Boolean).join("\n");
    results.dataset.status = message.startsWith("ERROR") ? "error" : "running";
    window.__topBasicCompleted = completed;
  };

  const record = (name, condition, detail = "") => {
    completed += 1;
    if (condition) {
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
    if (!app) throw new Error("找不到實際呈現掛載位置 #app");

    render("載入正式啟動入口…");
    await import("../../src/main.js");
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const container = app.querySelector(":scope > zizai-layout-container");
    const top = container?.querySelector(":scope > zizai-top-region");
    if (!container || !top) {
      throw new Error("正式啟動入口未建立版面容器或上方區");
    }

    const topStyle = getComputedStyle(top);
    record(
      "上方區基本呈現符合規劃",
      top.shadowRoot instanceof ShadowRoot &&
      top.shadowRoot.querySelector("section[role='banner'][aria-label='上方區']") !== null &&
      top.shadowRoot.querySelector("slot") !== null &&
      topStyle.gridArea === "top" &&
      topStyle.position === "sticky" &&
      topStyle.top === "0px",
      `grid-area=${topStyle.gridArea}；position=${topStyle.position}；top=${topStyle.top}`
    );

    record(
      "尚未定義內容標示「尚未建立」",
      top.shadowRoot.querySelector(".placeholder")?.textContent === "上方區內容尚未建立",
      `實際提示：${top.shadowRoot.querySelector(".placeholder")?.textContent ?? "不存在"}`
    );

    const surface = top.shadowRoot.querySelector(".surface");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "上方區內部操作測試";
    const output = document.createElement("output");
    output.textContent = "0";
    surface.append(button, output);

    let regionHandled = 0;
    let containerObserved = 0;
    let containerMutatedRegion = false;
    button.addEventListener("click", () => {
      regionHandled += 1;
      output.textContent = String(regionHandled);
    });
    container.addEventListener("click", () => {
      containerObserved += 1;
      containerMutatedRegion = output.textContent !== String(regionHandled);
    });
    button.click();

    record(
      "區域內部呈現與操作仍由上方區自身負責",
      regionHandled === 1 &&
      output.textContent === "1" &&
      containerObserved === 1 &&
      !containerMutatedRegion &&
      container.shadowRoot.querySelector("output") === null,
      `上方區操作次數=${regionHandled}；容器觀察事件=${containerObserved}；容器未持有區域輸出內容`
    );

    const snapshotBefore = container.getCoordinationSnapshot();
    const hasTopInterfaceBefore = Object.prototype.hasOwnProperty.call(top, "containerInterface");
    let rejected = false;
    try {
      container.connectRegion(top);
    } catch (error) {
      rejected = error instanceof TypeError;
    }
    const hasTopInterfaceAfter = Object.prototype.hasOwnProperty.call(top, "containerInterface");
    const snapshotAfter = container.getCoordinationSnapshot();

    record(
      "容器只負責上方區版面呈現，不建立上方區協調介面",
      !hasTopInterfaceBefore &&
      rejected &&
      !hasTopInterfaceAfter &&
      !snapshotBefore.some((item) => item.regionId === "top-region") &&
      !snapshotAfter.some((item) => item.regionId === "top-region"),
      `呼叫前介面=${hasTopInterfaceBefore}；拒絕連接=${rejected}；呼叫後介面=${hasTopInterfaceAfter}`
    );

    record(
      "上方區未提前建立收合控制或收合狀態",
      top.shadowRoot.querySelector("button:not(:scope button)") === null &&
      top.shadowRoot.querySelector("[aria-expanded], [data-role='collapse-toggle']") === null &&
      top.getAttribute("aria-expanded") === null,
      "本項只驗證上方區未提供收合控制"
    );

    render(`測試結束：${failed === 0 ? "全部通過" : "有項目未通過"}`);
    results.dataset.status = failed === 0 ? "passed" : "failed";
  } catch (error) {
    const message = error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
    lines.push(`ERROR  ${message}`);
    render(`ERROR 已中止；已完成 ${completed} 項；原因：${message}`);
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
  window.__topBasicReportError?.(
    error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  );
}
