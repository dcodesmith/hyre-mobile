import type { BookingType } from "@/lib/booking-types";
import { DAY_BOOKING_TYPE } from "@/lib/booking-types";
import type { ValidatedFlight } from "@/services/flights";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

export type DateRange = {
  from?: Date;
  to?: Date;
};

export type { ValidatedFlight };

type BookingSearchDraftContextValue = {
  bookingType: BookingType;
  setBookingType: (value: BookingType) => void;
  dateRange: DateRange;
  setDateRange: (value: DateRange) => void;
  pickupTime: string | undefined;
  setPickupTime: (value: string | undefined) => void;
  flightNumber: string | undefined;
  setFlightNumber: (value: string | undefined) => void;
  validatedFlight: ValidatedFlight | null;
  setValidatedFlight: (value: ValidatedFlight | null) => void;
  flightValidationError: string | null;
  setFlightValidationError: (value: string | null) => void;
  reset: () => void;
};

const BookingSearchDraftContext =
  createContext<BookingSearchDraftContextValue | null>(null);

export function useBookingSearchDraft(): BookingSearchDraftContextValue {
  const context = useContext(BookingSearchDraftContext);

  if (!context) {
    throw new Error(
      "BookingSearch must be rendered within BookingSearchDraftProvider to access BookingSearchDraftContext state.",
    );
  }

  return context;
}

export function BookingSearchDraftProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [bookingType, setBookingType] = useState<BookingType>(DAY_BOOKING_TYPE);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [pickupTime, setPickupTime] = useState<string | undefined>(undefined);
  const [flightNumber, setFlightNumber] = useState<string | undefined>(
    undefined,
  );
  const [validatedFlight, setValidatedFlight] =
    useState<ValidatedFlight | null>(null);
  const [flightValidationError, setFlightValidationError] = useState<
    string | null
  >(null);

  const reset = useCallback(() => {
    setBookingType(DAY_BOOKING_TYPE);
    setDateRange({ from: undefined, to: undefined });
    setPickupTime(undefined);
    setFlightNumber(undefined);
    setValidatedFlight(null);
    setFlightValidationError(null);
  }, []);

  const contextValue = useMemo(
    () => ({
      bookingType,
      setBookingType,
      dateRange,
      setDateRange,
      pickupTime,
      setPickupTime,
      flightNumber,
      setFlightNumber,
      validatedFlight,
      setValidatedFlight,
      flightValidationError,
      setFlightValidationError,
      reset,
    }),
    [
      bookingType,
      dateRange,
      pickupTime,
      flightNumber,
      validatedFlight,
      flightValidationError,
      reset,
    ],
  );

  return (
    <BookingSearchDraftContext.Provider value={contextValue}>
      {children}
    </BookingSearchDraftContext.Provider>
  );
}
