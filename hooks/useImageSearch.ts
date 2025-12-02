// hooks/useImageSearch.ts (已優化：移除黑白限制 + 強制風景風格)
import { useState } from 'react';

const API_ENDPOINT = 'https://api.unsplash.com/search/photos';

export const useImageSearch = (apiKey: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const performSearch = async (query: string): Promise<string | null> => {
    // 【⭐ 修改點 1】移除 &color=black_and_white
    // 【⭐ 修改點 2】強制加上 'fantasy art landscape' 後綴，確保搜到的是場景
    const enhancedQuery = `${query} fantasy art landscape atmospheric`;
    
    const url = `${API_ENDPOINT}?query=${encodeURIComponent(
      enhancedQuery
    )}&per_page=1&orientation=landscape&content_filter=high`;

    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Client-ID ${apiKey}` },
    });

    if (!response.ok) throw new Error(`Unsplash Error: ${response.status}`);

    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].urls.regular;
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