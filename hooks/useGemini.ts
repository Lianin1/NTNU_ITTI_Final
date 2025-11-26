// hooks/useGemini.ts
import {
  Content,
  GenerationConfig,
  GoogleGenerativeAI,
  Part,
} from '@google/generative-ai';
import { useState } from 'react';

// --- 資料結構 ---
export interface SceneData {
  scene_art: string[];
  scene_description: string;
  system_message: string;
  options: string[];
  game_state: 'ongoing' | 'ended';
  ending_keyword?: string;
}

export interface GameSettings {
  attributes: {
    rootBone: number;
    insight: number;
    luck: number;
    background: number;
  };
  maxTurns: number;
}

// --- 2. 關鍵提示 (加強版) ---
const SYSTEM_PROMPT: Part = {
  text: `# 角色扮演 (Persona)
你是一個文字冒險遊戲的「遊戲管理員 (GM)」，同時也是輔助玩家的「天道系統」。
你的世界觀是「轉生修仙」，玩家將從零開始體驗一個隨機的修仙人生。
你的風格受到台灣遊戲「文字遊戲」的啟發，冷靜、客觀，並專注於使用文字來構築場景。

# 核心規則：JSON 輸出 (JSON Output)
你【絕對必須】且【僅能】回傳一個格式化後的 JSON 物件。
【禁止】在 JSON 物件前後包含任何 markdown 標記 (如 \`\`\`json)。
你必須回傳的 JSON 結構如下：

{
  "scene_art": [
    "這是一個字串陣列，用來繪製場景。",
    "【重要繪圖規則】：",
    "1. 絕對禁止只畫一個空框框！",
    "2. 你必須用文字符號畫出具體物體。例如：樹木(Ψ, ♣), 山脈(▲), 房屋(☖), 人物(웃), 劍(⚔️), 靈氣(≋)。",
    "3. 畫面必須豐富。如果是森林，要有樹；如果是房間，要有桌椅。",
    "4. 請務必對齊，保持等寬字體排版的美觀。"
  ],
  "scene_description": "對當前場景或事件的客觀描述。",
  "system_message": "【系統提示】或【旁白】。包含屬性變化或狀態通知。",
  "options": [
    "1. 選項一",
    "2. 選項二",
    "3. 選項三"
  ],
  "game_state": "ongoing",
  "ending_keyword": null 
}

# 遊戲流程規則
1.  【玩家輸入】：我會提供玩家屬性、篇章長度、選擇和歷程。
2.  【回合制】：提供 \`current_turn\` 和 \`max_turns\`。你必須控制節奏。
3.  【結局】：當 \`current_turn\` >= \`max_turns\` 時，必須構思結局，將 \`scene_description\` 寫完，\`options\` 設為 []，\`game_state\` 設為 "ended"，並提供 2-3 個英文字的 \`ending_keyword\` (如 "mountain sunset") 用於搜尋圖片。
4.  【選項】：提供 3-4 個有意義的選擇。
5.  【風格】：修仙小說風格。
6.  【屬性影響】：
    - 家世高 (>7)：開局富貴。
    - 根骨低 (<3)：體弱多病。
    - 氣運高：易遇奇遇。
    - 請在劇情中體現屬性的影響。

# 初始任務
根據玩家屬性和篇章長度，生成「開局場景」。記得畫出豐富的 ASCII 場景圖！
`,
};

// --- 3. Hook 主體 ---
export const useGemini = (apiKey: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentScene, setCurrentScene] = useState<SceneData | null>(null);
  const [gameHistory, setGameHistory] = useState<Content[]>([]);
  const [turnState, setTurnState] = useState({ currentTurn: 0, maxTurns: 0 });

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
        model: 'gemini-2.5-flash', 
        ...(systemInstruction && { systemInstruction }),
      });

      const generationConfig: GenerationConfig = {
        responseMimeType: 'application/json',
      };

      const chat = model.startChat({
        history: currentFullHistory,
        generationConfig,
      });

      const result = await chat.sendMessage(newUserMessage.parts);
      const response = result.response;
      const jsonText = response.text();
      
      let parsedData: SceneData = JSON.parse(jsonText);

      // 防呆邏輯
      if (
        parsedData.options.length === 0 &&
        parsedData.game_state === 'ongoing' &&
        turnState.currentTurn >= turnState.maxTurns 
      ) {
        console.warn("AI 忘記設定 'ended' 狀態，強制修正。");
        parsedData.game_state = 'ended'; 

        if (!parsedData.ending_keyword) {
          parsedData.ending_keyword = 'fantasy landscape abstract';
        }
      }

      setCurrentScene(parsedData); 

      const newModelResponse: Content = { role: 'model', parts: [{ text: jsonText }] };
      setGameHistory([...currentFullHistory, newUserMessage, newModelResponse]);

    } catch (e: any) {
      console.error('Gemini API call failed:', e);
      setError(e.message || '呼叫 Gemini API 時發生未知錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async (settings: GameSettings) => {
    resetGame();
    setTurnState({ currentTurn: 0, maxTurns: settings.maxTurns });

    const userPrompt = `遊戲開始。玩家屬性：${JSON.stringify(
      settings.attributes
    )}。長度設定：${JSON.stringify({
      max_turns: settings.maxTurns,
      current_turn: 0,
    })}。請生成開局場景，並畫出詳細的 ASCII 場景圖。`;

    const firstUserMessage: Content = {
      role: 'user',
      parts: [{ text: userPrompt }],
    };

    await runGeminiCall([], firstUserMessage, SYSTEM_PROMPT);
  };

  const sendChoice = async (choice: string) => {
    const newTurn = turnState.currentTurn + 1;
    setTurnState(prev => ({ ...prev, currentTurn: newTurn }));

    const userPrompt = `玩家選擇：${choice}。狀態：${JSON.stringify({
      max_turns: turnState.maxTurns,
      current_turn: newTurn,
    })}。請繼續劇情並繪製新場景。`;
    
    const newUserMessage: Content = {
      role: 'user',
      parts: [{ text: userPrompt }],
    };

    await runGeminiCall(gameHistory, newUserMessage, null);
  };

  const resetGame = () => {
    setIsLoading(false);
    setError(null);
    setCurrentScene(null);
    setGameHistory([]);
    setTurnState({ currentTurn: 0, maxTurns: 0 });
  };

  return {
    isLoading,
    error,
    currentScene,
    startGame,
    sendChoice,
    resetGame,
  };
};