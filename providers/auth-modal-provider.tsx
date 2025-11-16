import {
	createContext,
	type PropsWithChildren,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";

import { Colors } from "@/constants/theme";
import { AuthContext } from "@/context/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
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
	const colorScheme = useColorScheme();
	const palette = Colors[colorScheme ?? "light"];
	const styles = useMemo(() => createStyles(palette), [palette]);

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
					styles={styles}
					loading={isRequestingOtp}
				/>

				<LoginModal
					title="Enter your code"
					description={
						pendingEmail
							? `We sent a 1-time passcode to ${pendingEmail}. Paste it below to finish signing in.`
							: ""
					}
					visible={isOtpModalVisible}
					confirmLabel={isVerifyingOtp ? "Verifying..." : "Verify"}
					confirmDisabled={!isOtpValid || isVerifyingOtp}
					onConfirm={handleVerifyOtp}
					onClose={closeLoginModal}
					value={otpInput}
					onChangeValue={setOtpInput}
					error={otpError}
					keyboardType="number-pad"
					placeholder="000000"
					autoComplete="one-time-code"
					styles={styles}
					loading={isVerifyingOtp}
					accessoryLabel={
						otpPreviewCode ? `Test code: ${otpPreviewCode}` : undefined
					}
				/>
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
	styles: ReturnType<typeof createStyles>;
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
	styles,
	loading,
	accessoryLabel,
}: LoginModalProps) => {
	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<View style={styles.backdrop}>
				<KeyboardAvoidingView
					behavior={Platform.select({ ios: "padding", default: undefined })}
					style={styles.modalWrapper}
				>
					<View style={styles.card}>
						<View style={styles.header}>
							<Text style={styles.title}>{title}</Text>
							<Pressable onPress={onClose} hitSlop={8}>
								<Text style={styles.linkLabel}>Close</Text>
							</Pressable>
						</View>

						{!!description && (
							<Text style={styles.description}>{description}</Text>
						)}

						<TextInput
							value={value}
							onChangeText={onChangeValue}
							style={styles.input}
							keyboardType={keyboardType}
							autoCapitalize={autoCapitalize}
							placeholder={placeholder}
							autoComplete={autoComplete}
							placeholderTextColor={styles.placeholderColor}
							textContentType={
								autoComplete === "email"
									? "emailAddress"
									: autoComplete === "one-time-code"
										? "oneTimeCode"
										: "none"
							}
						/>

						{!!accessoryLabel && (
							<Text style={styles.accessoryLabel}>{accessoryLabel}</Text>
						)}
						{!!error && <Text style={styles.errorText}>{error}</Text>}

						<View style={styles.actions}>
							<Pressable
								style={styles.secondaryButton}
								onPress={onClose}
								disabled={loading}
							>
								<Text style={styles.secondaryButtonLabel}>Cancel</Text>
							</Pressable>

							<Pressable
								style={[
									styles.primaryButton,
									confirmDisabled && styles.primaryButtonDisabled,
								]}
								onPress={onConfirm}
								disabled={confirmDisabled}
							>
								{loading ? (
									<ActivityIndicator color="#fff" />
								) : (
									<Text style={styles.primaryButtonLabel}>{confirmLabel}</Text>
								)}
							</Pressable>
						</View>
					</View>
				</KeyboardAvoidingView>
			</View>
		</Modal>
	);
};

const createStyles = (palette: (typeof Colors)["light"]) => {
	const placeholderColor = `${palette.icon}cc`;

	return {
		...StyleSheet.create({
			backdrop: {
				flex: 1,
				backgroundColor: "rgba(0,0,0,0.4)",
				justifyContent: "flex-end",
			},
			modalWrapper: {
				width: "100%",
			},
			card: {
				backgroundColor: palette.background,
				paddingHorizontal: 24,
				paddingTop: 24,
				paddingBottom: 32,
				borderTopLeftRadius: 20,
				borderTopRightRadius: 20,
				gap: 16,
			},
			header: {
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "space-between",
			},
			title: {
				fontSize: 20,
				fontWeight: "600",
				color: palette.text,
			},
			description: {
				fontSize: 15,
				color: palette.icon,
			},
			input: {
				borderWidth: 1,
				borderColor: palette.icon,
				borderRadius: 10,
				paddingHorizontal: 14,
				paddingVertical: 12,
				fontSize: 16,
				color: palette.text,
			},
			accessoryLabel: {
				fontSize: 13,
				color: palette.icon,
			},
			errorText: {
				fontSize: 13,
				color: "#d13438",
			},
			actions: {
				flexDirection: "row",
				gap: 12,
				alignItems: "center",
				justifyContent: "flex-end",
				marginTop: 4,
			},
			primaryButton: {
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "center",
				backgroundColor: palette.tint,
				paddingHorizontal: 20,
				paddingVertical: 12,
				borderRadius: 999,
				minWidth: 110,
			},
			primaryButtonDisabled: {
				opacity: 0.5,
			},
			primaryButtonLabel: {
				color: "#fff",
				fontWeight: "600",
			},
			secondaryButton: {
				paddingHorizontal: 16,
				paddingVertical: 12,
			},
			secondaryButtonLabel: {
				color: palette.icon,
				fontWeight: "500",
			},
			linkLabel: {
				color: palette.tint,
				fontWeight: "500",
			},
		}),
		placeholderColor,
	};
};
