// hooks/useTypewriter.ts
import { useEffect, useState } from 'react';

/**
 * 逐字顯示文字的打字機效果 Hook
 * @param text - 要顯示的完整文字
 * @param speed - 打字速度 (毫秒)
 * @param onCharTyped - (新增) 每打一個字時要呼叫的回呼函式
 */
export const useTypewriter = (
  text: string, 
  speed: number = 30,
  onCharTyped?: () => void // <-- 1. 新增 onCharTyped 參數
) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsFinished(false);

    const intervalId = setInterval(() => {
      setDisplayedText((prev) => {
        const currentLength = prev.length;

        if (currentLength < text.length) {
          // 2. 在這裡呼叫回呼
          if (onCharTyped) {
            onCharTyped(); 
          }
          return text.substring(0, currentLength + 1);
        } else {
          clearInterval(intervalId);
          setIsFinished(true);
      
          return text;
        }
      });
    }, speed);

    return () => clearInterval(intervalId);
    
  }, [text, speed, onCharTyped]); // <-- 3. 加入依賴項

  return { displayedText, isFinished };
};