import type { AuthModalSheetProps } from "@/components/auth/auth-modal-sheet";
import type { AuthContextValue } from "@/context/auth-context";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import {
  type EmailFormValues,
  type OtpFormValues,
  emailFormSchema,
  otpFormSchema,
} from "@/lib/validations/auth";
import { setAuthSessionInvalidationHandler } from "@/lib/auth-session-events";
import type { AuthModalContextValue } from "@/providers/auth-modal-context";
import {
  type AuthModalUiState,
  type AuthSessionAction,
  type AuthSessionState,
  authModalUiReducer,
  initialAuthModalUiState,
  initialAuthSessionState,
  patchState,
} from "@/providers/auth-modal-state";
import {
  AUTH_DEFAULTS,
  type UserProfile,
  fetchCurrentUser,
  getAuthErrorMessage,
  logout as logoutRequest,
  requestOtp,
  verifyOtp,
} from "@/services/auth";
import {
  deleteSavedAuthToken,
  getSavedAuthToken,
  saveAuthToken,
} from "@/storage/auth-token";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { useForm } from "react-hook-form";

type EmailOnlyFormValues = Pick<EmailFormValues, "email">;

export function useAuthModalController() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logoutInFlightRef = useRef(false);
  const authTokenRef = useRef<string | null>(null);
  const [uiState, dispatchUiState] = useReducer(
    authModalUiReducer,
    initialAuthModalUiState,
  );

  const [sessionState, dispatchSessionState] = useReducer(
    (state: AuthSessionState, action: AuthSessionAction) => {
      if (action.type === "patch") {
        return patchState(state, action.payload);
      }

      return state;
    },
    initialAuthSessionState,
  );

  const {
    isEmailModalVisible,
    isOtpModalVisible,
    pendingEmail,
    isRequestingOtp,
    isVerifyingOtp,
    emailError,
    otpError,
    isLoggingOut,
    isHydrating,
    enablePushRegistrationLogs,
  } = uiState;
  const { authToken, user } = sessionState;

  const patchUiState = useCallback((payload: Partial<AuthModalUiState>) => {
    dispatchUiState({ type: "patch", payload });
  }, []);

  const patchSessionState = useCallback(
    (payload: Partial<AuthSessionState>) => {
      dispatchSessionState({ type: "patch", payload });
    },
    [],
  );

  const {
    control: emailControl,
    handleSubmit: handleEmailSubmit,
    reset: resetEmailForm,
    formState: { errors: emailFormErrors },
  } = useForm<EmailOnlyFormValues>({
    resolver: zodResolver(emailFormSchema.pick({ email: true })),
    defaultValues: { email: "" },
  });

  const {
    handleSubmit: handleOtpSubmit,
    watch: watchOtpCode,
    setValue: setOtpCodeValue,
    reset: resetOtpForm,
    formState: { errors: otpFormErrors },
  } = useForm<OtpFormValues>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otpCode: "" },
  });

  const otpCode = watchOtpCode("otpCode");

  const setPendingEmail = useCallback(
    (email: string | null) => {
      patchUiState({ pendingEmail: email });
    },
    [patchUiState],
  );

  const setIsEmailModalVisible = useCallback(
    (value: boolean) => {
      patchUiState({ isEmailModalVisible: value });
    },
    [patchUiState],
  );

  const setIsOtpModalVisible = useCallback(
    (value: boolean) => {
      patchUiState({ isOtpModalVisible: value });
    },
    [patchUiState],
  );

  const setIsRequestingOtp = useCallback(
    (value: boolean) => {
      patchUiState({ isRequestingOtp: value });
    },
    [patchUiState],
  );

  const setIsVerifyingOtp = useCallback(
    (value: boolean) => {
      patchUiState({ isVerifyingOtp: value });
    },
    [patchUiState],
  );

  const setEmailError = useCallback(
    (value: string | null) => {
      patchUiState({ emailError: value });
    },
    [patchUiState],
  );

  const setOtpError = useCallback(
    (value: string | null) => {
      patchUiState({ otpError: value });
    },
    [patchUiState],
  );

  const setIsLoggingOut = useCallback(
    (value: boolean) => {
      patchUiState({ isLoggingOut: value });
    },
    [patchUiState],
  );

  const setIsHydrating = useCallback(
    (value: boolean) => {
      patchUiState({ isHydrating: value });
    },
    [patchUiState],
  );

  const setEnablePushRegistrationLogs = useCallback(
    (value: boolean) => {
      patchUiState({ enablePushRegistrationLogs: value });
    },
    [patchUiState],
  );

  const setAuthToken = useCallback(
    (value: string | null) => {
      authTokenRef.current = value;
      patchSessionState({ authToken: value });
    },
    [patchSessionState],
  );

  const setUser = useCallback(
    (value: UserProfile | null) => {
      patchSessionState({ user: value });
    },
    [patchSessionState],
  );

  const clearInMemoryAuthSession = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setEnablePushRegistrationLogs(false);
    setPendingEmail(null);
    resetEmailForm({ email: "" });
    resetOtpForm({ otpCode: "" });
    setEmailError(null);
    setOtpError(null);
    setIsEmailModalVisible(false);
    setIsOtpModalVisible(false);
    queryClient.clear();
  }, [
    queryClient,
    resetEmailForm,
    resetOtpForm,
    setAuthToken,
    setEmailError,
    setEnablePushRegistrationLogs,
    setIsEmailModalVisible,
    setIsOtpModalVisible,
    setOtpError,
    setPendingEmail,
    setUser,
  ]);

  const { revokeRegisteredPushToken } = usePushNotifications({
    isAuthenticated: Boolean(authToken),
    isHydrating,
    userId: user?.id ?? null,
    enableDebugLogs: enablePushRegistrationLogs,
  });

  useEffect(() => {
    return setAuthSessionInvalidationHandler((failedToken) => {
      if (logoutInFlightRef.current) {
        return;
      }

      const activeToken = authTokenRef.current;
      if (activeToken && activeToken !== failedToken) {
        return;
      }

      clearInMemoryAuthSession();
      if (activeToken) {
        router.replace("/");
      }
    });
  }, [clearInMemoryAuthSession, router]);

  useEffect(() => {
    let isCancelled = false;

    const hydrateAuthState = async () => {
      try {
        const storedToken = await getSavedAuthToken();
        if (storedToken && !isCancelled) {
          const profile = await fetchCurrentUser(storedToken);
          if (!isCancelled) {
            setAuthToken(storedToken);
            setUser(profile);
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          console.warn("Failed to hydrate auth state", error.message);
        }
      } finally {
        if (!isCancelled) {
          setIsHydrating(false);
        }
      }
    };

    hydrateAuthState();

    return () => {
      isCancelled = true;
    };
  }, [setAuthToken, setIsHydrating, setUser]);

  const closeLoginModal = useCallback(() => {
    setIsEmailModalVisible(false);
    setIsOtpModalVisible(false);
    setEmailError(null);
    setOtpError(null);
  }, [
    setEmailError,
    setIsEmailModalVisible,
    setIsOtpModalVisible,
    setOtpError,
  ]);

  const openLoginModal = useCallback(() => {
    resetEmailForm({ email: "" });
    resetOtpForm({ otpCode: "" });
    setEmailError(null);
    setOtpError(null);
    setIsOtpModalVisible(false);
    setIsEmailModalVisible(true);
  }, [
    resetEmailForm,
    resetOtpForm,
    setEmailError,
    setIsEmailModalVisible,
    setIsOtpModalVisible,
    setOtpError,
  ]);

  const handleRequestOtp = useCallback(
    async (data: EmailOnlyFormValues) => {
      setEmailError(null);
      setIsRequestingOtp(true);

      try {
        const response = await requestOtp(data.email, AUTH_DEFAULTS.role);
        if (!response.success) {
          throw new Error("Unable to send a verification code right now.");
        }
        setPendingEmail(data.email);
        setIsEmailModalVisible(false);
        setIsOtpModalVisible(true);
        resetOtpForm({ otpCode: "" });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to send an OTP right now.";
        setEmailError(message);
      } finally {
        setIsRequestingOtp(false);
      }
    },
    [
      resetOtpForm,
      setEmailError,
      setIsEmailModalVisible,
      setIsOtpModalVisible,
      setIsRequestingOtp,
      setPendingEmail,
    ],
  );

  const handleVerifyOtp = useCallback(
    async (data: OtpFormValues) => {
      if (!pendingEmail) {
        setOtpError("Request a new code to continue.");
        return;
      }

      setOtpError(null);
      setIsVerifyingOtp(true);

      try {
        const response = await verifyOtp({
          email: pendingEmail,
          otpCode: data.otpCode,
          role: AUTH_DEFAULTS.role,
        });
        const resolvedToken = response.token;

        if (!resolvedToken || typeof resolvedToken !== "string") {
          throw new Error("The server did not return a valid access token.");
        }

        await saveAuthToken(resolvedToken);
        setAuthToken(resolvedToken);

        const profile =
          response.user ?? (await fetchCurrentUser(resolvedToken));
        setUser(profile);
        setIsOtpModalVisible(false);
        setIsEmailModalVisible(false);

        setTimeout(() => {
          router.push("/(tabs)");
        }, 0);
      } catch (error) {
        setOtpError(
          getAuthErrorMessage(error, "We could not verify that code."),
        );
      } finally {
        setIsVerifyingOtp(false);
      }
    },
    [
      pendingEmail,
      router,
      setAuthToken,
      setIsEmailModalVisible,
      setIsOtpModalVisible,
      setIsVerifyingOtp,
      setOtpError,
      setUser,
    ],
  );

  const completeLogin = useCallback(
    async (token: string, profile: UserProfile) => {
      setEnablePushRegistrationLogs(true);
      await saveAuthToken(token);
      setAuthToken(token);
      setUser(profile);
      setPendingEmail(null);
      resetEmailForm({ email: "" });
      resetOtpForm({ otpCode: "" });
      setEmailError(null);
      setOtpError(null);
      setIsEmailModalVisible(false);
      setIsOtpModalVisible(false);
      router.replace("/");
    },
    [
      router,
      resetEmailForm,
      resetOtpForm,
      setAuthToken,
      setEmailError,
      setEnablePushRegistrationLogs,
      setIsEmailModalVisible,
      setIsOtpModalVisible,
      setOtpError,
      setPendingEmail,
      setUser,
    ],
  );

  const handleLogout = useCallback(async () => {
    if (logoutInFlightRef.current) {
      return;
    }

    logoutInFlightRef.current = true;
    setIsLoggingOut(true);
    try {
      if (authToken) {
        try {
          await revokeRegisteredPushToken();
        } catch (error) {
          if (error instanceof Error) {
            console.warn(
              "Failed to persist push token revocation",
              error.message,
            );
          }
        }
        await logoutRequest(authToken);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.warn("Failed to logout", error.message);
      }
    } finally {
      clearInMemoryAuthSession();
      try {
        await deleteSavedAuthToken();
      } catch (error) {
        console.warn(
          "Failed to delete saved auth token",
          error instanceof Error ? error.message : "Unknown storage error",
        );
      }
      logoutInFlightRef.current = false;
      setIsLoggingOut(false);
      router.replace("/");
    }
  }, [
    authToken,
    clearInMemoryAuthSession,
    revokeRegisteredPushToken,
    router,
    setIsLoggingOut,
  ]);

  const handleResendCode = useCallback(async () => {
    if (!pendingEmail) {
      return;
    }

    try {
      const response = await requestOtp(pendingEmail, AUTH_DEFAULTS.role);
      if (!response.success) {
        throw new Error("Unable to resend code.");
      }
    } catch (error) {
      setOtpError(getAuthErrorMessage(error, "Unable to resend code."));
    }
  }, [pendingEmail, setOtpError]);

  const handleEmailInputChange = useCallback(
    (text: string, onChange: (value: string) => void) => {
      setEmailError(null);
      onChange(text);
    },
    [setEmailError],
  );

  const handleOtpCodeChange = useCallback(
    (code: string) => {
      setOtpError(null);
      setOtpCodeValue("otpCode", code, { shouldValidate: true });
    },
    [setOtpCodeValue, setOtpError],
  );

  const onEmailSubmit = useMemo(
    () => handleEmailSubmit(handleRequestOtp),
    [handleEmailSubmit, handleRequestOtp],
  );

  const onOtpSubmit = useMemo(
    () => handleOtpSubmit(handleVerifyOtp),
    [handleOtpSubmit, handleVerifyOtp],
  );

  const authContextValue = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(authToken),
      user,
      userEmail: user?.email ?? null,
      openLoginModal,
      logout: handleLogout,
      isLoggingOut,
      isHydrating,
    }),
    [authToken, handleLogout, isHydrating, isLoggingOut, openLoginModal, user],
  );

  const modalContextValue = useMemo<AuthModalContextValue>(
    () => ({
      openLoginModal,
      closeLoginModal,
      completeLogin,
      isEmailModalVisible,
      isOtpModalVisible,
      isAuthenticated: Boolean(authToken),
      user,
      authToken,
      pendingEmail,
      setPendingEmail,
    }),
    [
      openLoginModal,
      closeLoginModal,
      completeLogin,
      isEmailModalVisible,
      isOtpModalVisible,
      authToken,
      user,
      pendingEmail,
      setPendingEmail,
    ],
  );

  const sheetProps = useMemo<AuthModalSheetProps>(
    () => ({
      isModalVisible: isEmailModalVisible || isOtpModalVisible,
      isEmailModalVisible,
      isOtpModalVisible,
      pendingEmail,
      isRequestingOtp,
      isVerifyingOtp,
      emailValidationError: emailFormErrors.email?.message,
      emailError,
      otpError: otpFormErrors.otpCode?.message ?? otpError,
      emailControl,
      onEmailChange: handleEmailInputChange,
      onEmailSubmit,
      onClose: closeLoginModal,
      otpCode,
      onOtpCodeChange: handleOtpCodeChange,
      onOtpSubmit,
      onResendCode: handleResendCode,
    }),
    [
      closeLoginModal,
      emailControl,
      emailError,
      emailFormErrors.email?.message,
      handleEmailInputChange,
      handleOtpCodeChange,
      handleResendCode,
      isEmailModalVisible,
      isOtpModalVisible,
      isRequestingOtp,
      isVerifyingOtp,
      onEmailSubmit,
      onOtpSubmit,
      otpCode,
      otpFormErrors.otpCode?.message,
      otpError,
      pendingEmail,
    ],
  );

  return {
    authContextValue,
    modalContextValue,
    sheetProps,
  };
}
