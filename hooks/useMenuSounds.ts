// hooks/useMenuSounds.ts
import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';

export const useMenuSounds = () => {
  const [sounds, setSounds] = useState<{ [key: string]: Audio.Sound | null }>({
    btn1: null,
    btn2: null,
    btn3: null,
  });

  useEffect(() => {
    const loadSounds = async () => {
      try {
        // 【⭐ 修正點：全部改為 .wav】
        const { sound: s1 } = await Audio.Sound.createAsync(
          require('@/assets/sounds/button1.wav') 
        );
        const { sound: s2 } = await Audio.Sound.createAsync(
          require('@/assets/sounds/button2.wav')
        );
        const { sound: s3 } = await Audio.Sound.createAsync(
          require('@/assets/sounds/button3.wav')
        );

        setSounds({ btn1: s1, btn2: s2, btn3: s3 });
      } catch (error) {
        console.error('Failed to load menu sounds', error);
      }
    };

    loadSounds();

    // Cleanup
    return () => {
      Object.values(sounds).forEach((sound) => {
        sound?.unloadAsync().catch(() => {});
      });
    };
  }, []);

  const playButton1 = async () => {
    try { await sounds.btn1?.replayAsync(); } catch (e) {}
  };

  const playButton2 = async () => {
    try { await sounds.btn2?.replayAsync(); } catch (e) {}
  };

  const playButton3 = async () => {
    try { await sounds.btn3?.replayAsync(); } catch (e) {}
  };

  return { playButton1, playButton2, playButton3 };
};