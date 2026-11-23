# ZIZAI UI Framework

本儲存庫為 `skyeden08/zizai-ui-framework`，用於承載 ZIZAI UI 純框架的全新獨立重建與分階段驗證成果。舊版程式與 Git 歷史僅供追溯，不複製、不搬移、不修補、不沿用。

## 分支結構與定位

採用 `main` + `phase-N` 雙層分支結構：

- `main`：正式成果分支，只納入通過階段驗證及使用者驗收的成果。
- `phase-N`：各階段獨立工作分支（如 `phase-1`），用於各階段獨立建置與驗證。

## 初始化方式

空白儲存庫先在 `main` 建立最小初始化 Commit，再從該 Commit 建立 `phase-1`。初始化 Commit 僅包含 `README.md`，不包含 `.gitignore`、UI 程式、元件、架構檔案或範例功能。

## 階段成果納入原則

各階段於對應的 `phase-N` 分支獨立執行與驗證，須通過階段驗證及使用者驗收成立後，才能納入 `main`。

## 合併與階段標籤方式

階段驗收成立後，使用 Merge Commit 合併回 `main`，不使用 Squash Merge。每個階段合併後建立階段標籤，第一階段命名為 `v0.1.0-phase1`。
