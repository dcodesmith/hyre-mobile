import { API_ENDPOINTS } from "@/constants/config";
import { deleteJsonWithAuth, postJsonWithAuth } from "@/lib/api-client";

export type PushPlatform = "ios" | "android";

type PushTokenResponse = {
  success: true;
};

export const registerPushToken = async (
  token: string,
  platform: PushPlatform,
): Promise<PushTokenResponse> => {
  return postJsonWithAuth<
    PushTokenResponse,
    { token: string; platform: PushPlatform }
  >(API_ENDPOINTS.pushTokens, { token, platform });
};

export const revokePushToken = async (
  token: string,
): Promise<PushTokenResponse> => {
  return deleteJsonWithAuth<PushTokenResponse>(API_ENDPOINTS.pushTokens, {
    body: JSON.stringify({ token }),
  });
};
