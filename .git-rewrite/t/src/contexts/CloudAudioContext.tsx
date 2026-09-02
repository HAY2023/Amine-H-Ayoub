import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSurahAudioUrl } from '../data/audioUrls';

interface CloudAudioContextType {
  availableSurahs: Set<number>;
  isLoading: boolean;
  hasCloudAudio: (number: number) => boolean;
  getAudioPath: (number: number) => string;
}

const CloudAudioContext = createContext<CloudAudioContextType | null>(null);

export function CloudAudioProvider({ children }: { children: ReactNode }) {
  const [availableSurahs, setAvailableSurahs] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const fetchAvailableAudio = async () => {
      try {
        // استخدم ?t= لتجنب التخزين المؤقت (Cache) من المتصفح أو سيرفر Hugging Face
        const res = await fetch(`https://huggingface.co/api/datasets/hammoualiyoucef20/quran-audio/tree/main?t=${Date.now()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        const available = new Set<number>();
        data.forEach((item: any) => {
          if (item.type === 'file' && item.path.endsWith('.mp3')) {
            const num = parseInt(item.path.replace('.mp3', ''), 10);
            if (!isNaN(num)) available.add(num);
          }
        });
        
        if (isMounted) {
          setAvailableSurahs(available);
        }
      } catch (err) {
        console.error("Failed to load available audio from cloud:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAvailableAudio();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const hasCloudAudio = (number: number) => availableSurahs.has(number);
  const getAudioPath = (number: number) => hasCloudAudio(number) ? getSurahAudioUrl(number) : `/audio/surahs/${number}.mp3`;

  return (
    <CloudAudioContext.Provider value={{ availableSurahs, isLoading, hasCloudAudio, getAudioPath }}>
      {children}
    </CloudAudioContext.Provider>
  );
}

export function useCloudAudio() {
  const context = useContext(CloudAudioContext);
  if (!context) {
    throw new Error('useCloudAudio must be used within a CloudAudioProvider');
  }
  return context;
}

