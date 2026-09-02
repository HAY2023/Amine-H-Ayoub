/**
 * Virtual scrolling utility for large lists
 * Renders only visible items to improve performance
 */

import React from 'react';

export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  buffer?: number; // extra items to render above/below visible area
}

export interface VirtualScrollResult {
  startIndex: number;
  endIndex: number;
  offsetY: number;
}

/**
 * Calculate which items should be visible
 */
export function calculateVisibleRange(
  scrollOffset: number,
  itemCount: number,
  options: VirtualScrollOptions
): VirtualScrollResult {
  const { itemHeight, containerHeight, buffer = 5 } = options;
  
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollOffset / itemHeight) - buffer);
  const endIndex = Math.min(itemCount, startIndex + visibleCount + buffer * 2);
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, offsetY };
}

/**
 * Hook for virtual scrolling (simplified for manual implementation)
 */
export function useVirtualScroll(
  itemCount: number,
  options: VirtualScrollOptions
) {
  const [scrollOffset, setScrollOffset] = React.useState(0);
  const visible = calculateVisibleRange(scrollOffset, itemCount, options);
  
  return {
    ...visible,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollOffset((e.target as HTMLDivElement).scrollTop);
    },
    totalHeight: itemCount * options.itemHeight,
  };
}

/**
 * For use with React.lazy for dynamic imports
 */
export const createLazyComponent = <T extends React.ComponentType<unknown>>(importFn: () => Promise<{ default: T }>) => {
  return React.lazy(importFn);
};
