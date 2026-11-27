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
  window.__rightDropdownTestLines = lines;

  const render = (message = "") => {
    if (!output) {
      window.__rightDropdownReportError?.("找不到測試結果容器");
      return;
    }
    output.textContent = [
      ...lines,
      `已完成：${completed} 項；通過：${passed}；未通過：${failed}`,
      message
    ].filter(Boolean).join("\n");
    output.dataset.status = message.startsWith("ERROR") ? "error" : "running";
    window.__rightDropdownTestCompleted = completed;
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
    const dropdownHeader = root?.querySelector('[data-role="dropdown-header"]');
    const trigger = root?.querySelector('[data-role="dropdown-trigger"]');
    const menu = root?.querySelector('[data-role="dropdown-menu"]');
    const content = root?.querySelector('[data-role="region-content"]');
    const collapseToggle = root?.querySelector('[data-role="collapse-toggle"]');
    const initialWidths = [width(left), width(middle), width(right)];

    test(
      "下拉選單標頭位置存在，位於右側區基本標頭與內容結構之間",
      !!regionFrame && !!dropdownHeader && !!trigger && !!menu && !!content &&
        regionFrame.dataset.rightRegionVersion === "dropdown-header-1" &&
        dropdownHeader.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING
    );

    test(
      "標頭未定義內容與選項位置均標示尚未建立，未預設選項",
      trigger?.textContent.trim() === "尚未建立" &&
        menu?.hidden === true &&
        menu?.children.length === 1 &&
        menu?.firstElementChild?.tagName === "P" &&
        menu?.firstElementChild?.classList.contains("dropdown-placeholder") &&
        menu?.firstElementChild?.textContent.trim() === "尚未建立" &&
        menu?.textContent.trim() === "尚未建立" &&
        menu?.querySelectorAll("button, a, input, select, [role='menuitem'], [data-dropdown-option]").length === 0 &&
        menu?.getAttribute("aria-label") === "下拉選單選項（尚未建立）" &&
        !trigger?.hasAttribute("data-selected-value")
    );

    const rightSource = await (await fetch(
      new URL("../../src/components/right-region.js?rev=phase9-right-region-2", import.meta.url)
    )).text();
    const capabilitySource = await (await fetch(
      new URL("../../src/capabilities/dropdown.js?rev=dropdown-header-1", import.meta.url)
    )).text();

    test(
      "右側區直接組裝第二階段既有下拉選單能力，未另寫互動能力",
      /import\s*\{[^}]*\bbindDropdown\b[^}]*\}\s*from\s*["']\.\.\/capabilities\/dropdown\.js["']/.test(rightSource) &&
        /bindDropdown\s*\(/.test(rightSource) &&
        /export function bindDropdown\s*\(/.test(capabilitySource) &&
        !/function\s+(handleDropdown|toggleDropdown|bindRightDropdown)\b/.test(rightSource)
    );

    let opened = false;
    let closed = false;
    if (trigger && menu) {
      trigger.click();
      opened = trigger.getAttribute("aria-expanded") === "true" &&
        menu.hidden === false;
      trigger.click();
      closed = trigger.getAttribute("aria-expanded") === "false" &&
        menu.hidden === true;
    }
    test("下拉選單開合由既有能力觸發，操作狀態由右側區持有", opened && closed);

    let selectedLocally = false;
    if (trigger && menu) {
      const option = document.createElement("button");
      option.type = "button";
      option.dataset.dropdownOption = "temporary-test-value";
      option.setAttribute("role", "menuitem");
      option.textContent = "暫存測試選項";
      menu.append(option);
      trigger.click();
      option.click();
      selectedLocally =
        trigger.dataset.selectedValue === "temporary-test-value" &&
        trigger.textContent.trim() === "暫存測試選項" &&
        menu.hidden === true &&
        trigger.getAttribute("aria-expanded") === "false" &&
        !container.shadowRoot.querySelector("[data-dropdown-option]") &&
        !container.shadowRoot.querySelector("[data-selected-value]");
      option.remove();
      trigger.textContent = "尚未建立";
      delete trigger.dataset.selectedValue;
    }
    test("選項及選取狀態由右側區自身保有，未建立全域資料或集中狀態", selectedLocally);

    test(
      "未提前實作第 6、7 項、裝置適配或中間區跨區連接",
      root.querySelector(".common-toolbar, .common-tools, .tool-list, [data-role*='common-tool'], [data-role='co-view-content'], .co-view-content") === null &&
        !/@media|matchMedia|innerWidth|mobile|tablet|deviceType/i.test(rightSource) &&
        !/zizai-middle-region|conversation|sendMessage|message-list|result-transfer|cross-region/i.test(rightSource) &&
        root.querySelectorAll("button").length === 2
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
      drag(middleHandle, 85, 300, 270);
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
