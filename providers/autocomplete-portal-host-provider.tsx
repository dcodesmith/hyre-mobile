import { PortalHost } from "@rn-primitives/portal";
import {
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useRef,
} from "react";
import { StyleSheet, View, type View as ViewType } from "react-native";
import type { WindowAnchor } from "@/lib/use-autocomplete-anchor";

type MeasureRelativeArgs = {
  inputRef: RefObject<ViewType | null>;
  minHeight: number;
  onMeasured: (anchor: WindowAnchor | null) => void;
};

type AutocompletePortalHostContextValue = {
  measureRelativeToHost: (args: MeasureRelativeArgs) => void;
};

const AutocompletePortalHostContext =
  createContext<AutocompletePortalHostContextValue | null>(null);

export function useAutocompletePortalHost() {
  const ctx = useContext(AutocompletePortalHostContext);
  if (!ctx) {
    throw new Error(
      "Autocomplete inputs must render inside AutocompletePortalHostProvider",
    );
  }
  return ctx;
}

/** Full-screen portal layer; anchor coords are relative to this host (not window). */
export function AutocompletePortalHostProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const hostRef = useRef<ViewType>(null);

  const measureRelativeToHost = useCallback(
    ({ inputRef, minHeight, onMeasured }: MeasureRelativeArgs) => {
      const input = inputRef.current;
      const host = hostRef.current;
      if (!input || !host) {
        onMeasured(null);
        return;
      }

      input.measureInWindow((ix, iy, iw, ih) => {
        host.measureInWindow((hx, hy) => {
          const height = Math.max(ih, minHeight);
          if (iw <= 0 || height <= 0) {
            onMeasured(null);
            return;
          }
          onMeasured({
            x: ix - hx,
            y: iy - hy,
            width: iw,
            height,
          });
        });
      });
    },
    [],
  );

  return (
    <AutocompletePortalHostContext.Provider value={{ measureRelativeToHost }}>
      <View style={styles.root}>
        {children}
        <View
          ref={hostRef}
          pointerEvents="box-none"
          collapsable={false}
          style={styles.portalHost}
        >
          <PortalHost />
        </View>
      </View>
    </AutocompletePortalHostContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  portalHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
});
