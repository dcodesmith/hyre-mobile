export const PUSH_REGISTRATION_VERSION = 1 as const;

export type PushPlatform = "ios" | "android";

export type PushRegistrationStatus =
  | "pending-registration"
  | "registered"
  | "pending-revocation";

export type PushRegistrationState = {
  version: typeof PUSH_REGISTRATION_VERSION;
  token: string;
  platform: PushPlatform;
  ownerUserId: string | null;
  status: PushRegistrationStatus;
  staleTokens: string[];
};

type StagePushRegistrationInput = {
  token: string;
  platform: PushPlatform;
  userId: string;
};

const uniqueTokens = (tokens: string[], currentToken: string): string[] =>
  [...new Set(tokens)].filter(
    (token) => token.length > 0 && token !== currentToken,
  );

export const stagePushRegistration = (
  current: PushRegistrationState | null,
  input: StagePushRegistrationInput,
): PushRegistrationState => {
  const staleTokens =
    current && current.token !== input.token
      ? [current.token, ...current.staleTokens]
      : (current?.staleTokens ?? []);

  return {
    version: PUSH_REGISTRATION_VERSION,
    token: input.token,
    platform: input.platform,
    ownerUserId: input.userId,
    status: "pending-registration",
    staleTokens: uniqueTokens(staleTokens, input.token),
  };
};

export const markPushRegistrationSucceeded = (
  state: PushRegistrationState,
  userId: string,
): PushRegistrationState => ({
  ...state,
  ownerUserId: userId,
  status: "registered",
  staleTokens: uniqueTokens(state.staleTokens, state.token),
});

export const markPushRegistrationPendingRevocation = (
  state: PushRegistrationState,
): PushRegistrationState => ({
  ...state,
  status: "pending-revocation",
});

export const markStalePushTokenRevoked = (
  state: PushRegistrationState,
  token: string,
): PushRegistrationState => ({
  ...state,
  staleTokens: state.staleTokens.filter(
    (staleToken) => staleToken !== token,
  ),
});

export const getPushTokensToRevoke = (
  state: PushRegistrationState,
): string[] => [...new Set([state.token, ...state.staleTokens])];

export const parsePushRegistrationState = (
  value: unknown,
): PushRegistrationState | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const status = candidate.status;
  const platform = candidate.platform;
  const staleTokens = candidate.staleTokens;

  if (
    candidate.version !== PUSH_REGISTRATION_VERSION ||
    typeof candidate.token !== "string" ||
    candidate.token.length === 0 ||
    (platform !== "ios" && platform !== "android") ||
    (status !== "pending-registration" &&
      status !== "registered" &&
      status !== "pending-revocation") ||
    !(
      candidate.ownerUserId === null ||
      typeof candidate.ownerUserId === "string"
    ) ||
    !Array.isArray(staleTokens) ||
    !staleTokens.every((token) => typeof token === "string")
  ) {
    return null;
  }

  return {
    version: PUSH_REGISTRATION_VERSION,
    token: candidate.token,
    platform,
    ownerUserId: candidate.ownerUserId,
    status,
    staleTokens: uniqueTokens(staleTokens, candidate.token),
  };
};

export const getNotificationResponseDisposition = ({
  isAuthenticated,
  isHydrating,
}: {
  isAuthenticated: boolean;
  isHydrating: boolean;
}): "handle" | "queue" =>
  !isHydrating && isAuthenticated ? "handle" : "queue";
