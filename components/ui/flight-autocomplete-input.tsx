import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
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
import { FLIGHT_AUTOCOMPLETE_POPOVER_STYLE } from "@/lib/autocomplete-popover-style";
import { useAutocompleteAnchor } from "@/lib/use-autocomplete-anchor";
import { cn } from "@/lib/utils";

/** hireApp --radix-popper-anchor-height (form input) */
const INPUT_HEIGHT = 40;

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
};

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
  });

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
      surfaceStyle={FLIGHT_AUTOCOMPLETE_POPOVER_STYLE}
    >
      <View className="flex-col gap-1">
        {suggestions.map((airline) => {
          const flightNumber = extractFlightDigits(query, airline);
          const formattedFlightNumber = flightNumber
            ? `${airline.iata}${flightNumber}`.toUpperCase()
            : airline.iata.toUpperCase();

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
    return (
      <View className={cn("w-full", className)} collapsable={false}>
        <View
          ref={anchorRef}
          collapsable={false}
          onLayout={measure}
          className="w-full flex-row items-center"
        >
          <TextInput
            className={cn(
              "flex-1 border-0 p-0 text-sm leading-[14px] text-gray-900",
              inputClassName,
            )}
            style={{ fontFamily: "Geist-Regular" }}
            value={value}
            onChangeText={handleChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            editable={!disabled}
            autoCapitalize="none"
            autoCorrect={false}
            {...focusHandlers}
          />
          {isValidating ? (
            <ActivityIndicator size="small" color="#6B7280" />
          ) : null}
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
