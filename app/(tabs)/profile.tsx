import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text as FieldText, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
	DetailCard,
	DetailCardBody,
	DetailCardHeader,
	DetailCardTitle,
} from "@/components/booking-detail-card";
import { BookingPhoneVerification } from "@/components/car-detail/BookingPhoneVerification";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { useAuth } from "@/hooks/use-auth";
import { useBookingPhoneVerification } from "@/hooks/use-booking-phone-verification";
import {
	deleteCurrentUserAccount,
	getAuthErrorMessage,
	updateCurrentUser,
} from "@/services/auth";

const emptyToNull = (value: string) => value.trim() || null;

/** Same field classes the booking card passes to `Input`. */
const bookingFieldClassName =
	"h-11 text-sm border-neutral-200 bg-white shadow-none";
const bookingFieldLabelClassName = "text-sm font-semibold text-gray-900";

function ProfileSwitch({
	disabled,
	onValueChange,
	value,
}: Readonly<{
	disabled?: boolean;
	onValueChange: (nextValue: boolean) => void;
	value: boolean;
}>) {
	return (
		<Pressable
			accessibilityLabel="Marketing communications"
			accessibilityRole="switch"
			accessibilityState={{ checked: value, disabled }}
			className={`h-6 w-11 rounded-full ${value ? "bg-[#111827]" : "bg-[#E5E7EB]"}`}
			disabled={disabled}
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
	const { user } = useAuth();
	return <ProfileContent key={user?.id ?? "profile"} />;
}

function ProfileContent() {
	const { isLoggingOut, logout, refreshUser, user } = useAuth();
	const edited = useRef({
		address: false,
		city: false,
		marketingConsent: false,
		name: false,
	});
	const [name, setName] = useState(user?.name ?? "");
	const [city, setCity] = useState(user?.city ?? "");
	const [address, setAddress] = useState(user?.address ?? "");
	const [marketingConsent, setMarketingConsent] = useState(
		user?.marketingConsent ?? false,
	);
	const [isSaving, setIsSaving] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const phone = useBookingPhoneVerification({
		isAuthenticated: true,
		identityKey: user?.id ?? "profile",
		initialPhoneNumber: user?.phoneNumber ?? "",
		initiallyVerified: user?.phoneVerified === true,
		onVerified: refreshUser,
	});

	useEffect(() => {
		if (!edited.current.name) setName(user?.name ?? "");
		if (!edited.current.city) setCity(user?.city ?? "");
		if (!edited.current.address) setAddress(user?.address ?? "");
		if (!edited.current.marketingConsent) {
			setMarketingConsent(user?.marketingConsent ?? false);
		}
	}, [user]);

	const saveProfile = async () => {
		setIsSaving(true);
		try {
			const profile = await updateCurrentUser({
				name: emptyToNull(name),
				city: emptyToNull(city),
				address: emptyToNull(address),
				marketingConsent,
			});
			edited.current = {
				address: false,
				city: false,
				marketingConsent: false,
				name: false,
			};
			setName(profile.name ?? "");
			setCity(profile.city ?? "");
			setAddress(profile.address ?? "");
			setMarketingConsent(profile.marketingConsent);
			await refreshUser();
			Alert.alert("Profile updated", "Your changes have been saved.");
		} catch (error) {
			Alert.alert("Could not save changes", getAuthErrorMessage(error));
		} finally {
			setIsSaving(false);
		}
	};

	const deleteAccount = async () => {
		setIsDeleting(true);
		try {
			const deletion = await deleteCurrentUserAccount();
			if (!deletion.success) {
				throw new Error("Account deletion was not confirmed.");
			}
			await logout();
		} catch (error) {
			Alert.alert(
				"Could not delete account",
				getAuthErrorMessage(
					error,
					"Failed to delete account. Please try again.",
				),
			);
		} finally {
			setIsDeleting(false);
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
								<View className="gap-5">
									<View className="gap-2">
										<FieldText className={bookingFieldLabelClassName}>
											Name
										</FieldText>
										<Input
											value={name}
											onChangeText={(value) => {
												edited.current.name = true;
												setName(value);
											}}
											placeholder="Enter name"
											textContentType="name"
											autoComplete="name"
											editable={!isSaving}
											accessibilityLabel="Name"
											className={bookingFieldClassName}
										/>
									</View>
									<View className="gap-2">
										<FieldText
											className={`${bookingFieldLabelClassName} opacity-50`}
										>
											Email
										</FieldText>
										<Input
											value={user?.email ?? ""}
											editable={false}
											inputMode="email"
											autoComplete="email"
											accessibilityLabel="Email"
											className={bookingFieldClassName}
										/>
									</View>

									<BookingPhoneVerification
										allowChange
										className="mt-0"
										phone={phone}
									/>

									<View className="gap-2">
										<FieldText className={bookingFieldLabelClassName}>
											City
										</FieldText>
										<Input
											value={city}
											onChangeText={(value) => {
												edited.current.city = true;
												setCity(value);
											}}
											placeholder="Enter city"
											textContentType="addressCity"
											editable={!isSaving}
											accessibilityLabel="City"
											className={bookingFieldClassName}
										/>
									</View>
									<View className="gap-2">
										<FieldText className={bookingFieldLabelClassName}>
											Address
										</FieldText>
										<Input
											value={address}
											onChangeText={(value) => {
												edited.current.address = true;
												setAddress(value);
											}}
											placeholder="Enter address"
											textContentType="fullStreetAddress"
											editable={!isSaving}
											accessibilityLabel="Address"
											className={bookingFieldClassName}
										/>
									</View>
								</View>

								<View className="mt-6 w-[152px]">
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
								<View className="min-h-16 flex-row items-start justify-between gap-8">
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
										disabled={isSaving}
										value={marketingConsent}
										onValueChange={(value) => {
											edited.current.marketingConsent = true;
											setMarketingConsent(value);
										}}
									/>
								</View>

								<View className="mt-3 h-px bg-[#E5E7EB]" />

								<View className="mt-8 gap-5">
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
											className="h-12 w-full rounded-md bg-destructive/10 shadow-none active:bg-destructive/20"
											onPress={() => setIsDeleteDialogOpen(true)}
										>
											<Text className="text-sm font-medium text-destructive">
												Delete Account
											</Text>
										</Button>
									</View>
								</View>
							</DetailCardBody>
						</DetailCard>
					</View>

					<Button
						variant="link"
						className="mt-8 self-start px-0"
						disabled={isLoggingOut}
						onPress={() => void logout()}
						accessibilityLabel="Logout"
					>
						<Text>{isLoggingOut ? "Logging out…" : "Logout"}</Text>
					</Button>
				</View>
			</ScrollView>

			<Dialog
				open={isDeleteDialogOpen}
				onOpenChange={(open) => {
					if (!isDeleting) setIsDeleteDialogOpen(open);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Are you absolutely sure?</DialogTitle>
						<DialogDescription>
							This action cannot be undone. This will permanently delete your
							account, including your profile, bank details, and identity
							documents. Your booking history will be anonymized for our
							records.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							variant="outline"
							disabled={isDeleting}
							onPress={() => setIsDeleteDialogOpen(false)}
						>
							<Text>Cancel</Text>
						</Button>
						<Button
							variant="destructive"
							disabled={isDeleting}
							onPress={() => void deleteAccount()}
						>
							<Text className="text-white">
								{isDeleting ? "Deleting…" : "Delete Account"}
							</Text>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</SafeAreaView>
	);
}
