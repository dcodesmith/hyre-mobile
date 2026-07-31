import { Portal } from "@rn-primitives/portal";
import type { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import type { WindowAnchor } from "@/lib/use-autocomplete-anchor";

/** hireApp ui/popover default sideOffset */
const DEFAULT_SIDE_OFFSET = 4;

type AutocompletePortalDropdownProps = {
  readonly portalName: string;
  readonly anchor: WindowAnchor | null;
  readonly visible: boolean;
  readonly sideOffset?: number;
  readonly maxHeight?: number;
  /** hireApp PopoverContent card (shadow/border) — must wrap ScrollView, not sit inside it. */
  readonly surfaceStyle?: ViewStyle;
  readonly children: ReactNode;
};

/**
 * Floating list (hireApp PopoverPortal): full-screen portal host + window-anchored
 * placement below the trigger — no layout shift, no overlap with the input.
 */
export function AutocompletePortalDropdown({
  portalName,
  anchor,
  visible,
  sideOffset = DEFAULT_SIDE_OFFSET,
  maxHeight = 280,
  surfaceStyle,
  children,
}: AutocompletePortalDropdownProps) {
  if (!visible || !anchor) {
    return null;
  }

  const top = anchor.y + anchor.height + sideOffset;

  return (
    <Portal name={portalName}>
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFillObject, styles.layer]}
      >
        <View
          style={[
            {
              position: "absolute",
              top,
              left: anchor.x,
              width: anchor.width,
            },
            surfaceStyle,
          ]}
        >
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={{ maxHeight, backgroundColor: "transparent" }}
            contentContainerStyle={styles.scrollContent}
            bounces={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  layer: {
    zIndex: 100,
    elevation: 100,
  },
  scrollContent: {
    flexGrow: 0,
  },
});
