// app/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage'; // 匯入 AsyncStorage
import React, { useEffect, useState } from 'react'; // 匯入 useEffect
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

// 1. 匯入我們的 hook 和類型
import { GameSettings, useGemini } from '@/hooks/useGemini';

// 2. 匯入我們【已經】建立的 GameLoop 元件
import GameLoop from '@/components/GameLoop';

// 遊戲篇章長度的類型
type GameLength = 'short' | 'medium' | 'long';
const TURN_MAP: Record<GameLength, number> = {
  short: 10,
  medium: 20,
  long: 35,
};

const API_KEY_STORAGE_KEY = '@gemini_api_key'; // 用於 AsyncStorage 的 Key

export default function AppEntry() { // 將函式名稱改為 AppEntry (或保持原樣)
  // --- 遊戲設定的 State ---
  const [apiKey, setApiKey] = useState('');
  const [isKeyLoaded, setIsKeyLoaded] = useState(false); // 追蹤是否已從 AsyncStorage 載入
  const [gameLength, setGameLength] = useState<GameLength>('medium');
  
  // (策略：我們先保持天賦點簡化)
  const [attributes, setAttributes] = useState({
    rootBone: 5, // 根骨
    insight: 5,  // 悟性
  });
  
  // 3. 呼叫 useGemini hook (取代 gameStarted state)
  const {
    isLoading,
    error,
    currentScene,
    startGame,
    resetGame,
    sendChoice, // 預先解構，給 GameLoop 使用
  } = useGemini(apiKey);

  // 4. 效果 (Effect)：App 啟動時，嘗試從 AsyncStorage 載入 API Key
  useEffect(() => {
    const loadKey = async () => {
      try {
        const storedKey = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
        if (storedKey) {
          setApiKey(storedKey);
        }
      } catch (e) {
        console.error('Failed to load API key from storage', e);
      } finally {
        setIsKeyLoaded(true); // 標記為「已載入」
      }
    };
    loadKey();
  }, []); // [] 空依賴陣列，代表只在 App 啟動時執行一次

  /**
   * 處理「開始轉生」按鈕點擊事件 (更新為 async)
   */
  const handleStartGame = async () => {
    // 1. 驗證
    if (!apiKey.trim()) {
      alert('請輸入您的 Gemini API Key');
      return;
    }

    // 2. 儲存 API Key
    try {
      await AsyncStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } catch (e) {
      console.error('Failed to save API key', e);
      alert('儲存 API Key 失敗');
    }

    // 3. 準備遊戲設定
    const gameSettings: GameSettings = {
      attributes,
      maxTurns: TURN_MAP[gameLength],
    };
    
    console.log('遊戲設定完畢，呼叫 startGame...', gameSettings);

    // 4. 呼叫 hook 中的 startGame 函式 (取代 setGameStarted)
    await startGame(gameSettings);
  };

  // --- 5. 核心渲染邏輯 (取代 if (gameStarted)) ---

  // 5.1 顯示「載入中...」 (全螢幕)
  if (isLoading || !isKeyLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFullScreen}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={styles.text}>{isKeyLoaded ? '生成場景中...' : '載入設定...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 5.2 顯示錯誤 (如果有的話)
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFullScreen}>
          <Text style={styles.errorText}>發生錯誤：</Text>
          <Text style={styles.errorText}>{error}</Text>
          {/* 使用您的 Pressable 按鈕風格來重製 */}
          <Pressable onPress={resetGame} style={styles.startButton}>
            <Text style={styles.startButtonText}>重 試</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // 5.3 顯示「遊戲主迴圈」
  // (如果 currentScene 有資料，代表遊戲已開始)
  // if (currentScene) {
  //   return (
  //     <SafeAreaView style={styles.container}>
  //       {/* 下一步：我們將用 <GameLoop /> 元件取代這裡 
  //         <GameLoop 
  //           scene={currentScene} 
  //           onChoice={(choice) => sendChoice(choice)} 
  //         />
  //       */}
  //       <Text style={styles.title}>遊戲主迴圈 (待辦)</Text>
  //       <Text style={styles.text}>{currentScene.scene_description}</Text>

  //       <Pressable onPress={resetGame} style={styles.startButton}>
  //         <Text style={styles.startButtonText}>重新開始</Text>
  //       </Pressable>
  //     </SafeAreaView>
  //   );
  // }

  // 新的 5.3 區塊
  if (currentScene) {
    return (
      <SafeAreaView style={styles.container}>
        <GameLoop 
          scene={currentScene} 
          onChoice={sendChoice} // 把 hook 的 sendChoice 傳下去
          onReset={resetGame}   // 把 hook 的 resetGame 傳下去
        />
      </SafeAreaView>
    );
  }

  
  // 5.4 預設顯示：「遊戲設定畫面」 (使用您更新的 Pressable UI)
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>轉生修仙錄</Text>
        <Text style={styles.label}>請輸入您的 Gemini API Key</Text>
        <TextInput
          style={styles.input}
          placeholder="貼上您的 API Key..."
          placeholderTextColor="#555"
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry // 隱藏 Key
        />

        <Text style={styles.label}>選擇篇章長度</Text>
        <View style={styles.buttonGroup}>
          {(['short', 'medium', 'long'] as GameLength[]).map((len) => (
            <Pressable
              key={len}
              onPress={() => setGameLength(len)}
              style={({ pressed }) => [
                styles.pressableButton,
                gameLength === len && styles.pressableButtonSelected,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text
                style={[
                  styles.pressableText,
                  gameLength === len && styles.pressableTextSelected,
                ]}
              >
                {len === 'short' ? '短篇 (10)' : len === 'medium' ? '中篇 (20)' : '長篇 (35)'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>分配天賦 (簡化版)</Text>
        <Text style={styles.text}>根骨: {attributes.rootBone}, 悟性: {attributes.insight}</Text>

        <Pressable
          onPress={handleStartGame}
          style={({ pressed }) => [
            styles.startButton,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={styles.startButtonText}>開始轉生</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- 樣式表 (StyleSheet) ---
// (合併了您的新樣式 和 我需要的樣式)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // 黑色背景
  },
  // 新增：用於載入中和錯誤畫面
  centerFullScreen: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center', // 垂直置中 (主軸)
    alignItems: 'center',     // 水平置中 (次軸)
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 30,
    fontFamily: 'monospace',
  },
  label: {
    fontSize: 16,
    color: '#CCC',
    marginTop: 20,
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  text: {
    fontSize: 14,
    color: '#AAA',
    fontFamily: 'monospace',
    textAlign: 'center',
    padding: 10,
  },
  // 新增：錯誤文字樣式
  errorText: {
    fontSize: 16,
    color: '#FFAAAA', // 錯誤使用淡紅色
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 15,
  },
  input: {
    width: '90%',
    height: 50,
    backgroundColor: '#222',
    color: '#FFF',
    paddingHorizontal: 15,
    borderRadius: 5,
    fontFamily: 'monospace',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
  },
  // 您的 Pressable '開始轉生' 按鈕樣式
  startButton: {
    marginTop: 40,
    backgroundColor: '#FFF',   // 白底
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  // 您的 Pressable '開始轉生' 文字樣式
  startButtonText: {
    color: '#000',             // 黑字
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  // 您的 Pressable '篇章' 按鈕樣式
  pressableButton: {
    backgroundColor: '#222',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  // 您的 Pressable '篇章' 選中樣式
  pressableButtonSelected: {
    backgroundColor: '#FFF',
  },
  // ˊ您的 Pressable '篇章' 文字樣式
  pressableText: {
    color: '#CCC',
    fontFamily: 'monospace',
  },
  // 您的 Pressable '篇章' 選中文字樣式
  pressableTextSelected: {
    color: '#000',
    fontWeight: 'bold',
  },
});