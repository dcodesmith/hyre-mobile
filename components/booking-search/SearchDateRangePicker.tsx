import dayjs, { type Dayjs } from "dayjs";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { DateType } from "react-native-ui-datepicker";
import DateTimePicker, {
  useDefaultClassNames,
} from "react-native-ui-datepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BookingType } from "@/lib/booking-types";
import {
  formatSearchDateRangeLabel,
  getFreshRangeStart,
  getFromDateMinDate,
  getSearchCalendarMinRangeDays,
} from "@/lib/booking-utils";
import { cn } from "@/lib/utils";

type SearchDateRangePickerProps = {
  readonly bookingType: BookingType;
  readonly fromDate: Date | undefined;
  readonly toDate: Date | undefined;
  readonly single?: boolean;
  readonly onChange: (from: Date | undefined, to: Date | undefined) => void;
};

function toNativeDate(value: DateType): Date | undefined {
  if (!value) return undefined;
  const date = dayjs(value);
  return date.isValid() ? date.toDate() : undefined;
}

function DateDisplay({
  label,
  date,
}: {
  readonly label: string;
  readonly date: Date | undefined;
}) {
  return (
    <View className="min-w-0 flex-1 gap-1">
      <Text
        className="text-sm leading-5 text-gray-900"
        style={{ fontFamily: "Geist-Medium" }}
      >
        {label}
      </Text>
      <View
        className="h-9 justify-center rounded-md border border-gray-300 bg-white px-3"
        style={{ boxShadow: "0 1px 1px rgba(0, 0, 0, 0.05)" }}
      >
        <Text
          className={cn(
            "text-sm leading-5",
            date ? "text-gray-900" : "text-gray-400",
          )}
          style={{ fontFamily: "Geist-Regular" }}
        >
          {date ? dayjs(date).format("MMM D") : "Select date"}
        </Text>
      </View>
    </View>
  );
}

function CalendarMonthHeader({
  month,
  onPrevious,
  onNext,
}: {
  readonly month: Dayjs;
  readonly onPrevious: () => void;
  readonly onNext: () => void;
}) {
  return (
    <View className="relative h-9">
      <Pressable
        onPress={onPrevious}
        className="absolute top-0 left-0 h-7 w-9 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Previous month"
      >
        <ChevronLeft size={16} color="#111827" strokeWidth={2} />
      </Pressable>
      <Text
        className="absolute inset-x-9 top-2 text-center text-sm leading-5 text-gray-900"
        style={{ fontFamily: "Geist-Medium" }}
      >
        {month.format("MMMM YYYY")}
      </Text>
      <Pressable
        onPress={onNext}
        className="absolute top-0 right-0 h-7 w-9 items-center justify-center"
        accessibilityRole="button"
        accessibilityLabel="Next month"
      >
        <ChevronRight size={16} color="#111827" strokeWidth={2} />
      </Pressable>
    </View>
  );
}

export function SearchDateRangePicker({
  bookingType,
  fromDate,
  toDate,
  single = false,
  onChange,
}: SearchDateRangePickerProps) {
  const defaults = useDefaultClassNames();
  const insets = useSafeAreaInsets();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [calendarHeight, setCalendarHeight] = useState(0);
  const [draftFromDate, setDraftFromDate] = useState(fromDate);
  const [draftToDate, setDraftToDate] = useState(toDate);
  const [isStartingNewRange, setIsStartingNewRange] = useState(false);
  const minDate = getFromDateMinDate(bookingType);
  const initialMonth = dayjs(fromDate ?? minDate).startOf("month");
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const secondMonth = visibleMonth.add(1, "month");
  const cardWidth = Math.min(353, screenWidth - 40);
  const closeTop = insets.top + 8;
  const cardTop = closeTop + 40;
  const cardMaxHeight = screenHeight - cardTop - insets.bottom;
  const cardHeight =
    calendarHeight > 0 ? Math.min(calendarHeight, cardMaxHeight) : undefined;
  const rangeLabel = formatSearchDateRangeLabel(fromDate, toDate);
  const displayedFromDate = open ? draftFromDate : fromDate;
  const displayedToDate = open ? draftToDate : toDate;

  const classNames = {
    ...defaults,
    day: cn(defaults.day, "rounded-md"),
    day_label: "font-geist text-sm leading-5 text-gray-900",
    selected: "rounded-md bg-[#111827]",
    selected_label: "font-geist text-sm leading-5 text-white",
    range_start: "rounded-md bg-[#111827]",
    range_start_label: "font-geist text-sm leading-5 text-white",
    range_end: "rounded-md bg-[#111827]",
    range_end_label: "font-geist text-sm leading-5 text-white",
    range_middle: "rounded-md bg-gray-100",
    range_middle_label: "font-geist text-sm leading-5 text-gray-900",
    range_fill: "bg-transparent",
    today: "bg-gray-100 rounded-md",
    today_label: "font-geist text-sm leading-5 text-gray-900",
    outside_label: "font-geist text-sm leading-5 text-gray-400",
    disabled_label: "font-geist text-sm leading-5 text-gray-400 opacity-50",
    month_selector_label: "font-geist-medium text-sm leading-5 text-gray-900",
    year_selector_label: "font-geist-medium text-sm leading-5 text-gray-900",
    weekday_label: "font-geist text-xs leading-4 text-gray-600",
  };

  const handleSingleChange = ({ date }: { date: DateType }) => {
    const selected = toNativeDate(date);
    onChange(selected, selected);
    if (selected) setOpen(false);
  };

  const handleRangeChange = ({
    startDate,
    endDate,
  }: {
    startDate: DateType;
    endDate: DateType;
  }) => {
    const nextFrom = toNativeDate(startDate);
    const nextTo = toNativeDate(endDate);

    if (isStartingNewRange && fromDate && toDate) {
      const freshFromDate = getFreshRangeStart(fromDate, toDate, nextFrom, nextTo);
      setDraftFromDate(freshFromDate);
      setDraftToDate(undefined);
      setIsStartingNewRange(false);
      onChange(freshFromDate, undefined);
      return;
    }

    setDraftFromDate(nextFrom);
    setDraftToDate(nextTo);
    onChange(nextFrom, nextTo);
    if (nextFrom && nextTo) {
      setOpen(false);
    }
  };

  const calendarProps = {
    minDate,
    min: getSearchCalendarMinRangeDays(bookingType, single),
    showOutsideDays: true,
    containerHeight: 234,
    weekdaysHeight: 24,
    classNames,
    hideHeader: true,
    disableMonthPicker: true,
    disableYearPicker: true,
  } as const;

  const renderCalendar = (calendarMonth: Dayjs) => (
    <View className="h-[304px] py-[14px]">
      <CalendarMonthHeader
        month={calendarMonth}
        onPrevious={() => setVisibleMonth((current) => current.subtract(1, "month"))}
        onNext={() => setVisibleMonth((current) => current.add(1, "month"))}
      />
      <View className="mt-1.5">
        {single ? (
          <DateTimePicker
            key={calendarMonth.format("YYYY-MM")}
            {...calendarProps}
            mode="single"
            date={fromDate}
            month={calendarMonth.month()}
            year={calendarMonth.year()}
            onChange={handleSingleChange}
          />
        ) : (
          <DateTimePicker
            key={calendarMonth.format("YYYY-MM")}
            {...calendarProps}
            mode="range"
            startDate={displayedFromDate}
            endDate={displayedToDate}
            month={calendarMonth.month()}
            year={calendarMonth.year()}
            onChange={handleRangeChange}
          />
        )}
      </View>
    </View>
  );

  return (
    <>
      <Pressable
        onPress={() => {
          setVisibleMonth(dayjs(fromDate ?? minDate).startOf("month"));
          setDraftFromDate(fromDate);
          setDraftToDate(toDate);
          setIsStartingNewRange(Boolean(fromDate && toDate));
          setOpen(true);
        }}
        className="w-full flex-row items-center justify-between gap-4 py-2"
        accessibilityRole="button"
        accessibilityLabel={single ? "When" : "Select booking dates"}
      >
        <Text
          className="h-4 shrink-0 text-sm leading-4"
          style={{ color: "#1E2939", fontFamily: "Geist-SemiBold" }}
        >
          When
        </Text>
        <View className="min-w-0 flex-row items-center gap-1">
          <Text
            className="h-4 shrink text-right text-sm leading-4"
            numberOfLines={1}
            style={{
              color: rangeLabel ? "#1E2939" : "#99A1AF",
              fontFamily: "Geist-Regular",
            }}
          >
            {rangeLabel ?? (single ? "Add date" : "Add dates")}
          </Text>
          <ChevronRight size={16} color="#99A1AF" strokeWidth={2} />
        </View>
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        transparent
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <StatusBar style="dark" />
        <View className="flex-1" style={{ backgroundColor: "#c8c9ce" }}>
          <Pressable
            onPress={() => setOpen(false)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close date picker"
            className="absolute z-10 size-8 items-center justify-center rounded-full border border-[#e5e7eb] bg-white"
            style={{ top: closeTop, right: (screenWidth - cardWidth) / 2 }}
          >
            <X size={16} color="#111827" strokeWidth={2} />
          </Pressable>
          <View
            className="overflow-hidden rounded-2xl bg-white"
            style={{
              marginTop: cardTop,
              width: cardWidth,
              alignSelf: "center",
              height: cardHeight,
              maxHeight: cardMaxHeight,
              borderCurve: "continuous",
            }}
          >
            <ScrollView
              style={{ flex: cardHeight ? 1 : undefined, maxHeight: cardMaxHeight }}
              showsVerticalScrollIndicator={false}
              contentInsetAdjustmentBehavior="never"
              scrollEnabled={calendarHeight > cardMaxHeight}
              onContentSizeChange={(_width, height) => {
                if (Math.abs(height - calendarHeight) > 1) setCalendarHeight(height);
              }}
              contentContainerStyle={{ padding: 24, flexGrow: 0 }}
            >
              <View className="mb-[23px] flex-row gap-4">
                <DateDisplay
                  label={single ? "When" : "Start date"}
                  date={displayedFromDate}
                />
                {single ? null : (
                  <DateDisplay label="End date" date={displayedToDate} />
                )}
              </View>

              <View className="gap-2">
                {renderCalendar(visibleMonth)}
                {single ? null : renderCalendar(secondMonth)}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
