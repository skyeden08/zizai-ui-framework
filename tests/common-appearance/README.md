# 第二階段第 1 項：共用外觀測試說明

## 能力與介面

沿用既有 `styles/variables.css` 作為共用外觀能力提供者。本檔只提供 CSS Custom Properties，不提供元件結構、全域元件選擇器或集中式樣式管理；各消費者在自己的封裝樣式中按需使用 `var(--ui-...)`。

目前介面沿用第一階段已確認的 10 個變數，不新增、不改名：

- 文字：`--ui-font-family`
- 顏色：`--ui-color-page`、`--ui-color-surface`、`--ui-color-text`、`--ui-color-muted`、`--ui-color-border`、`--ui-color-accent`
- 間距：`--ui-space-small`、`--ui-space-medium`
- 圓角：`--ui-radius`

## 靜態檢查

- 共用外觀提供者只宣告 CSS Variables，不包含元件選擇器或元件結構。
- 測試頁直接載入共用外觀樣式表，不載入平台啟動入口。
- 替換用樣式表提供完全相同的變數名稱集合。
- 測試消費者使用自己的 Shadow DOM 樣式；另一個消費者保留自身固定樣式。

## GitHub Pages 瀏覽器實測

公開測試頁：

`https://skyeden08.github.io/zizai-ui-framework/tests/common-appearance/`

頁面會自動執行測試，預期 8 項通過、0 項未通過。瀏覽器另須確認：

1. Network 中 `variables.css` 請求為 HTTP 200。
2. 頁面顯示測試結果，確認 CSS Variables 可由獨立消費者使用。
3. 既有基本單元與共用外觀同頁並存，且保有自身樣式的消費者不受影響。
4. 測試程式替換為另一份使用相同變數介面的樣式表後，使用變數的消費者外觀改變；自身樣式消費者不變。

本測試的組合檢查涵蓋既有基本單元與獨立樣式消費者；第二階段其他通用能力尚未建立，因此與那些能力的實際組合測試仍待後續具備對象後執行，不得提前標示通過。

## 狀態

程式碼寫入及靜態檢查不等於瀏覽器實測。GitHub Pages 實測完成前，本項維持「待定」。
