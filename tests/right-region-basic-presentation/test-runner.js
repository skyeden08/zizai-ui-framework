import { LayoutContainer } from "../../src/components/layout-container.js";
import { LeftRegion } from "../../src/components/left-region.js";
import { MiddleRegion } from "../../src/components/middle-region.js";
import { RightRegion } from "../../src/components/right-region.js?rev=phase9-right-region-2";

let started = false;

async function startTests() {
  if (started) return;
  started = true;

  const output = document.getElementById("results");
  const fixture = document.getElementById("fixture");
  const lines = [];
  let completed = 0;
  let passed = 0;
  let failed = 0;
  window.__rightBasicTestLines = lines;

  const render = (message = "") => {
    if (!output) {
      window.__rightBasicReportError?.("找不到測試結果容器");
      return;
    }
    output.textContent = [
      ...lines,
      `已完成：${completed} 項；通過：${passed}；未通過：${failed}`,
      message
    ].filter(Boolean).join("\n");
    output.dataset.status = message.startsWith("ERROR")
      ? "error"
      : "running";
    window.__rightBasicTestCompleted = completed;
  };

  const test = (name, condition, detail = "") => {
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

  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const width = (element) => element.getBoundingClientRect().width;
  const near = (a, b, tolerance = 2) => Math.abs(a - b) <= tolerance;

  function defineElement(name, constructor) {
    if (!customElements.get(name)) customElements.define(name, constructor);
  }

  function fillRegion(region, slotName = "") {
    for (let index = 0; index < 32; index += 1) {
      const paragraph = document.createElement("p");
      paragraph.textContent = `${region.localName} 測試內容 ${index + 1}：形成獨立垂直捲動範圍。`;
      if (slotName) paragraph.slot = slotName;
      region.append(paragraph);
    }
  }

  function drag(handle, pointerId, startX, endX) {
    handle.setPointerCapture = () => {};
    handle.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, cancelable: true, pointerId, pointerType: "mouse",
      isPrimary: true, button: 0, buttons: 1, clientX: startX
    }));
    handle.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, pointerId, pointerType: "mouse",
      isPrimary: true, button: 0, buttons: 1, clientX: endX
    }));
    handle.dispatchEvent(new PointerEvent("pointerup", {
      bubbles: true, cancelable: true, pointerId, pointerType: "mouse",
      isPrimary: true, button: 0, clientX: endX
    }));
  }

  try {
    if (!output || !fixture) throw new Error("缺少測試結果區或掛載區");
    if (typeof PointerEvent !== "function") throw new Error("瀏覽器不支援 PointerEvent");

    defineElement("zizai-layout-container", LayoutContainer);
    defineElement("zizai-left-region", LeftRegion);
    defineElement("zizai-middle-region", MiddleRegion);
    defineElement("zizai-right-region", RightRegion);

    const container = document.createElement("zizai-layout-container");
    container.style.height = "36rem";
    const left = document.createElement("zizai-left-region");
    const middle = document.createElement("zizai-middle-region");
    const right = document.createElement("zizai-right-region");

    container.append(left, middle, right);
    fixture.replaceChildren(container);
    container.connectRegion(left);
    container.connectRegion(middle);
    container.connectRegion(right);
    await frame();
    await frame();

    const root = right.shadowRoot;
    const regionFrame = root?.querySelector(".region-frame");
    const regionContent = root?.querySelector('[data-role="region-content"]');
    const placeholder = root?.querySelector('[data-role="basic-placeholder"]');
    const label = root?.querySelector(".region-label");
    const toggle = root?.querySelector('[data-role="collapse-toggle"]');
    const initialWidths = [width(left), width(middle), width(right)];

    test(
      "右側區基本呈現符合共視區定位",
      !!regionFrame &&
        !!root.querySelector(".region-header") &&
        root.querySelector(".region-toolbar") === null &&
        regionFrame.dataset.rightRegionVersion === "basic-presentation-1" &&
        regionFrame.getAttribute("aria-label") === "右側區（共視區）" &&
        label?.textContent.trim() === "右側區（共視區）" &&
        width(right) > 0 &&
        right.getBoundingClientRect().height > 0
    );

    test(
      "基本結構只有一個尚未建立提示，未預設內容分類",
      !!regionContent &&
        !!placeholder &&
        placeholder.textContent.trim() === "尚未建立" &&
        root.querySelectorAll(".placeholder").length === 1 &&
        regionContent.querySelectorAll("slot").length === 1 &&
        regionContent.querySelector("slot").name === "" &&
        regionContent.textContent.trim() === "尚未建立" &&
        !root.querySelector("[data-category], [data-content-type], [data-role='content-category']")
    );

    test(
      "右側區自身持有呈現位置，容器不接管內部內容與操作",
      root.contains(regionContent) &&
        regionContent.contains(placeholder) &&
        container.shadowRoot.querySelector(".region-content, .placeholder, [data-role='basic-placeholder']") === null &&
        !/rightRegion\.shadowRoot|rightRegion\.textContent|rightRegion\.innerHTML/.test(
          (await (await fetch(new URL("../../src/components/layout-container.js", import.meta.url))).text())
        )
    );

    const rightSource = await (await fetch(
      new URL("../../src/components/right-region.js?rev=phase9-right-region-2", import.meta.url)
    )).text();

    test(
      "未提前實作第 5～7 項、裝置適配或中間區跨區連接",
      root.querySelector("select, [role='combobox'], [data-role*='dropdown'], [class*='dropdown'], .common-toolbar, .common-tools, .tool-list, [data-role*='common-tool'], [data-role='co-view-content'], .co-view-content") === null &&
        root.querySelectorAll("button").length === 1 &&
        root.querySelector('[data-role="collapse-toggle"]') === toggle &&
        !/@media|matchMedia|innerWidth|mobile|tablet|deviceType/i.test(rightSource) &&
        !/zizai-middle-region|conversation|sendMessage|message-list|result-transfer|cross-region/i.test(rightSource)
    );

    let collapsed = false;
    let expanded = false;
    if (toggle && regionContent) {
      toggle.click();
      const collapsedState = container.getCoordinationSnapshot()
        .find((entry) => entry.regionId === "right-region");
      collapsed =
        regionContent.hidden &&
        toggle.getAttribute("aria-expanded") === "false" &&
        collapsedState?.regionStateRequest?.collapsed === true;

      toggle.click();
      const expandedState = container.getCoordinationSnapshot()
        .find((entry) => entry.regionId === "right-region");
      expanded =
        !regionContent.hidden &&
        toggle.getAttribute("aria-expanded") === "true" &&
        expandedState?.regionStateRequest?.collapsed === false;
    }
    test("既有右側區區域級收合與展開仍正常", collapsed && expanded);

    let widthAdjustment = false;
    const middleHandle = middle.shadowRoot.querySelector('[data-role="resize-handle"]');
    if (middleHandle) {
      const leftBefore = width(left);
      const middleBefore = width(middle);
      const rightBefore = width(right);
      drag(middleHandle, 84, 300, 270);
      await frame();
      widthAdjustment =
        width(middle) < middleBefore - 8 &&
        width(right) > rightBefore + 8 &&
        near(width(left), leftBefore);
    }
    test(
      "沿用既有中／右分隔線調整右側區寬度，左側區不受影響",
      widthAdjustment
    );

    fillRegion(left);
    fillRegion(middle, "conversation");
    fillRegion(right);
    await frame();

    const leftContent = left.shadowRoot.querySelector(".region-content");
    const middleContent = middle.shadowRoot.querySelector(".region-content");
    const rightMaxScroll = Math.max(0, regionContent.scrollHeight - regionContent.clientHeight);
    leftContent.scrollTop = 0;
    middleContent.scrollTop = 0;
    regionContent.scrollTop = Math.min(rightMaxScroll * 0.4, rightMaxScroll);
    await frame();
    const independentScroll =
      getComputedStyle(regionContent).overflowY === "auto" &&
      rightMaxScroll > 0 &&
      regionContent.scrollTop > 0 &&
      leftContent.scrollTop === 0 &&
      middleContent.scrollTop === 0;
    test("右側區保有自身獨立垂直捲動位置", independentScroll);

    test(
      "左、中、右區初始寬度維持 2:4:4",
      initialWidths.every((value) => value > 0) &&
        near(initialWidths[1] / initialWidths[0], 2, 0.05) &&
        near(initialWidths[2] / initialWidths[0], 2, 0.05),
      `實際寬度：${initialWidths.map((value) => value.toFixed(1)).join(" / ")}`
    );

    lines.push("");
    lines.push(`總計：${completed} 項；通過：${passed}；未通過：${failed}`);
    render(failed === 0 ? "測試結束：全部通過" : "測試結束：有項目未通過");
    output.dataset.status = failed === 0 ? "passed" : "failed";
  } catch (error) {
    const message = error instanceof Error
      ? `${error.name}: ${error.message}`
      : String(error);
    lines.push(`ERROR  ${message}`);
    render(`ERROR 已中止；已完成 ${completed} 項；原因：${message}`);
    if (output) output.dataset.status = "error";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startTests, { once: true });
} else {
  startTests();
}
