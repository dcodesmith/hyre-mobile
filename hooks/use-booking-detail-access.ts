import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useBookingDetail } from "@/hooks/use-booking-detail";
import {
  guestBookingAsDetail,
  resolveBookingDetailAccess,
} from "@/lib/guest-booking";
import {
  fetchGuestBooking,
  isInvalidGuestBookingAccessError,
} from "@/services/guest-booking-access";
import {
  deleteGuestBookingSession,
  getGuestBookingSession,
  type GuestBookingSessionResult,
} from "@/storage/guest-booking-session";

type LoadedGuestSession = {
  bookingId: string;
  result: GuestBookingSessionResult;
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

  useEffect(() => {
    if (!shouldLoadGuestSession || !bookingId) return;
    let isCancelled = false;

    void getGuestBookingSession(bookingId).then((result) => {
      if (!isCancelled) setLoadedGuestSession({ bookingId, result });
    });

    return () => {
      isCancelled = true;
    };
  }, [bookingId, shouldLoadGuestSession]);

  const guestSessionResult:
    | GuestBookingSessionResult
    | { status: "loading" } =
    !shouldLoadGuestSession || !bookingId
      ? { status: "missing" }
      : loadedGuestSession?.bookingId === bookingId
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
    if (delay <= 0) {
      setLoadedGuestSession({ bookingId, result: { status: "expired" } });
      void deleteGuestBookingSession(bookingId);
      return;
    }

    const timeout = setTimeout(() => {
      setLoadedGuestSession({ bookingId, result: { status: "expired" } });
      void deleteGuestBookingSession(bookingId);
    }, delay);
    return () => clearTimeout(timeout);
  }, [bookingId, guestSessionResult]);

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
          isInvalidGuestBookingAccessError(error)
        ) {
          await deleteGuestBookingSession(bookingId);
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

  return {
    accessMode,
    data: canFetchBooking ? activeQuery.data : undefined,
    error: canFetchBooking ? activeQuery.error : null,
    isLoading:
      accessMode === "loading" ||
      (canFetchBooking && activeQuery.isLoading),
    isFetching: canFetchBooking && activeQuery.isFetching,
    refetch: activeQuery.refetch,
    guestLinkInvalid,
  };
}
