import { AutocompletePortalDropdown } from "@/components/ui/autocomplete-portal-dropdown";
import { Input } from "@/components/ui/input";
import { AUTOCOMPLETE_POPOVER_STYLE } from "@/lib/autocomplete-popover-style";
import { useAutocompleteAnchor } from "@/lib/use-autocomplete-anchor";
import { cn } from "@/lib/utils";
import {
  autocompletePlaces,
  type PlaceSuggestion,
  resolvePlace,
} from "@/services/places";
import { MapPin } from "lucide-react-native";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;
/** hireApp --radix-popper-anchor-height */
const INPUT_HEIGHT = 40;

function createSessionToken() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

type AddressAutocompleteInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  onAddressSelected?: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
};

export function AddressAutocompleteInput({
  value,
  onChangeText,
  onAddressSelected,
  placeholder = "Start typing to search for an address",
  className,
  inputClassName,
  disabled,
}: Readonly<AddressAutocompleteInputProps>) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [isResolvingSelection, setIsResolvingSelection] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState<string | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteControllerRef = useRef<AbortController | null>(null);
  const resolvedAddressRef = useRef<string | null>(null);
  const sessionTokenRef = useRef<string>(createSessionToken());
  const latestAutocompleteRequestRef = useRef(0);
  const suggestionsCacheRef = useRef<Map<string, PlaceSuggestion[]>>(new Map());
  const portalName = `address-autocomplete-${useId()}`;

  const query = autocompleteQuery?.trim() ?? "";

  const shouldOpenSuggestions =
    isFocused && suggestions.length > 0 && query.length >= MIN_QUERY_LENGTH;

  const { ref: anchorRef, anchor, measure } = useAutocompleteAnchor({
    open: shouldOpenSuggestions,
  });

  const closeSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  const cancelAutocomplete = useCallback(() => {
    latestAutocompleteRequestRef.current += 1;
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
    autocompleteControllerRef.current?.abort();
    autocompleteControllerRef.current = null;
    setIsFetchingSuggestions(false);
  }, []);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      autocompleteControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (
      autocompleteQuery !== null &&
      value !== autocompleteQuery &&
      value !== resolvedAddressRef.current
    ) {
      cancelAutocomplete();
      closeSuggestions();
      setAutocompleteQuery(null);
      resolvedAddressRef.current = null;
    }
  }, [autocompleteQuery, cancelAutocomplete, closeSuggestions, value]);

  useEffect(() => {
    if (!isFocused || query.length < MIN_QUERY_LENGTH || disabled) {
      setIsFetchingSuggestions(false);
      closeSuggestions();
      return;
    }

    const normalizedQuery = query.toLowerCase();
    const cached = suggestionsCacheRef.current.get(normalizedQuery);
    if (cached) {
      setIsFetchingSuggestions(false);
      setSuggestions(cached);
      return;
    }

    const requestId = latestAutocompleteRequestRef.current + 1;
    latestAutocompleteRequestRef.current = requestId;
    debounceTimeoutRef.current = setTimeout(async () => {
      debounceTimeoutRef.current = null;
      const controller = new AbortController();
      autocompleteControllerRef.current = controller;
      try {
        setIsFetchingSuggestions(true);
        const response = await autocompletePlaces(
          {
            input: query,
            sessionToken: sessionTokenRef.current,
            limit: 5,
          },
          { signal: controller.signal },
        );
        if (latestAutocompleteRequestRef.current !== requestId) {
          return;
        }
        suggestionsCacheRef.current.set(normalizedQuery, response.suggestions);
        setSuggestions(response.suggestions);
      } catch {
        if (latestAutocompleteRequestRef.current !== requestId) {
          return;
        }
        closeSuggestions();
      } finally {
        if (latestAutocompleteRequestRef.current === requestId) {
          autocompleteControllerRef.current = null;
          setIsFetchingSuggestions(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      if (autocompleteControllerRef.current) {
        autocompleteControllerRef.current.abort();
        autocompleteControllerRef.current = null;
      }
      if (latestAutocompleteRequestRef.current === requestId) {
        latestAutocompleteRequestRef.current += 1;
      }
    };
  }, [isFocused, query, closeSuggestions, disabled]);

  const handleSelect = useCallback(
    async (suggestion: PlaceSuggestion) => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      cancelAutocomplete();
      setAutocompleteQuery(null);
      setIsResolvingSelection(true);
      try {
        const resolved = await resolvePlace({
          placeId: suggestion.placeId,
          sessionToken: sessionTokenRef.current,
        });
        const address = resolved.address ?? suggestion.description;
        resolvedAddressRef.current = address;
        onChangeText(address);
        onAddressSelected?.(address);
      } catch {
        resolvedAddressRef.current = suggestion.description;
        onChangeText(suggestion.description);
        onAddressSelected?.(suggestion.description);
      } finally {
        setIsResolvingSelection(false);
        closeSuggestions();
        setIsFocused(false);
        sessionTokenRef.current = createSessionToken();
      }
    },
    [cancelAutocomplete, closeSuggestions, onAddressSelected, onChangeText],
  );

  const isBusy = isFetchingSuggestions || isResolvingSelection;

  const spinner = useMemo(() => {
    if (!isBusy) return null;
    return (
      <View className="absolute right-3 top-1/2 -translate-y-1/2">
        <ActivityIndicator size="small" color="#6B7280" />
      </View>
    );
  }, [isBusy]);

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
          onChangeText={(next) => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
            }
            resolvedAddressRef.current = null;
            cancelAutocomplete();
            closeSuggestions();
            setAutocompleteQuery(next);
            setIsFocused(true);
            onChangeText(next);
          }}
          onFocus={() => {
            if (blurTimeoutRef.current) {
              clearTimeout(blurTimeoutRef.current);
            }
            setIsFocused(true);
            measure();
          }}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => {
              cancelAutocomplete();
              setIsFocused(false);
              closeSuggestions();
            }, 200);
          }}
          editable={!disabled && !isResolvingSelection}
          placeholder={placeholder}
          style={{ backgroundColor: "#FFFFFF", height: INPUT_HEIGHT }}
          className={cn(
            "h-10 rounded-md border border-neutral-200 bg-white pr-9 shadow-none",
            inputClassName,
          )}
        />
        {spinner}
      </View>

      <AutocompletePortalDropdown
        portalName={portalName}
        anchor={anchor}
        visible={shouldOpenSuggestions}
        surfaceStyle={AUTOCOMPLETE_POPOVER_STYLE}
      >
        <View className="flex-col gap-1">
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.placeId}
              onPressIn={() => void handleSelect(suggestion)}
              className="w-full flex-row items-center gap-2 rounded-md p-2 active:bg-gray-100"
            >
              <MapPin
                size={16}
                color="#6B7280"
                strokeWidth={2}
                style={{ flexShrink: 0 }}
              />
              <Text className="flex-1 text-sm leading-5 text-neutral-950">
                {suggestion.description}
              </Text>
            </Pressable>
          ))}
        </View>
      </AutocompletePortalDropdown>
    </View>
  );
}
