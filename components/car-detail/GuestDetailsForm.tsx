import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Text, View } from "react-native";

interface GuestDetailsFormProps {
  readonly name: string;
  readonly email: string;
  readonly onNameChange: (value: string) => void;
  readonly onEmailChange: (value: string) => void;
  readonly className?: string;
  readonly errors?: {
    name?: string;
    email?: string;
  };
}

function FieldError({ error }: { readonly error?: string }) {
  if (!error) return null;
  return <Text className="text-red-500 text-sm mt-1">{error}</Text>;
}

export function GuestDetailsForm({
  name,
  email,
  onNameChange,
  onEmailChange,
  className,
  errors,
}: GuestDetailsFormProps) {
  return (
    <View className={cn("mt-6 gap-6", className)}>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-900">
            Full Name
          </Text>
          <Input
            value={name}
            onChangeText={onNameChange}
            placeholder="Enter your full name"
            autoCapitalize="words"
            autoComplete="name"
            className={cn(
              "h-11 text-sm border-neutral-200 bg-white shadow-none",
              errors?.name && "border-red-500"
            )}
          />
          <FieldError error={errors?.name} />
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-gray-900">
            Email Address
          </Text>
          <Input
            value={email}
            onChangeText={onEmailChange}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            className={cn(
              "h-11 text-sm border-neutral-200 bg-white shadow-none",
              errors?.email && "border-red-500"
            )}
          />
          <FieldError error={errors?.email} />
        </View>
    </View>
  );
}
