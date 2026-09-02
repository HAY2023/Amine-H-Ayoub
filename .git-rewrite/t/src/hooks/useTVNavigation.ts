import { useEffect } from "react";

interface TVNavigationOptions {
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onBack?: () => void;
  enabled?: boolean;
}

/**
 * Hook for TV remote control (D-pad) and keyboard navigation.
 * Handles Android TV remote keys, D-pad, and media buttons.
 */
export function useTVNavigation({
  onPlayPause,
  onNext,
  onPrev,
  onBack,
  enabled = true,
}: TVNavigationOptions) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      switch (e.key) {
        case "MediaPlayPause":
        case " ": // Spacebar for Play/Pause
          if (onPlayPause) {
            e.preventDefault();
            onPlayPause();
          }
          break;

        case "MediaTrackNext":
        case "PageDown":
          if (onNext) {
            e.preventDefault();
            onNext();
          }
          break;

        case "MediaTrackPrevious":
        case "PageUp":
          if (onPrev) {
            e.preventDefault();
            onPrev();
          }
          break;

        case "Escape":
        case "BrowserBack":
          if (onBack) {
            e.preventDefault();
            onBack();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onPlayPause, onNext, onPrev, onBack, enabled]);
}
