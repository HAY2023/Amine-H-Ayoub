import { describe, expect, it } from 'vitest';
import { LOCAL_SERVER_SURAHS } from './useSurahData';

describe('useSurahData local surah mapping', () => {
  it('should use the correct audio file for Surah Al-Hadid', () => {
    expect(LOCAL_SERVER_SURAHS[57]).toBe('http://localhost:12345/57.mp3');
  });
});
