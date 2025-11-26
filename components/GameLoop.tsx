// components/GameLoop.tsx (已新增回合數顯示 UI)
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
  // 【新增 Props】
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
  currentTurn, // 接收
  maxTurns,    // 接收
}: GameLoopProps) {
  
  const isGameEnded = scene.game_state === 'ended';

  const [descriptionSound, setDescriptionSound] = useState<Audio.Sound | null>(null);
  const [systemSound, setSystemSound] = useState<Audio.Sound | null>(null);
  
  const descriptionCharCounter = useRef(0);
  const [areOptionsVisible, setAreOptionsVisible] = useState(false);
  const optionsOpacity = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    descriptionCharCounter.current = 0;
    setAreOptionsVisible(false);
    optionsOpacity.setValue(0);
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

  useEffect(() => {
    if (isGameEnded && !endingImageUrl && scene.ending_keyword) {
      onSearchImage(scene.ending_keyword);
    }
  }, [isGameEnded, endingImageUrl, onSearchImage, scene.ending_keyword]);

  // 計算回合進度百分比 (用於顯示進度條)
  const progressPercent = Math.min((currentTurn / maxTurns) * 100, 100);

  const tags = scene.scene_tags || ["", "", "", ""]; 

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* --- 【新功能】回合數顯示器 (HUD) --- */}
      <View style={styles.hudContainer}>
        <Text style={styles.turnText}>
          回合 {currentTurn} <Text style={styles.turnMaxText}>/ {maxTurns}</Text>
        </Text>
        {/* 小小的回合進度條 */}
        <View style={styles.turnProgressBar}>
          <View style={[styles.turnProgressFill, { width: `${progressPercent}%` }]} />
        </View>
      </View>
      {/* ---------------------------------- */}

      {/* 文字地景 UI */}
      <View style={styles.artContainer}>
        <View style={styles.cornerTL}>
          <Text style={styles.tagText}>{tags[0]}</Text>
        </View>
        <View style={styles.cornerTR}>
          <Text style={styles.tagText}>{tags[1]}</Text>
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.sceneTitle}>{scene.scene_title}</Text>
          <View style={styles.divider} />
        </View>
        <View style={styles.cornerBL}>
          <Text style={styles.tagText}>{tags[2]}</Text>
        </View>
        <View style={styles.cornerBR}>
          <Text style={styles.tagText}>{tags[3]}</Text>
        </View>
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

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
  },
  
  // --- 【新增樣式】HUD 回合顯示 ---
  hudContainer: {
    width: '100%',
    marginBottom: 15, // 與場景框保持距離
    alignItems: 'flex-end', // 靠右對齊，比較不干擾閱讀
  },
  turnText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: 'NotoSerifTC_400Regular',
    marginBottom: 5,
  },
  turnMaxText: {
    color: '#666', // 總回合數顏色淡一點
  },
  turnProgressBar: {
    width: '100%',
    height: 2, // 很細的線條
    backgroundColor: '#222',
    borderRadius: 1,
  },
  turnProgressFill: {
    height: '100%',
    backgroundColor: '#00FFFF', // 青色進度
  },
  // -----------------------------

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