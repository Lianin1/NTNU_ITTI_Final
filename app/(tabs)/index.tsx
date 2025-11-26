// app/(tabs)/index.tsx (已整合按鈕音效)
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import GameLoop from '@/components/GameLoop';
import LoadingScreen from '@/components/LoadingScreen';
import { GameSettings, useGemini } from '@/hooks/useGemini';
import { useImageSearch } from '@/hooks/useImageSearch';
import { useMenuSounds } from '@/hooks/useMenuSounds'; // <-- 1. 匯入音效 Hook

// --- 遊戲設定 (類型和常數) ---
type GameLength = 'short' | 'medium' | 'long';
const TURN_MAP: Record<GameLength, number> = {
  short: 10,
  medium: 20,
  long: 35,
};
const API_KEY_STORAGE_KEY = '@gemini_api_key';
const TOTAL_TALENT_POINTS = 10;
type Attribute = 'rootBone' | 'insight' | 'luck' | 'background';

const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_KEY || '';

// --- App 主元件 ---
export default function AppEntry() {
  const [apiKey, setApiKey] = useState('');
  const [isKeyLoaded, setIsKeyLoaded] = useState(false);
  const [gameLength, setGameLength] = useState<GameLength>('medium');
  
  const [attributes, setAttributes] = useState({
    rootBone: 0,
    insight: 0,
    luck: 0,
    background: 0,
  });

  const remainingPoints =
    TOTAL_TALENT_POINTS -
    attributes.rootBone -
    attributes.insight -
    attributes.luck -
    attributes.background;

  // --- Hook 呼叫 ---
  const {
    isLoading: isGameLoading,
    error: gameError,
    currentScene,
    startGame,
    resetGame: resetGeminiGame,
    sendChoice,
  } = useGemini(apiKey);

  const {
    isImageLoading,
    imageError,
    imageUrl,
    searchImage,
    resetImage,
  } = useImageSearch(UNSPLASH_ACCESS_KEY);

  // 2. 呼叫音效 Hook
  const { playButton1, playButton2, playButton3 } = useMenuSounds();

  // --- useEffect 載入 Key ---
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
        setIsKeyLoaded(true);
      }
    };
    loadKey();
  }, []);

  const handleResetGame = () => {
    playButton3(); // 重新開始也算大按鈕，播放 button3
    resetGeminiGame();
    resetImage();
  };

  // --- 天賦點邏輯 (綁定音效) ---
  const handleIncrement = (attr: Attribute) => {
    if (remainingPoints > 0) {
      playButton2(); // <-- 音效 2
      setAttributes(prev => ({ ...prev, [attr]: prev[attr] + 1 }));
    }
  };
  const handleDecrement = (attr: Attribute) => {
    if (attributes[attr] > 0) {
      playButton2(); // <-- 音效 2
      setAttributes(prev => ({ ...prev, [attr]: prev[attr] - 1 }));
    }
  };

  // --- 篇長選擇邏輯 (綁定音效) ---
  const handleSetGameLength = (len: GameLength) => {
    playButton1(); // <-- 音效 1
    setGameLength(len);
  };

  // --- handleStartGame (綁定音效) ---
  const handleStartGame = async () => {
    playButton3(); // <-- 音效 3 (開始遊戲)
    
    if (!apiKey.trim()) {
      alert('請輸入您的 Gemini API Key');
      return;
    }
    if (remainingPoints !== 0) {
      alert(`您還有 ${remainingPoints} 點天賦點尚未分配！`);
      return;
    }
    try {
      await AsyncStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } catch (e) {
      console.error('Failed to save API key', e);
      alert('儲存 API Key 失敗');
    }
    
    const gameSettings: GameSettings = {
      attributes,
      maxTurns: TURN_MAP[gameLength],
    };
    await startGame(gameSettings);
  };

  // --- 核心渲染邏輯 ---

  if (isGameLoading || isImageLoading || !isKeyLoaded) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingScreen isImageGeneration={isImageLoading} />
      </SafeAreaView>
    );
  }

  const combinedError = gameError || imageError;
  if (combinedError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerFullScreen}>
          <Text style={styles.errorText}>發生錯誤：</Text>
          <Text style={styles.errorText}>{combinedError}</Text>
          <Pressable onPress={handleResetGame} style={styles.startButton}> 
            <Text style={styles.startButtonText}>重 試</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (currentScene) {
    return (
      <SafeAreaView style={styles.container}>
        <GameLoop 
          scene={currentScene} 
          onChoice={sendChoice}
          onReset={handleResetGame}
          onSearchImage={searchImage}
          endingImageUrl={imageUrl}
        />
      </SafeAreaView>
    );
  }
  
  // 5.4 顯示設定畫面
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
          secureTextEntry
        />

        <Text style={styles.label}>選擇篇章長度</Text>
        <View style={styles.buttonGroup}>
          {(['short', 'medium', 'long'] as GameLength[]).map((len) => (
            <Pressable
              key={len}
              // 更新：使用新的 handleSetGameLength (含音效)
              onPress={() => handleSetGameLength(len)}
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
                {len === 'short' ? '短篇 (10)' : (len === 'medium' ? '中篇 (20)' : '長篇 (35)')}  
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>
          分配天賦 (剩餘點數: {remainingPoints})
        </Text>
        <View style={styles.talentContainer}>
          <TalentRow 
            label="根骨"
            value={attributes.rootBone}
            onDecrement={() => handleDecrement('rootBone')}
            onIncrement={() => handleIncrement('rootBone')}
            decrementDisabled={attributes.rootBone === 0}
            incrementDisabled={remainingPoints === 0}
          />
          <TalentRow 
            label="悟性"
            value={attributes.insight}
            onDecrement={() => handleDecrement('insight')}
            onIncrement={() => handleIncrement('insight')}
            decrementDisabled={attributes.insight === 0}
            incrementDisabled={remainingPoints === 0}
          />
          <TalentRow 
            label="氣運"
            value={attributes.luck}
            onDecrement={() => handleDecrement('luck')}
            onIncrement={() => handleIncrement('luck')}
            decrementDisabled={attributes.luck === 0}
            incrementDisabled={remainingPoints === 0}
          />
          <TalentRow 
            label="家世"
            value={attributes.background}
            onDecrement={() => handleDecrement('background')}
            onIncrement={() => handleIncrement('background')}
            decrementDisabled={attributes.background === 0}
            incrementDisabled={remainingPoints === 0}
          />
        </View>

        <Pressable
          onPress={handleStartGame}
          style={({ pressed }) => [
            styles.startButton,
            remainingPoints !== 0 && styles.startButtonDisabled,
            pressed && { opacity: 0.8 },
          ]}
          disabled={remainingPoints !== 0}
        >
          <Text style={[
            styles.startButtonText,
            remainingPoints !== 0 && styles.startButtonTextDisabled
          ]}>
            開始轉生
          </Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

// --- 輔助元件與樣式保持不變 ---
// (為了節省篇幅，下方的 TalentRow 和 styles 沿用上一版即可，內容無需更動)
// ... 
// ... 
interface TalentRowProps {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  incrementDisabled: boolean;
  decrementDisabled: boolean;
}

const TalentRow = ({ 
  label, 
  value, 
  onIncrement, 
  onDecrement,
  incrementDisabled,
  decrementDisabled 
}: TalentRowProps) => {
  return (
    <View style={styles.talentRow}>
      <Text style={styles.talentLabel}>{label}</Text>
      <View style={styles.talentControls}>
        <Pressable 
          onPress={onDecrement} 
          disabled={decrementDisabled}
          style={[styles.talentButton, decrementDisabled && styles.talentButtonDisabled]}
        >
          <Text style={styles.talentButtonText}>-</Text>
        </Pressable>
        <Text style={styles.talentValue}>{value}</Text>
        <Pressable 
          onPress={onIncrement} 
          disabled={incrementDisabled}
          style={[styles.talentButton, incrementDisabled && styles.talentButtonDisabled]}
        >
          <Text style={styles.talentButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerFullScreen: { 
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    color: '#FFF',
    marginBottom: 30,
    fontFamily: 'NotoSerifTC_700Bold', 
  },
  label: {
    fontSize: 16,
    color: '#CCC',
    marginTop: 20,
    marginBottom: 10,
    fontFamily: 'NotoSerifTC_400Regular', 
  },
  text: {
    fontSize: 14,
    color: '#AAA',
    fontFamily: 'NotoSerifTC_400Regular', 
    textAlign: 'center',
    padding: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#FFAAAA',
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
  startButton: {
    marginTop: 40,
    backgroundColor: '#FFF',
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  startButtonDisabled: {
    backgroundColor: '#555',
  },
  startButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'NotoSerifTC_700Bold', 
  },
  startButtonTextDisabled: {
    color: '#999',
  },
  pressableButton: {
    backgroundColor: '#222',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  pressableButtonSelected: {
    backgroundColor: '#FFF',
  },
  pressableText: {
    color: '#CCC',
    fontFamily: 'NotoSerifTC_400Regular', 
  },
  pressableTextSelected: {
    color: '#000',
    fontFamily: 'NotoSerifTC_700Bold', 
  },
  talentContainer: {
    width: '90%',
  },
  talentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  talentLabel: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'NotoSerifTC_400Regular', 
  },
  talentControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  talentButton: {
    backgroundColor: '#444',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  talentButtonDisabled: {
    backgroundColor: '#222',
  },
  talentButtonText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 30,
  },
  talentValue: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'monospace', 
    fontWeight: 'bold',
    width: 40,
    textAlign: 'center',
  },
});