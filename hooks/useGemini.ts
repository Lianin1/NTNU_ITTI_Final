// hooks/useGemini.ts (加強 ending_keyword 英文指令)
import {
  Content,
  GenerationConfig,
  GoogleGenerativeAI,
  Part,
} from '@google/generative-ai';
import { useState } from 'react';

// --- 1. 資料結構 ---
export interface SceneData {
  scene_title: string;
  scene_tags: string[];
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

// --- 2. 關鍵提示 ---
const SYSTEM_PROMPT: Part = {
  text: `# 角色扮演 (Persona)
你是一個文字冒險遊戲的「遊戲管理員 (GM)」。世界觀是「轉生修仙」。
風格參考「文字遊戲」，強調用文字本身來構建意境。

# 核心規則：JSON 輸出 (JSON Output)
你【絕對必須】且【僅能】回傳一個格式化後的 JSON 物件。
嚴禁 Markdown。

你必須回傳的 JSON 結構如下：
{
  "scene_title": "當前場景名稱 (2-5 字)",
  "scene_tags": ["標籤1", "標籤2", "標籤3", "標籤4"], 
  "scene_description": "劇情描述...",
  "system_message": "系統提示...",
  "options": ["選項1", "選項2", "選項3"],
  "game_state": "ongoing",
  "ending_keyword": null
}

# 場景生成規則 (Scene Generation)
1.  **動態變化**：根據劇情更新 scene_title 和 scene_tags。
2.  **scene_tags**: 必須提供【正好 4 個】環境元素。

# 語言與敘事規則
1.  **禁止程式碼洩漏**：禁止出現 rootBone 等變數名。
2.  **自然語言轉換**：請用「根骨」、「悟性」等詞彙。

# 遊戲流程規則
1.  回合制：嚴格遵守 \`max_turns\`。
2.  【結局】：當回合結束時，\`game_state\` 設為 "ended"。
    - **重要**：必須提供 \`ending_keyword\`。
    - **關鍵字規則**：【必須是英文 (English Only)】！絕對不要給中文。例如："mysterious mountains", "dark ruins", "ancient sword"。

3.  屬性影響：請在劇情中體現玩家屬性的影響。

# 初始任務
根據玩家屬性和篇章長度，生成「開局場景」。
`,
};

// --- 3. Hook 主體 ---
export const useGemini = (apiKey: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentScene, setCurrentScene] = useState<SceneData | null>(null);
  const [gameHistory, setGameHistory] = useState<Content[]>([]);
  const [turnState, setTurnState] = useState({ currentTurn: 0, maxTurns: 0 });

  // 重試邏輯
  const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
    try {
      return await fn();
    } catch (err: any) {
      if (retries > 0 && (err.message?.includes('503') || err.message?.includes('overloaded'))) {
        console.warn(`Gemini Overloaded (503). Retrying in ${delay}ms... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, retries - 1, delay * 2);
      }
      throw err;
    }
  };

  const runGeminiCall = async (
    currentFullHistory: Content[],
    newUserMessage: Content,
    systemInstruction: Part | null = null,
    overrideTurnState?: { currentTurn: number; maxTurns: number }
  ) => {
    if (!apiKey) {
      setError('請先輸入您的「通天令」（API Key）方可開啟仙途。');
      return;
    }

    const activeTurnState = overrideTurnState || turnState;

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

      const result = await retryWithBackoff(async () => {
        return await chat.sendMessage(newUserMessage.parts);
      });

      const response = result.response;
      const jsonText = response.text();
      
      let parsedData: SceneData = JSON.parse(jsonText);

      // --- 防呆邏輯 ---
      if (!parsedData.scene_tags || parsedData.scene_tags.length < 4) {
        parsedData.scene_tags = ["迷霧", "虛空", "混沌", "未知"];
      }
      if (!parsedData.scene_title) {
        parsedData.scene_title = "未 知 之 地";
      }

      if (activeTurnState.currentTurn >= activeTurnState.maxTurns) {
        if (parsedData.game_state !== 'ended') {
           console.warn("回合數已達上限，強制標記為結束。");
           parsedData.game_state = 'ended';
           parsedData.options = []; 
        }
        
        // 【修正點】如果 AI 沒給，或者 AI 給了中文(包含非ASCII字元)，就用備用字
        // 這裡簡單判斷：如果為空，就給預設值。更複雜的判斷交給 useImageSearch 的 fallback
        if (!parsedData.ending_keyword) {
          parsedData.ending_keyword = 'fantasy landscape abstract';
        }
      }

      setCurrentScene(parsedData); 

      // 歷史紀錄瘦身
      const historyData = {
        ...parsedData,
        scene_art: [], 
      };

      const newModelResponse: Content = { 
        role: 'model', 
        parts: [{ text: JSON.stringify(historyData) }] 
      };
      
      setGameHistory([...currentFullHistory, newUserMessage, newModelResponse]);

    } catch (e: any) {
      console.error('Gemini API call failed:', e);
      
      if (e.message?.includes('503') || e.message?.includes('overloaded')) {
        setError('【天道擁塞】目前修仙之人眾多，天機推演過載。請道友稍安勿躁，片刻後重新嘗試。');
      } else if (e.message?.includes('API key')) {
        setError('【通天令失效】您的 API Key 似乎無效或已過期，請檢查後重新輸入。');
      } else {
        setError('【靈氣紊亂】修仙系統運轉發生未知異常，請檢查網絡連結或稍後重試。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async (settings: GameSettings) => {
    resetGame();
    
    const newTurnState = { currentTurn: 0, maxTurns: settings.maxTurns };
    setTurnState(newTurnState);

    const userPrompt = `遊戲開始。玩家屬性：${JSON.stringify(
      settings.attributes
    )}。長度設定：${JSON.stringify({
      max_turns: settings.maxTurns,
      current_turn: 0,
    })}。請生成開局場景。`;

    const firstUserMessage: Content = {
      role: 'user',
      parts: [{ text: userPrompt }],
    };

    await runGeminiCall([], firstUserMessage, SYSTEM_PROMPT, newTurnState);
  };

  const sendChoice = async (choice: string) => {
    const newTurn = turnState.currentTurn + 1;
    
    const newTurnState = { ...turnState, currentTurn: newTurn };
    setTurnState(newTurnState);

    const isFinalTurn = newTurn >= turnState.maxTurns;

    let instruction = "請推進劇情，並根據當下情境更新 scene_title 和 scene_tags。";
    
    if (isFinalTurn) {
      instruction += " 【系統強制指令】：回合數已達上限。請務必在此回合完結故事，給出結局，將 game_state 設為 'ended'，提供 'ending_keyword' (ENGLISH ONLY)，且不要再提供任何 options！";
    }

    const userPrompt = `玩家選擇：${choice}。狀態：${JSON.stringify({
      max_turns: turnState.maxTurns,
      current_turn: newTurn,
    })}。${instruction}`;
    
    const newUserMessage: Content = {
      role: 'user',
      parts: [{ text: userPrompt }],
    };

    await runGeminiCall(gameHistory, newUserMessage, null, newTurnState);
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
    currentTurn: turnState.currentTurn,
    maxTurns: turnState.maxTurns,
  };
};