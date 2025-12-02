// hooks/useTypewriter.ts
import { useCallback, useEffect, useRef, useState } from 'react';

export const useTypewriter = (
  text: string, 
  speed: number = 30,
  onCharTyped?: () => void
) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isFinished, setIsFinished] = useState(false);
  
  // 使用 useRef 來儲存計時器 ID，這樣才能在其他函式中清除它
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 重置狀態
    setDisplayedText('');
    setIsFinished(false);
    
    // 如果文字為空，直接完成
    if (!text) {
      setIsFinished(true);
      return;
    }

    // 啟動計時器
    intervalRef.current = setInterval(() => {
      setDisplayedText((prev) => {
        const currentLength = prev.length;

        if (currentLength < text.length) {
          if (onCharTyped) {
            onCharTyped(); 
          }
          return text.substring(0, currentLength + 1);
        } else {
          // 完成
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsFinished(true);
          return text;
        }
      });
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    
  }, [text, speed, onCharTyped]);

  // 【⭐ 新增：跳過函式】
  const skip = useCallback(() => {
    if (isFinished) return; // 如果已經完成了，就不做任何事

    // 清除計時器
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    // 直接顯示完整文字
    setDisplayedText(text);
    setIsFinished(true);
  }, [text, isFinished]);

  return { displayedText, isFinished, skip };
};