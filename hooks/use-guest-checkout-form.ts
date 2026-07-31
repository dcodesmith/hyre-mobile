import {
  type GuestCheckoutFormValues,
  guestCheckoutFormSchema,
} from "@/lib/validations/booking";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";

export type GuestCheckoutErrors = {
  name?: string;
  email?: string;
  phoneNumber?: string;
};

export type GuestCheckoutFormReturn = {
  form: UseFormReturn<GuestCheckoutFormValues>;
  values: GuestCheckoutFormValues;
  errors: GuestCheckoutErrors;
};

/**
 * Encapsulates the guest RHF instance used by unauthenticated booking flows.
 * Exposes the form ref (for `trigger`/`getValues` in the submit pipeline) plus
 * the watched values and a plain-string errors map for the form presenter.
 */
export function useGuestCheckoutForm(): GuestCheckoutFormReturn {
  const form = useForm<GuestCheckoutFormValues>({
    resolver: zodResolver(guestCheckoutFormSchema),
    defaultValues: { name: "", email: "", phoneNumber: "" },
    reValidateMode: "onChange",
  });
  const {
    watch,
    formState: { errors },
  } = form;

  const name = watch("name");
  const email = watch("email");
  const phoneNumber = watch("phoneNumber");

  const errorsMap = useMemo<GuestCheckoutErrors>(
    () => ({
      name: errors.name?.message,
      email: errors.email?.message,
      phoneNumber: errors.phoneNumber?.message,
    }),
    [errors.name?.message, errors.email?.message, errors.phoneNumber?.message],
  );

  return {
    form,
    values: { name, email, phoneNumber },
    errors: errorsMap,
  };
}
