import { Loader2 } from "lucide-react-native";
import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  Text,
  TextInput,
  View,
  type View as ViewType,
} from "react-native";
import { AutocompletePortalDropdown } from "@/components/ui/autocomplete-portal-dropdown";
import { Input } from "@/components/ui/input";
import {
  type Airline,
  extractFlightDigits,
  filterAirlines,
  formatSelectedFlightNumber,
  shouldShowAirlineSuggestions,
} from "@/lib/airline-data";
import {
  FLIGHT_AUTOCOMPLETE_POPOVER_STYLE,
  INLINE_FLIGHT_MENU_STYLE,
} from "@/lib/autocomplete-popover-style";
import { useAutocompleteAnchor } from "@/lib/use-autocomplete-anchor";
import { cn } from "@/lib/utils";

/** hireApp --radix-popper-anchor-height (form input) */
const INPUT_HEIGHT = 40;
/** hireApp Loader2 `h-4 w-4` — fixed so it cannot change row height. */
const LOADER_SIZE = 16;

type FlightAutocompleteInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  /** Called when user picks an airline suggestion (formatted IATA+digits). */
  onFlightSelected?: (flightNumber: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  hasError?: boolean;
  isValidating?: boolean;
  nigeriaOnly?: boolean;
  variant?: "inline" | "form";
  /** Service text shown on the same line, immediately left of the value. */
  inlineDetail?: string | null;
  /** `success` is the green route; `error` is the gray service message. */
  inlineTone?: "success" | "error";
  /** Full flight-number row. The suggestion menu matches this width. */
  rowAnchorRef?: RefObject<ViewType | null>;
  anchorMeasureRef?: RefObject<(() => void) | null>;
};

/** Fixed 16×16 slot. The icon is absolute inside it so it cannot grow the row. */
function InlineSlotLoader({ visible }: { readonly visible: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    spin.setValue(0);
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [spin, visible]);

  if (!visible) return null;

  return (
    <View
      pointerEvents="none"
      collapsable={false}
      style={{ width: LOADER_SIZE, height: LOADER_SIZE }}
    >
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: LOADER_SIZE,
          height: LOADER_SIZE,
          transform: [
            {
              rotate: spin.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "360deg"],
              }),
            },
          ],
        }}
      >
        <Loader2 size={LOADER_SIZE} color="#6B7280" strokeWidth={2} />
      </Animated.View>
    </View>
  );
}

export function FlightAutocompleteInput({
  value,
  onChangeText,
  onFlightSelected,
  placeholder = "e.g. BA123",
  className,
  inputClassName,
  disabled,
  hasError = false,
  isValidating = false,
  nigeriaOnly = true,
  variant = "form",
  inlineDetail = null,
  inlineTone = "success",
  rowAnchorRef,
  anchorMeasureRef,
}: Readonly<FlightAutocompleteInputProps>) {
  const [suggestions, setSuggestions] = useState<Airline[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const portalName = `flight-autocomplete-${useId()}`;

  const query = value.trim();
  const shouldOpenSuggestions =
    isFocused && suggestions.length > 0 && query.length >= 2;

  const {
    ref: anchorRef,
    anchor,
    measure,
  } = useAutocompleteAnchor({
    open: shouldOpenSuggestions,
    minHeight: variant === "form" ? INPUT_HEIGHT : 0,
    anchorRef: rowAnchorRef,
  });

  useEffect(() => {
    if (!anchorMeasureRef) return;
    anchorMeasureRef.current = measure;
    return () => {
      anchorMeasureRef.current = null;
    };
  }, [anchorMeasureRef, measure]);

  const closeSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isFocused || disabled || !shouldShowAirlineSuggestions(query)) {
      closeSuggestions();
      return;
    }
    setSuggestions(filterAirlines(query, { nigeriaOnly }));
  }, [isFocused, query, nigeriaOnly, disabled, closeSuggestions]);

  const handleSelect = useCallback(
    (airline: Airline) => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      const formatted = formatSelectedFlightNumber(value, airline);
      onChangeText(formatted);
      onFlightSelected?.(formatted);
      closeSuggestions();
      setIsFocused(false);
    },
    [value, onChangeText, onFlightSelected, closeSuggestions],
  );

  const handleChangeText = useCallback(
    (next: string) => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      setIsFocused(true);
      onChangeText(next);
    },
    [onChangeText],
  );

  const focusHandlers = {
    onFocus: () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      setIsFocused(true);
      measure();
    },
    onBlur: () => {
      blurTimeoutRef.current = setTimeout(() => {
        setIsFocused(false);
        closeSuggestions();
      }, 200);
    },
  };

  const suggestionPortal = (
    <AutocompletePortalDropdown
      portalName={portalName}
      anchor={anchor}
      visible={shouldOpenSuggestions}
      maxHeight={240}
      surfaceStyle={
        variant === "inline"
          ? INLINE_FLIGHT_MENU_STYLE
          : FLIGHT_AUTOCOMPLETE_POPOVER_STYLE
      }
    >
      <View
        className={variant === "inline" ? undefined : "flex-col gap-1"}
        style={variant === "inline" ? { gap: 10 } : undefined}
      >
        {suggestions.map((airline) => {
          const flightNumber = extractFlightDigits(query, airline);
          const formattedFlightNumber = flightNumber
            ? `${airline.iata}${flightNumber}`.toUpperCase()
            : airline.iata.toUpperCase();

          if (variant === "inline") {
            return (
              <Pressable
                key={airline.id}
                onPressIn={() => handleSelect(airline)}
                className="w-full flex-row items-center justify-between gap-3 rounded active:bg-gray-100"
                style={{ minHeight: 36, paddingHorizontal: 8, paddingVertical: 8 }}
              >
                <Text
                  className="shrink-0 text-sm text-neutral-950"
                  style={{
                    fontFamily: "Geist-SemiBold",
                    lineHeight: 20,
                  }}
                >
                  {formattedFlightNumber}
                </Text>
                <Text
                  className="min-w-0 flex-1 text-right text-sm text-gray-600"
                  numberOfLines={1}
                  style={{ fontFamily: "Geist-Regular", lineHeight: 20 }}
                >
                  {airline.name}
                  {flightNumber ? ` ${flightNumber}` : ""}
                </Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={airline.id}
              onPressIn={() => handleSelect(airline)}
              className="w-full flex-row items-center justify-between gap-3 rounded p-2 active:bg-gray-100"
            >
              <View className="shrink-0 flex-row items-center gap-2">
                <Text className="text-sm font-semibold text-neutral-950">
                  {formattedFlightNumber}
                </Text>
              </View>
              <View className="min-w-0 grow flex-col items-end">
                <Text
                  className="w-full text-right text-sm font-medium text-neutral-950"
                  numberOfLines={1}
                >
                  {airline.name} {flightNumber}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </AutocompletePortalDropdown>
  );

  if (variant === "inline") {
    const detail = inlineDetail?.trim() ? inlineDetail.trim() : null;
    const showSlot = Boolean(detail) || isValidating;

    if (!showSlot) {
      return (
        <View className={cn("w-full", className)} collapsable={false}>
          <View
            ref={rowAnchorRef ? undefined : anchorRef}
            collapsable={false}
            onLayout={rowAnchorRef ? undefined : measure}
            className="w-full flex-row items-center"
          >
            <TextInput
              className={cn(
                "h-4 flex-1 border-0 p-0 text-sm leading-4 text-gray-900",
                inputClassName,
              )}
              style={{ color: "#1E2939", fontFamily: "Geist-Regular" }}
              value={value}
              onChangeText={handleChangeText}
              placeholder={placeholder}
              placeholderTextColor="#99A1AF"
              editable={!disabled}
              autoCapitalize="none"
              autoCorrect={false}
              {...focusHandlers}
            />
          </View>
          {suggestionPortal}
        </View>
      );
    }

    const shown = value.length > 0 ? value : placeholder;

    return (
      <View className={cn("w-full", className)} collapsable={false}>
        <View
          ref={rowAnchorRef ? undefined : anchorRef}
          collapsable={false}
          onLayout={rowAnchorRef ? undefined : measure}
          className="w-full flex-row flex-nowrap items-center justify-end gap-2"
          style={{
            flexDirection: "row",
            flexWrap: "nowrap",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          {isValidating ? (
            <InlineSlotLoader visible />
          ) : (
            <Text
              selectable
              numberOfLines={1}
              ellipsizeMode="tail"
              className={cn(
                "h-4 min-w-0 shrink text-right text-sm leading-4",
                inlineTone === "error" ? "text-gray-500" : "text-green-600",
              )}
              style={{ fontFamily: "Geist-Regular" }}
            >
              {detail}
            </Text>
          )}
          <View className="relative shrink-0" collapsable={false}>
            <Text
              accessible={false}
              numberOfLines={1}
              className="h-4 text-sm leading-4"
              style={{ fontFamily: "Geist-Regular", color: "transparent" }}
            >
              {shown || " "}
            </Text>
            <TextInput
              className={cn(
                "absolute left-0 right-0 top-0 h-4 border-0 p-0 text-right text-sm leading-4 text-gray-900",
                inputClassName,
              )}
              style={{ color: "#1E2939", fontFamily: "Geist-Regular" }}
              value={value}
              onChangeText={handleChangeText}
              placeholder={placeholder}
              placeholderTextColor="#99A1AF"
              editable={!disabled}
              autoCapitalize="none"
              autoCorrect={false}
              {...focusHandlers}
            />
          </View>
        </View>
        {suggestionPortal}
      </View>
    );
  }

  return (
    <View className={cn("w-full", className)} collapsable={false}>
      <View
        ref={anchorRef}
        collapsable={false}
        onLayout={measure}
        className="relative"
        style={{ height: INPUT_HEIGHT, width: "100%" }}
      >
        <Input
          value={value}
          onChangeText={handleChangeText}
          editable={!disabled}
          placeholder={placeholder}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ backgroundColor: "#FFFFFF", height: INPUT_HEIGHT }}
          className={cn(
            "h-10 w-full rounded-sm pr-9 text-sm border-neutral-200 bg-white shadow-none",
            hasError && "border-red-500",
            inputClassName,
          )}
          {...focusHandlers}
        />
        {isValidating ? (
          <View className="absolute right-3 top-1/2 -translate-y-1/2">
            <ActivityIndicator size="small" color="#6B7280" />
          </View>
        ) : null}
      </View>
      {suggestionPortal}
    </View>
  );
}
