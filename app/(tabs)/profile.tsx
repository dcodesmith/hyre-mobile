import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthTextInput } from "@/components/auth/auth-text-input";
import {
	DetailCard,
	DetailCardBody,
	DetailCardHeader,
	DetailCardTitle,
} from "@/components/booking-detail-card";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";
import { phoneNumberSchema } from "@/lib/validations/auth";
import {
	getAuthErrorMessage,
	requestPhoneVerification,
	updateCurrentUser,
} from "@/services/auth";

const emptyToNull = (value: string) => value.trim() || null;

const formatPhoneNumber = (phoneNumber: string) => {
	const nigeriaMatch = phoneNumber.match(/^\+234(\d{3})(\d{3})(\d{4})$/);
	if (!nigeriaMatch) return phoneNumber;
	return `+234 ${nigeriaMatch[1]} ${nigeriaMatch[2]} ${nigeriaMatch[3]}`;
};

function ProfileSwitch({
	onValueChange,
	value,
}: Readonly<{
	onValueChange: (nextValue: boolean) => void;
	value: boolean;
}>) {
	return (
		<Pressable
			accessibilityLabel="Marketing communications"
			accessibilityRole="switch"
			accessibilityState={{ checked: value }}
			className={`h-6 w-11 rounded-full ${value ? "bg-[#111827]" : "bg-[#D1D5DB]"}`}
			onPress={() => onValueChange(!value)}
		>
			<View
				className={`absolute top-0.5 size-5 rounded-full bg-white ${
					value ? "right-0.5" : "left-0.5"
				}`}
			/>
		</Pressable>
	);
}

export default function ProfileScreen() {
	const router = useRouter();
	const { refreshUser, user } = useAuth();
	const [name, setName] = useState(user?.name ?? "");
	const [city, setCity] = useState(user?.city ?? "");
	const [address, setAddress] = useState(user?.address ?? "");
	const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? "");
	const [marketingConsent, setMarketingConsent] = useState(
		user?.marketingConsent ?? false,
	);
	const [isChangingPhone, setIsChangingPhone] = useState(
		user?.phoneVerified !== true,
	);
	const [isSaving, setIsSaving] = useState(false);
	const [isSendingCode, setIsSendingCode] = useState(false);

	useEffect(() => {
		setName(user?.name ?? "");
		setCity(user?.city ?? "");
		setAddress(user?.address ?? "");
		setPhoneNumber(user?.phoneNumber ?? "");
		setMarketingConsent(user?.marketingConsent ?? false);
		setIsChangingPhone(user?.phoneVerified !== true);
	}, [user]);

	const saveProfile = async () => {
		setIsSaving(true);
		try {
			await updateCurrentUser({
				name: emptyToNull(name),
				city: emptyToNull(city),
				address: emptyToNull(address),
				marketingConsent,
			});
			await refreshUser();
			Alert.alert("Profile updated", "Your changes have been saved.");
		} catch (error) {
			Alert.alert("Could not save changes", getAuthErrorMessage(error));
		} finally {
			setIsSaving(false);
		}
	};

	const sendPhoneCode = async () => {
		const parsed = phoneNumberSchema.safeParse(phoneNumber);
		if (!parsed.success) {
			Alert.alert(
				"Could not send code",
				parsed.error.issues[0]?.message ?? "Enter a valid phone number.",
			);
			return;
		}

		setIsSendingCode(true);
		try {
			await requestPhoneVerification(parsed.data);
			await refreshUser();
			router.push({
				pathname: "/phone-verification",
				params: { reason: "profile", redirectTo: "/profile" },
			});
		} catch (error) {
			Alert.alert("Could not send code", getAuthErrorMessage(error));
		} finally {
			setIsSendingCode(false);
		}
	};

	return (
		<SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
			<ScrollView
				className="flex-1"
				contentContainerClassName="px-5 pb-36 pt-[41px]"
				contentInsetAdjustmentBehavior="never"
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View className="w-full max-w-[353px] self-center">
					<Text className="font-geist-semibold text-2xl leading-9 text-[#111827]">
						Your Profile
					</Text>
					<Text className="mt-1 font-geist text-sm leading-5 text-[#4B5563]">
						Update your information and manage your account
					</Text>

					<View className="mt-8">
						<DetailCard>
							<DetailCardHeader>
								<DetailCardTitle>Personal Information</DetailCardTitle>
							</DetailCardHeader>

							<DetailCardBody>
								<View>
									<View className="gap-4">
										<View>
											<AuthTextInput
												value={name}
												onChangeText={setName}
												placeholder="Enter name"
												textContentType="name"
												editable={!isSaving}
												accessibilityLabel="Name"
											/>
										</View>
										<View>
											<AuthTextInput
												value={user?.email ?? ""}
												placeholder="Enter email"
												editable={false}
												inputMode="email"
												accessibilityLabel="Email"
											/>
										</View>
									</View>

									{isChangingPhone ? (
										<View className="mt-5 gap-2">
											<View className="gap-1">
												<Text className="font-geist-semibold text-sm leading-5 text-[#111827]">
													Phone Number
												</Text>
												<Text className="font-geist text-sm leading-5 text-[#374151]">
													We’ll send you a code to verify this number
												</Text>
											</View>
											<View className="flex-row gap-2">
												<View className="min-w-0 flex-1">
													<AuthTextInput
														value={phoneNumber}
														onChangeText={setPhoneNumber}
														placeholder="+234 803 123 4675"
														autoComplete="tel"
														textContentType="telephoneNumber"
														keyboardType="phone-pad"
														inputMode="tel"
														editable={!isSendingCode}
													/>
												</View>
												<View className="w-[104px]">
													<Button
														className="h-12 w-full rounded-md bg-neutral-900"
														disabled={
															isSendingCode || phoneNumber.trim().length === 0
														}
														onPress={() => void sendPhoneCode()}
													>
														<Text className="text-sm font-medium text-white">
															{isSendingCode ? "Sending…" : "Send code"}
														</Text>
													</Button>
												</View>
											</View>
										</View>
									) : (
										<View className="mt-5 gap-2">
											<Text className="font-geist-semibold text-sm leading-5 text-[#111827]">
												Phone Number
											</Text>
											<View className="h-[66px] flex-row items-center gap-4 rounded-[4px] border border-[#047857] bg-[#D1FAE5] px-[14px]">
												<View className="size-8 items-center justify-center rounded-full bg-[#047857]">
													<Check size={16} color="#FFFFFF" strokeWidth={3} />
												</View>
												<View className="min-w-0 flex-1">
													<Text
														className="font-geist-medium text-sm leading-5 text-[#111827]"
														numberOfLines={1}
													>
														{formatPhoneNumber(user?.phoneNumber ?? "")}
													</Text>
													<Text className="font-geist text-xs leading-5 text-[#111827]">
														Phone number verified
													</Text>
												</View>
											</View>
											<Pressable
												accessibilityRole="button"
												onPress={() => setIsChangingPhone(true)}
											>
												<Text className="font-geist-medium text-sm leading-5 text-neutral-900 underline">
													Change phone number
												</Text>
											</Pressable>
										</View>
									)}

									<View className={isChangingPhone ? "mt-5" : "mt-6"}>
										<View className="gap-4">
											<View>
												<AuthTextInput
													value={city}
													onChangeText={setCity}
													placeholder="Enter city"
													textContentType="addressCity"
													editable={!isSaving}
													accessibilityLabel="City"
												/>
											</View>
											<View>
												<AuthTextInput
													value={address}
													onChangeText={setAddress}
													placeholder="Enter address"
													textContentType="fullStreetAddress"
													editable={!isSaving}
													accessibilityLabel="Address"
												/>
											</View>
										</View>
									</View>
								</View>

								<View className="mt-[54px] w-[152px]">
									<Button
										className="h-12 w-full rounded-md bg-neutral-900"
										disabled={isSaving}
										onPress={() => void saveProfile()}
									>
										<Text className="text-sm font-medium text-white">
											{isSaving ? "Saving…" : "Save Changes"}
										</Text>
									</Button>
								</View>
							</DetailCardBody>
						</DetailCard>
					</View>

					<View className="mt-8">
						<DetailCard>
							<DetailCardHeader>
								<DetailCardTitle>Privacy and Security</DetailCardTitle>
							</DetailCardHeader>

							<DetailCardBody>
								<View className="min-h-16 flex-row items-start justify-between gap-4">
									<View className="min-w-0 flex-1 gap-1">
										<Text className="font-geist-semibold text-sm leading-5 text-[#111827]">
											Marketing communications
										</Text>
										<Text className="font-geist text-sm leading-5 text-[#4B5563]">
											Receive updates about new features, promotions, and travel
											tips.
										</Text>
									</View>
									<ProfileSwitch
										value={marketingConsent}
										onValueChange={setMarketingConsent}
									/>
								</View>

								<View className="mt-3 h-px bg-[#E5E7EB]" />

								<View className="mt-8 gap-8">
									<View className="gap-1">
										<Text className="font-geist-semibold text-sm leading-5 text-[#111827]">
											Delete Tripidly Account?
										</Text>
										<Text className="font-geist text-sm leading-5 text-[#4B5563]">
											Once you delete your account, there is no going back. Your
											profile and identity data will be permanently removed, and
											your booking history will be anonymized for records.
										</Text>
									</View>
									<View className="w-[152px]">
										<Button
											className="h-12 w-full rounded-md bg-neutral-900"
											disabled
										>
											<Text className="text-sm font-medium text-white">
												Delete Account
											</Text>
										</Button>
									</View>
								</View>
							</DetailCardBody>
						</DetailCard>
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
