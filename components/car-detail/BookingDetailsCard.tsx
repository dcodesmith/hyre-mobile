import { BookingTypeInput } from "@/components/booking-search/BookingTypeInput";
import { BookingTypeTabs } from "@/components/booking-search/BookingTypeTabs";
import { AddressAutocompleteInput } from "@/components/ui/address-autocomplete-input";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import type { CarBookingFormReturn } from "@/hooks/use-car-booking-form";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  BOOKING_TYPE_LABELS,
  BOOKING_TYPE_OPTIONS_MAP,
  DAY_BOOKING_TYPE,
} from "@/lib/booking-types";
import type { CarDetail, CostBreakdownData } from "@/lib/car-detail-types";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { Pressable, Text, View } from "react-native";

/** hireApp / worker: discounted list price emphasis */
const DISCOUNT_PRICE_COLOR = "#D32F2F";

function FieldError({ error }: { readonly error?: string }) {
  if (!error) return null;
  return <Text className="text-red-500 text-sm">{error}</Text>;
}

interface BookingDetailsCardProps {
  readonly car: Pick<
    CarDetail,
    "promotion" | "pricingIncludesFuel" | "fuelUpgradeRate"
  >;
  readonly booking: CarBookingFormReturn;
  readonly pricing: CostBreakdownData;
  readonly totalDays: number;
  readonly requiresFullTank: boolean;
  readonly onRequiresFullTankChange: (next: boolean) => void;
  readonly creditsToUse: number;
  readonly applyCredits: boolean;
  readonly onApplyCreditsChange: (next: boolean) => void;
  readonly flightError?: string | null;
  readonly isValidatingFlight?: boolean;
  readonly onDropOffAddressSelected?: (address: string) => void;
}

/**
 * The full in-page booking card: price header, booking-type tabs, date range,
 * pickup time/flight number, pickup & drop-off addresses, fuel note, and the
 * optional full-tank upgrade. Reads from `useCarBookingForm` and renders
 * inline errors from RHF.
 */
export function BookingDetailsCard({
  car,
  booking,
  pricing,
  totalDays,
  requiresFullTank,
  onRequiresFullTankChange,
  creditsToUse,
  applyCredits,
  onApplyCreditsChange,
  flightError,
  isValidatingFlight = false,
  onDropOffAddressSelected,
}: BookingDetailsCardProps) {
  const { form, values, constraints, handlers } = booking;
  const {
    formState: { errors },
    setValue,
    clearErrors,
  } = form;
  const {
    bookingType,
    dateRange,
    pickupTime,
    flightNumber,
    pickupAddress,
    dropOffAddress,
    sameLocation,
    isAirport,
  } = values;

  return (
    <View collapsable={false}>
      <View
        className="overflow-visible rounded border border-neutral-200 bg-white shadow-xl"
        style={{ overflow: "visible" }}
        collapsable={false}
      >
        <View className="flex-row items-center justify-between gap-2 px-4 py-4 lg:px-6">
          <View className="min-w-0 flex-1 flex-row flex-wrap items-baseline gap-x-2 gap-y-1">
            {pricing.originalBaseRate == null ? (
              <Text className="font-bold leading-none text-gray-900">
                {formatCurrency(pricing.baseRate)}
              </Text>
            ) : (
              <>
                <Text className="text-sm text-gray-400 line-through">
                  {formatCurrency(pricing.originalBaseRate)}
                </Text>
                <Text
                  className="font-bold leading-none"
                  style={{ color: DISCOUNT_PRICE_COLOR }}
                >
                  {formatCurrency(pricing.baseRate)}
                </Text>
              </>
            )}
            <Text className="text-sm font-normal text-gray-500">
              / {BOOKING_TYPE_LABELS[bookingType].perUnit}
            </Text>
          </View>
        </View>
        {/* Explicit mt-* between sections: RN Yoga can mis-measure gap after sibling height changes (accordion). */}
        <View className="flex flex-col px-4 pb-6 lg:px-6" collapsable={false}>
          <View className="flex flex-col gap-1">
            <Text className="text-sm font-semibold text-gray-900">
              Booking Type
            </Text>
            <BookingTypeTabs
              value={BOOKING_TYPE_OPTIONS_MAP[bookingType].value}
              onValueChange={handlers.handleBookingTypeChange}
              variant="modal"
            />
          </View>

          <View className="relative z-50 mt-4 flex flex-col gap-1">
            <Text className="text-sm font-semibold text-gray-900">
              Select Dates
            </Text>
            {/* h-10 on the row makes this section's height deterministic so the next
                section (Pickup Time) doesn't overlap after re-layout. */}
            <View
              className={cn(
                "h-10",
                isAirport ? "w-full" : "flex-row gap-2",
              )}
            >
              <DatePicker
                value={dateRange.from ?? null}
                onChange={(d) =>
                  handlers.handleFromDateChange(d ? dayjs(d).toDate() : null)
                }
                placeholder="Select date"
                minDate={constraints.fromDateMinDate}
                triggerClassName={cn(
                  "h-10",
                  isAirport ? "w-full" : "flex-1 min-w-0",
                )}
                buttonClassName={cn(
                  "h-10 flex-row items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2",
                  errors.from && "border-red-500",
                )}
                icon="chevrons"
              />
              {isAirport ? null : (
                <DatePicker
                  value={dateRange.to ?? null}
                  onChange={(d) =>
                    handlers.handleToDateChange(d ? dayjs(d).toDate() : null)
                  }
                  placeholder="Select date"
                  minDate={constraints.toDateMinDate}
                  triggerClassName="flex-1 min-w-0 h-10"
                  buttonClassName={cn(
                    "h-10 flex-row items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2",
                    errors.to && "border-red-500",
                  )}
                  icon="chevrons"
                />
              )}
            </View>
            <FieldError error={errors.from?.message ?? errors.to?.message} />
          </View>

          <View
            className="mt-4 flex flex-col gap-1"
            style={{ overflow: "visible", zIndex: isAirport ? 30 : 0 }}
            collapsable={false}
          >
            <Text className="text-sm font-semibold text-gray-900">
              {isAirport ? "Flight Number" : "Pickup Time"}
            </Text>
            <BookingTypeInput
              bookingType={bookingType}
              pickupTime={pickupTime}
              flightNumber={flightNumber}
              dateRange={dateRange}
              hasError={Boolean(
                errors.pickupTime || errors.flightNumber || flightError,
              )}
              onPickupTimeChange={handlers.handlePickupTimeChange}
              onFlightNumberChange={handlers.handleFlightNumberChange}
              isValidatingFlight={isValidatingFlight}
              variant="form"
            />
            <FieldError
              error={
                errors.pickupTime?.message ??
                errors.flightNumber?.message ??
                flightError ??
                undefined
              }
            />
          </View>

          <View
            className="mt-4 flex flex-col gap-1"
            style={{ overflow: "visible", zIndex: 10 }}
            collapsable={false}
          >
            <Text className="text-sm font-semibold text-gray-900">
              Pickup Address
            </Text>
            {isAirport ? (
              <View
                className={cn(
                  "min-h-10 w-full justify-center rounded-md border border-neutral-200 bg-gray-50 px-3 py-2",
                  errors.pickupAddress && "border-red-500",
                )}
              >
                <Text
                  selectable
                  className={cn(
                    "text-sm leading-tight",
                    pickupAddress ? "text-gray-900" : "text-gray-500",
                  )}
                  numberOfLines={3}
                >
                  {pickupAddress || "Set from flight details"}
                </Text>
              </View>
            ) : (
              <AddressAutocompleteInput
                value={pickupAddress}
                onChangeText={(next) => {
                  setValue("pickupAddress", next, {
                    shouldValidate: Boolean(errors.pickupAddress),
                  });
                }}
                onAddressSelected={(selected) => {
                  setValue("pickupAddress", selected, {
                    shouldValidate: true,
                  });
                }}
                placeholder="Start typing to search for an address"
                inputClassName={cn(
                  "h-10 text-sm border-neutral-200 bg-white shadow-none",
                  errors.pickupAddress && "border-red-500",
                )}
              />
            )}
            <FieldError error={errors.pickupAddress?.message} />
          </View>

          {isAirport ? null : (
            <View className="mt-4 flex-row items-center gap-2">
              <Checkbox
                checked={sameLocation}
                onCheckedChange={(v) => {
                  setValue("sameLocation", !!v, { shouldValidate: true });
                }}
                className="border-neutral-900 shadow-none"
                checkedClassName="border-neutral-900"
                indicatorClassName="bg-neutral-900"
                iconClassName="text-white"
              />
              <Pressable
                onPress={() => {
                  setValue("sameLocation", !sameLocation, {
                    shouldValidate: true,
                  });
                }}
                className="justify-center py-0.5"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: sameLocation }}
              >
                <Text className="text-sm font-medium leading-5 text-gray-900">
                  Drop-off location same as pickup
                </Text>
              </Pressable>
            </View>
          )}

          {(isAirport || !sameLocation) && (
            <View
              className="mt-4 flex flex-col gap-1"
              style={{ overflow: "visible", zIndex: 20 }}
              collapsable={false}
            >
              <Text className="text-sm font-semibold text-gray-900">
                Drop-off Address
              </Text>
              <AddressAutocompleteInput
                value={dropOffAddress ?? ""}
                onChangeText={(next) => {
                  setValue("dropOffAddress", next, {
                    shouldValidate: Boolean(errors.dropOffAddress),
                  });
                  // Typing clears a derived window; don't keep a stale error.
                  if (isAirport) {
                    setValue("pickupTime", undefined, {
                      shouldValidate: false,
                    });
                    clearErrors("dropOffAddress");
                  }
                }}
                onAddressSelected={(selected) => {
                  setValue("dropOffAddress", selected, {
                    shouldValidate: false,
                  });
                  clearErrors("dropOffAddress");
                  onDropOffAddressSelected?.(selected);
                }}
                placeholder="Start typing to search for an address"
                inputClassName={cn(
                  "h-10 text-sm border-neutral-200 bg-white shadow-none",
                  errors.dropOffAddress && "border-red-500",
                )}
              />
              <FieldError error={errors.dropOffAddress?.message} />
            </View>
          )}

          {pricing.fuelNote &&
            !car.pricingIncludesFuel &&
            bookingType !== AIRPORT_PICKUP_BOOKING_TYPE && (
              <View className="mt-4 min-w-0 rounded-md bg-slate-100 p-2">
                <Text className="text-sm text-orange-600">
                  <Text className="font-medium">Fuel included: </Text>
                  {pricing.fuelNote}
                </Text>
              </View>
            )}

          {!car.pricingIncludesFuel &&
            totalDays > 0 &&
            totalDays <= 2 &&
            bookingType === DAY_BOOKING_TYPE && (
              <View className="mt-4 flex flex-col gap-1">
                <View className="flex-row items-center gap-2">
                  <Checkbox
                    checked={requiresFullTank}
                    onCheckedChange={(v) => onRequiresFullTankChange(!!v)}
                    className="border-neutral-900 shadow-none"
                    checkedClassName="border-neutral-900"
                    indicatorClassName="bg-neutral-900"
                    iconClassName="text-white"
                  />
                  <Pressable
                    onPress={() => onRequiresFullTankChange(!requiresFullTank)}
                    className="justify-center py-0.5"
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: requiresFullTank }}
                  >
                    <Text className="text-sm font-medium leading-5 text-gray-900">
                      Upgrade to full tank (+
                      {formatCurrency(car.fuelUpgradeRate ?? 0)})
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

          {creditsToUse > 0 ? (
            <Pressable
              onPress={() => onApplyCreditsChange(!applyCredits)}
              className="mt-4 min-h-11 flex-row items-center gap-2"
              accessibilityRole="checkbox"
              accessibilityState={{ checked: applyCredits }}
              accessibilityLabel={`Apply up to ${formatCurrency(creditsToUse)} in referral credits`}
            >
              <Checkbox
                checked={applyCredits}
                onCheckedChange={() => undefined}
                className="border-neutral-900 shadow-none"
                checkedClassName="border-neutral-900"
                indicatorClassName="bg-neutral-900"
                iconClassName="text-white"
                accessible={false}
                pointerEvents="none"
              />
              <View className="min-h-11 flex-1 justify-center">
                <Text selectable className="text-sm font-medium leading-5 text-gray-900">
                  Apply up to {formatCurrency(creditsToUse)} in referral credits
                </Text>
                <Text selectable className="text-xs leading-4 text-gray-500">
                  Your total will update before payment.
                </Text>
              </View>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}
