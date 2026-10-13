import { useAutocompletePortalHost } from "@/providers/autocomplete-portal-host-provider";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { type View } from "react-native";

export type WindowAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** hireApp --radix-popper-anchor-height */
export const AUTOCOMPLETE_INPUT_MIN_HEIGHT = 40;

type UseAutocompleteAnchorOptions = {
  open: boolean;
  /** Minimum trigger height when layout reports less (inline TextInput rows). */
  minHeight?: number;
  /** Measure this view instead of an internally owned one. */
  anchorRef?: RefObject<View | null>;
};

/**
 * Measure trigger vs portal host so dropdown `top` is host-relative
 * (window coords alone misalign and overlap the input on Android).
 */
export function useAutocompleteAnchor({
  open,
  minHeight = AUTOCOMPLETE_INPUT_MIN_HEIGHT,
  anchorRef,
}: UseAutocompleteAnchorOptions) {
  const internalRef = useRef<View>(null);
  const ref = anchorRef ?? internalRef;
  const [anchor, setAnchor] = useState<WindowAnchor | null>(null);
  const { measureRelativeToHost } = useAutocompletePortalHost();

  const measure = useCallback(() => {
    measureRelativeToHost({
      inputRef: ref,
      minHeight,
      onMeasured: setAnchor,
    });
  }, [measureRelativeToHost, minHeight]);

  useEffect(() => {
    if (!open) {
      setAnchor(null);
      return;
    }
    measure();
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [open, measure]);

  return { ref, anchor, measure };
}
