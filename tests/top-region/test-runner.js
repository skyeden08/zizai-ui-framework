import { LayoutContainer } from "../../src/components/layout-container.js";
import { TopRegion } from "../../src/components/top-region.js";
import { LeftRegion } from "../../src/components/left-region.js";
import { MiddleRegion } from "../../src/components/middle-region.js";
import { RightRegion } from "../../src/components/right-region.js";

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

  window.__topRegionTestLines = lines;
  window.__topRegionTestCompleted = completed;

  const render = (message = "") => {
    if (!results) {
      window.__topRegionReportError?.("找不到結果容器 #results");
      return;
    }
    const summary = "已完成：" + completed + " 項；通過：" + passed + "；未通過：" + failed;
    results.textContent = [...lines, summary, message].filter(Boolean).join("\n");
    results.dataset.status = message.startsWith("ERROR")
      ? "error"
      : "running";
    window.__topRegionTestCompleted = completed;
  };

  const record = (name, passedCondition, detail = "") => {
    completed += 1;
    if (passedCondition) {
      passed += 1;
      lines.push("PASS  " + name);
    } else {
      failed += 1;
      lines.push("FAIL  " + name + (detail ? " — " + detail : ""));
    }
    render();
  };

  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const pointer = (type, pointerId, clientX) => new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    pointerId,
    pointerType: "mouse",
    isPrimary: true,
    button: 0,
    clientX
  });
  const drag = (handle, pointerId, startX, endX) => {
    handle.setPointerCapture = () => {};
    handle.dispatchEvent(pointer("pointerdown", pointerId, startX));
    handle.dispatchEvent(pointer("pointermove", pointerId, endX));
    handle.dispatchEvent(pointer("pointerup", pointerId, endX));
  };

  try {
    if (!results) throw new Error("找不到結果容器 #results");
    if (!fixture) throw new Error("找不到測試掛載容器 #fixture");

    render("測試程式已啟動；正在載入必要元件…");

    const sideDefinitions = [
      { id: "left-region", tag: "zizai-left-region" },
      { id: "middle-region", tag: "zizai-middle-region" },
      { id: "right-region", tag: "zizai-right-region" }
    ];

    // Register every custom element before creating any of them.
    if (!customElements.get("zizai-layout-container")) {
      customElements.define("zizai-layout-container", LayoutContainer);
    }
    if (!customElements.get("zizai-top-region")) {
      customElements.define("zizai-top-region", TopRegion);
    }
    if (!customElements.get("zizai-left-region")) {
      customElements.define("zizai-left-region", LeftRegion);
    }
    if (!customElements.get("zizai-middle-region")) {
      customElements.define("zizai-middle-region", MiddleRegion);
    }
    if (!customElements.get("zizai-right-region")) {
      customElements.define("zizai-right-region", RightRegion);
    }

    const container = document.createElement("zizai-layout-container");
    const top = document.createElement("zizai-top-region");

    container.append(top);
    const regions = sideDefinitions.map(({ id, tag }) => {
      const element = document.createElement(tag);
      container.append(element);
      const api = container.connectRegion(element);
      const filler = document.createElement("div");
      filler.style.minHeight = "900px";
      filler.textContent = id + " 捲動測試內容";
      if (id === "middle-region") filler.slot = "conversation";
      element.append(filler);
      return { id, element, api };
    });
    fixture.replaceChildren(container);

    await nextFrame();
    await nextFrame();

    record(
      "上方區自身呈現",
      top.shadowRoot instanceof ShadowRoot &&
      top.shadowRoot.querySelector("section[role='banner']") !== null &&
      top.shadowRoot.querySelector(".placeholder")?.textContent === "上方區內容尚未建立"
    );

    const topStyle = getComputedStyle(top);
    record(
      "上方區固定於容器上方",
      topStyle.position === "sticky" &&
      topStyle.top === "0px" &&
      Math.abs(top.getBoundingClientRect().top - container.getBoundingClientRect().top) < 1
    );

    const topRectBeforeScroll = top.getBoundingClientRect();
    let allScrollChecksPassed = true;
    for (const region of regions) {
      const viewport = region.element.shadowRoot.querySelector(".region-content");
      const maxScroll = viewport ? viewport.scrollHeight - viewport.clientHeight : 0;
      if (!viewport || maxScroll <= 0) {
        allScrollChecksPassed = false;
        record(
          region.id + " 具有可實際操作的獨立垂直捲動區",
          false,
          "可捲動範圍為 " + maxScroll
        );
        continue;
      }

      viewport.scrollTop = maxScroll;
      await nextFrame();
      const topRectAfterScroll = top.getBoundingClientRect();
      const passedCheck =
        viewport.scrollTop > 0 &&
        Math.abs(topRectAfterScroll.top - topRectBeforeScroll.top) < 1 &&
        Math.abs(topRectAfterScroll.height - topRectBeforeScroll.height) < 1;
      allScrollChecksPassed = allScrollChecksPassed && passedCheck;
      record(
        "上方區不隨" + region.id + "垂直捲動移動",
        passedCheck,
        "上方區 top：" + topRectBeforeScroll.top + " → " + topRectAfterScroll.top
      );
      viewport.scrollTop = 0;
    }

    record(
      "上方區不隨左、中、右區垂直捲動而移動",
      allScrollChecksPassed
    );

    record(
      "上方區沒有收合控制或收合狀態",
      top.shadowRoot.querySelector("button, summary, [aria-expanded], [data-role='collapse-toggle']") === null &&
      top.getAttribute("aria-expanded") === null &&
      top.shadowRoot.querySelector("[data-role='resize-handle']") === null
    );

    const snapshot = container.getCoordinationSnapshot();
    record(
      "容器未提供上方區收合介面或狀態",
      !Object.prototype.hasOwnProperty.call(top, "containerInterface") &&
      !snapshot.some((state) => state.regionId === "top-region") &&
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
      "左、中、右區仍各自保有收合控制、寬度調整入口及既有單向介面",
      regions.every(({ element, api }) =>
        element.shadowRoot.querySelector('[data-role="collapse-toggle"]') instanceof HTMLButtonElement &&
        element.shadowRoot.querySelector('[data-role="resize-handle"]') instanceof HTMLElement &&
        typeof api.requestRegionState === "function" &&
        typeof api.requestSpace === "function"
      )
    );

    const requests = [];
    container.addEventListener("zizai:region-request", (event) => requests.push(event.detail));
    for (const region of regions) {
      const toggle = region.element.shadowRoot.querySelector('[data-role="collapse-toggle"]');
      toggle.click();
      const collapse = requests.at(-1);
      const collapsedLocally =
        toggle.getAttribute("aria-expanded") === "false" &&
        region.element.shadowRoot.querySelector(".region-content").hidden === true &&
        collapse?.regionId === region.id &&
        collapse?.kind === "region-state" &&
        collapse?.request?.collapsed === true;
      record(region.id + " 沿用既有收合機制", collapsedLocally);

      toggle.click();
      const expand = requests.at(-1);
      record(
        region.id + " 沿用既有展開機制",
        toggle.getAttribute("aria-expanded") === "true" &&
        region.element.shadowRoot.querySelector(".region-content").hidden === false &&
        expand?.regionId === region.id &&
        expand?.kind === "region-state" &&
        expand?.request?.collapsed === false
      );
    }

    record(
      "收合與展開請求只來自左、中、右區",
      requests.length === 6 &&
      requests.every((request) =>
        ["left-region", "middle-region", "right-region"].includes(request.regionId)
      )
    );

    for (const [index, region] of regions.entries()) {
      const handle = region.element.shadowRoot.querySelector('[data-role="resize-handle"]');
      const requestStart = requests.length;
      drag(handle, 200 + index, 200, 224);
      const widthRequest = requests[requestStart];
      record(
        region.id + " 沿用既有拖曳寬度調整機制",
        widthRequest?.regionId === region.id &&
        widthRequest?.kind === "space" &&
        Number.isFinite(widthRequest?.request?.width) &&
        widthRequest.request.width > 0
      );
    }

    record(
      "寬度調整請求仍只來自左、中、右區",
      requests.length === 9 &&
      requests.every((request) =>
        ["left-region", "middle-region", "right-region"].includes(request.regionId)
      )
    );

    const containerSource = await fetch("../../src/components/layout-container.js").then((response) => {
      if (!response.ok) throw new Error("無法讀取容器來源：" + response.status);
      return response.text();
    });
    record(
      "容器來源不含上方區角色、收合狀態或上方區介面映射",
      !containerSource.includes('"zizai-top-region"') &&
      !containerSource.includes('"top-region"') &&
      !containerSource.includes("topRegion") &&
      !containerSource.includes("top-region")
    );

    render("測試結束：" + (failed === 0 ? "全部通過" : "有項目未通過"));
    results.dataset.status = failed === 0 ? "passed" : "failed";
  } catch (error) {
    const message = error instanceof Error
      ? error.name + ": " + error.message
      : String(error);
    lines.push("ERROR  " + message);
    render("ERROR 已中止；已完成 " + completed + " 項；原因：" + message);
    if (results) results.dataset.status = "error";
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
  window.__topRegionReportError?.(
    error instanceof Error ? error.message : String(error)
  );
}
