// hooks/useImageSearch.ts (已優化：隨機選圖機制)
import { useState } from 'react';

const API_ENDPOINT = 'https://api.unsplash.com/search/photos';

export const useImageSearch = (apiKey: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const performSearch = async (query: string): Promise<string | null> => {
    const enhancedQuery = `${query} fantasy art landscape atmospheric`;
    
    // 雖然 per_page=1 可以省流量，但為了隨機性，我們請求 10 張 (預設)
    // 這裡設 per_page=10
    const url = `${API_ENDPOINT}?query=${encodeURIComponent(
      enhancedQuery
    )}&per_page=10&orientation=landscape&content_filter=high`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Client-ID ${apiKey}` },
    });

    if (!response.ok) throw new Error(`Unsplash Error: ${response.status}`);

    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // 【⭐ 修改點：隨機選圖】
      // 不要總是拿第 0 張，而是從回傳的結果中隨機挑一張
      const randomIndex = Math.floor(Math.random() * data.results.length);
      const randomImage = data.results[randomIndex];
      
      return randomImage.urls.regular;
    }
    return null;
  };

  const searchImage = async (keyword: string) => {
    if (!apiKey) {
      setError('Unsplash API Key 尚未設定');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      let url = await performSearch(keyword);

      if (!url) {
        console.warn(`Unsplash 找不到 "${keyword}"，嘗試使用備用關鍵字...`);
        url = await performSearch('mysterious ancient ruins fog'); 
      }

      if (url) {
        setImageUrl(url);
      } else {
        throw new Error('無法找到任何相關圖片');
      }

    } catch (e: any) {
      console.error('圖片搜尋失敗:', e);
      setError('無法載入天機圖像');
    } finally {
      setIsLoading(false);
    }
  };

  const resetImage = () => {
    setIsLoading(false);
    setError(null);
    setImageUrl(null);
  };

  return {
    isImageLoading: isLoading,
    imageError: error,
    imageUrl,
    searchImage,
    resetImage,
  };
};