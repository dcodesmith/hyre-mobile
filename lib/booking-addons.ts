export const MAX_BOOKING_ADDONS = 10;

export type AddonPricingUnit = "PER_BOOKING" | "PER_LEG";

export type PublicAddon = {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly pricingUnit: AddonPricingUnit;
  readonly unitPrice: number;
  readonly currency: "NGN";
};

export type BookingAddonSnapshot = {
  readonly code: string;
  readonly name: string;
  readonly pricingUnit: AddonPricingUnit;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly totalPrice: number;
};

export type BookingPricingAddon = BookingAddonSnapshot & {
  readonly id: string;
};

export function addonCatalogKey(addons: readonly Pick<PublicAddon, "id">[]): string {
  return addons.map((addon) => addon.id).join("|");
}

export function toggleSelectedAddonId(
  ids: readonly string[],
  addonId: string,
  selected: boolean,
): string[] {
  if (!selected) return ids.filter((id) => id !== addonId);
  if (ids.includes(addonId) || ids.length >= MAX_BOOKING_ADDONS) return [...ids];
  return [...ids, addonId];
}

export function selectedBookingPricingAddons(
  addons: readonly PublicAddon[],
  selectedIds: readonly string[],
  numberOfLegs: number,
): BookingPricingAddon[] {
  const selected = new Set(selectedIds);

  return addons.filter((addon) => selected.has(addon.id)).map((addon) => {
    const quantity =
      addon.pricingUnit === "PER_LEG" ? Math.max(numberOfLegs, 1) : 1;

    return {
      id: addon.id,
      code: addon.code,
      name: addon.name,
      pricingUnit: addon.pricingUnit,
      unitPrice: addon.unitPrice,
      quantity,
      totalPrice: addon.unitPrice * quantity,
    };
  });
}
