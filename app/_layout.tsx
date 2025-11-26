// app/_layout.tsx
import {
  NotoSerifTC_400Regular,
  NotoSerifTC_700Bold,
  useFonts,
} from '@expo-google-fonts/noto-serif-tc';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// 1. 防止啟動畫面自動隱藏 (直到字體載入完成)
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  // 2. 使用 hook 載入字體
  const [loaded, error] = useFonts({
    NotoSerifTC_400Regular,
    NotoSerifTC_700Bold,
  });

  // 3. 處理載入狀態
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      // 字體載入好後，隱藏啟動畫面
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // 如果還沒載入好，什麼都不渲染 (繼續顯示啟動畫面)
  if (!loaded) {
    return null;
  }

  // 4. 渲染導航結構
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}