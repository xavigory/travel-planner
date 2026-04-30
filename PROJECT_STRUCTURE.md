# Travel App - 項目結構指南

## 📁 目錄結構

```
travel-app/
├── src/
│   ├── components/
│   │   ├── common/              # 通用元件
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Field.tsx
│   │   │   └── Badge.tsx        # 待建立
│   │   │
│   │   ├── tabs/                # 各標籤頁面元件 (待建立)
│   │   │   ├── ItineraryTab.tsx
│   │   │   ├── AttractionsTab.tsx
│   │   │   ├── AccommodationsTab.tsx
│   │   │   ├── ExpensesTab.tsx
│   │   │   └── LuggageTab.tsx
│   │   │
│   │   ├── modals/              # 模態對話框元件 (待建立)
│   │   │   ├── ExpenseModal.tsx
│   │   │   ├── AttractionModal.tsx
│   │   │   └── TripSettingsModal.tsx
│   │   │
│   │   └── layout/              # 佈局元件 (待建立)
│   │       └── Header.tsx
│   │
│   ├── utils/
│   │   ├── constants.ts         # 常數 (已完成)
│   │   ├── helpers.ts           # 工具函數 (已完成)
│   │   ├── pdf.ts               # PDF 生成 (待建立)
│   │   ├── storage.ts           # 本地儲存管理 (待建立)
│   │   └── validators.ts        # 驗證函數 (待建立)
│   │
│   ├── hooks/
│   │   ├── useStorage.ts        # 本地儲存 (已完成)
│   │   ├── useTrip.ts           # 行程管理 hook (待建立)
│   │   └── useExport.ts         # 匯出功能 hook (待建立)
│   │
│   ├── types/
│   │   └── index.ts             # TypeScript 型別 (已完成)
│   │
│   ├── styles/
│   │   ├── global.css           # 全域樣式 (已完成)
│   │   └── variables.css        # CSS 變數 (待建立)
│   │
│   ├── App.tsx                  # 主應用程式 (基本完成)
│   └── main.tsx                 # 進入點 (已完成)
│
├── index.html                   # HTML 模板 (已完成)
├── package.json                 # 依賴管理 (已完成)
├── vite.config.ts              # Vite 配置 (已完成)
├── tsconfig.json               # TypeScript 配置 (已完成)
└── README.md                    # 專案說明 (待建立)
```

## ✅ 已完成

- [x] Vite + React + TypeScript 基本設置
- [x] 全局樣式和字體導入
- [x] TypeScript 類型定義
- [x] 常數和工具函數
- [x] LocalStorage hook
- [x] 基本 UI 元件 (Button, Card, Modal, Field)
- [x] 應用主框架和選項卡切換

## 🚧 待建立 (優先順序)

### Phase 1: 核心功能
1. **Badge 元件** - 用於標籤顯示
2. **ItineraryTab** - 行程規劃標籤頁
3. **AttractionsTab** - 景點管理標籤頁
4. **ExpensesTab** - 記帳功能 (最複雜)
5. **PDF 導出工具** - 由原 travel_app.tsx 改寫

### Phase 2: 其他功能
6. **AccommodationsTab** - 住宿和交通管理
7. **LuggageTab** - 行李清單管理
8. **各類模態對話框** - 編輯和新增功能
9. **Export/Import** - 備份和還原

### Phase 3: 優化
10. 單元測試
11. 性能優化
12. 無障礙功能提升

## 🔄 遷移原有代碼

原 `travel_app.tsx` 中的內容需要按以下方式分解：

- **PDF 生成函數** → `src/utils/pdf.ts`
- **Modal 元件** → `src/components/modals/`
- **Tab 組件** → `src/components/tabs/`
- **常數定義** → `src/utils/constants.ts` (已做)
- **工具函數** → `src/utils/helpers.ts` (已做)

## 📦 NPM 命令

```bash
# 安裝依賴
npm install

# 開發伺服器 (http://localhost:5173)
npm run dev

# 生產構建
npm run build

# 預覽生產構建
npm run preview
```

## 💾 LocalStorage 結構

```json
{
  "trips": [
    {
      "id": "xxx",
      "name": "日本自由行",
      "destination": "東京",
      "startDate": "2024-05-01",
      "endDate": "2024-05-07",
      "currency": "JPY",
      "localCurrency": "JPY",
      "itinerary": {},
      "attractions": [],
      "accommodations": [],
      "transports": [],
      "expenses": [],
      "luggage": []
    }
  ],
  "lugTpls": ["護照", "信用卡", "...]
}
```

## 🎯 下一步建議

1. 先安裝依賴: `npm install`
2. 啟動開發伺服器: `npm run dev`
3. 逐步實現各個 Tab 的功能
4. 將 PDF 生成邏輯從原檔案遷移到 `src/utils/pdf.ts`
5. 建立模態對話框元件用於編輯

需要幫忙實現哪個部分？
