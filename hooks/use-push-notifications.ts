import NetInfo from "@react-native-community/netinfo";
import { useQueryClient } from "@tanstack/react-query";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import { expoOs, isExpoAndroid, isExpoNative } from "@/lib/expo-platform";
import {
	getPushNotificationRoute,
	parsePushNotificationData,
} from "@/lib/push-notification-data";
import {
	getNotificationResponseDisposition,
	getPushTokensToRevoke,
	markPushRegistrationPendingRevocation,
	markPushRegistrationSucceeded,
	markStalePushTokenRevoked,
	type PushRegistrationState,
	stagePushRegistration,
} from "@/lib/push-notification-lifecycle";
import {
	type PushPlatform,
	registerPushToken,
	revokePushToken,
} from "@/services/push-tokens";
import {
	deleteSavedPushRegistration,
	getSavedPushRegistration,
	savePushRegistration,
} from "@/storage/push-token";

const PUSH_LOG_PREFIX = "[push-notifications]";
const INITIAL_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;
const debugLog = (message: string, payload?: unknown) => {
	if (!__DEV__) return;
	if (payload !== undefined) {
		console.info(`${PUSH_LOG_PREFIX} ${message}`, payload);
		return;
	}
	console.info(`${PUSH_LOG_PREFIX} ${message}`);
};

type UsePushNotificationsArgs = {
	isAuthenticated: boolean;
	isHydrating: boolean;
	userId: string | null;
	enableDebugLogs?: boolean;
};

if (isExpoNative) {
	Notifications.setNotificationHandler({
		handleNotification: async () => ({
			shouldPlaySound: true,
			shouldSetBadge: true,
			shouldShowBanner: true,
			shouldShowList: true,
		}),
	});
}

const getEasProjectId = (): string | undefined => {
	const expoConfigProjectId = (
		Constants.expoConfig as { extra?: { eas?: { projectId?: string } } } | null
	)?.extra?.eas?.projectId;
	return expoConfigProjectId ?? Constants.easConfig?.projectId;
};

const getPushPlatform = (): PushPlatform | null => {
	return expoOs === "ios" || expoOs === "android" ? expoOs : null;
};

export const usePushNotifications = ({
	isAuthenticated,
	isHydrating,
	userId,
	enableDebugLogs = false,
}: UsePushNotificationsArgs) => {
	const queryClient = useQueryClient();
	const lastNotificationResponse = Notifications.useLastNotificationResponse();
	const lastHandledResponseId = useRef<string | null>(null);
	const handlingResponseIds = useRef(new Set<string>());
	const pendingNotificationResponse =
		useRef<Notifications.NotificationResponse | null>(null);
	const pendingDevicePushToken = useRef<Notifications.DevicePushToken | null>(
		null,
	);
	const registrationInFlight = useRef<Promise<void> | null>(null);
	const retryAttempt = useRef(0);
	const retryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [reconcileVersion, setReconcileVersion] = useState(0);
	const currentSession = useRef({ isAuthenticated, isHydrating, userId });
	currentSession.current = { isAuthenticated, isHydrating, userId };
	const log = useCallback(
		(message: string, payload?: unknown) => {
			if (!enableDebugLogs) return;
			debugLog(message, payload);
		},
		[enableDebugLogs],
	);

	const invalidateBookingQueries = useCallback(
		async (bookingId: string) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["bookings"] }),
				queryClient.invalidateQueries({ queryKey: ["booking", bookingId] }),
			]);
		},
		[queryClient],
	);

	const handleNotificationData = useCallback(
		async (data: unknown, shouldNavigate: boolean) => {
			const notificationData = parsePushNotificationData(data);
			if (!notificationData) {
				return false;
			}
			const route = getPushNotificationRoute(notificationData);
			if (notificationData.target.kind === "booking") {
				await invalidateBookingQueries(notificationData.target.bookingId);
			} else {
				await queryClient.invalidateQueries({
					queryKey: ["referrals", "summary"],
				});
			}

			if (shouldNavigate) {
				router.push(route);
			}
			return true;
		},
		[invalidateBookingQueries, queryClient],
	);

	const handleNotificationResponse = useCallback(
		async (response: Notifications.NotificationResponse) => {
			const responseId = response.notification.request.identifier;
			if (
				getNotificationResponseDisposition({
					isAuthenticated,
					isHydrating,
				}) === "queue"
			) {
				pendingNotificationResponse.current = response;
				log("Queued notification response until authentication is ready", {
					responseId,
				});
				return;
			}

			if (lastHandledResponseId.current === responseId) {
				Notifications.clearLastNotificationResponse();
				return;
			}
			if (handlingResponseIds.current.has(responseId)) {
				return;
			}
			handlingResponseIds.current.add(responseId);
			try {
				const handled = await handleNotificationData(
					response.notification.request.content.data,
					true,
				);
				if (!handled) {
					return;
				}

				lastHandledResponseId.current = responseId;
				if (
					pendingNotificationResponse.current?.notification.request
						.identifier === responseId
				) {
					pendingNotificationResponse.current = null;
				}
				Notifications.clearLastNotificationResponse();
			} finally {
				handlingResponseIds.current.delete(responseId);
			}
		},
		[handleNotificationData, isAuthenticated, isHydrating, log],
	);

	const requestReconcile = useCallback(() => {
		setReconcileVersion((version) => version + 1);
	}, []);

	const clearScheduledRetry = useCallback(() => {
		if (retryTimeout.current) {
			clearTimeout(retryTimeout.current);
			retryTimeout.current = null;
		}
	}, []);

	const scheduleRetry = useCallback(() => {
		clearScheduledRetry();
		const delay = Math.min(
			INITIAL_RETRY_DELAY_MS * 2 ** Math.min(retryAttempt.current, 6),
			MAX_RETRY_DELAY_MS,
		);
		retryAttempt.current += 1;
		log("Scheduling push registration retry", { delay });
		retryTimeout.current = setTimeout(() => {
			retryTimeout.current = null;
			requestReconcile();
		}, delay);
	}, [clearScheduledRetry, log, requestReconcile]);

	const revokeStalePushTokens = useCallback(
		async (state: PushRegistrationState) => {
			let nextState = state;
			for (const staleToken of state.staleTokens) {
				await revokePushToken(staleToken);
				nextState = markStalePushTokenRevoked(nextState, staleToken);
				await savePushRegistration(nextState);
			}
			return nextState;
		},
		[],
	);

	const reconcilePushRegistration = useCallback(async () => {
		if (!userId || isHydrating || !isAuthenticated) {
			return;
		}

		const permission = await Notifications.getPermissionsAsync();
		let finalStatus = permission.status;
		log("Notification permission status", { status: finalStatus });
		if (finalStatus !== "granted" && permission.canAskAgain) {
			const requested = await Notifications.requestPermissionsAsync();
			finalStatus = requested.status;
			log("Notification permission requested", { status: finalStatus });
		}
		if (finalStatus !== "granted") {
			log("Push registration skipped because permission is not granted");
			return;
		}

		const platform = getPushPlatform();
		if (!platform) {
			return;
		}

		const projectId = getEasProjectId();
		const devicePushToken = pendingDevicePushToken.current;
		const tokenResult = await Notifications.getExpoPushTokenAsync({
			...(projectId ? { projectId } : {}),
			...(devicePushToken ? { devicePushToken } : {}),
		});
		if (pendingDevicePushToken.current === devicePushToken) {
			pendingDevicePushToken.current = null;
		}

		const token = tokenResult.data;
		const session = currentSession.current;
		if (
			!token ||
			session.isHydrating ||
			!session.isAuthenticated ||
			session.userId !== userId
		) {
			return;
		}

		let state = await getSavedPushRegistration();
		const needsRegistration =
			state?.token !== token ||
			state?.platform !== platform ||
			state?.ownerUserId !== userId ||
			state?.status !== "registered";

		if (needsRegistration) {
			state = stagePushRegistration(state, {
				token,
				platform,
				userId,
			});
			await savePushRegistration(state);
			log("Registering Expo push token on backend", { platform });
			await registerPushToken(token, platform);
			state = markPushRegistrationSucceeded(state, userId);
			await savePushRegistration(state);
			log("Expo push token registration succeeded");
		}

		if (!state) {
			return;
		}
		if (state.staleTokens.length > 0) {
			await revokeStalePushTokens(state);
			log("Revoked stale Expo push tokens");
		}
	}, [isAuthenticated, isHydrating, log, revokeStalePushTokens, userId]);

	const runPushRegistrationReconciliation = useCallback(async () => {
		if (registrationInFlight.current) {
			await registrationInFlight.current.catch(() => undefined);
			return;
		}

		const operation = reconcilePushRegistration();
		registrationInFlight.current = operation;
		try {
			await operation;
			retryAttempt.current = 0;
			clearScheduledRetry();
			if (pendingDevicePushToken.current) {
				requestReconcile();
			}
		} catch (error) {
			if (error instanceof Error) {
				console.warn("Failed to register push notifications", error.message);
			}
			scheduleRetry();
		} finally {
			if (registrationInFlight.current === operation) {
				registrationInFlight.current = null;
			}
		}
	}, [
		clearScheduledRetry,
		reconcilePushRegistration,
		requestReconcile,
		scheduleRetry,
	]);

	const revokeRegisteredPushToken = useCallback(async (): Promise<boolean> => {
		clearScheduledRetry();
		await registrationInFlight.current?.catch(() => undefined);

		const savedRegistration = await getSavedPushRegistration();
		if (!savedRegistration) {
			log("No saved push registration found to revoke");
			return true;
		}

		let state = markPushRegistrationPendingRevocation(savedRegistration);
		await savePushRegistration(state);

		try {
			for (const token of getPushTokensToRevoke(state)) {
				await revokePushToken(token);
				if (token !== state.token) {
					state = markStalePushTokenRevoked(state, token);
					await savePushRegistration(state);
				}
			}
			await deleteSavedPushRegistration();
			log("Successfully revoked saved push registration");
			return true;
		} catch (error) {
			if (error instanceof Error) {
				console.warn("Failed to revoke push token", error.message);
			}
			return false;
		}
	}, [clearScheduledRetry, log]);

	useEffect(() => {
		if (!isExpoNative) {
			return;
		}

		const onNotificationReceived =
			Notifications.addNotificationReceivedListener((notification) => {
				void handleNotificationData(notification.request.content.data, false);
			});

		const onNotificationResponse =
			Notifications.addNotificationResponseReceivedListener((response) => {
				void handleNotificationResponse(response);
			});

		return () => {
			onNotificationReceived.remove();
			onNotificationResponse.remove();
		};
	}, [handleNotificationData, handleNotificationResponse]);

	useEffect(() => {
		if (!isExpoNative || !lastNotificationResponse) {
			return;
		}
		void handleNotificationResponse(lastNotificationResponse);
	}, [handleNotificationResponse, lastNotificationResponse]);

	useEffect(() => {
		if (
			!isExpoNative ||
			getNotificationResponseDisposition({
				isAuthenticated,
				isHydrating,
			}) !== "handle" ||
			!pendingNotificationResponse.current
		) {
			return;
		}
		void handleNotificationResponse(pendingNotificationResponse.current);
	}, [handleNotificationResponse, isAuthenticated, isHydrating]);

	useEffect(() => {
		if (!isExpoAndroid) {
			return;
		}

		void Notifications.setNotificationChannelAsync("default", {
			name: "default",
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: "#2563EB",
		}).catch((error: unknown) => {
			if (error instanceof Error) {
				console.warn(
					"Failed to configure Android notification channel",
					error.message,
				);
			}
		});
	}, []);

	useEffect(() => {
		if (!isExpoNative || !isAuthenticated || isHydrating || !userId) {
			clearScheduledRetry();
			return;
		}

		log("Reconciling push registration", { reconcileVersion });
		void runPushRegistrationReconciliation();
	}, [
		clearScheduledRetry,
		isAuthenticated,
		isHydrating,
		log,
		reconcileVersion,
		runPushRegistrationReconciliation,
		userId,
	]);

	useEffect(() => {
		if (!isExpoNative || !isAuthenticated || isHydrating || !userId) {
			return;
		}

		const networkSubscription = NetInfo.addEventListener((state) => {
			if (state.isConnected === true && state.isInternetReachable !== false) {
				requestReconcile();
			}
		});
		const appStateSubscription = AppState.addEventListener(
			"change",
			(nextAppState) => {
				if (nextAppState === "active") {
					requestReconcile();
				}
			},
		);
		const pushTokenSubscription = Notifications.addPushTokenListener(
			(devicePushToken) => {
				pendingDevicePushToken.current = devicePushToken;
				requestReconcile();
			},
		);

		return () => {
			networkSubscription();
			appStateSubscription.remove();
			pushTokenSubscription.remove();
		};
	}, [isAuthenticated, isHydrating, requestReconcile, userId]);

	useEffect(
		() => () => {
			clearScheduledRetry();
		},
		[clearScheduledRetry],
	);

	return { revokeRegisteredPushToken };
};
