// components/GameLoop.tsx (已更新：使用自定義退出視窗)
import { Ionicons } from '@expo/vector-icons';
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

import ExitModal from '@/components/ExitModal'; // 1. 匯入新元件
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
  const [buttonSound, setButtonSound] = useState<Audio.Sound | null>(null); 
  
  const descriptionCharCounter = useRef(0);
  const [areOptionsVisible, setAreOptionsVisible] = useState(false);
  const optionsOpacity = useRef(new Animated.Value(0)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;

  // 2. 新增 Modal 可見度狀態
  const [isExitModalVisible, setIsExitModalVisible] = useState(false);

  // 1. 載入音效
  useEffect(() => {
    let descSound: Audio.Sound | null = null;
    let sysSound: Audio.Sound | null = null;
    let btnSound: Audio.Sound | null = null;
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

        const { sound: newBtnSound } = await Audio.Sound.createAsync(
           require('@/assets/sounds/button3.wav'), 
           { shouldPlay: false }
        );
        if (isMounted) {
          btnSound = newBtnSound;
          setButtonSound(newBtnSound);
        } else { newBtnSound.unloadAsync().catch(() => {}); }
        
      } catch (error) {
        console.error('Failed to load sounds', error);
      }
    }
    loadSounds();

    return () => {
      isMounted = false;
      if (descSound) descSound.unloadAsync().catch(() => {}); 
      if (sysSound) sysSound.unloadAsync().catch(() => {});
      if (btnSound) btnSound.unloadAsync().catch(() => {});
    };
  }, []);

  useEffect(() => {
    descriptionCharCounter.current = 0;
    setAreOptionsVisible(false);
    optionsOpacity.setValue(0);
    imageOpacity.setValue(0);
  }, [scene.scene_description]); 

  const playDescriptionSound = useCallback(() => {
    if (descriptionSound) {
      descriptionCharCounter.current += 1;
      if (descriptionCharCounter.current % SOUND_PLAYBACK_RATE === 0) {
        try { descriptionSound.playFromPositionAsync(0).catch(() => {}); } catch (e) {}
      }
    }
  }, [descriptionSound]);

  const playButtonSound = () => {
    if (buttonSound) {
      try { buttonSound.replayAsync().catch(() => {}); } catch (e) {}
    }
  };

  const { 
    displayedText: displayedDescription, 
    isFinished: isDescriptionFinished,
    skip: skipDescription 
  } = useTypewriter(
    scene.scene_description, 
    50, 
    playDescriptionSound 
  );

  const handleSkip = () => {
    if (!isDescriptionFinished) {
      skipDescription();
    }
  };

  // 【⭐ 修改：打開 Modal】
  const handleExit = () => {
    playButtonSound();
    setIsExitModalVisible(true);
  };

  // 【⭐ 新增：處理確認退出】
  const handleConfirmExit = () => {
    playButtonSound();
    setIsExitModalVisible(false); // 關閉視窗
    onReset(); // 執行重置
  };

  useEffect(() => {
    if (isDescriptionFinished) {
      if (scene.system_message && systemSound) {
        try { systemSound.playFromPositionAsync(0).catch(() => {}); } catch (e) {}
      }

      if (isGameEnded) {
        Animated.timing(imageOpacity, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start();

        const timer = setTimeout(() => {
          setAreOptionsVisible(true);
          Animated.timing(optionsOpacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }).start();
        }, 1000); 
        return () => clearTimeout(timer);

      } else {
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

  useEffect(() => {
    if (isGameEnded && !endingImageUrl && scene.ending_keyword) {
      onSearchImage(scene.ending_keyword);
    }
  }, [isGameEnded, endingImageUrl, onSearchImage, scene.ending_keyword]);

  const isAllFinished = isDescriptionFinished;
  const progressPercent = Math.min((currentTurn / maxTurns) * 100, 100);
  const tags = scene.scene_tags || ["", "", "", ""]; 

  return (
    <ScrollView contentContainerStyle={styles.container}>
      
      {/* Top Bar */}
      <View style={styles.topBar}>
        <Pressable onPress={handleExit} style={styles.exitButton} hitSlop={15}>
          <Ionicons name="home-outline" size={20} color="#666" />
          <Text style={styles.exitText}> 退出</Text>
        </Pressable>

        <View style={styles.hudContainer}>
          <Text style={styles.turnText}>
            回合 {currentTurn} <Text style={styles.turnMaxText}>/ {maxTurns}</Text>
          </Text>
          <View style={styles.turnProgressBar}>
            <View style={[styles.turnProgressFill, { width: `${progressPercent}%` }]} />
          </View>
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
      <Pressable onPress={handleSkip} style={styles.textContainer}>
        <Text style={[
          styles.descriptionText,
          !isDescriptionFinished && styles.textAlignLeft 
        ]}>
          {displayedDescription}
        </Text>
      </Pressable>

      {/* 系統訊息 */}
      {isDescriptionFinished && scene.system_message && (
        <Text style={styles.systemText}>
          {scene.system_message}
        </Text>
      )}
      
      {/* 跳過按鈕 */}
      {!isAllFinished && (
        <Pressable 
          onPress={handleSkip} 
          style={styles.skipButton}
          hitSlop={20} 
        >
          <Text style={styles.skipButtonText}> 跳過 </Text>
        </Pressable>
      )}

      {/* 結局圖片 */}
      {isGameEnded && (
        <Animated.View style={[
          styles.endingImageContainer,
          { opacity: imageOpacity } 
        ]}>
          {endingImageUrl ? (
            <Image 
              source={{ uri: endingImageUrl }} 
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
              onPress={() => {
                playButtonSound();
                onReset();
              }}
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
                onPress={() => {
                  playButtonSound();
                  onChoice(option);
                }}
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

      {/* 【⭐ 插入退出視窗元件】 */}
      <ExitModal 
        visible={isExitModalVisible}
        onConfirm={handleConfirmExit}
        onCancel={() => {
          playButtonSound();
          setIsExitModalVisible(false);
        }}
      />

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
  topBar: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  exitText: {
    color: '#666',
    fontFamily: 'NotoSerifTC_400Regular',
    fontSize: 14,
  },
  hudContainer: {
    width: '40%',
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

  textContainer: {
    width: '100%',
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
  
  skipButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#666',
    zIndex: 10, 
  },
  skipButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontFamily: 'NotoSerifTC_400Regular',
  },

  endingImageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#111', 
    borderRadius: 5,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', 
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