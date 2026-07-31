import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  cancelBooking,
  updateBooking,
  type UpdateBookingPayload,
} from "@/services/bookings";

type UseBookingActionsReturn = {
  updateBooking: (payload: UpdateBookingPayload) => Promise<void>;
  cancelBooking: (reason?: string) => Promise<void>;
  isUpdatingBooking: boolean;
  isCancellingBooking: boolean;
};

export function useBookingActions(
  bookingId: string | undefined,
): UseBookingActionsReturn {
  const queryClient = useQueryClient();

  const invalidateBookingQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["bookings"] }),
      queryClient.invalidateQueries({ queryKey: ["booking", bookingId] }),
    ]);
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: UpdateBookingPayload) => {
      if (!bookingId) {
        throw new Error("Missing booking id");
      }
      await updateBooking(bookingId, payload);
    },
    onSuccess: invalidateBookingQueries,
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason?: string) => {
      if (!bookingId) {
        throw new Error("Missing booking id");
      }
      await cancelBooking(bookingId, reason);
    },
    onSuccess: invalidateBookingQueries,
  });

  return {
    updateBooking: updateMutation.mutateAsync,
    cancelBooking: cancelMutation.mutateAsync,
    isUpdatingBooking: updateMutation.isPending,
    isCancellingBooking: cancelMutation.isPending,
  };
}
