import { LayoutContainer } from "../../src/components/layout-container.js";
import { LeftRegion } from "../../src/components/left-region.js";
import { MiddleRegion } from "../../src/components/middle-region.js";
import { RightRegion } from "../../src/components/right-region.js?rev=co-view-content-1";

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
  window.__rightCoViewTestLines = lines;

  const render = (message = "") => {
    if (!output) {
      window.__rightCoViewReportError?.("找不到測試結果容器");
      return;
    }
    output.textContent = [
      ...lines,
      `已完成：${completed} 項；通過：${passed}；未通過：${failed}`,
      message
    ].filter(Boolean).join("\\n");
    output.dataset.status = message.startsWith("ERROR") ? "error" : "running";
    window.__rightCoViewTestCompleted = completed;
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
    for (let index = 0; index < 36; index += 1) {
      const paragraph = document.createElement("p");
      paragraph.textContent = `${region.localName} 測試夾具內容 ${index + 1}：驗證區域獨立垂直捲動。`;
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
    if (!output || !fixture) throw new Error("缺少測試結果容器或掛載區");
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
    const regionContent = root?.querySelector('[data-role="region-content"]');
    const coView = root?.querySelector('[data-role="co-view-content"]');
    const coViewLabel = coView?.querySelector(".co-view-content-label");
    const coViewSlot = coView?.querySelector('slot[name="co-view-content"]');
    const placeholder = coView?.querySelector('[data-role="co-view-content-placeholder"]');
    const collapseToggle = root?.querySelector('[data-role="collapse-toggle"]');
    const initialWidths = [width(left), width(middle), width(right)];

    test(
      "共視內容區位置存在，位於常用工具列之後並置於右側區主體內容內",
      !!frameElement && !!dropdownHeader && !!toolbar && !!regionContent && !!coView &&
        dropdownHeader.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING &&
        toolbar.compareDocumentPosition(regionContent) & Node.DOCUMENT_POSITION_FOLLOWING &&
        regionContent.contains(coView)
    );

    test(
      "共視內容區具備獨立且可辨識的結構標示",
      coView?.tagName === "SECTION" &&
        coView.getAttribute("role") === "region" &&
        coView.getAttribute("aria-label") === "共視內容區" &&
        coViewLabel?.textContent.trim() === "共視內容區" &&
        coView.dataset.version === "co-view-content-1"
    );

    test(
      "共視內容區尚未定義的內容標示尚未建立",
      placeholder?.textContent.trim() === "尚未建立" &&
        coViewSlot?.assignedElements().length === 0
    );

    test(
      "共視內容區保留自身內容掛載位置，但沒有預置任務成果",
      coViewSlot?.name === "co-view-content" &&
        coView?.querySelectorAll("iframe, canvas, object, embed, img, video, audio, button, input, a").length === 0
    );

    test(
      "共視內容區由右側區自身呈現，容器未接管其內部結構",
      right.shadowRoot.querySelector('[data-role="co-view-content"]') === coView &&
        container.shadowRoot.querySelector('[data-role="co-view-content"]') === null
    );

    const rightSource = await (await fetch(
      new URL("../../src/components/right-region.js?rev=co-view-content-1", import.meta.url)
    )).text();
    const pageSource = await (await fetch(new URL("./index.html", import.meta.url))).text();
    const runnerSource = await (await fetch(new URL("./test-runner.js?rev=co-view-content-1", import.meta.url))).text();

    test(
      "未實作任務成果內容及中間區對話成果跨區連接",
      !["zizai-middle-region", "conversation", "sendMessage", "message-list", "result-transfer", "cross-region", "postMessage"].some((term) => rightSource.toLowerCase().includes(term.toLowerCase()))
    );

    test(
      "未提前實作第 8～10 項總檢查或裝置／情境適配",
      pageSource.includes("不進行第 8～10 項檢查") &&
        !["@media", "matchMedia", "innerWidth", "visualViewport", "devicePixelRatio", "navigator.userAgent"].some((term) => rightSource.includes(term)) &&
        !["通用能力組裝總檢查", "尚未建立標示總檢查", "單獨與組合呈現測試"].some((term) => runnerSource.includes(term))
    );

    test(
      "本項未新增或重寫第二階段通用能力",
      /import\\s*\\{\\s*bindOpenClose\\s*\\}\\s*from\\s*["']\\.\\.\\/capabilities\\/open-close\\.js["']/.test(rightSource) &&
        /import\\s*\\{\\s*bindDropdown,\\s*syncDropdownState\\s*\\}\\s*from\\s*["']\\.\\.\\/capabilities\\/dropdown\\.js["']/.test(rightSource) &&
        !/bindDragAdjustment|bindCommonAppearance|function\\s+(handleOpenClose|handleDropdown|bindRightRegion)/.test(rightSource)
    );

    let collapsed = false;
    let expanded = false;
    if (collapseToggle && regionContent) {
      collapseToggle.click();
      const collapsedState = container.getCoordinationSnapshot()
        .find((entry) => entry.regionId === "right-region");
      collapsed = regionContent.hidden &&
        collapseToggle.getAttribute("aria-expanded") === "false" &&
        collapsedState?.regionStateRequest?.collapsed === true;

      collapseToggle.click();
      const expandedState = container.getCoordinationSnapshot()
        .find((entry) => entry.regionId === "right-region");
      expanded = !regionContent.hidden &&
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
      drag(middleHandle, 97, 300, 270);
      await frame();
      widthAdjustment =
        width(middle) < middleBefore - 8 &&
        width(right) > rightBefore + 8 &&
        near(width(left), leftBefore);
    }
    test("既有中／右分隔線調整右側區寬度正常，左側區不受影響", widthAdjustment);

    fillRegion(left);
    fillRegion(middle, "conversation");
    fillRegion(right, "co-view-content");
    await frame();

    const leftContent = left.shadowRoot.querySelector(".region-content");
    const middleContent = middle.shadowRoot.querySelector(".region-content");
    const rightMaxScroll = Math.max(0, regionContent.scrollHeight - regionContent.clientHeight);
    leftContent.scrollTop = 0;
    middleContent.scrollTop = 0;
    regionContent.scrollTop = Math.min(rightMaxScroll * 0.45, rightMaxScroll);
    await frame();

    test(
      "右側區獨立垂直捲動正常，左、中區捲動位置不受影響",
      getComputedStyle(regionContent).overflowY === "auto" &&
        rightMaxScroll > 0 &&
        regionContent.scrollTop > 0 &&
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
