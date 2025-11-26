// components/GameLoop.tsx (已修復無限迴圈 Bug)
import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react'; // 1. 匯入 useCallback
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SceneData } from '@/hooks/useGemini';
import { useTypewriter } from '@/hooks/useTypewriter';

interface GameLoopProps {
  scene: SceneData;
  onChoice: (choice: string) => void;
  onReset: () => void;
  onSearchImage: (keyword: string) => void;
  endingImageUrl: string | null;
}

const SOUND_PLAYBACK_RATE = 3; 

export default function GameLoop({ 
  scene, 
  onChoice, 
  onReset,
  onSearchImage,
  endingImageUrl
}: GameLoopProps) {
  
  const isGameEnded = scene.game_state === 'ended';

  const [descriptionSound, setDescriptionSound] = useState<Audio.Sound | null>(null);
  const [systemSound, setSystemSound] = useState<Audio.Sound | null>(null);
  
  const descriptionCharCounter = useRef(0);

  const [areOptionsVisible, setAreOptionsVisible] = useState(false);
  const optionsOpacity = useRef(new Animated.Value(0)).current;

  // 載入音效
  useEffect(() => {
    let descSound: Audio.Sound | null = null;
    let sysSound: Audio.Sound | null = null;
    let isMounted = true;
    
    async function loadSounds() {
      try {
        const { sound: newDescSound } = await Audio.Sound.createAsync(
           require('@/assets/sounds/type.mp3'),
           { shouldPlay: false }
        );
        if (isMounted) {
          descSound = newDescSound;
          setDescriptionSound(newDescSound);
        } else { newDescSound.unloadAsync().catch(() => {}); }

        const { sound: newSysSound } = await Audio.Sound.createAsync(
           require('@/assets/sounds/system.wav'),
           { shouldPlay: false }
        );
        if (isMounted) {
          sysSound = newSysSound;
          setSystemSound(newSysSound);
        } else { newSysSound.unloadAsync().catch(() => {}); }
        
      } catch (error) {
        console.error('Failed to load sounds', error);
      }
    }
    loadSounds();

    return () => {
      isMounted = false;
      if (descSound) descSound.unloadAsync().catch(() => {}); 
      if (sysSound) sysSound.unloadAsync().catch(() => {});
    };
  }, []);

  // 重設狀態
  useEffect(() => {
    descriptionCharCounter.current = 0;
    setAreOptionsVisible(false);
    optionsOpacity.setValue(0);
  }, [scene.scene_description]); 

  // --- 【⭐ 修正點：使用 useCallback】 ---
  // 這樣可以確保函式記憶體位置不變，避免 useTypewriter 誤判重置
  const playDescriptionSound = useCallback(() => {
    if (descriptionSound) {
      descriptionCharCounter.current += 1;
      if (descriptionCharCounter.current % SOUND_PLAYBACK_RATE === 0) {
        try { descriptionSound.playFromPositionAsync(0).catch(() => {}); } catch (e) {}
      }
    }
  }, [descriptionSound]); // 只有當 descriptionSound 改變時才更新函式

  // 雖然系統音效不是打字機用的，但保持一致性也好
  const playSystemSound = useCallback(() => {
    // 這裡其實用不到，因為我們現在是手動播放，但為了未來擴充保留
  }, [systemSound]);
  // --------------------------------------

  const { 
    displayedText: displayedDescription, 
    isFinished: isDescriptionFinished 
  } = useTypewriter(
    scene.scene_description, 
    50, 
    playDescriptionSound 
  );

  // 系統音效 與 選項延遲顯示
  useEffect(() => {
    if (isDescriptionFinished) {
      
      if (scene.system_message && systemSound) {
        try { systemSound.playFromPositionAsync(0).catch(() => {}); } catch (e) {}
      }

      const timer = setTimeout(() => {
        setAreOptionsVisible(true); 
        
        Animated.timing(optionsOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true, 
        }).start();

      }, 800); 

      return () => clearTimeout(timer);
    }
  }, [isDescriptionFinished, scene.system_message, systemSound]);

  // 圖片搜尋
  useEffect(() => {
    if (isGameEnded && !endingImageUrl && scene.ending_keyword) {
      onSearchImage(scene.ending_keyword);
    }
  }, [isGameEnded, endingImageUrl, onSearchImage, scene.ending_keyword]);

  // --- Return JSX ---
  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* Scene Art */}
      {scene.scene_art && scene.scene_art.length > 0 && (
        <View style={styles.artContainer}>
          {scene.scene_art.map((line, index) => (
            <Text key={index} style={styles.artText}>
              {line}
            </Text>
          ))}
        </View>
      )}

      {/* 劇情描述 */}
      <Text style={[
        styles.descriptionText,
        !isDescriptionFinished && styles.textAlignLeft 
      ]}>
        {displayedDescription}
      </Text>

      {/* 系統訊息 */}
      {isDescriptionFinished && scene.system_message && (
        <Text style={styles.systemText}>
          {scene.system_message}
        </Text>
      )}
      
      {/* 結局圖片 */}
      {isGameEnded && (
        <View style={styles.endingImageContainer}>
          {endingImageUrl ? (
            <Image 
              source={{ uri: endingImageUrl }} 
              style={styles.endingImage} 
              resizeMode="contain"
            />
          ) : (
            <View>
              {scene.ending_keyword ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.textMuted}>結局意境圖搜尋中...</Text>
                </>
              ) : (
                <Text style={styles.textMuted}>[AI 未提供結局關鍵字]</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* 選項 */}
      {areOptionsVisible && (
        <Animated.View 
          style={[
            styles.optionsContainer, 
            { opacity: optionsOpacity, transform: [{ translateY: optionsOpacity.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] } 
          ]}
        >
          {isGameEnded ? (
            <Pressable
              onPress={onReset}
              style={({ pressed }) => [
                styles.optionButton,
                styles.resetButton,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.optionButtonText, styles.resetButtonText]}>
                重新開始
              </Text>
            </Pressable>
          ) : (
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
        </Animated.View>
      )}

    </ScrollView>
  );
}

// --- 樣式表 (保持不變) ---
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  artContainer: {
    backgroundColor: '#0a0a0a',
    padding: 20,
    borderRadius: 8,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#FFF', 
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  artText: {
    color: '#E0E0E0',
    fontSize: 16,
    fontFamily: 'monospace',
    lineHeight: 22,
    textAlign: 'center',
  },
  descriptionText: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'NotoSerifTC_400Regular', 
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 28,
  },
  systemText: {
    color: '#00FFFF', 
    fontSize: 16,
    fontFamily: 'NotoSerifTC_400Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
  textAlignLeft: {
    textAlign: 'left',
  },
  endingImageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#111',
    borderRadius: 5,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  endingImage: {
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  textMuted: {
    color: '#888',
    fontFamily: 'monospace',
    marginTop: 10,
  },
  optionsContainer: {
    width: '100%',
    marginTop: 10,
    minHeight: 50,
  },
  optionButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444', 
    borderStyle: 'solid',
  },
  optionButtonText: {
    color: '#CCC',
    fontFamily: 'NotoSerifTC_400Regular',
    fontSize: 18,
    textAlign: 'left',
  },
  resetButton: {
    backgroundColor: '#FFF',
    alignItems: 'center',
    borderColor: '#FFF',
  },
  resetButtonText: {
    color: '#000',
    fontWeight: 'bold',
    textAlign: 'center',
    fontFamily: 'NotoSerifTC_700Bold', 
  },
});