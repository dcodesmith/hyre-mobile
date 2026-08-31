import { cn } from "@/lib/utils";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

type AuthTextInputProps = Omit<
  React.ComponentProps<typeof TextInput>,
  "className"
> & {
  invalid?: boolean;
};

export function AuthTextInput({
  invalid = false,
  onBlur,
  onFocus,
  placeholder,
  style,
  value,
  ...props
}: Readonly<AuthTextInputProps>) {
  const [isFocused, setIsFocused] = useState(false);
  const showPlaceholder = typeof value !== "string" || value.length === 0;

  return (
    <View
      className={cn(
        "h-12 w-full justify-center rounded-sm border-2 border-transparent bg-neutral-100 px-3 py-2",
        isFocused && "border-neutral-900",
        invalid && "border-red-500",
      )}
    >
      {showPlaceholder ? (
        <View
          pointerEvents="none"
          className="absolute inset-y-0 left-3 right-3 justify-center"
        >
          <Text
            className="font-jakarta text-base text-neutral-500"
            style={style}
          >
            {placeholder}
          </Text>
        </View>
      ) : null}
      <TextInput
        {...props}
        value={value}
        className="h-7 w-full font-jakarta text-neutral-900"
        style={[
          { fontSize: 16, padding: 0 },
          process.env.EXPO_OS === "android"
            ? {
                includeFontPadding: false,
                textAlignVertical: "center",
              }
            : undefined,
          style,
        ]}
        underlineColorAndroid="transparent"
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
      />
    </View>
  );
}
