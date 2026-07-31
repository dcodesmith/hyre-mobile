import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Text, View } from "react-native";

interface GuestDetailsFormProps {
  readonly name: string;
  readonly email: string;
  readonly phoneNumber: string;
  readonly onNameChange: (value: string) => void;
  readonly onEmailChange: (value: string) => void;
  readonly onPhoneNumberChange: (value: string) => void;
  readonly className?: string;
  readonly errors?: {
    name?: string;
    email?: string;
    phoneNumber?: string;
  };
}

function FieldError({ error }: { readonly error?: string }) {
  if (!error) return null;
  return <Text className="text-red-500 text-sm mt-1">{error}</Text>;
}

export function GuestDetailsForm({
  name,
  email,
  phoneNumber,
  onNameChange,
  onEmailChange,
  onPhoneNumberChange,
  className,
  errors,
}: GuestDetailsFormProps) {
  return (
    <View
      className={cn(
        "bg-white border border-neutral-200 rounded shadow-xl px-4 py-4",
        className
      )}
    >
      <View className="gap-4">
        <View className="space-y-1">
          <Text className="text-sm font-semibold text-gray-900">Name</Text>
          <Input
            value={name}
            onChangeText={onNameChange}
            placeholder="Enter your full name"
            autoCapitalize="words"
            autoComplete="name"
            className={cn(
              "h-10 text-sm border-neutral-200 bg-white shadow-none",
              errors?.name && "border-red-500"
            )}
          />
          <FieldError error={errors?.name} />
        </View>

        <View className="space-y-1">
          <Text className="text-sm font-semibold text-gray-900">Email</Text>
          <Input
            value={email}
            onChangeText={onEmailChange}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            className={cn(
              "h-10 text-sm border-neutral-200 bg-white shadow-none",
              errors?.email && "border-red-500"
            )}
          />
          <FieldError error={errors?.email} />
        </View>

        <View className="space-y-1">
          <Text className="text-sm font-semibold text-gray-900">
            Phone Number
          </Text>
          <Input
            value={phoneNumber}
            onChangeText={onPhoneNumberChange}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            autoComplete="tel"
            className={cn(
              "h-10 text-sm border-neutral-200 bg-white shadow-none",
              errors?.phoneNumber && "border-red-500"
            )}
          />
          <FieldError error={errors?.phoneNumber} />
        </View>
      </View>
    </View>
  );
}
