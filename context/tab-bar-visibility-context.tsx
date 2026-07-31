"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { Animated } from "react-native";

const SCROLL_THRESHOLD = 10;

type TabBarVisibilityContextValue = {
  translateY: Animated.Value;
  onScroll: (contentOffsetY: number) => void;
  showTabBar: () => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibilityContextValue | null>(
  null
);

export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isHiddenRef = useRef(false);

  const onScroll = useCallback(
    (contentOffsetY: number) => {
      const delta = contentOffsetY - lastScrollY.current;

      // Near top - always show
      if (contentOffsetY < 50) {
        if (isHiddenRef.current) {
          isHiddenRef.current = false;
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
        lastScrollY.current = contentOffsetY;
        return;
      }

      if (delta > SCROLL_THRESHOLD) {
        // Scrolling down (content moving up) -> hide tab bar
        if (!isHiddenRef.current) {
          isHiddenRef.current = true;
          Animated.timing(translateY, {
            toValue: 150,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }
        lastScrollY.current = contentOffsetY;
      } else if (delta < -SCROLL_THRESHOLD) {
        // Scrolling up (content moving down) -> show tab bar
        if (isHiddenRef.current) {
          isHiddenRef.current = false;
          Animated.timing(translateY, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }).start();
        }
        lastScrollY.current = contentOffsetY;
      }
    },
    [translateY]
  );

  const showTabBar = useCallback(() => {
    if (isHiddenRef.current) {
      isHiddenRef.current = false;
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [translateY]);

  const value: TabBarVisibilityContextValue = {
    translateY,
    onScroll,
    showTabBar,
  };

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const ctx = useContext(TabBarVisibilityContext);
  const fallbackTranslateY = useRef(new Animated.Value(0)).current;
  if (!ctx) {
    return {
      translateY: fallbackTranslateY,
      onScroll: () => {},
      showTabBar: () => {},
    };
  }
  return ctx;
}
