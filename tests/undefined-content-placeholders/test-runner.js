import { LayoutContainer } from "../../src/components/layout-container.js";
import { TopRegion } from "../../src/components/top-region.js";
import { LeftRegion } from "../../src/components/left-region.js";
import { MiddleRegion } from "../../src/components/middle-region.js";
import { RightRegion } from "../../src/components/right-region.js?rev=phase9-right-region-2";

let started = false;

function defineElement(name, constructor) {
  if (!customElements.get(name)) customElements.define(name, constructor);
}

async function startTests() {
  if (started) return;
  started = true;

  const output = document.getElementById("results");
  const fixture = document.getElementById("fixture");
  const regressionFixture = document.getElementById("regression-fixture");
  const lines = [];
  let completed = 0;
  let passed = 0;
  let failed = 0;

  const render = (message = "") => {
    output.textContent = [
      ...lines,
      "已完成：" + completed + " 項；通過：" + passed + "；未通過：" + failed,
      message
    ].filter(Boolean).join("\n");
    output.dataset.status = message.startsWith("ERROR") ? "error" : "running";
  };

  const record = (name, ok, detail = "") => {
    completed += 1;
    if (ok) {
      passed += 1;
      lines.push("PASS  " + name);
    } else {
      failed += 1;
      lines.push("FAIL  " + name + (detail ? " — " + detail : ""));
    }
    render();
  };

  const textIs = (element, expected) =>
    Boolean(element) && element.textContent.trim() === expected;

  try {
    if (!output || !fixture || !regressionFixture) {
      throw new Error("缺少測試結果區、掛載區或既有回歸測試掛載區");
    }

    defineElement("zizai-layout-container", LayoutContainer);
    defineElement("zizai-top-region", TopRegion);
    defineElement("zizai-left-region", LeftRegion);
    defineElement("zizai-middle-region", MiddleRegion);
    defineElement("zizai-right-region", RightRegion);

    const container = document.createElement("zizai-layout-container");
    container.style.height = "36rem";
    const top = document.createElement("zizai-top-region");
    const left = document.createElement("zizai-left-region");
    const middle = document.createElement("zizai-middle-region");
    const right = document.createElement("zizai-right-region");

    container.append(top, left, middle, right);
    fixture.replaceChildren(container);
    container.connectRegion(left);
    container.connectRegion(middle);
    container.connectRegion(right);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const topRoot = top.shadowRoot;
    const leftRoot = left.shadowRoot;
    const middleRoot = middle.shadowRoot;
    const rightRoot = right.shadowRoot;

    const topSlot = topRoot.querySelector("slot");
    const topPlaceholder = topSlot && topSlot.querySelector("p");
    record(
      "上方區內容掛載位置存在，並標示尚未建立",
      Boolean(topSlot) && Boolean(topPlaceholder) &&
        topPlaceholder.textContent.includes("尚未建立"),
      topPlaceholder ? topPlaceholder.textContent.trim() : "找不到上方區內容掛載位置或標示"
    );

    const leftContent = leftRoot.querySelector(".region-content");
    const leftSlot = leftContent && leftContent.querySelector("slot");
    const leftPlaceholder = leftSlot && leftSlot.querySelector("p");
    record(
      "左側區內容掛載位置存在，並標示尚未建立",
      Boolean(leftContent) && Boolean(leftSlot) && textIs(leftPlaceholder, "尚未建立"),
      leftPlaceholder ? leftPlaceholder.textContent.trim() : "找不到左側區內容掛載位置或標示"
    );

    const middleDropdownHeader = middleRoot.querySelector('[data-role="dropdown-header"]');
    const middleTrigger = middleRoot.querySelector('[data-role="dropdown-trigger"]');
    const middleMenu = middleRoot.querySelector('[data-role="dropdown-menu"]');
    const middleOptions = middleMenu ? Array.from(middleMenu.querySelectorAll("[data-dropdown-option]")) : [];
    record(
      "中間區需求主題選項僅有尚未建立，沒有預設分類或其他選項",
      Boolean(middleDropdownHeader) &&
        Boolean(middleTrigger) &&
        middleTrigger.textContent.trim() === "需求主題：尚未建立" &&
        middleOptions.length === 1 &&
        textIs(middleOptions[0], "尚未建立") &&
        middleMenu.children.length === 1,
      "選項數：" + middleOptions.length + "；選單子項數：" + (middleMenu ? middleMenu.children.length : 0)
    );

    const conversation = middleRoot.querySelector('[data-role="conversation-position"]');
    const conversationSlot = conversation && conversation.querySelector('slot[name="conversation"]');
    const conversationPlaceholder = conversationSlot && conversationSlot.querySelector("p");
    record(
      "中間區對話呈現位置存在，並標示尚未建立",
      Boolean(conversation) &&
        Boolean(conversationSlot) &&
        textIs(conversationPlaceholder, "尚未建立"),
      conversationPlaceholder ? conversationPlaceholder.textContent.trim() : "找不到對話呈現位置或標示"
    );

    const inputPosition = middleRoot.querySelector('[data-role="input-position"]');
    const inputSlot = inputPosition && inputPosition.querySelector('slot[name="input"]');
    const inputPlaceholder = inputSlot && inputSlot.querySelector("p");
    record(
      "中間區對話輸入位置存在，並標示尚未建立",
      Boolean(inputPosition) &&
        Boolean(inputSlot) &&
        textIs(inputPlaceholder, "尚未建立"),
      inputPlaceholder ? inputPlaceholder.textContent.trim() : "找不到對話輸入位置或標示"
    );

    const rightDropdownHeader = rightRoot.querySelector('[data-role="dropdown-header"]');
    const rightTrigger = rightRoot.querySelector('[data-role="dropdown-trigger"]');
    const rightMenu = rightRoot.querySelector('[data-role="dropdown-menu"]');
    const rightMenuPlaceholder = rightMenu && rightMenu.querySelector(".dropdown-placeholder");
    const rightDefinedOptions = rightMenu ? rightMenu.querySelectorAll("[data-dropdown-option], [role='menuitem'], button") : [];
    record(
      "右側區下拉選單標頭選項位置存在，並標示尚未建立，沒有預設選項",
      Boolean(rightDropdownHeader) &&
        textIs(rightTrigger, "尚未建立") &&
        textIs(rightMenuPlaceholder, "尚未建立") &&
        rightMenu.children.length === 1 &&
        rightDefinedOptions.length === 0,
      "選單子項數：" + (rightMenu ? rightMenu.children.length : 0) +
        "；實際選項數：" + rightDefinedOptions.length
    );

    const toolbar = rightRoot.querySelector('[data-role="common-toolbar"]');
    const toolbarPlaceholder = rightRoot.querySelector('[data-role="common-toolbar-placeholder"]');
    const toolbarItems = toolbar ? toolbar.querySelectorAll("button, [role='button'], [data-tool]") : [];
    record(
      "右側區常用工具列位置存在，並標示尚未建立，沒有預設工具項目",
      Boolean(toolbar) &&
        textIs(toolbarPlaceholder, "尚未建立") &&
        toolbar.children.length === 1 &&
        toolbarItems.length === 0,
      "工具列子項數：" + (toolbar ? toolbar.children.length : 0) +
        "；工具項目數：" + toolbarItems.length
    );

    const coView = rightRoot.querySelector('[data-role="co-view-content"]');
    const coViewSlot = coView && coView.querySelector('slot[name="co-view-content"]');
    const coViewPlaceholder = coViewSlot && coViewSlot.querySelector("p");
    record(
      "右側區共視內容區位置存在，並標示尚未建立",
      Boolean(coView) &&
        Boolean(coViewSlot) &&
        textIs(coViewPlaceholder, "尚未建立"),
      coViewPlaceholder ? coViewPlaceholder.textContent.trim() : "找不到共視內容區或標示"
    );

    const allDropdownOptions = [
      ...Array.from(topRoot.querySelectorAll("[data-dropdown-option]")),
      ...Array.from(leftRoot.querySelectorAll("[data-dropdown-option]")),
      ...Array.from(middleRoot.querySelectorAll("[data-dropdown-option]")),
      ...Array.from(rightRoot.querySelectorAll("[data-dropdown-option]"))
    ];
    record(
      "四區沒有預設分類、額外下拉選項或工具項目",
      allDropdownOptions.length === 1 &&
        textIs(allDropdownOptions[0], "尚未建立") &&
        toolbarItems.length === 0 &&
        rightDefinedOptions.length === 0,
      "下拉選項標記數：" + allDropdownOptions.length +
        "；常用工具項目數：" + toolbarItems.length
    );

    const regressionFrame = document.createElement("iframe");
    regressionFrame.id = "regression-frame";
    regressionFrame.title = "既有區域收合、拖曳、獨立捲動及 2:4:4 回歸測試";
    const regressionResult = await new Promise(resolve => {
      let settled = false;
      let observer = null;
      const finish = (ok, detail) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        if (observer) observer.disconnect();
        resolve({ ok, detail });
      };
      const timeout = setTimeout(
        () => finish(false, "既有回歸測試 30 秒內未回報結果"),
        30000
      );

      regressionFrame.addEventListener("load", () => {
        const childResults = regressionFrame.contentDocument &&
          regressionFrame.contentDocument.getElementById("results");
        if (!childResults) {
          finish(false, "既有回歸測試頁未產生結果區");
          return;
        }
        const readStatus = () => {
          const status = childResults.dataset.status;
          if (status === "passed") finish(true, childResults.textContent.trim());
          else if (status === "failed" || status === "error") {
            finish(false, childResults.textContent.trim());
          }
        };
        observer = new MutationObserver(readStatus);
        observer.observe(childResults, {
          attributes: true,
          childList: true,
          subtree: true
        });
        readStatus();
      }, { once: true });

      regressionFrame.src = "../region-resize-coordination/?rev=phase9-right-region-2";
      regressionFixture.replaceChildren(regressionFrame);
    });

    record(
      "沿用既有回歸測試：收合、拖曳、獨立捲動及 2:4:4",
      regressionResult.ok,
      regressionResult.detail
    );

    render(failed === 0 ? "測試結束：全部通過" : "測試結束：有項目未通過");
    output.dataset.status = failed === 0 ? "passed" : "failed";
  } catch (error) {
    const message = error instanceof Error
      ? error.name + ": " + error.message
      : String(error);
    lines.push("ERROR  " + message);
    render("ERROR 已中止：" + message);
    output.dataset.status = "error";
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startTests, { once: true });
} else {
  startTests();
}