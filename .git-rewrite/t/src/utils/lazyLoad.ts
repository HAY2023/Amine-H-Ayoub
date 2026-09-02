/**
 * Lazy loading utilities for performance optimization
 */

// Cache for preloaded images
const imageCache = new Map<string, Promise<string>>();

/**
 * Preload images with caching
 */
export function preloadImage(src: string): Promise<string> {
  if (imageCache.has(src)) {
    return imageCache.get(src)!;
  }

  const promise = new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });

  imageCache.set(src, promise);
  return promise;
}

/**
 * Batch preload multiple images
 */
export async function batchPreloadImages(srcs: string[], concurrent = 3): Promise<void> {
  const chunks = [];
  for (let i = 0; i < srcs.length; i += concurrent) {
    chunks.push(srcs.slice(i, i + concurrent));
  }

  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map(preloadImage));
  }
}

/**
 * Intersection Observer for lazy loading
 */
export function setupIntersectionObserver(
  element: Element,
  callback: (isIntersecting: boolean) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      callback(entry.isIntersecting);
    });
  }, {
    threshold: 0.1,
    ...options,
  });

  observer.observe(element);
  return observer;
}

/**
 * Debounced resize observer
 */
export function setupResizeObserver(
  element: Element,
  callback: (rect: DOMRect) => void,
  delay = 300
): ResizeObserver {
  let timeoutId: NodeJS.Timeout;
  const observer = new ResizeObserver(() => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      callback(element.getBoundingClientRect());
    }, delay);
  });

  observer.observe(element);
  return observer;
}
