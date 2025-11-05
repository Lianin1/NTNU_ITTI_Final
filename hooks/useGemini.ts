// hooks/useGemini.ts
import {
    Content,
    GenerationConfig,
    GoogleGenerativeAI,
    Part,
} from '@google/generative-ai';
import { useState } from 'react';

// --- 1. 定義我們需要的資料結構 ---

/**
 * 我們期望 Gemini 回傳的 JSON 結構
 */
export interface SceneData {
  scene_art: string[];
  scene_description: string;
  system_message: string;
  options: string[];
  game_state: 'ongoing' | 'ended';
}

/**
 * 來自 GameSetup 畫面的初始遊戲設定
 */
export interface GameSettings {
  attributes: {
    rootBone: number; // 根骨
    insight: number;  // 悟性
    // (未來可以從這裡擴充)
  };
  maxTurns: number; // 總回合數
}

// --- 2. 關鍵的「初始系統提示」 ---

const SYSTEM_PROMPT: Part = {
  text: `# 角色扮演 (Persona)
你是一個文字冒險遊戲的「遊戲管理員 (GM)」，同時也是輔助玩家的「天道系統」。
你的世界觀是「轉生修仙」，玩家將從零開始體驗一個隨機的修仙人生。
你的風格受到台灣遊戲「文字遊戲」的啟發，冷靜、客觀，並專注於使用文字來構築場景。

# 核心規則：JSON 輸出 (JSON Output)
你【絕對必須】且【僅能】回傳一個格式化後的 JSON 物件。
【禁止】在 JSON 物件前後包含任何 "'''json" 或 "這裏是您的回覆：" 之類的文字。
你必須回傳的 JSON 結構如下：

{
  "scene_art": [
    "這是一個字串陣列 (Array of Strings)，用來繪製場景。",
    "你必須使用中文全形或半形的文字、符號來「畫出」當前的畫面。",
    "例如：用「我」代表玩家，「火」代表火焰，「門」代表建築物。",
    "請務必對齊，保持等寬字體排版的美觀。",
    "如果當前場景不適合繪畫（例如：純粹的內心獨白），你可以回傳一個空陣列 []。"
  ],
  "scene_description": "對當前場景或事件的客觀描述。例如：『你睜開眼，發現自己身處一個破舊的柴房。』",
  "system_message": "【系統提示】或【旁白】。用來發布玩家的狀態、獲得的物品、或觸發的劇情。例如：『【系統：你的根骨提升了】』或『你感覺到一陣暈眩。』",
  "options": [
    "1. 選項一",
    "2. 選項二",
    "3. 選項三"
  ],
  "game_state": "ongoing"
}

# 遊戲流程規則 (Game Flow Rules)
1.  【玩家輸入】：我將會提供給你玩家的「初始屬性」、「選擇的篇章長度」，以及每一次的「玩家選擇」和「遊戲歷程」。
2.  【回合制】：我會提供 \`current_turn\` (當前回合) 和 \`max_turns\` (總回合數)。你必須控制敘事節奏。
3.  【結局】：當 \`current_turn\` 接近或等於 \`max_turns\` 時，你【必須】構思一個合理的「結局」（無論好壞），在 \`scene_description\` 中描述它，將 \`options\` 設為空陣列 \`[]\`，並將 \`game_state\` 設為 \`"ended"\`。
4.  【選項】：你提供的 \`options\` 必須是 3 到 4 個有意義的選擇。
5.  【風格】：保持修仙小說的風格，並在 \`system_message\` 中模擬「系統」的感覺。

# 初始任務 (Initial Task)
接下來我會提供給你玩家的【初始屬性】和【篇章長度】。
你的第一個任務是：根據這些屬性，生成遊戲的「開局場景」。
`,
};

// --- 3. Gemini Hook 主體 ---

/**
 * 管理 Gemini API 互動的自定義 Hook
 * @param apiKey - 從使用者輸入或 AsyncStorage 獲取的 API Key
 */
export const useGemini = (apiKey: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 遊戲的核心狀態
  const [currentScene, setCurrentScene] = useState<SceneData | null>(null);
  const [gameHistory, setGameHistory] = useState<Content[]>([]); // 儲存完整的 Gemini 對話歷史
  
  // 遊戲設定 (回合制)
  const [turnState, setTurnState] = useState({ currentTurn: 0, maxTurns: 0 });

  /**
   * 核心 API 呼叫函式
   * @param currentFullHistory - 呼叫前的完整對話歷史
   * @param newUserMessage - 玩家這次要傳送的新訊息
   * @param systemInstruction - 系統提示 (僅在第一次呼叫時使用)
   */
  const runGeminiCall = async (
    currentFullHistory: Content[],
    newUserMessage: Content,
    systemInstruction: Part | null = null
  ) => {
    if (!apiKey) {
      setError('API Key 尚未設定');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash', // 使用我們選擇的模型
        ...(systemInstruction && { systemInstruction }), // 附加系統提示 (如果有的話)
      });

      const generationConfig: GenerationConfig = {
        responseMimeType: 'application/json', // 強制 JSON 輸出
      };

      // 啟動一個「聊天」，並提供「過去的歷史」
      const chat = model.startChat({
        history: currentFullHistory,
        generationConfig,
      });

      // 傳送「新的訊息」
      // 正確的程式碼
      const result = await chat.sendMessage(newUserMessage.parts);
      
      const response = result.response;
      const jsonText = response.text();
      const parsedData: SceneData = JSON.parse(jsonText); // 解析回傳的 JSON

      // --- 成功，更新狀態 ---
      setCurrentScene(parsedData);

      // 將「玩家的新訊息」和「AI 的新回應」都加入到歷史紀錄中
      const newModelResponse: Content = { role: 'model', parts: [{ text: jsonText }] };
      setGameHistory([...currentFullHistory, newUserMessage, newModelResponse]);

    } catch (e: any) {
      console.error('Gemini API call failed:', e);
      setError(e.message || '呼叫 Gemini API 時發生未知錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 遊戲開始 (由 GameSetup 呼叫)
   * @param settings - 玩家的初始屬性與篇章長度
   */
  const startGame = async (settings: GameSettings) => {
    // 1. 重設所有狀態
    resetGame();
    setTurnState({ currentTurn: 0, maxTurns: settings.maxTurns });

    // 2. 格式化第一條 User 訊息
    const userPrompt = `遊戲開始。玩家的屬性是：${JSON.stringify(
      settings.attributes
    )}。遊戲長度：${JSON.stringify({
      max_turns: settings.maxTurns,
      current_turn: 0,
    })}。請生成開局場景。`;

    const firstUserMessage: Content = {
      role: 'user',
      parts: [{ text: userPrompt }],
    };

    // 3. 呼叫 API (傳入空歷史、第一條訊息、和系統提示)
    await runGeminiCall([], firstUserMessage, SYSTEM_PROMPT);
  };

  /**
   * 玩家做出選擇 (由 GameLoop 呼叫)
   * @param choice - 玩家點選的選項文字 (例如 "1. 檢查丹爐")
   */
  const sendChoice = async (choice: string) => {
    // 1. 更新回合數
    const newTurn = turnState.currentTurn + 1;
    setTurnState(prev => ({ ...prev, currentTurn: newTurn }));

    // 2. 格式化新的 User 訊息
    const userPrompt = `玩家選擇了：${choice}。當前狀態：${JSON.stringify({
      max_turns: turnState.maxTurns,
      current_turn: newTurn,
    })}。`;
    
    const newUserMessage: Content = {
      role: 'user',
      parts: [{ text: userPrompt }],
    };

    // 3. 呼叫 API (傳入「當前的歷史」、新訊息、不傳系統提示)
    await runGeminiCall(gameHistory, newUserMessage, null);
  };

  /**
   * 重設遊戲 (用於「重新開始」)
   */
  const resetGame = () => {
    setIsLoading(false);
    setError(null);
    setCurrentScene(null);
    setGameHistory([]);
    setTurnState({ currentTurn: 0, maxTurns: 0 });
  };

  // --- 4. 匯出 Hook 的 API ---
  return {
    isLoading,    // 遊戲是否在載入中
    error,        // 顯示錯誤訊息
    currentScene, // 當前的場景資料 (用於渲染)
    startGame,    // 讓 GameSetup 呼叫
    sendChoice,   // 讓 GameLoop 呼叫
    resetGame,    // 讓遊戲結束時呼叫
  };
};