// app/(tabs)/index.tsx (已更新：加入繼續仙途按鈕)
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
import { useMenuSounds } from '@/hooks/useMenuSounds';

type GameLength = 'short' | 'medium' | 'long';
const TURN_MAP: Record<GameLength, number> = {
  short: 2,
  medium: 20,
  long: 35,
};
const API_KEY_STORAGE_KEY = '@gemini_api_key';
const TOTAL_TALENT_POINTS = 20; 
type Attribute = 'rootBone' | 'insight' | 'luck' | 'background';

const ATTRIBUTE_DESCRIPTIONS: Record<Attribute, string> = {
  rootBone: "【根骨】：決定你的修練速度、體質強弱，以及對抗物理傷害的能力。根骨高者，百病不侵，修為一日千里。",
  insight: "【悟性】：決定你領悟功法、突破瓶頸的機率。悟性高者，能從萬物中參透大道，學習法術事半功倍。",
  luck: "【氣運】：決定你遇到奇遇、獲得寶物以及逃脫死劫的運氣。氣運高者，走路都能踢到靈石，絕處亦能逢生。",
  background: "【家世】：決定你的開局資源、人脈關係以及初始社會地位。家世顯赫者，起步即有神兵靈藥相助，少走許多彎路。",
};

const UNSPLASH_ACCESS_KEY = process.env.EXPO_PUBLIC_UNSPLASH_KEY || '';

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

  const [activeAttribute, setActiveAttribute] = useState<Attribute | null>(null);

  const remainingPoints =
    TOTAL_TALENT_POINTS -
    attributes.rootBone -
    attributes.insight -
    attributes.luck -
    attributes.background;

  const {
    isLoading: isGameLoading,
    error: gameError,
    currentScene,
    startGame,
    resetGame: resetGeminiGame,
    sendChoice,
    currentTurn,
    maxTurns,
    // 【⭐ 新增：接收存檔狀態】
    hasSave,
    continueGame,
  } = useGemini(apiKey);

  const {
    isImageLoading,
    imageError,
    imageUrl,
    searchImage,
    resetImage,
  } = useImageSearch(UNSPLASH_ACCESS_KEY);

  const { playButton1, playButton2, playButton3 } = useMenuSounds();

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

  const handleResetGame = async () => {
    playButton3();
    resetGeminiGame();
    resetImage();
  };

  const handleIncrement = (attr: Attribute) => {
    setActiveAttribute(attr); 
    if (remainingPoints > 0) {
      playButton2();
      setAttributes(prev => ({ ...prev, [attr]: prev[attr] + 1 }));
    }
  };
  const handleDecrement = (attr: Attribute) => {
    setActiveAttribute(attr); 
    if (attributes[attr] > 0) {
      playButton2();
      setAttributes(prev => ({ ...prev, [attr]: prev[attr] - 1 }));
    }
  };
  
  const handleSetGameLength = (len: GameLength) => {
    playButton1();
    setGameLength(len);
  };

  const handleStartGame = async () => {
    playButton3();
    if (!apiKey.trim()) {
      alert('請輸入天道密鑰方可開啟輪迴。');
      return;
    }
    if (remainingPoints !== 0) {
      alert(`尚有 ${remainingPoints} 點先天命數未分配！`);
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

  // 【⭐ 新增：繼續遊戲處理函式】
  const handleContinue = async () => {
    playButton3();
    if (!apiKey.trim()) {
      alert('請輸入天道密鑰以讀取神識。');
      return;
    }
    await continueGame();
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
          currentTurn={currentTurn}
          maxTurns={maxTurns}
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
        
        <Text style={styles.label}>請輸入您的「天道密鑰」</Text>
        <TextInput
          style={styles.input}
          placeholder="在此注入密鑰 (Gemini API Key)..."
          placeholderTextColor="#555"
          value={apiKey}
          onChangeText={setApiKey}
          secureTextEntry
        />

        <Text style={styles.label}>選擇輪迴長度</Text>
        <View style={styles.buttonGroup}>
          {(['short', 'medium', 'long'] as GameLength[]).map((len) => (
            <Pressable
              key={len}
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
          先天命格 (剩餘點數: {remainingPoints})
        </Text>
        <View style={styles.talentContainer}>
          <TalentRow 
            label="根骨"
            value={attributes.rootBone}
            onDecrement={() => handleDecrement('rootBone')}
            onIncrement={() => handleIncrement('rootBone')}
            onLabelPress={() => setActiveAttribute('rootBone')}
            decrementDisabled={attributes.rootBone === 0}
            incrementDisabled={remainingPoints === 0}
            isActive={activeAttribute === 'rootBone'} 
          />
          <TalentRow 
            label="悟性"
            value={attributes.insight}
            onDecrement={() => handleDecrement('insight')}
            onIncrement={() => handleIncrement('insight')}
            onLabelPress={() => setActiveAttribute('insight')}
            decrementDisabled={attributes.insight === 0}
            incrementDisabled={remainingPoints === 0}
            isActive={activeAttribute === 'insight'}
          />
          <TalentRow 
            label="氣運"
            value={attributes.luck}
            onDecrement={() => handleDecrement('luck')}
            onIncrement={() => handleIncrement('luck')}
            onLabelPress={() => setActiveAttribute('luck')}
            decrementDisabled={attributes.luck === 0}
            incrementDisabled={remainingPoints === 0}
            isActive={activeAttribute === 'luck'}
          />
          <TalentRow 
            label="家世"
            value={attributes.background}
            onDecrement={() => handleDecrement('background')}
            onIncrement={() => handleIncrement('background')}
            onLabelPress={() => setActiveAttribute('background')}
            decrementDisabled={attributes.background === 0}
            incrementDisabled={remainingPoints === 0}
            isActive={activeAttribute === 'background'}
          />
        </View>

        <View style={styles.descriptionBox}>
          <Text style={styles.descriptionTitle}>
            {activeAttribute ? "命格說明" : "天道提示"}
          </Text>
          <Text style={styles.descriptionContent}>
            {activeAttribute 
              ? ATTRIBUTE_DESCRIPTIONS[activeAttribute] 
              : "請點擊上方命格名稱，查看各項天賦的詳細因果。"}
          </Text>
        </View>

        {/* 【⭐ 新增：繼續遊戲按鈕 (如果有存檔)】 */}
        {hasSave && (
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [
              styles.continueButton, // 使用新樣式
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.continueButtonText}>
              繼續仙途
            </Text>
          </Pressable>
        )}

        {/* 開始按鈕 */}
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
            {hasSave ? "放棄並重新開始" : "開始轉生"} {/* 文字隨狀態改變 */}
          </Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

// ... TalentRow (保持不變) ...
interface TalentRowProps {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onLabelPress: () => void; 
  incrementDisabled: boolean;
  decrementDisabled: boolean;
  isActive: boolean; 
}

const TalentRow = ({ 
  label, 
  value, 
  onIncrement, 
  onDecrement,
  onLabelPress,
  incrementDisabled,
  decrementDisabled,
  isActive
}: TalentRowProps) => {
  return (
    <View style={[styles.talentRow, isActive && styles.talentRowActive]}>
      <Pressable onPress={onLabelPress}>
        <Text style={[styles.talentLabel, isActive && styles.talentLabelActive]}>
          {label}
        </Text>
      </Pressable>
      
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

// --- 樣式表 (新增了 continueButton) ---
const styles = StyleSheet.create({
  // ... (保留所有舊樣式)
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
  
  // 【新樣式】繼續按鈕
  continueButton: {
    marginTop: 30, // 與上方說明框的距離
    backgroundColor: '#000', // 黑底
    borderRadius: 5,
    paddingVertical: 12,
    paddingHorizontal: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00FFFF', // 青色邊框，突顯重要性
    marginBottom: 10, // 與開始按鈕的距離
  },
  continueButtonText: {
    color: '#00FFFF', // 青色文字
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'NotoSerifTC_700Bold',
  },

  startButton: {
    marginTop: 10, // 縮小間距
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
  talentRowActive: {
    backgroundColor: '#111', 
    paddingHorizontal: 5, 
    borderRadius: 5,
  },
  talentLabel: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: 'NotoSerifTC_400Regular', 
  },
  talentLabelActive: {
    color: '#00FFFF', 
    fontFamily: 'NotoSerifTC_700Bold',
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
  descriptionBox: {
    width: '90%',
    marginTop: 20,
    padding: 15,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 5,
    minHeight: 80, 
  },
  descriptionTitle: {
    color: '#888',
    fontSize: 12,
    marginBottom: 5,
    fontFamily: 'NotoSerifTC_400Regular',
  },
  descriptionContent: {
    color: '#E0E0E0',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'NotoSerifTC_400Regular',
  },
});