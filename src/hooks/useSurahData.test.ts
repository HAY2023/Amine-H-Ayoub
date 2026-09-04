import { describe, expect, it } from 'vitest';
import { LOCAL_SERVER_SURAHS } from './useSurahData';

describe('useSurahData local surah mapping', () => {
  it('checks LOCAL_SERVER_SURAHS definition', () => {
    expect(LOCAL_SERVER_SURAHS).toBeDefined();
  });
});
