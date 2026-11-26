import { LayoutContainer } from "../../src/components/layout-container.js";
import { LeftRegion } from "../../src/components/left-region.js?rev=basic-structure-2";
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

  window.__leftRegionTestLines = lines;
  window.__leftRegionTestCompleted = completed;

  const render = (message = "") => {
    if (!results) {
      window.__leftRegionReportError?.("找不到結果容器 #results");
      return;
    }
    results.textContent = [
      ...lines,
      `已完成：${completed} 項；通過：${passed}；未通過：${failed}`,
      message
    ].filter(Boolean).join("\n");
    results.dataset.status = message.startsWith("ERROR") ? "error" : "running";
    window.__leftRegionTestCompleted = completed;
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

  try {
    if (!results) throw new Error("找不到結果容器 #results");
    if (!fixture) throw new Error("找不到測試掛載容器 #fixture");

    render("測試程式已啟動；正在載入必要元件…");

    const definitions = [
      ["zizai-layout-container", LayoutContainer],
      ["zizai-left-region", LeftRegion],
      ["zizai-middle-region", MiddleRegion],
      ["zizai-right-region", RightRegion]
    ];
    for (const [tag, constructor] of definitions) {
      if (!customElements.get(tag)) customElements.define(tag, constructor);
    }

    const container = document.createElement("zizai-layout-container");
    container.style.height = "520px";
    const left = document.createElement("zizai-left-region");
    const middle = document.createElement("zizai-middle-region");
    const right = document.createElement("zizai-right-region");
    container.append(left, middle, right);
    fixture.replaceChildren(container);
    container.connectRegion(left);
    container.connectRegion(middle);
    container.connectRegion(right);

    await nextFrame();
    await nextFrame();

    const leftRoot = left.shadowRoot;
    const frame = leftRoot?.querySelector(".region-frame[aria-label='左側區']");
    const regionContent = leftRoot?.querySelector("#left-region-content") ?? null;
    const regionToggle = leftRoot?.querySelector('[data-role="collapse-toggle"]') ?? null;
    const resizeHandle = leftRoot?.querySelector('[data-role="resize-handle"]') ?? null;
    const placeholder = regionContent?.querySelector(".placeholder") ?? null;

    const containerRect = container.getBoundingClientRect();
    const leftRect = left.getBoundingClientRect();
    record(
      "左側區基本結構存在且位於容器左側",
      Boolean(frame && regionContent && regionToggle && resizeHandle) &&
      leftRect.width > 0 &&
      leftRect.height > 0 &&
      Math.abs(leftRect.left - containerRect.left) < 1,
      "缺少必要的左側區結構節點"
    );

    record(
      "左側區內容以單一「尚未建立」提示呈現，未預設內容分類",
      Boolean(placeholder) &&
      placeholder.textContent.trim() === "尚未建立" &&
      leftRoot.querySelectorAll(".placeholder").length === 1 &&
      leftRoot.querySelectorAll('[data-role="content-item"], [data-role="item-toggle"], .item-content').length === 0
    );

    const coordinationBeforeCollapse = container.getCoordinationSnapshot();
    let collapsed = false;
    let expanded = false;
    if (regionContent && regionToggle) {
      regionToggle.click();
      const collapsedRecord = container.getCoordinationSnapshot()
        .find((item) => item.regionId === "left-region");
      collapsed = regionContent.hidden &&
        regionToggle.getAttribute("aria-expanded") === "false" &&
        collapsedRecord?.regionStateRequest?.collapsed === true;

      regionToggle.click();
      const expandedRecord = container.getCoordinationSnapshot()
        .find((item) => item.regionId === "left-region");
      expanded = !regionContent.hidden &&
        regionToggle.getAttribute("aria-expanded") === "true" &&
        expandedRecord?.regionStateRequest?.collapsed === false;
    }
    record("左側區區域級收合與展開正常", collapsed && expanded,
      "必要節點不存在時不讀取 null.hidden");

    let scrollWorks = false;
    if (regionContent) {
      const tallContent = document.createElement("div");
      tallContent.style.minHeight = "1200px";
      tallContent.textContent = "獨立捲動測試內容";
      regionContent.append(tallContent);
      await nextFrame();
      const scrollTopBefore = regionContent.scrollTop;
      const maxScroll = regionContent.scrollHeight - regionContent.clientHeight;
      regionContent.scrollTop = maxScroll;
      await nextFrame();
      scrollWorks = maxScroll > 0 &&
        regionContent.scrollTop > scrollTopBefore &&
        getComputedStyle(regionContent).overflowY === "auto";
      tallContent.remove();
    }
    record("左側區獨立垂直捲動正常", scrollWorks);

    let widthWorks = false;
    if (resizeHandle) {
      const widthBefore = left.getBoundingClientRect().width;
      const resizeRequestBefore = container.getCoordinationSnapshot()
        .find((item) => item.regionId === "left-region")?.requestCount ?? 0;
      resizeHandle.setPointerCapture = () => {};
      resizeHandle.dispatchEvent(pointer("pointerdown", 71, 200));
      resizeHandle.dispatchEvent(pointer("pointermove", 71, 232));
      resizeHandle.dispatchEvent(pointer("pointerup", 71, 232));
      await nextFrame();
      const widthAfter = left.getBoundingClientRect().width;
      const resizeState = container.getCoordinationSnapshot()
        .find((item) => item.regionId === "left-region");
      widthWorks = resizeState?.requestCount > resizeRequestBefore &&
        resizeState?.lastRequestKind === "space" &&
        widthAfter > widthBefore + 8;
    }
    record("左側區寬度調整仍可提出空間需求", widthWorks);

    const requestCountsBefore = container.getCoordinationSnapshot()
      .map((item) => [item.regionId, item.requestCount]);
    const regionControlsOwnedLocally = Boolean(
      regionToggle && resizeHandle &&
      leftRoot.contains(regionToggle) &&
      leftRoot.contains(resizeHandle) &&
      container.shadowRoot.querySelector('[data-role="collapse-toggle"], [data-role="resize-handle"]') === null &&
      leftRoot.querySelectorAll('[data-role="item-toggle"], [data-role="content-item"]').length === 0
    );
    const requestCountsAfter = container.getCoordinationSnapshot()
      .map((item) => [item.regionId, item.requestCount]);
    record(
      "區域內部呈現與操作由左側區自身負責，容器不接管",
      regionControlsOwnedLocally &&
      JSON.stringify(requestCountsAfter) === JSON.stringify(requestCountsBefore) &&
      left.getAttribute("aria-expanded") === null &&
      container.getAttribute("aria-expanded") === null
    );

    render(`測試結束：${failed === 0 ? "全部通過" : "有項目未通過"}`);
    results.dataset.status = failed === 0 ? "passed" : "failed";
  } catch (error) {
    const message = error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
    lines.push(`ERROR  ${message}`);
    render(`ERROR 已中止；已完成 ${completed} 項；原因：${message}`);
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
  window.__leftRegionReportError?.(
    error instanceof Error ? error.message : String(error)
  );
}
