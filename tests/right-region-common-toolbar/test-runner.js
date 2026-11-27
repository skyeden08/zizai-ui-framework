import { LayoutContainer } from "../../src/components/layout-container.js";
import { LeftRegion } from "../../src/components/left-region.js";
import { MiddleRegion } from "../../src/components/middle-region.js";
import { RightRegion } from "../../src/components/right-region.js?rev=common-toolbar-1";

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
  window.__rightToolbarTestLines = lines;

  const render = (message = "") => {
    if (!output) {
      window.__rightToolbarReportError?.("找不到測試結果容器");
      return;
    }
    output.textContent = [
      ...lines,
      `已完成：${completed} 項；通過：${passed}；未通過：${failed}`,
      message
    ].filter(Boolean).join("\n");
    output.dataset.status = message.startsWith("ERROR") ? "error" : "running";
    window.__rightToolbarTestCompleted = completed;
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
    const frameElement = root?.querySelector(".region-frame");
    const dropdownHeader = root?.querySelector('[data-role="dropdown-header"]');
    const toolbar = root?.querySelector('[data-role="common-toolbar"]');
    const toolbarPlaceholder = root?.querySelector('[data-role="common-toolbar-placeholder"]');
    const content = root?.querySelector('[data-role="region-content"]');
    const collapseToggle = root?.querySelector('[data-role="collapse-toggle"]');
    const dropdownTrigger = root?.querySelector('[data-role="dropdown-trigger"]');
    const dropdownMenu = root?.querySelector('[data-role="dropdown-menu"]');
    const initialWidths = [width(left), width(middle), width(right)];

    test(
      "常用工具列位置存在，位於下拉選單標頭之後、主體內容位置之前",
      !!frameElement && !!dropdownHeader && !!toolbar && !!content &&
        frameElement.dataset.rightRegionVersion === "common-toolbar-1" &&
        dropdownHeader.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING &&
        toolbar.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING
    );

    test(
      "工具列內未定義的內容明確標示尚未建立",
      toolbar?.getAttribute("role") === "toolbar" &&
        toolbar?.getAttribute("aria-label") === "常用工具列" &&
        toolbarPlaceholder?.textContent.trim() === "尚未建立" &&
        toolbar?.children.length === 1
    );

    test(
      "未預設任何具體工具項目、按鈕、圖示或功能",
      !!toolbar &&
        toolbar.querySelectorAll("button, a, img, svg, input, select, [data-tool], [data-action]").length === 0 &&
        toolbar.textContent.trim() === "尚未建立"
    );

    test(
      "未建立工具分類或分類標題",
      !!toolbar &&
        toolbar.querySelectorAll("h1, h2, h3, h4, ul, ol, li, fieldset, [data-category]").length === 0
    );

    const rightSource = await (await fetch(
      new URL("../../src/components/right-region.js?rev=common-toolbar-1", import.meta.url)
    )).text();
    const dropdownSource = await (await fetch(
      new URL("../../src/capabilities/dropdown.js?rev=common-toolbar-1", import.meta.url)
    )).text();

    test(
      "既有下拉選單互動仍由第二階段能力提供，未另寫互動實作",
      /import\s*\{[^}]*\bbindDropdown\b[^}]*\}\s*from\s*["']\.\.\/capabilities\/dropdown\.js["']/.test(rightSource) &&
        /bindDropdown\s*\(/.test(rightSource) &&
        /export function bindDropdown\s*\(/.test(dropdownSource) &&
        !/function\s+(handleDropdown|toggleDropdown|bindRightDropdown)\b/.test(rightSource)
    );

    let dropdownOpened = false;
    let dropdownClosed = false;
    if (dropdownTrigger && dropdownMenu) {
      dropdownTrigger.click();
      dropdownOpened = dropdownTrigger.getAttribute("aria-expanded") === "true" &&
        dropdownMenu.hidden === false;
      dropdownTrigger.click();
      dropdownClosed = dropdownTrigger.getAttribute("aria-expanded") === "false" &&
        dropdownMenu.hidden === true;
    }
    test("既有下拉選單標頭仍可正常開合", dropdownOpened && dropdownClosed);

    test(
      "工具列由右側區自身呈現，容器未接管工具列內容",
      !!toolbar &&
        right.shadowRoot.querySelector('[data-role="common-toolbar"]') === toolbar &&
        container.shadowRoot.querySelector('[data-role="common-toolbar"]') === null
    );

    test(
      "未提前建立第 7 項共視內容區",
      root.querySelector(".co-view-content, [data-role='co-view-content'], [data-role='shared-content']") === null &&
        content?.querySelectorAll("iframe, canvas, object, embed").length === 0 &&
        content?.querySelector('[data-role="basic-placeholder"]')?.textContent.trim() === "尚未建立"
    );

    test(
      "未提前實作裝置／情境適配",
      !/@media|matchMedia|innerWidth|mobile|tablet|deviceType/i.test(rightSource)
    );

    test(
      "未建立中間區跨區連接",
      !/zizai-middle-region|conversation|sendMessage|message-list|result-transfer|cross-region/i.test(rightSource)
    );

    let collapsed = false;
    let expanded = false;
    if (collapseToggle && content) {
      collapseToggle.click();
      const collapsedState = container.getCoordinationSnapshot()
        .find((entry) => entry.regionId === "right-region");
      collapsed = content.hidden &&
        collapseToggle.getAttribute("aria-expanded") === "false" &&
        collapsedState?.regionStateRequest?.collapsed === true;

      collapseToggle.click();
      const expandedState = container.getCoordinationSnapshot()
        .find((entry) => entry.regionId === "right-region");
      expanded = !content.hidden &&
        collapseToggle.getAttribute("aria-expanded") === "true" &&
        expandedState?.regionStateRequest?.collapsed === false;
    }
    test("既有右側區區域級收合與展開仍正常", collapsed && expanded);

    let widthAdjustment = false;
    const middleHandle = middle.shadowRoot.querySelector('[data-role="resize-handle"]');
    if (middleHandle) {
      const leftBefore = width(left);
      const middleBefore = width(middle);
      const rightBefore = width(right);
      drag(middleHandle, 86, 300, 270);
      await frame();
      widthAdjustment =
        width(middle) < middleBefore - 8 &&
        width(right) > rightBefore + 8 &&
        near(width(left), leftBefore);
    }
    test("既有中／右分隔線調整右側區寬度正常，左側區不受影響", widthAdjustment);

    fillRegion(left);
    fillRegion(middle, "conversation");
    fillRegion(right);
    await frame();

    const leftContent = left.shadowRoot.querySelector(".region-content");
    const middleContent = middle.shadowRoot.querySelector(".region-content");
    const rightMaxScroll = Math.max(0, content.scrollHeight - content.clientHeight);
    leftContent.scrollTop = 0;
    middleContent.scrollTop = 0;
    content.scrollTop = Math.min(rightMaxScroll * 0.4, rightMaxScroll);
    await frame();

    test(
      "右側區保有獨立垂直捲動，且左、中區捲動位置不受影響",
      getComputedStyle(content).overflowY === "auto" &&
        rightMaxScroll > 0 &&
        content.scrollTop > 0 &&
        leftContent.scrollTop === 0 &&
        middleContent.scrollTop === 0
    );

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
