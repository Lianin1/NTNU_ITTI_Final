// hooks/useImageSearch.ts
import { useState } from 'react';

// Unsplash API 的端點
const API_ENDPOINT = 'https://api.unsplash.com/search/photos';

/**
 * 處理 Unsplash 圖片搜尋的 Hook
 * @param apiKey - 您的 Unsplash Access Key
 */
export const useImageSearch = (apiKey: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // imageUrl 將儲存一個 'https://images.unsplash.com/...' 格式的 URL
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  /**
   * 呼叫 API，搜尋符合關鍵字的圖片
   * @param keyword - 來自 Gemini 結局的關鍵字
   */
  const searchImage = async (keyword: string) => {
    if (!apiKey) {
      setError('Unsplash API Key 尚未設定');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setImageUrl(null);

    // 1. 準備 API 請求 URL
    const url = `${API_ENDPOINT}?query=${encodeURIComponent(
      keyword
    )}&per_page=1&orientation=landscape`;

    try {
      // 2. 發送 fetch 請求
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          // Unsplash 使用 "Authorization"
          Authorization: `Client-ID ${apiKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Unsplash API 錯誤: ${response.status} ${errorText}`);
      }

      // 3. 處理回傳的 JSON 資料
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        // 4. 取得第一張圖片的 URL
        // 我們使用 'regular' 尺寸，它大小適中
        const firstImage = data.results[0];
        setImageUrl(firstImage.urls.regular);
      } else {
        // 如果 Unsplash 找不到任何圖片
        throw new Error(`找不到符合 "${keyword}" 的圖片`);
      }

    } catch (e: any) {
      console.error('圖片搜尋失敗:', e);
      setError(e.message || '搜尋圖片時發生未知錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 重設狀態 (用於新遊戲)
   */
  const resetImage = () => {
    setIsLoading(false);
    setError(null);
    setImageUrl(null);
  };

  return {
    isImageLoading: isLoading,
    imageError: error,
    imageUrl,
    searchImage, // 匯出 searchImage
    resetImage,
  };
};