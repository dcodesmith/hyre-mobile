import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useBookingDetail } from "@/hooks/use-booking-detail";
import {
  guestBookingAsDetail,
  resolveBookingDetailAccess,
} from "@/lib/guest-booking";
import { reportHandledException } from "@/lib/telemetry";
import {
  fetchGuestBooking,
  isInvalidGuestBookingAccessError,
} from "@/services/guest-booking-access";
import {
  deleteGuestBookingSession,
  getGuestBookingSession,
  type GuestBookingSessionResult,
} from "@/storage/guest-booking-session";

type GuestSessionState =
  | GuestBookingSessionResult
  | { status: "error" }
  | { status: "loading" };

type LoadedGuestSession = {
  bookingId: string;
  loadAttempt: number;
  result: Exclude<GuestSessionState, { status: "loading" }>;
};

const deleteGuestSessionSafely = async (
  bookingId: string,
  token: string,
) => {
  try {
    await deleteGuestBookingSession(bookingId, token);
  } catch (error) {
    reportHandledException(error, {
      area: "guest_booking",
      operation: "delete_session",
    });
  }
};

export function useBookingDetailAccess({
  bookingId,
  isAuthenticated,
  isAuthHydrating,
}: {
  bookingId: string | undefined;
  isAuthenticated: boolean;
  isAuthHydrating: boolean;
}) {
  const shouldLoadGuestSession =
    !isAuthHydrating && !isAuthenticated && Boolean(bookingId);
  const [loadedGuestSession, setLoadedGuestSession] =
    useState<LoadedGuestSession | null>(null);
  const [guestSessionLoadAttempt, setGuestSessionLoadAttempt] = useState(0);

  useEffect(() => {
    if (!shouldLoadGuestSession || !bookingId) return;
    let isCancelled = false;

    const loadGuestSession = async () => {
      try {
        const result = await getGuestBookingSession(bookingId);
        if (!isCancelled) {
          setLoadedGuestSession({
            bookingId,
            loadAttempt: guestSessionLoadAttempt,
            result,
          });
        }
      } catch (error) {
        reportHandledException(error, {
          area: "guest_booking",
          operation: "load_session",
        });
        if (!isCancelled) {
          setLoadedGuestSession({
            bookingId,
            loadAttempt: guestSessionLoadAttempt,
            result: { status: "error" },
          });
        }
      }
    };

    void loadGuestSession();

    return () => {
      isCancelled = true;
    };
  }, [bookingId, guestSessionLoadAttempt, shouldLoadGuestSession]);

  const guestSessionResult: GuestSessionState =
    !shouldLoadGuestSession || !bookingId
      ? { status: "missing" }
      : loadedGuestSession?.bookingId === bookingId &&
          loadedGuestSession.loadAttempt === guestSessionLoadAttempt
        ? loadedGuestSession.result
        : { status: "loading" };

  useEffect(() => {
    if (
      !bookingId ||
      guestSessionResult.status !== "valid"
    ) {
      return;
    }

    const delay =
      Date.parse(guestSessionResult.session.accessExpiresAt) - Date.now();
    const { token } = guestSessionResult.session;
    if (delay <= 0) {
      setLoadedGuestSession({
        bookingId,
        loadAttempt: guestSessionLoadAttempt,
        result: { status: "expired" },
      });
      void deleteGuestSessionSafely(bookingId, token);
      return;
    }

    const timeout = setTimeout(() => {
      setLoadedGuestSession({
        bookingId,
        loadAttempt: guestSessionLoadAttempt,
        result: { status: "expired" },
      });
      void deleteGuestSessionSafely(bookingId, token);
    }, delay);
    return () => clearTimeout(timeout);
  }, [bookingId, guestSessionLoadAttempt, guestSessionResult]);

  const accessMode = resolveBookingDetailAccess({
    isAuthHydrating,
    isAuthenticated,
    guestSessionStatus: guestSessionResult.status,
  });
  const accountQuery = useBookingDetail(bookingId, accessMode === "account");
  const guestToken =
    guestSessionResult.status === "valid"
      ? guestSessionResult.session.token
      : null;
  const guestQuery = useQuery({
    queryKey: ["guest-booking", bookingId],
    queryFn: async ({ signal }) => {
      try {
        return guestBookingAsDetail(
          await fetchGuestBooking(guestToken ?? "", { signal }),
        );
      } catch (error) {
        if (
          bookingId &&
          guestToken &&
          isInvalidGuestBookingAccessError(error)
        ) {
          await deleteGuestSessionSafely(bookingId, guestToken);
        }
        throw error;
      }
    },
    enabled: accessMode === "guest" && Boolean(bookingId && guestToken),
    retry: false,
    staleTime: 30 * 1000,
    gcTime: 0,
    refetchOnReconnect: true,
  });

  const guestLinkInvalid =
    accessMode === "expired" ||
    (accessMode === "guest" &&
      isInvalidGuestBookingAccessError(guestQuery.error));

  const activeQuery = accessMode === "account" ? accountQuery : guestQuery;
  const canFetchBooking =
    accessMode === "account" || accessMode === "guest";
  const refetch = () => {
    if (accessMode === "error") {
      setLoadedGuestSession(null);
      setGuestSessionLoadAttempt((attempt) => attempt + 1);
      return;
    }
    return activeQuery.refetch();
  };

  return {
    accessMode,
    data: canFetchBooking ? activeQuery.data : undefined,
    error: canFetchBooking ? activeQuery.error : null,
    isLoading:
      accessMode === "loading" ||
      (canFetchBooking && activeQuery.isLoading),
    isFetching: canFetchBooking && activeQuery.isFetching,
    refetch,
    guestLinkInvalid,
  };
}
