import { Check, ChevronRight } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { type BookingType, DAY_BOOKING_TYPE } from "@/lib/booking-types";
import { getFromDateMinDate } from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

const hasTimePassed = (selectedDate: Date, hour: number): boolean => {
  const now = new Date();
  const selected = new Date(selectedDate);
  const sameDay =
    now.getFullYear() === selected.getFullYear() &&
    now.getMonth() === selected.getMonth() &&
    now.getDate() === selected.getDate();
  if (!sameDay) return false;
  return now.getHours() >= hour;
};

function getPickupTimes(
  date: Date | undefined,
  bookingType: BookingType = DAY_BOOKING_TYPE,
  startHour = 7,
  endHour = 11,
): { label: string; value: string }[] {
  const times: { label: string; value: string }[] = [];
  // Time-first: assume earliest bookable day (usually today) and hide past hours.
  const filterDate = date ?? getFromDateMinDate(bookingType);

  if (bookingType === "FULL_DAY") {
    for (let hour = 6; hour <= 23; hour++) {
      const timeLabel = new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
      });
      if (!hasTimePassed(filterDate, hour)) {
        times.push({ label: timeLabel, value: timeLabel });
      }
    }
  } else {
    for (let hour = startHour; hour <= endHour; hour++) {
      const timeLabel = new Date(2000, 0, 1, hour).toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
      });
      if (!hasTimePassed(filterDate, hour)) {
        times.push({ label: timeLabel, value: timeLabel });
      }
    }
  }

  return times;
}

interface TimePickerProps {
  readonly date?: Date;
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly bookingType?: BookingType;
  readonly label?: string;
  readonly placeholder?: string;
  readonly variant?: "inline" | "form";
  readonly triggerClassName?: string;
}

export function TimePicker({
  date,
  value,
  onValueChange,
  bookingType = DAY_BOOKING_TYPE,
  label = "Pickup Time",
  placeholder = "Select pickup time",
  variant = "inline",
  triggerClassName,
}: TimePickerProps) {
  const times = useMemo(
    () => getPickupTimes(date, bookingType),
    [date, bookingType],
  );
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const triggerRef = useRef<View>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const isForm = variant === "form";

  const handleOpen = useCallback(() => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setLayout({ x, y, width, height });
      setOpen(true);
    });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setLayout(null);
  }, []);

  const handleSelect = useCallback(
    (timeValue: string) => {
      onValueChange?.(timeValue);
      handleClose();
    },
    [onValueChange, handleClose],
  );

  const dropdownWidth = Math.min(
    Math.max(layout?.width ?? 280, 200),
    screenWidth - 32,
  );
  // Match date picker: horizontally centered; keep Y under the trigger.
  const dropdownLeft = (screenWidth - dropdownWidth) / 2;
  const dropdownTop = layout
    ? Math.min(layout.y + layout.height + 4, screenHeight - 240)
    : 100;

  return (
    <View className={cn("w-full", !isForm && "flex-col justify-center")}>
      <View ref={triggerRef} collapsable={false} style={{ width: "100%" }}>
        <Pressable
          onPress={() => (open ? handleClose() : handleOpen())}
          className={cn(
            "w-full flex-row items-center",
            isForm
              ? "h-10 justify-between rounded-md border border-neutral-200 bg-white px-3"
              : "justify-between gap-4 py-3",
            triggerClassName,
          )}
          accessibilityRole="button"
          style={isForm ? { backgroundColor: "#FFFFFF" } : undefined}
        >
          {isForm ? (
            <Text
              className={cn(
                "flex-1 leading-tight text-sm",
                value ? "text-gray-900" : "text-gray-500",
              )}
              numberOfLines={1}
            >
              {value ?? placeholder}
            </Text>
          ) : (
            <>
              <Text
                className="shrink-0 text-sm leading-[14px] text-gray-800"
                style={{ fontFamily: "Geist-SemiBold" }}
              >
                {label}
              </Text>
              <View className="min-w-0 flex-row items-center gap-1">
                <Text
                  className={cn(
                    "shrink text-right text-sm leading-[14px]",
                    value ? "text-gray-800" : "text-gray-400",
                  )}
                  numberOfLines={1}
                  style={{ fontFamily: "Geist-Regular" }}
                >
                  {value ?? placeholder}
                </Text>
                <ChevronRight size={16} color="#9CA3AF" strokeWidth={1.75} />
              </View>
            </>
          )}
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.3)" }}
          onPress={handleClose}
        >
          {layout && (
            <Pressable
              style={{
                position: "absolute",
                left: dropdownLeft,
                top: dropdownTop,
                width: dropdownWidth,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View className="rounded-md border border-neutral-200 bg-white shadow-md shadow-black/10">
                <ScrollView
                  style={{ maxHeight: 208 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {times.length === 0 ? (
                    <Text className="px-3 py-3 text-sm text-gray-500">
                      No pickup times available
                    </Text>
                  ) : (
                    times.map(({ label: timeLabel, value: timeValue }) => {
                      const selected = value === timeValue;
                      return (
                        <Pressable
                          key={timeValue}
                          onPress={() => handleSelect(timeValue)}
                          className="flex-row items-center justify-between px-3 py-2.5 active:bg-neutral-100"
                          accessibilityRole="button"
                        >
                          <Text
                            className={cn(
                              "text-sm",
                              selected
                                ? "font-semibold text-gray-900"
                                : "text-gray-900",
                            )}
                          >
                            {timeLabel}
                          </Text>
                          {selected ? (
                            <Check color="#171717" size={16} strokeWidth={2} />
                          ) : null}
                        </Pressable>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            </Pressable>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}
