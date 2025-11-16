import {
	BottomSheet,
	BottomSheetContent,
	BottomSheetDescription,
	BottomSheetFooter,
	BottomSheetHeader,
	BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { Alert } from "react-native";

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

			Alert.alert(
				"Logged in",
				profile?.name
					? `Welcome back, ${profile.name}!`
					: "OTP verification succeeded.",
			);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: "We could not verify that code.";
			setOtpError(message);
		} finally {
			setIsVerifyingOtp(false);
		}
	}, [isOtpValid, otpInput, pendingEmail]);

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

	return (
		<AuthContext.Provider value={authContextValue}>
			<AuthModalContext.Provider value={modalContextValue}>
				{children}

				<LoginModal
					title="Log in"
					description="Enter the email associated with your account and we will send you a one-time passcode."
					visible={isEmailModalVisible}
					confirmLabel={isRequestingOtp ? "Sending..." : "Send code"}
					confirmDisabled={!isEmailValid || isRequestingOtp}
					onConfirm={handleRequestOtp}
					onClose={closeLoginModal}
					value={emailInput}
					onChangeValue={setEmailInput}
					error={emailError}
					keyboardType="email-address"
					autoCapitalize="none"
					placeholder="name@company.com"
					autoComplete="email"
					loading={isRequestingOtp}
				/>

				<BottomSheet
					open={isOtpModalVisible}
					onOpenChange={(open) => !open && closeLoginModal()}
				>
					<BottomSheetContent className="px-6 py-8">
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

type LoginModalProps = {
	title: string;
	description: string;
	visible: boolean;
	confirmLabel: string;
	confirmDisabled: boolean;
	onConfirm: () => void;
	onClose: () => void;
	value: string;
	onChangeValue: (text: string) => void;
	error: string | null;
	keyboardType?: "default" | "email-address" | "number-pad";
	autoCapitalize?: "none" | "sentences" | "words" | "characters";
	placeholder?: string;
	autoComplete?: "email" | "off" | "one-time-code";
	loading: boolean;
	accessoryLabel?: string;
};

const LoginModal = ({
	title,
	description,
	visible,
	confirmLabel,
	confirmDisabled,
	onConfirm,
	onClose,
	value,
	onChangeValue,
	error,
	keyboardType = "default",
	autoCapitalize = "none",
	placeholder,
	autoComplete = "off",
	loading,
	accessoryLabel,
}: LoginModalProps) => {
	return (
		<BottomSheet open={visible} onOpenChange={(open) => !open && onClose()}>
			<BottomSheetContent>
				<BottomSheetHeader>
					<BottomSheetTitle>{title}</BottomSheetTitle>
					{!!description && (
						<BottomSheetDescription>{description}</BottomSheetDescription>
					)}
				</BottomSheetHeader>

				<Input
					value={value}
					onChangeText={onChangeValue}
					keyboardType={keyboardType}
					autoCapitalize={autoCapitalize}
					placeholder={placeholder}
					autoComplete={autoComplete}
					textContentType={
						autoComplete === "email"
							? "emailAddress"
							: autoComplete === "one-time-code"
								? "oneTimeCode"
								: "none"
					}
					editable={!loading}
					aria-invalid={!!error}
					className="w-full"
				/>

				{!!accessoryLabel && (
					<Text variant="small" className="text-muted-foreground -mt-2">
						{accessoryLabel}
					</Text>
				)}
				{!!error && (
					<Text variant="small" className="text-destructive -mt-2">
						{error}
					</Text>
				)}

				<BottomSheetFooter>
					<Button variant="outline" onPress={onClose} disabled={loading}>
						<Text>Cancel</Text>
					</Button>

					<Button onPress={onConfirm} disabled={confirmDisabled || loading}>
						<Text>{loading ? "Loading..." : confirmLabel}</Text>
					</Button>
				</BottomSheetFooter>
			</BottomSheetContent>
		</BottomSheet>
	);
};
