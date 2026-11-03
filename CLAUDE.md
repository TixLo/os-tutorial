# os-tutorial 專案規範

通用規範在個人層級 `~/.claude/CLAUDE.md`（繁中溝通、畫面與程式碼註解只用英文、
自動 commit/push、UI 需支援 PC / iPhone / iPhone Fold）。此處只記錄本專案特有的部分。

## Commit
依個人層級的 `commit` skill（全英文、Conventional Commits）。本 repo 習慣不加 scope，
里程碑 commit 在標題結尾標上里程碑編號，例如 `feat: add day 4, drawing with C (M5a)`。

## 部署
- GitHub Pages（legacy，`main` 分支根目錄），push 後約 1 分鐘上線：
  https://tixlo.github.io/os-tutorial/
- 純靜態網站，沒有 build step。本機預覽：`python3 -m http.server 8123`
  （`.claude/launch.json` 的 `os-tutorial`）。

## 檢查
- `node tools/check.mjs`：檢查所有章節資料（步驟欄位、程式碼 tag、記憶體區塊、
  `{0x…}` 位址連結、里程碑標籤長度、畫面文字不含中日文）。commit 前必須通過。

## 內容決策（2026-11-04 與使用者確認）
1. 章節照書一天一章（Day 0 是本站加的）。
2. 細節程度：Day 0–8 拆成細步驟；越後面越偏重點，Day 23–30 只講重點（約 6–10 步）。
3. TERMINAL：Day 17 前當除錯器視角（暫存器、記憶體 dump），Day 17 起變成 OS 的 console。
4. 開發方式：每天直接做完、push；使用者之後一天一天對照書本檢查，有錯再回報修正。
5. 程式碼都是本站自己寫的教學版，不抄書（包含字型：用本站自製的點陣字型）。

## 本站 OS 的記憶體配置（從 Day 3 延續，之後各天都要一致）
- `0x7C00` IPL；`0x8000`–`0x34FFF` 複製進來的磁碟前 10 個磁柱；kernel 從 `0xC200` 開始
- `0x0FF0` boot info；stack 頂端 `0x90000`
- `0xA0000` VRAM（320 × 200）
- `0x26F800` IDT、`0x270000` GDT（Day 5 起，與書相同）
- `0x3C0000` 記憶體管理表、`0x400000` 以上是可分配的空閒記憶體（Day 9 起，與書相同）
- 機器記憶體 32 MiB（與書使用的 QEMU 設定相同）
