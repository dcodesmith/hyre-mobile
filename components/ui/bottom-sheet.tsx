import { cn } from "@/lib/utils";
import * as DialogPrimitive from "@rn-primitives/dialog";
import * as React from "react";
import { Platform, View } from "react-native";
import { SlideInDown, SlideOutDown } from "react-native-reanimated";
import { NativeOnlyAnimatedView } from "@/components/ui/native-only-animated-view";
import { FullWindowOverlay as RNFullWindowOverlay } from "react-native-screens";

const BottomSheet = DialogPrimitive.Root;

const BottomSheetTrigger = DialogPrimitive.Trigger;

const BottomSheetPortal = DialogPrimitive.Portal;

const BottomSheetClose = DialogPrimitive.Close;

const FullWindowOverlay =
	Platform.OS === "ios" ? RNFullWindowOverlay : React.Fragment;

function BottomSheetOverlay({
	className,
	children,
	...props
}: Omit<DialogPrimitive.OverlayProps, "asChild"> &
	React.RefAttributes<DialogPrimitive.OverlayRef> & {
		children?: React.ReactNode;
	}) {
	return (
		<FullWindowOverlay>
			<DialogPrimitive.Overlay
				className={cn(
					"absolute inset-0 z-50 flex items-end justify-center bg-black/50",
					Platform.select({
						web: "animate-in fade-in-0 fixed cursor-default",
					}),
					className,
				)}
				{...props}
				asChild={Platform.OS !== "web"}
			>
				<NativeOnlyAnimatedView
					entering={SlideInDown.duration(250)}
					exiting={SlideOutDown.duration(200)}
				>
					{children}
				</NativeOnlyAnimatedView>
			</DialogPrimitive.Overlay>
		</FullWindowOverlay>
	);
}

function BottomSheetContent({
	className,
	portalHost,
	children,
	...props
}: DialogPrimitive.ContentProps &
	React.RefAttributes<DialogPrimitive.ContentRef> & {
		portalHost?: string;
	}) {
	return (
		<BottomSheetPortal hostName={portalHost}>
			<BottomSheetOverlay>
				<DialogPrimitive.Content
					className={cn(
						"bg-background z-50 w-full h-full flex flex-col items-center justify-center rounded-t-3xl p-6 pb-8 shadow-lg shadow-foreground/10",
						Platform.select({
							web: "animate-in slide-in-from-bottom duration-250",
						}),
						className,
					)}
					{...props}
				>
					<View className="w-full max-w-md">
						{children}
					</View>
				</DialogPrimitive.Content>
			</BottomSheetOverlay>
		</BottomSheetPortal>
	);
}

function BottomSheetHeader({ className, ...props }: React.ComponentProps<typeof View>) {
	return (
		<View
			className={cn("flex flex-col gap-2", className)}
			{...props}
		/>
	);
}

function BottomSheetFooter({ className, ...props }: React.ComponentProps<typeof View>) {
	return (
		<View
			className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-auto", className)}
			{...props}
		/>
	);
}

function BottomSheetTitle({
	className,
	...props
}: DialogPrimitive.TitleProps & React.RefAttributes<DialogPrimitive.TitleRef>) {
	return (
		<DialogPrimitive.Title
			className={cn("text-foreground text-2xl font-semibold leading-none", className)}
			{...props}
		/>
	);
}

function BottomSheetDescription({
	className,
	...props
}: DialogPrimitive.DescriptionProps &
	React.RefAttributes<DialogPrimitive.DescriptionRef>) {
	return (
		<DialogPrimitive.Description
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	BottomSheet,
	BottomSheetClose,
	BottomSheetContent,
	BottomSheetDescription,
	BottomSheetFooter,
	BottomSheetHeader,
	BottomSheetOverlay,
	BottomSheetPortal,
	BottomSheetTitle,
	BottomSheetTrigger,
};

