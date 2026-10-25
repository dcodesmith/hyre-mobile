import { BookingTypeInput } from "@/components/booking-search/BookingTypeInput";
import { BookingTypeTabs } from "@/components/booking-search/BookingTypeTabs";
import { AddressAutocompleteInput } from "@/components/ui/address-autocomplete-input";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import type { CarBookingFormReturn } from "@/hooks/use-car-booking-form";
import {
  AIRPORT_PICKUP_BOOKING_TYPE,
  BOOKING_TYPE_OPTIONS_MAP,
  DAY_BOOKING_TYPE,
} from "@/lib/booking-types";
import type { CarDetail, CostBreakdownData } from "@/lib/car-detail-types";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { ChevronDown } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

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
  readonly flightError?: string | null;
  readonly isValidatingFlight?: boolean;
  readonly onDropOffAddressSelected?: (address: string) => void;
  readonly guestDetails?: ReactNode;
  readonly phoneVerification?: ReactNode;
  readonly addons?: ReactNode;
  readonly tripDetails?: ReactNode;
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * The full in-page booking card: price header, booking-type tabs, date range,
 * pickup time/flight number, pickup & drop-off addresses, fuel note, and
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
  flightError,
  isValidatingFlight = false,
  onDropOffAddressSelected,
  guestDetails,
  phoneVerification,
  addons,
  tripDetails,
  isOpen,
  onOpenChange,
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
    <View
      className="overflow-visible rounded-lg border border-gray-200 bg-white px-4 py-6"
      style={{
        overflow: "visible",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.07)",
      }}
      collapsable={false}
    >
      <Pressable
        onPress={() => onOpenChange(!isOpen)}
        className="w-full flex-row items-center justify-between gap-3"
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Book a service"
        accessibilityState={{ expanded: isOpen }}
      >
        <Text className="text-base font-semibold leading-5 text-gray-900">
          Book a service
        </Text>
        <View
          className="shrink-0"
          style={{
            width: 16,
            height: 16,
            transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
          }}
        >
          <ChevronDown size={16} color="#111827" />
        </View>
      </Pressable>

      {isOpen ? (
        <View
          className="mt-4 flex flex-col border-t border-gray-200 pt-6"
          style={{ overflow: "visible" }}
          collapsable={false}
        >
          <View className="flex flex-col gap-2">
            <Text className="text-sm font-semibold text-gray-900">
              Booking Type
            </Text>
            <BookingTypeTabs
              value={BOOKING_TYPE_OPTIONS_MAP[bookingType].value}
              onValueChange={handlers.handleBookingTypeChange}
              variant="modal"
            />
          </View>

          <View className="relative z-50 mt-6 flex flex-col gap-2">
            <Text className="text-sm font-semibold text-gray-900">
              Select Dates
            </Text>
            {/* h-10 on the row makes this section's height deterministic so the next
                section (Pickup Time) doesn't overlap after re-layout. */}
            <View
              className={cn(
                "h-11",
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
                  "h-11",
                  isAirport ? "w-full" : "flex-1 min-w-0",
                )}
                buttonClassName={cn(
                  "h-11 flex-row items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2",
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
                  triggerClassName="flex-1 min-w-0 h-11"
                  buttonClassName={cn(
                    "h-11 flex-row items-center justify-between rounded-md border border-neutral-200 bg-white px-3 py-2",
                    errors.to && "border-red-500",
                  )}
                  icon="chevrons"
                />
              )}
            </View>
            <FieldError error={errors.from?.message ?? errors.to?.message} />
          </View>

          <View
            className="mt-6 flex flex-col gap-2"
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
            className="mt-6 flex flex-col gap-2"
            style={{ overflow: "visible", zIndex: 10 }}
            collapsable={false}
          >
            <Text className="text-sm font-semibold text-gray-900">
              Pickup Address
            </Text>
            {isAirport ? (
              <View
                className={cn(
                  "min-h-11 w-full justify-center rounded-md border border-neutral-200 bg-gray-50 px-3 py-2",
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
                  "h-11 text-sm border-neutral-200 bg-white shadow-none",
                  errors.pickupAddress && "border-red-500",
                )}
              />
            )}
            <FieldError error={errors.pickupAddress?.message} />
          </View>

          {isAirport ? null : (
            <View className="mt-6 flex-row items-center gap-2">
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
              className="mt-6 flex flex-col gap-2"
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
                  "h-11 text-sm border-neutral-200 bg-white shadow-none",
                  errors.dropOffAddress && "border-red-500",
                )}
              />
              <FieldError error={errors.dropOffAddress?.message} />
            </View>
          )}

          {pricing.fuelNote &&
            !car.pricingIncludesFuel &&
            bookingType !== AIRPORT_PICKUP_BOOKING_TYPE && (
              <View className="mt-6 min-w-0 rounded-md bg-slate-100 p-2">
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
              <View className="mt-6 flex flex-col gap-2">
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
            {guestDetails}
            {phoneVerification}
            {addons}
            {tripDetails}
        </View>
      ) : null}
    </View>
  );
}
