# 快速開始指南

## 🎯 項目重構完成！

你的旅遊網頁應用已經成功轉換為現代的 React + TypeScript + Vite 項目。

## 📦 安裝並運行

### 第一步：安裝依賴
```bash
cd /Users/sakurali/Documents/Code
npm install
```

### 第二步：啟動開發伺服器
```bash
npm run dev
```

應用將在 `http://localhost:5173` 打開。

## 📋 項目結構變化

### 從單一文件到模塊化結構

**舊結構：**
```
travel_app.tsx (1167 行 - 包含所有功能)
```

**新結構：**
```
src/
├── components/        # UI 元件
├── hooks/            # React hooks
├── utils/            # 工具函數
├── types/            # TypeScript 型別
├── styles/           # 樣式文件
└── App.tsx           # 主應用
```

## 🔄 遷移計畫

原 `travel_app.tsx` 中的功能分布如下：

| 功能 | 遷移到 | 狀態 |
|------|--------|------|
| 顏色常數 | `src/utils/constants.ts` | ✅ 完成 |
| 字體定義 | `src/utils/constants.ts` | ✅ 完成 |
| 工具函數 (uid, today 等) | `src/utils/helpers.ts` | ✅ 完成 |
| 類型定義 | `src/types/index.ts` | ✅ 完成 |
| PDF 生成 | `src/utils/pdf.ts` | ⏳ 待遷移 |
| 行程標籤頁 | `src/components/tabs/ItineraryTab.tsx` | ⏳ 待建立 |
| 景點標籤頁 | `src/components/tabs/AttractionsTab.tsx` | ⏳ 待建立 |
| 記帳標籤頁 | `src/components/tabs/ExpensesTab.tsx` | ⏳ 待建立 |
| 行李標籤頁 | `src/components/tabs/LuggageTab.tsx` | ⏳ 待建立 |
| 住宿交通標籤頁 | `src/components/tabs/AccommodationsTab.tsx` | ⏳ 待建立 |

## 🎨 可用的通用元件

現在你可以使用以下已準備好的元件：

```typescript
// 按鈕
<Button variant="primary" size="normal" icon="✨">
  新增行程
</Button>

// 卡片
<Card>
  內容
</Card>

// 模態框
<Modal title="編輯" onClose={handleClose} width={480}>
  模態內容
</Modal>

// 表單欄位
<Field label="名稱" required>
  <input type="text" />
</Field>
```

## 🚀 下一步任務

### 優先順序 1（建議先做這些）
1. [ ] 創建 Badge 元件
2. [ ] 建立 ItineraryTab 元件
3. [ ] 實現行程管理邏輯

### 優先順序 2
4. [ ] 建立 AttractionsTab
5. [ ] 建立 ExpensesTab
6. [ ] 遷移 PDF 生成函數

### 優先順序 3
7. [ ] 建立 AccommodationsTab
8. [ ] 建立 LuggageTab
9. [ ] 實現匯出和匯入功能

## 💡 使用提示

### 訪問全局樣式
```typescript
import { COLORS, FONTS } from '../utils/constants'

<div style={{ color: COLORS.coral, fontFamily: FONTS.display }}>
  使用預定義顏色和字體
</div>
```

### 管理行程數據
```typescript
import { useStorage } from '../hooks/useStorage'

const { trips, updateTrips, lugTpls, updateLugTpls } = useStorage()
```

### 使用工具函數
```typescript
import { uid, today, getDays, safeStr } from '../utils/helpers'

const tripId = uid()  // 生成唯一 ID
const current = today()  // 取得今天日期
```

## ✅ 檢查清單

在開始開發前，確認：

- [ ] 已執行 `npm install`
- [ ] 已執行 `npm run dev` 並能看到應用
- [ ] 瀏覽器開發者工具中沒有錯誤
- [ ] 能夠新增行程並查看列表
- [ ] TypeScript 類型檢查正常

## 🐛 常見問題

**Q: 顯示找不到模塊？**
A: 確認已執行 `npm install`

**Q: Vite 伺服器無法啟動？**
A: 檢查 5173 端口是否被佔用，或在 `vite.config.ts` 中改變端口

**Q: TypeScript 錯誤？**
A: 確認 `tsconfig.json` 正確，VS Code 可能需要重新加載

## 📞 需要幫助？

- 查看 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) 了解完整結構
- 查看 [README.md](./README.md) 了解項目詳情
- 原檔案 `travel_app.tsx` 仍保留作為參考

---

祝你開發愉快！🎉
