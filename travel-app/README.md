# Wanderlust 旅行規劃 App

一個完整的旅行規劃應用，使用 React + TypeScript + Vite 構建。

## 功能特色

- 📅 **行程規劃** - 按日期組織旅行行程
- 📍 **景點管理** - 記錄景點資訊、營業時間、票價等
- 🏨 **住宿交通** - 管理住宿預訂和交通方式
- 💰 **記帳系統** - 多幣別支出記錄和統計分析
- 🧳 **行李清單** - 可視化打包進度追蹤
- 🔔 **提醒功能** - 搶票提醒和免費取消截止提醒
- 📋 **備忘錄** - 記錄重要事項和注意事項
- 💾 **本地存儲** - 數據自動保存到瀏覽器

## 技術棧

- **React 18** - 前端框架
- **TypeScript** - 類型檢查
- **Vite** - 構建工具
- **Inline Styles** - 樣式管理（無需外部 CSS 框架）

## 專案結構

```
travel-app/
├── src/
│   ├── components/           # React 組件
│   │   ├── Button.tsx
│   │   ├── Badge.tsx
│   │   ├── Field.tsx
│   │   ├── Modal.tsx
│   │   ├── TripModal.tsx
│   │   └── tabs/            # 各功能標籤頁
│   │       ├── ItineraryTab.tsx
│   │       ├── AttractionsTab.tsx
│   │       ├── AccomTransTab.tsx
│   │       ├── ExpensesTab.tsx
│   │       └── LuggageTab.tsx
│   ├── constants/            # 常量定義
│   │   ├── colors.ts
│   │   ├── fonts.ts
│   │   └── data.ts
│   ├── types/               # TypeScript 類型定義
│   │   └── index.ts
│   ├── utils/               # 工具函數
│   │   ├── helpers.ts
│   │   ├── storage.ts
│   │   ├── reminders.ts
│   │   └── pdf.ts
│   ├── styles/              # CSS 樣式
│   │   └── index.css
│   ├── App.tsx              # 主應用組件
│   └── main.tsx             # 應用入口
├── index.html               # HTML 模板
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
└── package.json             # 依賴和腳本
```

## 快速開始

### 安裝依賴

```bash
npm install
```

### 開發模式

```bash
npm run dev
```

應用會在 `http://localhost:5173` 打開。

### 構建生產版本

```bash
npm run build
```

構建的文件會生成在 `dist/` 目錄。

### 預覽生產版本

```bash
npm run preview
```

## 使用指南

### 建立旅行計畫

1. 點擊主頁右上角「＋ 新增旅行」按鈕
2. 填入旅行基本資訊（名稱、目的地、日期、貨幣等）
3. 點擊「儲存」

### 規劃行程

1. 進入旅行詳情頁面
2. 切換到「🗓️ 行程」標籤
3. 點擊「＋ 新增項目」新增每日行程
4. 支持自動生成住宿入住/退房和交通信息

### 管理景點

1. 在「📍 景點」標籤頁面新增景點
2. 可批次導入多個景點名稱
3. 編輯景點詳情（營業時間、票價、Maps 連結等）
4. 拖曳景點到行程中加入

### 記錄支出

1. 在「💰 記帳」標籤頁面新增支出
2. 支持多幣別和分類統計
3. 可切換清單或統計表視圖

### 行李清單

1. 在「🧳 行李」標籤頁面新增項目
2. 可使用預定模板快速新增
3. 實時顯示打包進度

## 數據存儲

所有數據存儲在瀏覽器 `localStorage` 中，鍵為 `travel_app_v4`。數據會自動保存，在同一瀏覽器中可永久存放。

## 樣式設計

應用採用精美的漸變配色方案：
- **主色** - 珊瑚色 (#FF6B47)
- **輔助色** - 紫羅蘭色、青綠色、金黃色、天藍色等
- **字體** - Fraunces (顯示文本) 和 Plus Jakarta Sans (正文)

## 開發筆記

- 所有組件均採用內聯樣式管理，便於維護和定制
- TypeScript 確保類型安全
- Vite 提供快速開發體驗和最小化構建

## 許可証

MIT
