// hooks/useImageSearch.ts (已修復：加入找不到圖片時的備用機制)
import { useState } from 'react';

const API_ENDPOINT = 'https://api.unsplash.com/search/photos';

export const useImageSearch = (apiKey: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // 內部搜尋函式，可重複使用
  const performSearch = async (query: string): Promise<string | null> => {
    // 強制黑白 + 高品質過濾
    const url = `${API_ENDPOINT}?query=${encodeURIComponent(
      query
    )}&per_page=1&orientation=landscape&color=black_and_white&content_filter=high`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Client-ID ${apiKey}` },
    });

    if (!response.ok) throw new Error(`Unsplash Error: ${response.status}`);

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].urls.regular;
    }
    return null; // 沒找到
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
      // 1. 嘗試使用 AI 給的關鍵字
      let url = await performSearch(keyword);

      // 2. 【⭐ 修正點】如果找不到，使用備用關鍵字重試
      if (!url) {
        console.warn(`Unsplash 找不到 "${keyword}"，嘗試使用備用關鍵字...`);
        // 使用一個很穩的通用關鍵字
        url = await performSearch('fantasy mystery landscape mist'); 
      }

      // 3. 設定圖片 (如果兩次都失敗，url 仍可能為 null，但機率極低)
      if (url) {
        setImageUrl(url);
      } else {
        throw new Error('無法找到任何相關圖片');
      }

    } catch (e: any) {
      console.error('圖片搜尋失敗:', e);
      setError('無法載入天機圖像'); // 給使用者看的友善訊息
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