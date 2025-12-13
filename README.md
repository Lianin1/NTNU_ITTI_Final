# 轉生修仙錄 (Reincarnation Cultivation Record)

![Project Status](https://img.shields.io/badge/Status-Completed-success)
![Expo](https://img.shields.io/badge/Expo-Framework-000020?style=flat&logo=expo)
![React Native](https://img.shields.io/badge/React_Native-0.76-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript)
![Gemini](https://img.shields.io/badge/AI-Google_Gemini-8E75B2?style=flat&logo=google)

> **「一念起，萬法生。」**
> 
> 這是一個結合生成式 AI (Generative AI) 的無限流文字冒險遊戲。透過 LLM 擔任「天道系統 (AI Game Master)」，為每一位玩家生成獨一無二的修仙人生。

## 📖 專案簡介 (Introduction)

《轉生修仙錄》旨在解決傳統文字遊戲劇本僵化、重玩價值低的問題。本專案不預寫任何劇本，而是利用 **Google Gemini API** 根據玩家設定的初始屬性（根骨、悟性、氣運、家世），即時運算劇情發展。

當玩家達成結局時，系統會自動提取劇情關鍵字，並串接 **Unsplash API** 生成符合意境的黑白攝影圖，作為視覺獎勵。

## ✨ 核心功能 (Key Features)

- **♾️ 無限流劇情**：由 Gemini AI 即時生成，沒有固定的劇本，每一次轉生都是全新的體驗。
- **🎨 意境視覺化**：結局時自動搜尋符合情境的高畫質攝影圖，並透過前端濾鏡轉為黑白風格。
- **📜 沉浸式體驗**：
  - **打字機特效**：文字逐字浮現，模擬閱讀節奏。
  - **動態 UI**：場景標題與環境標籤由 AI 動態生成。
  - **音效回饋**：整合打字聲、按鈕聲與系統提示音。
- **💾 自動存檔**：支援 `AsyncStorage` 自動保存進度，隨時可以中斷或繼續遊戲。
- **🖥️ 跨平台支援**：基於 React Native for Web，同時支援網頁版與行動端操作（支援 Web 端滑鼠滾輪調整數值）。

## 🛠️ 技術架構 (Tech Stack)

本專案採用 **Serverless (無伺服器)** 的純前端架構：

- **核心框架**：React Native (Expo SDK)
- **語言**：TypeScript
- **路由管理**：Expo Router
- **AI 模型**：Google Gemini 2.5 Flash
- **視覺資源**：Unsplash API
- **狀態保存**：AsyncStorage
- **多媒體**：Expo AV (Audio)

### 📂 專案結構圖

```text
NTNU_ITTI_Final/
│
├── app/                        # 頁面路由入口
│   ├── (tabs)/
│   │   ├── _layout.tsx         # 底部導航設定 (隱藏 Tab Bar)
│   │   └── index.tsx           # 遊戲主程式與狀態管理
│   └── _layout.tsx             # 全域佈局 (字體載入)
│
├── components/                 # UI 元件
│   ├── GameLoop.tsx            # 遊戲主迴圈 (顯示劇情、選項、HUD)
│   ├── LoadingScreen.tsx       # 過場動畫 (進度條)
│   └── ExitModal.tsx           # 自定義退出視窗
│
├── hooks/                      # 自定義 Hooks (核心邏輯)
│   ├── useGemini.ts            # Gemini API 串接、Prompt 工程與自動存檔
│   ├── useImageSearch.ts       # Unsplash API 串接、關鍵字優化與隨機選圖
│   ├── useTypewriter.ts        # 打字機特效邏輯
│   └── useMenuSounds.ts        # 音效管理
│
├── assets/                     # 靜態資源 (音效、圖片)
└── .env                        # 環境變數 (Unsplash Key)
```

## 🚀 快速開始 (Getting Started)

### 1. 安裝依賴

請確保您的電腦已安裝 Node.js。

```bash
# 下載專案
git clone [https://github.com/your-username/NTNU_ITTI_Final.git](https://github.com/your-username/NTNU_ITTI_Final.git)
cd NTNU_ITTI_Final

# 安裝套件
npm install
```

### 2. 設定環境變數 (重要！)

在專案根目錄建立一個名為 `.env` 的檔案，並填入您的 Unsplash Access Key：

```env
# .env 檔案內容
EXPO_PUBLIC_UNSPLASH_KEY=你的_Unsplash_Access_Key_貼在這裡
```

> **注意**：變數名稱必須以 `EXPO_PUBLIC_` 開頭，Expo 才能在建置時讀取。

### 3. 啟動專案

使用以下指令啟動開發伺服器（建議加上 `-c` 清除快取以確保讀取到 env）：

```bash
npx expo start -c
```

按 `w` 開啟網頁版預覽，或使用 Expo Go App 掃描 QR Code 進行手機預覽。

## 🎮 如何遊玩 (How to Play)

1. **輸入天道密鑰**：遊戲啟動時，請輸入您的 Google Gemini API Key。（Key 僅儲存於本地裝置，不會上傳至任何伺服器）。
2. **分配屬性**：使用 `+` `-` 按鈕或滑鼠滾輪（Web限定），分配 20 點天賦點數（根骨、悟性、氣運、家世）。
3. **選擇篇章**：選擇短篇 (10回)、中篇 (20回) 或長篇 (35回)。
4. **開始轉生**：閱讀劇情並做出選擇，您的每一個決定都會影響 AI 的後續生成。
5. **達成結局**：欣賞由 AI 與 Unsplash 共同為您獻上的結局意境圖。

## 🔮 未來展望 (Future Roadmap)

- [ ] **生成式繪圖**：將圖庫搜尋升級為 Stable Diffusion 或 DALL-E API，實現真正的即時繪圖。
- [ ] **效能優化**：導入 Streaming Response (流式傳輸)，大幅縮短每回合的等待時間。
- [ ] **線上排行榜**：建立後端資料庫，記錄玩家達成的最高修仙境界。

## 📄 License

This project is licensed under the MIT License.