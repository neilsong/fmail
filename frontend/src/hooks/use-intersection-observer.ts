import { useEffect, useRef, useState } from "react";

interface UseIntersectionObserverOptions {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
  enabled?: boolean;
  onIntersect?: () => void;
}

export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.5,
  root = null,
  rootMargin = "0px",
  enabled = true,
  onIntersect,
}: UseIntersectionObserverOptions = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<T>(null);
  const hasIntersectedRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;

    if (!enabled || !element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsIntersecting(entry.isIntersecting);

          // Only call onIntersect once when element first becomes visible
          if (entry.isIntersecting && !hasIntersectedRef.current && onIntersect) {
            hasIntersectedRef.current = true;
            onIntersect();
          }
        });
      },
      {
        threshold,
        root,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [enabled, threshold, root, rootMargin, onIntersect]);

  // Reset the hasIntersected flag when element changes
  useEffect(() => {
    hasIntersectedRef.current = false;
  }, []);

  return {
    ref: elementRef,
    isIntersecting,
  };
}
