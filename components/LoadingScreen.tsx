// components/LoadingScreen.tsx
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

const LOADING_TIPS = [
  "正在推演天機...",
  "凝聚天地靈氣中...",
  "正在構思因果輪迴...",
  "天道系統運算中...",
  "正在繪製神州大陸...",
  "查詢生死簿...",
];

interface LoadingScreenProps {
  isImageGeneration?: boolean;
}

export default function LoadingScreen({ isImageGeneration = false }: LoadingScreenProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // --- 音效播放邏輯 ---
  useEffect(() => {
    let soundObject: Audio.Sound | null = null;

    const playSound = async () => {
      try {
        // 【⭐ 修正點：改為 .wav】
        const { sound } = await Audio.Sound.createAsync(
          require('@/assets/sounds/button3.wav'), 
          { shouldPlay: true } // 直接設定為 true，載入完立刻播放
        );
        soundObject = sound;
        // sound.playAsync(); // 上面設了 shouldPlay: true，這裡可以省略
      } catch (error) {
        console.log('Error playing loading sound', error);
      }
    };

    playSound();

    // Cleanup
    return () => {
      soundObject?.unloadAsync().catch(() => {});
    };
  }, []);
  // ---------------------------

  // 進度條動畫
  useEffect(() => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 90, 
      duration: 3000,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, []);

  // 隨機文字
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % LOADING_TIPS.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const widthInterpolated = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {isImageGeneration ? "繪製天機圖..." : "轉生模擬中..."}
      </Text>

      <View style={styles.progressBarBackground}>
        <Animated.View 
          style={[
            styles.progressBarFill, 
            { width: widthInterpolated }
          ]} 
        />
      </View>

      <Text style={styles.tipText}>
        {isImageGeneration ? "正在捕捉命運的瞬間..." : LOADING_TIPS[tipIndex]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontFamily: 'NotoSerifTC_700Bold',
    marginBottom: 20,
  },
  progressBarBackground: {
    width: '80%',
    height: 10,
    backgroundColor: '#333',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#555',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#FFF',
  },
  tipText: {
    marginTop: 20,
    color: '#AAA',
    fontSize: 14,
    fontFamily: 'NotoSerifTC_400Regular',
    fontStyle: 'italic',
  },
});