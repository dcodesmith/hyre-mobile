import { Checkbox } from "@/components/ui/checkbox";
import {
  MAX_BOOKING_ADDONS,
  type PublicAddon,
} from "@/lib/booking-addons";
import { formatCurrency } from "@/lib/currency";
import { Pressable, Text, View } from "react-native";

export function BookingAddons({
  addons,
  addonsLoading,
  selectedAddonIds,
  onSelectionChange,
}: {
  readonly addons: readonly PublicAddon[];
  readonly addonsLoading: boolean;
  readonly selectedAddonIds: readonly string[];
  readonly onSelectionChange: (addonId: string, selected: boolean) => void;
}) {
  const selectedIds = new Set(selectedAddonIds);

  if (!addonsLoading && addons.length === 0) return null;

  return (
    <View>
      <Text className="mb-2 text-sm font-semibold text-foreground">Add-ons</Text>
      <View className="gap-3 rounded border border-neutral-200 bg-white px-4 py-4 shadow-xl">
        {addonsLoading && addons.length === 0 ? (
          <Text className="text-sm text-muted-foreground">
            Loading add-ons…
          </Text>
        ) : (
          addons.map((addon) => {
            const selected = selectedIds.has(addon.id);
            const atLimit =
              !selected && selectedIds.size >= MAX_BOOKING_ADDONS;

            return (
              <Pressable
                key={addon.id}
                disabled={atLimit}
                onPress={() => onSelectionChange(addon.id, !selected)}
                className="min-h-11 flex-row items-start gap-3"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled: atLimit }}
                accessibilityLabel={`${addon.name}, ${formatCurrency(addon.unitPrice)}`}
              >
                <Checkbox
                  checked={selected}
                  disabled={atLimit}
                  onCheckedChange={() => undefined}
                  className="mt-0.5 border-neutral-900 shadow-none"
                  checkedClassName="border-neutral-900"
                  indicatorClassName="bg-neutral-900"
                  iconClassName="text-white"
                  accessible={false}
                  pointerEvents="none"
                />
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-start justify-between gap-3">
                    <Text className="min-w-0 flex-1 text-sm font-medium leading-5 text-foreground">
                      {addon.name}
                    </Text>
                    <Text className="shrink-0 text-sm font-medium leading-5 text-foreground">
                      {formatCurrency(addon.unitPrice)}
                    </Text>
                  </View>
                  {addon.description ? (
                    <Text className="mt-0.5 text-xs leading-4 text-muted-foreground">
                      {addon.description}
                    </Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}
