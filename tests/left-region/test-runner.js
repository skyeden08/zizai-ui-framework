import { LayoutContainer } from "../../src/components/layout-container.js";
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

    const itemDefinitions = [
      ["connection-status", "連線狀態"],
      ["account", "登入／帳號"],
      ["tasks", "任務清單／任務切換"],
      ["cognition", "認知現況"],
      ["navigation-help", "導覽／說明入口"]
    ];
    const itemSections = Array.from(
      left.shadowRoot.querySelectorAll('[data-role="content-item"]')
    );
    const itemButtons = itemSections.map((item) =>
      item.querySelector('[data-role="item-toggle"]')
    );
    const itemContents = itemSections.map((item) =>
      item.querySelector(".item-content")
    );

    record(
      "左側區基本呈現符合規劃，位於容器左側區域",
      left.shadowRoot.querySelector(".region-frame[aria-label='左側區']") !== null &&
      getComputedStyle(left).gridArea === "left"
    );

    record(
      "已確認的五類呈現位置均存在且未增加其他類別",
      itemSections.length === itemDefinitions.length &&
      itemSections.every((item, index) =>
        item.dataset.item === itemDefinitions[index][0] &&
        itemButtons[index]?.textContent === itemDefinitions[index][1]
      )
    );

    record(
      "所有尚未定義的內容均標示「尚未建立」",
      itemContents.length === itemDefinitions.length &&
      itemContents.every((content) =>
        content.querySelector(".placeholder")?.textContent === "尚未建立"
      )
    );

    record(
      "五類內容各自具有獨立開合控制",
      itemButtons.length === itemDefinitions.length &&
      itemButtons.every((button, index) =>
        button instanceof HTMLButtonElement &&
        button.getAttribute("aria-controls") === itemContents[index]?.id &&
        button.getAttribute("aria-expanded") === "true"
      )
    );

    let independentItemToggles = itemButtons.length === itemDefinitions.length;
    for (let index = 0; index < itemButtons.length; index += 1) {
      const before = itemContents.map((content) => content.hidden);
      itemButtons[index].click();
      const changedOnlyTarget = itemContents.every((content, itemIndex) =>
        itemIndex === index
          ? content.hidden !== before[itemIndex]
          : content.hidden === before[itemIndex]
      );
      itemButtons[index].click();
      const restored = itemContents.every((content, itemIndex) =>
        content.hidden === before[itemIndex]
      );
      independentItemToggles = independentItemToggles &&
        changedOnlyTarget && restored;
    }
    record(
      "各項目可獨立開合，不改變其他項目的開合狀態",
      independentItemToggles
    );

    const regionContent = left.shadowRoot.querySelector("#left-region-content");
    const regionToggle = left.shadowRoot.querySelector(
      '[data-role="collapse-toggle"]'
    );
    const initialSnapshot = container.getCoordinationSnapshot();
    regionToggle.click();
    const collapsedSnapshot = container.getCoordinationSnapshot();
    const collapsed = regionContent.hidden &&
      regionToggle.getAttribute("aria-expanded") === "false" &&
      collapsedSnapshot.find((item) => item.regionId === "left-region")
        ?.regionStateRequest?.collapsed === true;
    regionToggle.click();
    const expandedSnapshot = container.getCoordinationSnapshot();
    const expanded = !regionContent.hidden &&
      regionToggle.getAttribute("aria-expanded") === "true" &&
      expandedSnapshot.find((item) => item.regionId === "left-region")
        ?.regionStateRequest?.collapsed === false;
    record("左側區既有收合與展開行為維持", collapsed && expanded);

    const tallContent = document.createElement("div");
    tallContent.slot = "connection-status";
    tallContent.style.minHeight = "1200px";
    tallContent.textContent = "獨立捲動測試內容";
    left.append(tallContent);
    await nextFrame();
    const scrollTopBefore = regionContent.scrollTop;
    const maxScroll = regionContent.scrollHeight - regionContent.clientHeight;
    regionContent.scrollTop = maxScroll;
    await nextFrame();
    const scrollWorks = maxScroll > 0 &&
      regionContent.scrollTop > scrollTopBefore &&
      getComputedStyle(regionContent).overflowY === "auto";
    regionContent.scrollTop = 0;
    record("左側區既有獨立垂直捲動行為維持", scrollWorks);

    const resizeHandle = left.shadowRoot.querySelector(
      '[data-role="resize-handle"]'
    );
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
    record(
      "左側區既有寬度調整入口仍可提出空間需求",
      resizeState?.requestCount > resizeRequestBefore &&
      resizeState?.lastRequestKind === "space" &&
      widthAfter > widthBefore + 8,
      `寬度：${widthBefore.toFixed(1)} → ${widthAfter.toFixed(1)}`
    );

    const requestsBeforeItemOperation = container.getCoordinationSnapshot()
      .map((item) => [item.regionId, item.requestCount]);
    itemButtons[0].click();
    const requestsAfterItemOperation = container.getCoordinationSnapshot()
      .map((item) => [item.regionId, item.requestCount]);
    itemButtons[0].click();
    record(
      "區域內部呈現與項目操作仍由左側區自身負責",
      left.shadowRoot.querySelectorAll('[data-role="item-toggle"]').length === 5 &&
      container.shadowRoot.querySelector('[data-role="item-toggle"]') === null &&
      JSON.stringify(requestsAfterItemOperation) === JSON.stringify(requestsBeforeItemOperation) &&
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
