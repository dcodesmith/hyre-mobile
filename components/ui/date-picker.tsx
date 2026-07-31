"use client";

import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
} from "lucide-react-native";
import * as React from "react";
import {
  Modal,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { DateType } from "react-native-ui-datepicker";
import DateTimePicker, {
  useDefaultClassNames,
} from "react-native-ui-datepicker";

const formatDate = (date: DateType) =>
  date ? dayjs(date).format("MMM D, YYYY") : "Select date";

type DatePickerProps = {
  value: DateType;
  onChange: (date: DateType) => void;
  placeholder?: string;
  minDate?: DateType;
  maxDate?: DateType;
  label?: string;
  className?: string;
  triggerClassName?: string;
  buttonClassName?: string;
  icon?: "calendar" | "chevrons" | "none";
  disabled?: boolean;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  minDate,
  maxDate,
  label,
  className,
  triggerClassName,
  buttonClassName,
  icon = "none",
  disabled = false,
}: Readonly<DatePickerProps>) {
  const defaultClassNames = useDefaultClassNames();
  const [open, setOpen] = React.useState(false);
  const [anchorY, setAnchorY] = React.useState<number | null>(null);
  const triggerRef = React.useRef<View>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const handleOpen = React.useCallback(() => {
    triggerRef.current?.measureInWindow((_x, y, _width, height) => {
      setAnchorY(y + height + 4);
      setOpen(true);
    });
  }, []);

  const handleClose = React.useCallback(() => {
    setOpen(false);
    setAnchorY(null);
  }, []);

  const handleChange = React.useCallback(
    ({ date }: { date: DateType }) => {
      onChange(date);
      handleClose();
    },
    [onChange, handleClose],
  );

  const IconComponent =
    icon === "chevrons"
      ? ChevronsUpDown
      : icon === "calendar"
        ? CalendarDays
        : null;

  const dropdownWidth = Math.min(340, screenWidth - 32);
  const dropdownLeft = (screenWidth - dropdownWidth) / 2;
  const dropdownTop =
    anchorY == null ? 100 : Math.min(anchorY, screenHeight - 360);

  return (
    <View className={cn("relative min-w-0 flex-1", triggerClassName)}>
      <View ref={triggerRef} collapsable={false} style={{ width: "100%" }}>
        <Pressable
          disabled={disabled}
          onPress={() => {
            if (disabled) return;
            if (open) {
              handleClose();
            } else {
              handleOpen();
            }
          }}
          className={cn(
            "w-full min-h-[38px] flex-row items-center",
            disabled && "opacity-50",
            buttonClassName,
          )}
          accessibilityRole="button"
          accessibilityState={{ disabled }}
        >
          {label ? (
            <View className="flex-1 min-w-0 flex-col justify-center">
              <Text
                className="text-gray-700 leading-tight text-xs font-semibold"
                numberOfLines={1}
              >
                {label}
              </Text>
              <Text
                className={cn(
                  "mt-1 leading-tight text-sm",
                  value ? "text-gray-900" : "text-gray-500",
                )}
                numberOfLines={1}
              >
                {value ? formatDate(value) : placeholder}
              </Text>
            </View>
          ) : (
            <Text
              className={cn(
                "flex-1 leading-tight text-sm",
                value ? "text-gray-900" : "text-gray-500",
              )}
              numberOfLines={1}
            >
              {value ? formatDate(value) : placeholder}
            </Text>
          )}
          {IconComponent ? (
            <IconComponent color="#6B7280" size={16} strokeWidth={1.75} />
          ) : null}
        </Pressable>
      </View>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <Pressable className="flex-1 bg-black/30" onPress={handleClose}>
          {anchorY != null ? (
            <Pressable
              style={{
                position: "absolute",
                left: dropdownLeft,
                top: dropdownTop,
                width: dropdownWidth,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                className={cn(
                  "rounded-md border border-neutral-200 bg-white shadow-md shadow-black/10",
                  className,
                )}
                style={{ elevation: 16 }}
              >
                <View className="p-3">
                  <DateTimePicker
                    mode="single"
                    date={value ?? dayjs()}
                    onChange={handleChange}
                    minDate={minDate ?? dayjs()}
                    maxDate={maxDate}
                    showOutsideDays
                    classNames={{
                      ...defaultClassNames,
                      day: cn(defaultClassNames.day, "rounded-md"),
                      day_label: "text-sm text-neutral-900 font-normal",
                      selected: "bg-neutral-900 rounded-md",
                      selected_label: "text-sm text-white font-normal",
                      today: "bg-neutral-100 rounded-md",
                      today_label: "text-sm text-neutral-900 font-normal",
                      outside: "",
                      outside_label: "text-sm text-neutral-500 opacity-50",
                      disabled: "",
                      disabled_label: "text-sm text-neutral-500 opacity-50",
                      month_selector_label:
                        "text-sm font-semibold text-neutral-900",
                      year_selector_label:
                        "text-sm font-semibold text-neutral-900",
                      weekday_label:
                        "text-[0.8rem] text-neutral-500 font-normal",
                      button_prev: cn(
                        defaultClassNames.button_prev,
                        "h-7 w-7 rounded-md border border-neutral-200 items-center justify-center",
                      ),
                      button_next: cn(
                        defaultClassNames.button_next,
                        "h-7 w-7 rounded-md border border-neutral-200 items-center justify-center",
                      ),
                    }}
                    components={{
                      IconPrev: (
                        <ChevronLeft
                          size={14}
                          color="#171717"
                          strokeWidth={2}
                        />
                      ),
                      IconNext: (
                        <ChevronRight
                          size={14}
                          color="#171717"
                          strokeWidth={2}
                        />
                      ),
                    }}
                  />
                </View>
              </View>
            </Pressable>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
