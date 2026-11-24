import { TestBasicUnit } from "../../src/components/test-basic-unit.js";

const stylesheet = document.querySelector("#appearance-contract");
const fixtures = document.querySelector("#fixtures");
const summary = document.querySelector("#test-summary");
const results = document.querySelector("#test-results");

let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  const item = document.createElement("li");
  item.dataset.result = condition ? "pass" : "fail";
  item.textContent = `${condition ? "通過" : "未通過"}：${name}${detail ? `（${detail}）` : ""}`;
  results.append(item);
  if (condition) passed += 1;
  else failed += 1;
}

function createShadowConsumer(container, selector, cssText, content) {
  const host = document.createElement("div");
  host.id = selector;
  const root = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = cssText;
  const surface = document.createElement("div");
  surface.className = "surface";
  surface.textContent = content;
  root.append(style, surface);
  container.append(host);
  return { host, root, surface };
}

function waitForStylesheet(link) {
  return new Promise((resolve, reject) => {
    link.addEventListener("load", resolve, { once: true });
    link.addEventListener("error", () => reject(new Error("替換樣式表載入失敗。")), { once: true });
  });
}

async function replaceStylesheet(href) {
  const loaded = waitForStylesheet(stylesheet);
  stylesheet.href = href;
  await loaded;
}

try {
  if (!customElements.get("zizai-test-basic-unit")) {
    customElements.define("zizai-test-basic-unit", TestBasicUnit);
  }

  const tokenConsumer = createShadowConsumer(
    document.querySelector("#appearance-consumer"),
    "token-consumer",
    `:host { display: block; }
     .surface {
       color: var(--ui-color-accent);
       background: var(--ui-color-surface);
       padding: var(--ui-space-medium);
       border-radius: var(--ui-radius);
     }`,
    "獨立共用外觀消費者"
  );

  const localConsumer = createShadowConsumer(
    document.querySelector("#local-style-consumer"),
    "local-style-consumer",
    `:host { display: block; }
     .surface {
       color: rgb(17, 34, 51);
       background: rgb(238, 242, 246);
       padding: 7px;
     }`,
    "保有自身樣式的獨立消費者"
  );

  const existingUnit = document.createElement("zizai-test-basic-unit");
  document.querySelector("#existing-unit").append(existingUnit);

  const rootAccent = getComputedStyle(document.documentElement)
    .getPropertyValue("--ui-color-accent").trim();
  const tokenColorBefore = getComputedStyle(tokenConsumer.surface).color;
  const localColorBefore = getComputedStyle(localConsumer.surface).color;
  const localPaddingBefore = getComputedStyle(localConsumer.surface).padding;
  const baseHref = stylesheet.href;

  check("共用外觀樣式表已獨立載入", Boolean(stylesheet.sheet));
  check("CSS Variables 介面可讀取", rootAccent.length > 0);
  check(
    "消費者不依賴啟動入口即可使用共用外觀",
    Boolean(tokenColorBefore && tokenConsumer.root.querySelector(".surface"))
  );
  check(
    "既有基本單元可與共用外觀並存",
    Boolean(existingUnit.shadowRoot?.querySelector('[data-role="test-basic-unit-content"]'))
  );
  check(
    "消費者自身樣式不受共用外觀覆寫",
    localColorBefore === "rgb(17, 34, 51)" && localPaddingBefore === "7px"
  );

  const alternateHref = new URL("./alternate-variables.css", import.meta.url).href;
  await replaceStylesheet(alternateHref);

  const alternateAccent = getComputedStyle(document.documentElement)
    .getPropertyValue("--ui-color-accent").trim();
  const tokenColorAfter = getComputedStyle(tokenConsumer.surface).color;
  const localColorAfter = getComputedStyle(localConsumer.surface).color;
  const localPaddingAfter = getComputedStyle(localConsumer.surface).padding;

  check(
    "替換提供者後仍遵守相同 CSS Variables 介面",
    alternateAccent.length > 0 && alternateAccent !== rootAccent
  );
  check(
    "替換共用外觀後消費者自動取得新樣式",
    tokenColorAfter !== tokenColorBefore
  );
  check(
    "替換共用外觀不改動消費者自身樣式",
    localColorAfter === localColorBefore && localPaddingAfter === localPaddingBefore
  );

  await replaceStylesheet(baseHref);

  summary.textContent = `測試結束：${passed} 項通過，${failed} 項未通過。`;
  summary.dataset.testStatus = failed === 0 ? "passed" : "failed";
} catch (error) {
  failed += 1;
  summary.textContent = `測試中止：${error instanceof Error ? error.message : String(error)}`;
  summary.dataset.testStatus = "failed";
  const item = document.createElement("li");
  item.dataset.result = "fail";
  item.textContent = summary.textContent;
  results.append(item);
}
