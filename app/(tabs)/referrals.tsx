import {
  DetailCard,
  DetailCardBody,
  DetailCardHeader,
  DetailCardTitle,
} from "@/components/booking-detail-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { PUBLIC_WEB_ORIGIN } from "@/constants/config";
import { useTabBarVisibility } from "@/context/tab-bar-visibility-context";
import { useAuth } from "@/hooks/use-auth";
import { useReferralSummary } from "@/hooks/use-referrals";
import { formatRateAmount } from "@/lib/currency";
import { getReferralErrorMessage } from "@/services/referrals";
import * as ExpoClipboard from "expo-clipboard";
import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import {
  AlertTriangle,
  CircleDollarSign,
  Clipboard as ClipboardIcon,
  Clock3,
  Coins,
  EyeOff,
  MessageCircle,
  Send,
  TableProperties,
  Users,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CopiedTarget = "code" | "link";

const referralDateFormatter = new Intl.DateTimeFormat("en-NG", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const formatDate = (value: string) =>
  referralDateFormatter.format(new Date(value));

function StatCard({
  label,
  value,
  icon,
}: Readonly<{
  label: string;
  value: string | number;
  icon: ReactNode;
}>) {
  return (
    <View
      className="min-h-[140px] justify-between rounded-lg border border-neutral-200 bg-white p-4 shadow-none"
      style={{
        borderCurve: "continuous",
        flexBasis: "47.5%",
      }}
    >
      <View className="size-8 items-center justify-center rounded-full bg-neutral-100">
        {icon}
      </View>
      <View className="gap-1">
        <Text selectable className="text-xl font-semibold text-neutral-950">
          {value}
        </Text>
        <Text className="text-xs font-medium text-neutral-500">
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function ReferralsScreen() {
  const { isAuthenticated, openLoginModal } = useAuth();
  const { onScroll } = useTabBarVisibility();
  const referralQuery = useReferralSummary(isAuthenticated);
  const [copiedTarget, setCopiedTarget] = useState<CopiedTarget | null>(null);

  const referralSummary = referralQuery.data;
  const shareLink = useMemo(() => {
    if (!referralSummary?.referralCode) return null;
    return `${PUBLIC_WEB_ORIGIN}/r/${encodeURIComponent(referralSummary.referralCode)}`;
  }, [referralSummary?.referralCode]);

  const stats = referralSummary?.stats;
  const statsData = stats
    ? [
        {
          label: "Rewards Earned",
          value: formatRateAmount(stats.totalRewardsGranted),
          icon: <CircleDollarSign size={17} color="#6B7280" strokeWidth={2} />,
        },
        {
          label: "Pending Rewards",
          value: formatRateAmount(stats.totalRewardsPending),
          icon: <Clock3 size={17} color="#6B7280" strokeWidth={2} />,
        },
        {
          label: "Used Credits",
          value: formatRateAmount(stats.totalUsed),
          icon: <Coins size={17} color="#6B7280" strokeWidth={2} />,
        },
        {
          label: "Total Referrals",
          value: stats.totalReferrals,
          icon: <Users size={17} color="#6B7280" strokeWidth={2} />,
        },
      ]
    : [];

  const copyToClipboard = async (value: string, target: CopiedTarget) => {
    await ExpoClipboard.setStringAsync(value);
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget(null), 2000);
  };

  const shareReferralLink = async (provider: "whatsapp" | "telegram") => {
    if (!shareLink) return;
    const text = "Get a discount on your first booking with Tripdly";
    const url =
      provider === "whatsapp"
        ? `https://wa.me/?text=${encodeURIComponent(`${text}: ${shareLink}`)}`
        : `https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent(text)}`;
    await Linking.openURL(url);
  };
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScroll(event.nativeEvent.contentOffset.y);
    },
    [onScroll],
  );

  if (!isAuthenticated) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-neutral-950">
            Sign in to view referrals
          </Text>
          <Text className="mt-2 text-center text-sm text-neutral-500">
            Your referral code, rewards, and booking credits are available once
            you log in.
          </Text>
          <Button
            className="mt-5 w-full max-w-[220px]"
            onPress={openLoginModal}
          >
            <Text className="text-sm font-semibold text-white">Sign In</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  if (referralQuery.isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6B7280" />
          <Text className="mt-2 text-sm text-neutral-500">
            Loading referral program
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (referralQuery.error || !referralSummary) {
    return (
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right", "bottom"]}
      >
        <StatusBar style="dark" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-semibold text-red-700">
            Unable to load referrals
          </Text>
          <Text className="mt-2 text-center text-sm text-red-600">
            {getReferralErrorMessage(referralQuery.error)}
          </Text>
          <Button
            className="mt-5 w-full max-w-[220px]"
            onPress={() => referralQuery.refetch()}
          >
            <Text className="text-sm font-semibold text-white">Retry</Text>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1 bg-white"
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar style="dark" />
      <ScrollView
        className="flex-1"
        contentInsetAdjustmentBehavior="never"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View className="gap-4 p-5 pb-10">
          <View>
            <Text className="text-2xl font-semibold leading-9 text-neutral-950">
              Referral Program
            </Text>
            <Text className="text-sm font-medium text-neutral-950">
              <Text className="text-neutral-500">New to Tripidly? </Text>
              See how it works
            </Text>
          </View>

          {referralSummary.programEnabled ? null : (
            <View
              accessibilityRole="alert"
              className="flex-row items-start gap-3 rounded-md border border-amber-500 bg-amber-50 p-4"
            >
              <AlertTriangle size={16} color="#F59E0B" strokeWidth={2} />
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-base font-medium leading-5 text-amber-600">
                  Referral program temporarily closed
                </Text>
                <Text className="text-sm leading-5 text-amber-600">
                  New referrals cannot be processed at this time.
                </Text>
              </View>
            </View>
          )}

          <DetailCard>
            <DetailCardHeader>
              <DetailCardTitle>Invite friends and Earn</DetailCardTitle>
            </DetailCardHeader>
            <DetailCardBody>
              <View className="gap-6">
                <View className="h-52 overflow-hidden rounded-lg border border-neutral-800 bg-[#111827] p-5">
                  <Text className="text-sm font-medium text-neutral-300">
                    Available Credits
                  </Text>
                  <Text
                    selectable
                    className="mt-1 text-3xl font-semibold leading-9 text-white"
                  >
                    {formatRateAmount(referralSummary.stats.availableCredits)}
                  </Text>
                  <View className="mt-auto flex-row items-end justify-between">
                    <Coins size={74} color="#4B5563" strokeWidth={1.5} />
                    <EyeOff size={18} color="#FFFFFF" strokeWidth={2} />
                  </View>
                </View>

                {referralSummary.referralCode ? (
                  <View className="gap-6">
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-neutral-900">
                        Your Referral Code
                      </Text>
                      <View className="flex-row gap-2">
                        <Input
                          value={referralSummary.referralCode}
                          readOnly
                          selectTextOnFocus
                          className="h-10 min-w-0 flex-1 text-sm shadow-none"
                          accessibilityLabel="Referral code"
                        />
                        <Button
                          className="h-10 px-3.5"
                          onPress={() =>
                            void copyToClipboard(
                              referralSummary.referralCode ?? "",
                              "code",
                            )
                          }
                          accessibilityLabel="Copy referral code"
                        >
                          <ClipboardIcon
                            size={16}
                            color="#FFFFFF"
                            strokeWidth={2}
                          />
                          <Text className="text-sm font-medium text-white">
                            {copiedTarget === "code" ? "Copied!" : "Copy"}
                          </Text>
                        </Button>
                      </View>
                    </View>

                    {shareLink ? (
                      <View className="gap-2">
                        <Text className="text-sm font-semibold text-neutral-900">
                          Your Referral Link
                        </Text>
                        <View className="flex-row gap-2">
                          <Input
                            value={shareLink}
                            readOnly
                            selectTextOnFocus
                            className="h-10 min-w-0 flex-1 text-sm shadow-none"
                            accessibilityLabel="Referral link"
                          />
                          <Button
                            className="h-10 px-3.5"
                            onPress={() =>
                              void copyToClipboard(shareLink, "link")
                            }
                            accessibilityLabel="Copy referral link"
                          >
                            <ClipboardIcon
                              size={16}
                              color="#FFFFFF"
                              strokeWidth={2}
                            />
                            <Text className="text-sm font-medium text-white">
                              {copiedTarget === "link" ? "Copied!" : "Copy"}
                            </Text>
                          </Button>
                        </View>
                        <View className="flex-row items-center gap-2.5">
                          <Text className="text-xs font-semibold text-neutral-500">
                            SHARE VIA:
                          </Text>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Share referral link on WhatsApp"
                            className="flex-row items-center gap-1 rounded-xl border border-neutral-300 px-2 py-1"
                            onPress={() => void shareReferralLink("whatsapp")}
                          >
                            <MessageCircle
                              size={16}
                              color="#22C55E"
                              strokeWidth={2}
                            />
                            <Text className="text-xs text-neutral-950">
                              WhatsApp
                            </Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Share referral link on Telegram"
                            className="flex-row items-center gap-1 rounded-xl border border-neutral-300 px-2 py-1"
                            onPress={() => void shareReferralLink("telegram")}
                          >
                            <Send size={16} color="#229ED9" strokeWidth={2} />
                            <Text className="text-xs text-neutral-950">
                              Telegram
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text className="text-sm text-neutral-500">
                    Your referral code is being generated. Please refresh the
                    page.
                  </Text>
                )}
              </View>
            </DetailCardBody>
          </DetailCard>

          <View className="flex-row flex-wrap gap-3">
            {statsData.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                icon={stat.icon}
              />
            ))}
          </View>

          <DetailCard>
            <DetailCardHeader>
              <DetailCardTitle>Your Referral History</DetailCardTitle>
            </DetailCardHeader>
            <DetailCardBody>
              {referralSummary.referrals.length === 0 ? (
                <View className="min-h-[360px] items-center justify-center px-2">
                  <TableProperties size={56} color="#6B7280" strokeWidth={1.5} />
                  <Text className="mt-4 text-base font-semibold text-neutral-900">
                    No referral history
                  </Text>
                  <Text className="mt-1 max-w-[290px] text-center text-sm leading-5 text-neutral-600">
                    Your referral history will appear here. You can share your
                    referral link to get started
                  </Text>
                </View>
              ) : (
                <View>
                  {referralSummary.referrals.map((referral, index) => (
                    <View
                      key={referral.id}
                      className={[
                        "flex-row items-center justify-between gap-3 py-4",
                        index < referralSummary.referrals.length - 1
                          ? "border-b border-neutral-200"
                          : "",
                      ].join(" ")}
                    >
                      <View className="min-w-0 flex-1">
                        <Text
                          selectable
                          numberOfLines={1}
                          className="text-sm font-semibold text-neutral-900"
                        >
                          {referral.name || referral.email}
                        </Text>
                        <Text
                          selectable
                          numberOfLines={1}
                          className="mt-1 text-xs text-neutral-500"
                        >
                          {referral.email}
                        </Text>
                      </View>
                      <Text className="text-xs text-neutral-500">
                        {formatDate(referral.createdAt)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </DetailCardBody>
          </DetailCard>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
