# 陀螺抽選助手

手機優先的 BEYBLADE X 個人抽選整理工具。資料由 Excel 轉成靜態 JSON，已抽狀態保存在瀏覽器 `localStorage`。

支援 LINE 1／LINE 2 兩套獨立抽選進度。Samsung Dual Messenger 無法由一般網頁強制指定第二個 App；使用第二個 LINE 時可按「複製」後切換至帶橘色標記的 LINE 貼上連結。

## 使用方式

```bash
pnpm install
pnpm run import:data path/to/source.xlsx 2026-09-round-1 "9月新一輪抽選"
pnpm run dev
```

每次匯入都必須指定檔案與輪次代號，避免誤匯入舊 Excel。若日期已確認，可直接用日期作為代號：

```bash
pnpm run import:data path/to/source.xlsx YYYY-MM-DD
```

正式建置：

```bash
pnpm run build
```

## 更新資料

1. 更新 Excel 的「雙北20店」、「店家商品」、「商品優先級」與「非FUNBOX店家」。
2. 執行 `pnpm run import:data <Excel路徑> <輪次代號> [顯示名稱]`。同一輪補資料須沿用同一代號；新一輪須換新代號，已抽紀錄才不會混用。9 月這輪使用 `2026-09-round-1`，日期尚未確認，因此未設定開始或截止日。
3. 檢查終端列出的未知商品、店家或無效網址警告。
4. 執行 `pnpm run build`。

GitHub Pages workflow 會在 `main` 分支更新時自動建置與部署。首次使用時，請在 GitHub repository 的 Pages 設定中選擇 **GitHub Actions** 作為來源。
