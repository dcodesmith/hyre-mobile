import { BottomSheet, BottomSheetContent } from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/text";
import { VerifyOtpForm } from "@/components/ui/verify-otp-form";
import { AuthContext } from "@/context/auth-context";
import {
	AUTH_DEFAULTS,
	fetchCurrentUser,
	logout as logoutRequest,
	requestOtp,
	type UserProfile,
	verifyOtp,
} from "@/services/auth";
import {
	deleteSavedAuthToken,
	getSavedAuthToken,
	saveAuthToken,
} from "@/storage/auth-token";
import { useRouter } from "expo-router";
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { View } from "react-native";
import Animated, { FadeInRight, FadeOutLeft } from "react-native-reanimated";

type AuthModalContextValue = {
	openLoginModal: () => void;
	closeLoginModal: () => void;
	isEmailModalVisible: boolean;
	isOtpModalVisible: boolean;
	isAuthenticated: boolean;
	user: UserProfile | null;
	authToken: string | null;
};

const AuthModalContext = createContext<AuthModalContextValue | undefined>(
	undefined,
);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const AuthModalProvider = ({ children }: PropsWithChildren) => {
	const router = useRouter();
	const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
	const [isOtpModalVisible, setIsOtpModalVisible] = useState(false);
	const [emailInput, setEmailInput] = useState("");
	const [otpInput, setOtpInput] = useState("");
	const [pendingEmail, setPendingEmail] = useState<string | null>(null);
	const [isRequestingOtp, setIsRequestingOtp] = useState(false);
	const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
	const [emailError, setEmailError] = useState<string | null>(null);
	const [otpError, setOtpError] = useState<string | null>(null);
	const [authToken, setAuthToken] = useState<string | null>(null);
	const [user, setUser] = useState<UserProfile | null>(null);
	const [otpPreviewCode, setOtpPreviewCode] = useState<string | null>(null);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	useEffect(() => {
		let isCancelled = false;

		const hydrateAuthState = async () => {
			try {
				const storedToken = await getSavedAuthToken();
				if (!storedToken || isCancelled) {
					return;
				}

				const profile = await fetchCurrentUser(storedToken);
				if (isCancelled) {
					return;
				}

				setAuthToken(storedToken);
				setUser(profile);
			} catch (error) {
				await deleteSavedAuthToken();
				if (error instanceof Error) {
					console.warn("Failed to hydrate auth state", error.message);
				}
			}
		};

		hydrateAuthState();

		return () => {
			isCancelled = true;
		};
	}, []);

	const closeLoginModal = useCallback(() => {
		setIsEmailModalVisible(false);
		setIsOtpModalVisible(false);
		setEmailError(null);
		setOtpError(null);
	}, []);

	const openLoginModal = useCallback(() => {
		setEmailInput("");
		setOtpInput("");
		setEmailError(null);
		setOtpError(null);
		setIsOtpModalVisible(false);
		setIsEmailModalVisible(true);
	}, []);

	const isEmailValid = useMemo(
		() => EMAIL_REGEX.test(emailInput.trim().toLowerCase()),
		[emailInput],
	);
	const isOtpValid = useMemo(() => otpInput.trim().length >= 4, [otpInput]);

	const handleRequestOtp = useCallback(async () => {
		const normalizedEmail = emailInput.trim().toLowerCase();

		if (!normalizedEmail || !isEmailValid) {
			setEmailError("Enter a valid email address.");
			return;
		}

		setEmailError(null);
		setIsRequestingOtp(true);

		try {
			const response = await requestOtp(normalizedEmail, AUTH_DEFAULTS.role);
			setPendingEmail(normalizedEmail);
			setOtpPreviewCode(response.code ?? null);
			setIsEmailModalVisible(false);
			setIsOtpModalVisible(true);
			setOtpInput("");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "Unable to send an OTP right now.";
			setEmailError(message);
		} finally {
			setIsRequestingOtp(false);
		}
	}, [emailInput, isEmailValid]);

	const handleVerifyOtp = useCallback(async () => {
		const normalizedCode = otpInput.trim();

		if (!pendingEmail) {
			setOtpError("Request a new code to continue.");
			return;
		}

		if (!normalizedCode || !isOtpValid) {
			setOtpError("Enter the code we sent to your email.");
			return;
		}

		setOtpError(null);
		setIsVerifyingOtp(true);

		try {
			const response = await verifyOtp({
				email: pendingEmail,
				otpCode: normalizedCode,
				role: AUTH_DEFAULTS.role,
			});

			if (!response.success) {
				throw new Error(response.message || "OTP verification failed.");
			}

			const resolvedToken = response.tokens?.accessToken;

			if (!resolvedToken || typeof resolvedToken !== "string") {
				throw new Error("The server did not return a valid access token.");
			}

			await saveAuthToken(resolvedToken);
			setAuthToken(resolvedToken);

			const profile = response.user ?? (await fetchCurrentUser(resolvedToken));
			setUser(profile);
			setIsOtpModalVisible(false);
			setIsEmailModalVisible(false);

			// Navigate to home page after successful login
			router.push("/(tabs)");
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "We could not verify that code.";
			setOtpError(message);
		} finally {
			setIsVerifyingOtp(false);
		}
	}, [isOtpValid, otpInput, pendingEmail, router]);

	const handleLogout = useCallback(async () => {
		if (isLoggingOut) {
			return;
		}

		setIsLoggingOut(true);
		try {
			if (authToken) {
				await logoutRequest(authToken);
			}
		} catch (error) {
			if (error instanceof Error) {
				console.warn("Failed to logout", error.message);
			}
		} finally {
			setIsLoggingOut(false);
			setAuthToken(null);
			setUser(null);
			setPendingEmail(null);
			setOtpInput("");
			setIsEmailModalVisible(false);
			setIsOtpModalVisible(false);
			await deleteSavedAuthToken();
		}
	}, [authToken, isLoggingOut]);

	const authContextValue = useMemo(
		() => ({
			isAuthenticated: Boolean(authToken),
			user,
			userEmail: user?.email ?? null,
			openLoginModal,
			logout: handleLogout,
			isLoggingOut,
		}),
		[authToken, handleLogout, isLoggingOut, openLoginModal, user],
	);

	const modalContextValue = useMemo<AuthModalContextValue>(
		() => ({
			openLoginModal,
			closeLoginModal,
			isEmailModalVisible,
			isOtpModalVisible,
			isAuthenticated: Boolean(authToken),
			user,
			authToken,
		}),
		[
			openLoginModal,
			closeLoginModal,
			isEmailModalVisible,
			isOtpModalVisible,
			authToken,
			user,
		],
	);

	const isModalVisible = isEmailModalVisible || isOtpModalVisible;

	return (
		<AuthContext.Provider value={authContextValue}>
			<AuthModalContext.Provider value={modalContextValue}>
				{children}

				<BottomSheet
					open={isModalVisible}
					onOpenChange={(open) => !open && closeLoginModal()}
				>
					<BottomSheetContent className="px-6 py-8">
						{isEmailModalVisible && (
							<Animated.View
								entering={FadeInRight.duration(200)}
								exiting={FadeOutLeft.duration(200)}
								style={{ width: "100%" }}
							>
								<View className="gap-6 w-full">
									<View className="gap-2">
										<Text
											variant="h2"
											className="text-2xl font-bold text-center sm:text-left"
										>
											Log in
										</Text>
										<Text variant="muted" className="text-center sm:text-left">
											Enter the email associated with your account and we will
											send you a one-time passcode.
										</Text>
									</View>

									<View className="gap-1.5">
										<Label htmlFor="email" className="text-base font-semibold">
											Email address
										</Label>
										<Input
											id="email"
											value={emailInput}
											onChangeText={setEmailInput}
											keyboardType="email-address"
											autoCapitalize="none"
											placeholder="name@company.com"
											autoComplete="email"
											editable={!isRequestingOtp}
											aria-invalid={!!emailError}
											className="w-full"
										/>
										{!!emailError && (
											<Text variant="small" className="text-destructive">
												{emailError}
											</Text>
										)}
									</View>

									<View className="gap-3">
										<Button
											className="w-full"
											onPress={handleRequestOtp}
											disabled={!isEmailValid || isRequestingOtp}
										>
											<Text>
												{isRequestingOtp ? "Sending..." : "Send code"}
											</Text>
										</Button>
										<Button
											variant="link"
											className="mx-auto"
											onPress={closeLoginModal}
											disabled={isRequestingOtp}
										>
											<Text>Cancel</Text>
										</Button>
									</View>
								</View>
							</Animated.View>
						)}

						{isOtpModalVisible && (
							<Animated.View
								entering={FadeInRight.duration(200)}
								exiting={FadeOutLeft.duration(200)}
								style={{ width: "100%" }}
							>
								<VerifyOtpForm
									title="Enter your code"
									description={
										pendingEmail
											? `Enter the verification code sent to ${pendingEmail}`
											: undefined
									}
									otpCode={otpInput}
									onOtpCodeChange={setOtpInput}
									onSubmit={handleVerifyOtp}
									onCancel={closeLoginModal}
									onResendCode={async () => {
										if (pendingEmail) {
											try {
												const response = await requestOtp(
													pendingEmail,
													AUTH_DEFAULTS.role,
												);
												setOtpPreviewCode(response.code ?? null);
											} catch (error) {
												const message =
													error instanceof Error
														? error.message
														: "Unable to resend code.";
												setOtpError(message);
											}
										}
									}}
									isSubmitting={isVerifyingOtp}
									error={otpError}
									previewCode={otpPreviewCode}
								/>
							</Animated.View>
						)}
					</BottomSheetContent>
				</BottomSheet>
			</AuthModalContext.Provider>
		</AuthContext.Provider>
	);
};

export const useAuthModal = () => {
	const context = useContext(AuthModalContext);

	if (!context) {
		throw new Error("useAuthModal must be used inside AuthModalProvider");
	}

	return context;
};
