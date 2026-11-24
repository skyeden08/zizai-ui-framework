import { mountBasicTestUnit } from "../src/main.js";

const app = document.querySelector("#app");
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

try {
  const firstUnit = app.querySelector(":scope > zizai-test-basic-unit");

  check("測試頁面掛載位置存在", app instanceof HTMLElement);
  check("基本單元已註冊", Boolean(customElements.get("zizai-test-basic-unit")));
  check("啟動後載入一個基本單元", Boolean(firstUnit));
  check(
    "基本單元內容已建立",
    Boolean(firstUnit?.shadowRoot?.querySelector('[data-role="test-basic-unit-content"]'))
  );

  const unrelatedElement = document.createElement("span");
  unrelatedElement.dataset.testRole = "unrelated";
  app.append(unrelatedElement);

  firstUnit?.remove();

  check(
    "移除基本單元後不留掛載節點",
    !app.querySelector(":scope > zizai-test-basic-unit")
  );
  check(
    "移除基本單元不影響無關元素",
    unrelatedElement.isConnected && unrelatedElement.parentElement === app
  );

  const replacementUnit = mountBasicTestUnit(app);

  check(
    "可載入替換單元",
    Boolean(replacementUnit?.isConnected && replacementUnit !== firstUnit)
  );
  check(
    "替換後只保留一個基本單元",
    app.querySelectorAll(":scope > zizai-test-basic-unit").length === 1
  );

  const sameUnit = mountBasicTestUnit(app);
  check("重複呼叫掛載不產生重複單元", sameUnit === replacementUnit);
  check(
    "替換後無關元素仍保留",
    unrelatedElement.isConnected && unrelatedElement.parentElement === app
  );

  replacementUnit.remove();
  unrelatedElement.remove();

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
