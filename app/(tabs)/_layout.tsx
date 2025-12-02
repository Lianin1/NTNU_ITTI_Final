// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        // 1. 隱藏頂部標題欄 (如果有出現的話)
        headerShown: false,
        
        // 2. 【關鍵】隱藏底部 Tab Bar
        tabBarStyle: {
          display: 'none', // 這行會讓底部白條完全消失
        },
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          // 確保這裡也隱藏 (雙重保險)
          href: null, 
        }}
      />
      
      {/* 既然我們不需要 explore，可以把它隱藏或之後刪除檔案 */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          href: null, // 從導航中移除
        }}
      />
    </Tabs>
  );
}