// components/GameLoop.tsx (已優化：動畫順序 + 圖片灰階)
import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { SceneData } from '@/hooks/useGemini';
import { useTypewriter } from '@/hooks/useTypewriter';

interface GameLoopProps {
  scene: SceneData;
  onChoice: (choice: string) => void;
  onReset: () => void;
  onSearchImage: (keyword: string) => void;
  endingImageUrl: string | null;
  currentTurn: number;
  maxTurns: number;
}

const SOUND_PLAYBACK_RATE = 3; 

export default function GameLoop({ 
  scene, 
  onChoice, 
  onReset,
  onSearchImage,
  endingImageUrl,
  currentTurn,
  maxTurns,
}: GameLoopProps) {
  
  const isGameEnded = scene.game_state === 'ended';

  const [descriptionSound, setDescriptionSound] = useState<Audio.Sound | null>(null);
  const [systemSound, setSystemSound] = useState<Audio.Sound | null>(null);
  
  const descriptionCharCounter = useRef(0);

  // 動畫控制狀態
  const [areOptionsVisible, setAreOptionsVisible] = useState(false);
  
  // 兩個獨立的透明度動畫值
  const optionsOpacity = useRef(new Animated.Value(0)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current; // 【新增】圖片透明度

  // 1. 載入音效
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
    imageOpacity.setValue(0); // 重設圖片透明度
  }, [scene.scene_description]); 

  const playDescriptionSound = useCallback(() => {
    if (descriptionSound) {
      descriptionCharCounter.current += 1;
      if (descriptionCharCounter.current % SOUND_PLAYBACK_RATE === 0) {
        try { descriptionSound.playFromPositionAsync(0).catch(() => {}); } catch (e) {}
      }
    }
  }, [descriptionSound]);

  const { 
    displayedText: displayedDescription, 
    isFinished: isDescriptionFinished 
  } = useTypewriter(
    scene.scene_description, 
    50, 
    playDescriptionSound 
  );

  // --- 【核心動畫邏輯修正】 ---
  useEffect(() => {
    if (isDescriptionFinished) {
      // 1. 播放系統音效
      if (scene.system_message && systemSound) {
        try { systemSound.playFromPositionAsync(0).catch(() => {}); } catch (e) {}
      }

      // 2. 如果是結局：先顯示圖片 -> 再顯示按鈕
      if (isGameEnded) {
        // (A) 圖片淡入
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 1000, // 圖片慢慢浮現 (1秒)
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();

        // (B) 延遲 1 秒後，顯示「重新開始」按鈕
        const timer = setTimeout(() => {
          setAreOptionsVisible(true);
          Animated.timing(optionsOpacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
        }, 1000); // 延遲 1 秒

        return () => clearTimeout(timer);

      } else {
        // 3. 如果是普通回合：直接顯示選項 (延遲 0.3 秒讓節奏舒服點)
        const timer = setTimeout(() => {
          setAreOptionsVisible(true);
          Animated.timing(optionsOpacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
        }, 300); 

        return () => clearTimeout(timer);
      }
    }
  }, [isDescriptionFinished, isGameEnded, scene.system_message, systemSound]);

  // 圖片搜尋
  useEffect(() => {
    if (isGameEnded && !endingImageUrl && scene.ending_keyword) {
      onSearchImage(scene.ending_keyword);
    }
  }, [isGameEnded, endingImageUrl, onSearchImage, scene.ending_keyword]);

  const progressPercent = Math.min((currentTurn / maxTurns) * 100, 100);
  const tags = scene.scene_tags || ["", "", "", ""]; 

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* HUD */}
      <View style={styles.hudContainer}>
        <Text style={styles.turnText}>
          回合 {currentTurn} <Text style={styles.turnMaxText}>/ {maxTurns}</Text>
        </Text>
        <View style={styles.turnProgressBar}>
          <View style={[styles.turnProgressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* Scene Art */}
      <View style={styles.artContainer}>
        <View style={styles.cornerTL}><Text style={styles.tagText}>{tags[0]}</Text></View>
        <View style={styles.cornerTR}><Text style={styles.tagText}>{tags[1]}</Text></View>
        <View style={styles.centerContent}>
          <Text style={styles.sceneTitle}>{scene.scene_title}</Text>
          <View style={styles.divider} />
        </View>
        <View style={styles.cornerBL}><Text style={styles.tagText}>{tags[2]}</Text></View>
        <View style={styles.cornerBR}><Text style={styles.tagText}>{tags[3]}</Text></View>
      </View>

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
      
      {/* 結局圖片 (包裹在 Animated.View 中) */}
      {isGameEnded && (
        <Animated.View style={[
          styles.endingImageContainer,
          { opacity: imageOpacity } // 【綁定圖片透明度】
        ]}>
          {endingImageUrl ? (
            <Image 
              source={{ uri: endingImageUrl }} 
              // 【⭐ 重點：前端灰階濾鏡 (Web/Expo Go 支援)】
              style={[styles.endingImage, { 
                // @ts-ignore
                filter: 'grayscale(100%)' 
              }]} 
              resizeMode="cover"
            />
          ) : (
            <View style={styles.loadingContainer}>
              {scene.ending_keyword ? (
                <>
                  <ActivityIndicator size="small" color="#FFF" />
                  <Text style={styles.textMuted}>結局意境圖繪製中...</Text>
                </>
              ) : (
                <Text style={styles.textMuted}>[AI 未提供結局關鍵字]</Text>
              )}
            </View>
          )}
        </Animated.View>
      )}

      {/* 選項/重新開始按鈕 */}
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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  hudContainer: {
    width: '100%',
    marginBottom: 15,
    alignItems: 'flex-end', 
  },
  turnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'NotoSerifTC_400Regular',
    marginBottom: 5,
  },
  turnMaxText: {
    color: '#666', 
  },
  turnProgressBar: {
    width: '100%',
    height: 2, 
    backgroundColor: '#222',
    borderRadius: 1,
  },
  turnProgressFill: {
    height: '100%',
    backgroundColor: '#00FFFF', 
  },
  artContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    width: '100%',
    height: 180, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: '#FFF', 
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
  },
  sceneTitle: {
    color: '#E0E0E0',
    fontSize: 32,
    fontFamily: 'NotoSerifTC_700Bold', 
    letterSpacing: 4, 
    textAlign: 'center',
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: '#555',
    marginTop: 10,
  },
  tagText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'NotoSerifTC_400Regular',
  },
  cornerTL: { position: 'absolute', top: 15, left: 20 },
  cornerTR: { position: 'absolute', top: 15, right: 20 },
  cornerBL: { position: 'absolute', bottom: 15, left: 20 },
  cornerBR: { position: 'absolute', bottom: 15, right: 20 },

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
    backgroundColor: '#111', // 確保圖片載入前背景是黑的
    borderRadius: 5,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // 確保圖片圓角
  },
  loadingContainer: {
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