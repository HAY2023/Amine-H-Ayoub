import { useState, useEffect, useCallback } from "react";

export interface SurahItem {
  number: number;
  name: string;
  driveId: string;
  size: string;
  type: string;
}

const API_URL =
  "https://script.google.com/macros/s/AKfycbwTphBJ6zTGk3pzZ9FAAToLggsshO3rVVfJwfh6RfVxOtsNlGI3FRGIJYipHtrDu7Vi/exec";

function parseName(n: string): { number: number; name: string } {
  const match = n.match(/^(\d+)\s+(.+?)\.mp3$/);
  if (match) {
    return { number: parseInt(match[1], 10), name: match[2] };
  }
  return { number: 0, name: n };
}

export function useSurahData() {
  const [surahs, setSurahs] = useState<SurahItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(API_URL)
      .then((res) => res.json())
      .then((json) => {
        const items: SurahItem[] = (json.data || [])
          .filter((d: any) => d.t === "a")
          .map((d: any) => {
            const parsed = parseName(d.n);
            return {
              number: parsed.number,
              name: parsed.name,
              driveId: d.i,
              size: d.s,
              type: d.t,
            };
          })
          .sort((a: SurahItem, b: SurahItem) => a.number - b.number);
        setSurahs(items);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { surahs, loading, error, retry: fetchData };
}
