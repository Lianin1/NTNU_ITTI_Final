// components/GameLoop.tsx
import React from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

// 1. 從 hook 檔案中匯入 SceneData 類型
// 確保路徑正確 (相對於 components 資料夾)
import { SceneData } from '@/hooks/useGemini';

// 2. 定義此元件需要的 props
interface GameLoopProps {
  scene: SceneData;                // AI 回傳的當前場景
  onChoice: (choice: string) => void; // 玩家選擇選項時要呼叫的函式
  onReset: () => void;                // 玩家點擊「重新開始」時呼叫
}

/**
 * 遊戲主迴圈 UI 元件
 * 專注於渲染場景和選項
 */
export default function GameLoop({ scene, onChoice, onReset }: GameLoopProps) {
  
  // 檢查遊戲是否結束
  const isGameEnded = scene.game_state === 'ended';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* 1. 渲染 Scene Art (文字藝術) */}
      {/* 這是最關鍵的部分：我們用 <View> 模擬 <pre> 標籤 */}
      {scene.scene_art && scene.scene_art.length > 0 && (
        <View style={styles.artContainer}>
          {scene.scene_art.map((line, index) => (
            <Text key={index} style={styles.artText}>
              {line}
            </Text>
          ))}
        </View>
      )}

      {/* 2. 渲染劇情描述 */}
      <Text style={styles.descriptionText}>
        {scene.scene_description}
      </Text>

      {/* 3. 渲染系統訊息 */}
      {scene.system_message && (
        <Text style={styles.systemText}>
          {scene.system_message}
        </Text>
      )}

      {/* 4. 渲染選項 (或 重新開始) */}
      <View style={styles.optionsContainer}>
        {isGameEnded ? (
          // 遊戲結束：只顯示「重新開始」按鈕
          <Pressable
            onPress={onReset}
            style={({ pressed }) => [
              styles.optionButton,
              styles.resetButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.optionButtonText}>重新開始</Text>
          </Pressable>
        ) : (
          // 遊戲進行中：渲染所有選項
          scene.options.map((option, index) => (
            <Pressable
              key={index}
              onPress={() => onChoice(option)}
              style={({ pressed }) => [
                styles.optionButton,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.optionButtonText}>{option}</Text>
            </Pressable>
          ))
        )}
      </View>

    </ScrollView>
  );
}

// --- 樣式表 (StyleSheet) ---
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#000',
    alignItems: 'center', // 水平置中
    justifyContent: 'center', // 垂直置中 (優先)
    padding: 15,
  },
  // 關鍵：Scene Art 的容器
  artContainer: {
    backgroundColor: '#111', // 深灰色背景，突顯 art
    padding: 15,
    borderRadius: 5,
    width: '100%',
    marginBottom: 20,
  },
  // 關鍵：Scene Art 的文字
  artText: {
    color: '#E0E0E0',
    fontSize: 14,
    fontFamily: 'monospace', // 必須是等寬字體才能對齊
    lineHeight: 18,
  },
  // 劇情描述
  descriptionText: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 24,
  },
  // 系統訊息
  systemText: {
    color: '#88F', // 系統訊息用不同的顏色 (例如淡紫色)
    fontSize: 14,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  // 選項的容器
  optionsContainer: {
    width: '100%',
    marginTop: 10,
  },
  // 選項按鈕
  optionButton: {
    backgroundColor: '#222',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  // 選項文字
  optionButtonText: {
    color: '#FFF',
    fontFamily: 'monospace',
    fontSize: 16,
    textAlign: 'left',
  },
  // 重新開始按鈕 (使用 "開始轉生" 的風格)
  resetButton: {
    backgroundColor: '#ffffffff',
    alignItems: 'center',
  },
  // 重新開始文字
  resetButtonText: {
    color: '#000000ff',
    fontWeight: 'bold',
  },
});