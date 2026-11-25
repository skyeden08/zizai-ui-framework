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

  window.__resizeTestLines = lines;
  window.__resizeTestCompleted = completed;

  const render = (message = "") => {
    if (!results) {
      window.__resizeTestReportError?.("找不到結果容器 #results");
      return;
    }
    results.textContent = [
      ...lines,
      `已完成：${completed} 項；通過：${passed}；未通過：${failed}`,
      message
    ].filter(Boolean).join("\n");
    results.dataset.status = message.startsWith("ERROR") ? "error" : "running";
    window.__resizeTestCompleted = completed;
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
  const width = (region) => region.getBoundingClientRect().width;
  const closeTo = (actual, expected, tolerance = 2) =>
    Math.abs(actual - expected) <= tolerance;

  const drag = async (region, deltaX, pointerId) => {
    const handle = region.shadowRoot.querySelector('[data-role="resize-handle"]');
    if (!handle) throw new Error("找不到區域拖曳控制");
    // Synthetic pointer events are used by this browser regression page.
    // Pointer capture is a browser-managed operation and is neutralized here
    // so the event sequence can exercise the component's real drag callbacks.
    handle.setPointerCapture = () => {};
    const startX = 200;
    const eventInit = {
      bubbles: true,
      cancelable: true,
      pointerId,
      isPrimary: true,
      button: 0,
      clientX: startX
    };
    handle.dispatchEvent(new PointerEvent("pointerdown", eventInit));
    handle.dispatchEvent(new PointerEvent("pointermove", {
      ...eventInit,
      buttons: 1,
      clientX: startX + deltaX
    }));
    handle.dispatchEvent(new PointerEvent("pointerup", {
      ...eventInit,
      buttons: 0,
      clientX: startX + deltaX
    }));
    await nextFrame();
  };

  try {
    if (!results) throw new Error("找不到結果容器 #results");
    if (!fixture) throw new Error("找不到測試掛載容器 #fixture");
    if (typeof PointerEvent !== "function") {
      throw new Error("目前瀏覽器不支援 PointerEvent，無法執行拖曳回歸檢查");
    }

    const [
      { LayoutContainer },
      { TopRegion },
      { LeftRegion },
      { MiddleRegion },
      { RightRegion }
    ] = await Promise.all([
      import("../../src/components/layout-container.js"),
      import("../../src/components/top-region.js"),
      import("../../src/components/left-region.js"),
      import("../../src/components/middle-region.js"),
      import("../../src/components/right-region.js")
    ]);

    const definitions = [
      ["zizai-layout-container", LayoutContainer],
      ["zizai-top-region", TopRegion],
      ["zizai-left-region", LeftRegion],
      ["zizai-middle-region", MiddleRegion],
      ["zizai-right-region", RightRegion]
    ];
    for (const [name, constructor] of definitions) {
      if (!customElements.get(name)) customElements.define(name, constructor);
    }

    const container = document.createElement("zizai-layout-container");
    container.style.width = "1000px";
    container.style.height = "600px";
    const top = document.createElement("zizai-top-region");
    const left = document.createElement("zizai-left-region");
    const middle = document.createElement("zizai-middle-region");
    const right = document.createElement("zizai-right-region");
    container.append(top, left, middle, right);
    fixture.append(container);
    container.connectRegion(left);
    container.connectRegion(middle);
    container.connectRegion(right);
    await nextFrame();

    const initial = [width(left), width(middle), width(right)];
    record(
      "初始寬度維持 2:4:4",
      closeTo(initial[1] / initial[0], 2, 0.03) &&
        closeTo(initial[2] / initial[0], 2, 0.03),
      `實際寬度：${initial.map((value) => value.toFixed(1)).join(" / ")}`
    );

    await drag(left, 40, 101);
    const afterLeftDrag = [width(left), width(middle), width(right)];
    record(
      "拖左／中邊界只調整左側區與中間區",
      closeTo(afterLeftDrag[0], initial[0] + 40) &&
        closeTo(afterLeftDrag[1], initial[1] - 40) &&
        closeTo(afterLeftDrag[2], initial[2]),
      `拖曳前：${initial.map((value) => value.toFixed(1)).join(" / ")}；拖曳後：${afterLeftDrag.map((value) => value.toFixed(1)).join(" / ")}`
    );

    await drag(middle, 40, 102);
    const afterMiddleDrag = [width(left), width(middle), width(right)];
    record(
      "拖中／右邊界只調整中間區與右側區",
      closeTo(afterMiddleDrag[0], afterLeftDrag[0]) &&
        closeTo(afterMiddleDrag[1], afterLeftDrag[1] + 40) &&
        closeTo(afterMiddleDrag[2], afterLeftDrag[2] - 40),
      `拖曳後：${afterMiddleDrag.map((value) => value.toFixed(1)).join(" / ")}`
    );

    await drag(right, -30, 103);
    const afterRightExpand = [width(left), width(middle), width(right)];
    record(
      "右側區可再次變寬，且只由中間區讓出寬度",
      closeTo(afterRightExpand[0], afterMiddleDrag[0]) &&
        closeTo(afterRightExpand[1], afterMiddleDrag[1] - 30) &&
        closeTo(afterRightExpand[2], afterMiddleDrag[2] + 30),
      `拖曳後：${afterRightExpand.map((value) => value.toFixed(1)).join(" / ")}`
    );

    await drag(right, 20, 104);
    const afterRightShrink = [width(left), width(middle), width(right)];
    record(
      "右側區可再次變窄，且只由中間區取得寬度",
      closeTo(afterRightShrink[0], afterRightExpand[0]) &&
        closeTo(afterRightShrink[1], afterRightExpand[1] + 20) &&
        closeTo(afterRightShrink[2], afterRightExpand[2] - 20),
      `拖曳後：${afterRightShrink.map((value) => value.toFixed(1)).join(" / ")}`
    );

    await drag(middle, -15, 105);
    const afterRepeatedPairDrag = [width(left), width(middle), width(right)];
    record(
      "拖曳後相鄰兩區仍可繼續互相調整",
      closeTo(afterRepeatedPairDrag[0], afterRightShrink[0]) &&
        closeTo(afterRepeatedPairDrag[1], afterRightShrink[1] - 15) &&
        closeTo(afterRepeatedPairDrag[2], afterRightShrink[2] + 15),
      `拖曳後：${afterRepeatedPairDrag.map((value) => value.toFixed(1)).join(" / ")}`
    );

    const leftContent = left.shadowRoot.querySelector(".region-content");
    const middleContent = middle.shadowRoot.querySelector(".region-content");
    const rightContent = right.shadowRoot.querySelector(".region-content");
    record(
      "三區獨立捲動設定維持",
      [leftContent, middleContent, rightContent].every(
        (content) => getComputedStyle(content).overflowY === "auto"
      )
    );

    const topPosition = getComputedStyle(top).position;
    const containerStyle = getComputedStyle(container);
    record(
      "上方區固定與容器分隔線設定維持",
      topPosition === "sticky" &&
        containerStyle.columnGap === "1px" &&
        containerStyle.backgroundColor !== "rgba(0, 0, 0, 0)",
      `上方區 position=${topPosition}；column-gap=${containerStyle.columnGap}；背景=${containerStyle.backgroundColor}`
    );

    const leftToggle = left.shadowRoot.querySelector('[data-role="collapse-toggle"]');
    leftToggle.click();
    const collapsed = left.shadowRoot.querySelector(".region-content").hidden;
    leftToggle.click();
    const expanded = !left.shadowRoot.querySelector(".region-content").hidden;
    record("收合與展開行為維持", collapsed && expanded);

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
  window.__resizeTestReportError?.(
    error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  );
}
