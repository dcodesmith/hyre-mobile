import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { TRUSTED_REQUEST_ORIGIN } from "@/constants/config";
import { useTabBarVisibility } from "@/context/tab-bar-visibility-context";
import { useAuth } from "@/hooks/use-auth";
import { useReferralSummary } from "@/hooks/use-referrals";
import { formatCurrency } from "@/lib/currency";
import {
  getReferralErrorMessage,
  type ReferralReward,
} from "@/services/referrals";
import * as ExpoClipboard from "expo-clipboard";
import { StatusBar } from "expo-status-bar";
import {
  AlertTriangle,
  Clipboard as ClipboardIcon,
  Gift,
  Share2,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  Share,
  TextInput,
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

const getRewardStatusClassName = (status: string) => {
  switch (status) {
    case "RELEASED":
      return "bg-green-100 text-green-700";
    case "PENDING":
      return "bg-orange-100 text-orange-700";
    case "REVERSED":
      return "bg-red-100 text-red-700";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
};

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
      className="rounded border border-neutral-200 bg-white p-4"
      style={{
        borderCurve: "continuous",
        flexBasis: "48%",
        boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
      }}
    >
      <View className="mb-3 size-9 items-center justify-center rounded-full bg-neutral-100">
        {icon}
      </View>
      <Text selectable className="text-xl font-bold text-neutral-950">
        {value}
      </Text>
      <Text className="mt-1 text-xs font-medium text-neutral-500">{label}</Text>
    </View>
  );
}

function RewardRow({ reward }: Readonly<{ reward: ReferralReward }>) {
  return (
    <View className="flex-row items-center justify-between rounded border border-neutral-200 p-3">
      <View className="flex-1 pr-3">
        <Text selectable className="text-base font-semibold text-neutral-950">
          {formatCurrency(reward.amount, { fractionDigits: 0 })}
        </Text>
        <Text selectable className="mt-0.5 text-sm text-neutral-500">
          From {reward.refereeName}
        </Text>
      </View>

      <View className="items-end">
        <Text
          className={[
            "overflow-hidden rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
            getRewardStatusClassName(reward.status),
          ].join(" ")}
        >
          {reward.status.toLowerCase()}
        </Text>
        <Text className="mt-1 text-xs text-neutral-500">
          {formatDate(reward.createdAt)}
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
    return `${TRUSTED_REQUEST_ORIGIN}/auth?ref=${referralSummary.referralCode}`;
  }, [referralSummary?.referralCode]);

  const stats = referralSummary?.stats;
  const statsData = stats
    ? [
        {
          label: "Total Referrals",
          value: stats.totalReferrals,
          icon: <Users size={18} color="#3B82F6" strokeWidth={2} />,
        },
        {
          label: "Rewards Earned",
          value: formatCurrency(stats.totalRewardsGranted, {
            fractionDigits: 0,
          }),
          icon: <Gift size={18} color="#22C55E" strokeWidth={2} />,
        },
        {
          label: "Pending Rewards",
          value: formatCurrency(stats.totalRewardsPending, {
            fractionDigits: 0,
          }),
          icon: <Sparkles size={18} color="#F97316" strokeWidth={2} />,
        },
        {
          label: "Used Credits",
          value: formatCurrency(stats.totalUsed, { fractionDigits: 0 }),
          icon: <Wallet size={18} color="#EF4444" strokeWidth={2} />,
        },
        {
          label: "Available Credits",
          value: formatCurrency(stats.availableCredits, { fractionDigits: 0 }),
          icon: <Wallet size={18} color="#8B5CF6" strokeWidth={2} />,
        },
      ]
    : [];

  const copyToClipboard = async (value: string, target: CopiedTarget) => {
    await ExpoClipboard.setStringAsync(value);
    setCopiedTarget(target);
    setTimeout(() => setCopiedTarget(null), 2000);
  };

  const shareReferralLink = async () => {
    if (!shareLink) return;
    await Share.share({
      title: "Join HireApp with my referral code",
      message: `Get a discount on your first booking with Tripdly: ${shareLink}`,
      url: shareLink,
    });
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
        <View className="gap-6 p-4">
          <View>
            <Text className="text-3xl font-bold text-neutral-950">
              Referral Program
            </Text>
            <Text className="mt-2 text-base text-neutral-500">
              Invite friends and earn rewards when they book their first trip!
            </Text>
          </View>

          {referralSummary.programEnabled ? null : (
            <View className="rounded border border-yellow-200 bg-yellow-50 p-4">
              <View className="flex-row items-center gap-2">
                <AlertTriangle size={18} color="#854D0E" strokeWidth={2} />
                <Text className="font-semibold text-yellow-800">
                  Referral Program Temporarily Disabled
                </Text>
              </View>
              <Text className="mt-1 text-sm text-yellow-700">
                New referrals cannot be processed at this time.
              </Text>
            </View>
          )}

          <View
            className="rounded border border-neutral-200 bg-white"
            style={{
              borderCurve: "continuous",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
          >
            <View className="border-b border-neutral-100 px-5 py-4">
              <View className="flex-row items-center gap-2">
                <Gift size={20} color="#171717" strokeWidth={2} />
                <Text className="text-lg font-semibold text-neutral-950">
                  Your Referral Code
                </Text>
              </View>
            </View>

            <View className="gap-4 p-5">
              {referralSummary.referralCode ? (
                <>
                  <View className="flex-row items-center justify-between gap-3 rounded bg-neutral-100 p-4">
                    <Text
                      selectable
                      className="flex-1 font-mono text-lg font-bold tracking-wider text-neutral-950"
                    >
                      {referralSummary.referralCode}
                    </Text>
                    <Button
                      variant="outline"
                      size="sm"
                      onPress={() =>
                        void copyToClipboard(
                          referralSummary.referralCode ?? "",
                          "code",
                        )
                      }
                    >
                      <ClipboardIcon
                        size={16}
                        color="#171717"
                        strokeWidth={2}
                      />
                      <Text className="text-sm font-semibold">
                        {copiedTarget === "code" ? "Copied!" : "Copy"}
                      </Text>
                    </Button>
                  </View>

                  {shareLink ? (
                    <View className="gap-2">
                      <Text className="text-sm font-semibold text-neutral-800">
                        Share Link:
                      </Text>
                      <View className="flex-row gap-2">
                        <TextInput
                          value={shareLink}
                          editable={false}
                          multiline={false}
                          scrollEnabled={false}
                          caretHidden
                          underlineColorAndroid="transparent"
                          className="h-10 min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-3 py-1 text-sm leading-5 text-neutral-700"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onPress={() =>
                            void copyToClipboard(shareLink, "link")
                          }
                          accessibilityLabel="Copy referral link"
                        >
                          <ClipboardIcon
                            size={16}
                            color="#171717"
                            strokeWidth={2}
                          />
                        </Button>
                        <Button
                          size="icon"
                          onPress={() => void shareReferralLink()}
                          accessibilityLabel="Share referral link"
                        >
                          <Share2 size={16} color="#FFFFFF" strokeWidth={2} />
                        </Button>
                      </View>
                      {copiedTarget === "link" ? (
                        <Text className="text-xs font-medium text-green-700">
                          Referral link copied to clipboard.
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </>
              ) : (
                <Text className="text-sm text-neutral-500">
                  Your referral code is being generated. Please refresh the
                  page.
                </Text>
              )}
            </View>
          </View>

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

          {referralSummary.rewards.length > 0 ? (
            <View
              className="rounded border border-neutral-200 bg-white"
              style={{
                borderCurve: "continuous",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              <View className="border-b border-neutral-100 px-5 py-4">
                <Text className="text-lg font-semibold text-neutral-950">
                  Recent Rewards
                </Text>
              </View>
              <View className="gap-3 p-5">
                {referralSummary.rewards.slice(0, 5).map((reward) => (
                  <RewardRow key={reward.id} reward={reward} />
                ))}
              </View>
            </View>
          ) : null}

          {referralSummary.referrals.length > 0 ? (
            <View
              className="rounded border border-neutral-200 bg-white"
              style={{
                borderCurve: "continuous",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
              }}
            >
              <View className="border-b border-neutral-100 px-5 py-4">
                <Text className="text-lg font-semibold text-neutral-950">
                  Your Referrals
                </Text>
              </View>
              <View className="gap-3 p-5">
                {referralSummary.referrals.map((referral) => (
                  <View
                    key={referral.id}
                    className="rounded border border-neutral-200 p-3"
                  >
                    <Text
                      selectable
                      className="text-base font-semibold text-neutral-950"
                    >
                      {referral.name || referral.email}
                    </Text>
                    <Text
                      selectable
                      className="mt-0.5 text-sm text-neutral-500"
                    >
                      {referral.email}
                    </Text>
                    <Text className="mt-2 text-xs text-neutral-500">
                      Joined {formatDate(referral.createdAt)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View
            className="rounded border border-neutral-200 bg-white"
            style={{
              borderCurve: "continuous",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
          >
            <View className="border-b border-neutral-100 px-5 py-4">
              <Text className="text-lg font-semibold text-neutral-950">
                How it works
              </Text>
            </View>
            <View className="gap-4 p-5">
              {[
                {
                  title: "Share your code",
                  body: "Send your referral code or link to friends",
                },
                {
                  title: "They sign up",
                  body: "Friends create an account using your code",
                },
                {
                  title: "Both get rewards",
                  body: `They get ${formatCurrency(referralSummary.discountAmount, { fractionDigits: 0 })} discount, you earn ${formatCurrency(referralSummary.discountAmount, { fractionDigits: 0 })} reward`,
                },
              ].map((step, index) => (
                <View key={step.title} className="items-center rounded p-2">
                  <View className="size-8 items-center justify-center rounded-full bg-neutral-950">
                    <Text className="text-sm font-bold text-white">
                      {index + 1}
                    </Text>
                  </View>
                  <Text className="mt-2 text-center font-semibold text-neutral-950">
                    {step.title}
                  </Text>
                  <Text className="mt-1 text-center text-sm text-neutral-500">
                    {step.body}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
