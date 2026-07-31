import { API_ENDPOINTS } from "@/constants/config";
import { ApiError, getJsonWithAuth } from "@/lib/api-client";

export type ReferralStats = {
  totalReferrals: number;
  totalRewardsGranted: number;
  totalRewardsPending: number;
  lastReferralAt: string | null;
  totalEarned: number;
  totalUsed: number;
  availableCredits: number;
  maxCreditsPerBooking: number;
};

export type ReferralUser = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
};

export type ReferralReward = {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  processedAt: string | null;
  refereeName: string;
};

export type ReferralSummary = {
  referralCode: string | null;
  shareLink: string | null;
  programEnabled: boolean;
  discountAmount: number;
  hasUsedDiscount: boolean;
  referredBy: string | null;
  signupDate: string | null;
  stats: ReferralStats;
  referrals: ReferralUser[];
  rewards: ReferralReward[];
};

export async function fetchReferralSummary(
  init?: RequestInit,
): Promise<ReferralSummary> {
  return getJsonWithAuth<ReferralSummary>(API_ENDPOINTS.referralsUser, init);
}

export const getReferralErrorMessage = (
  error: unknown,
  fallback = "Unable to load referral details. Please try again.",
): string => {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};
