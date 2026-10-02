export type AuthenticatedUser = {
  id: string;
  email: string;
  name?: string | null;
  roles?: string[];
  [key: string]: unknown;
};

type AuthSessionResponse = {
  token?: unknown;
  user?: unknown;
};

const isAuthenticatedUser = (value: unknown): value is AuthenticatedUser => {
  if (typeof value !== "object" || value === null) return false;
  const user = value as Record<string, unknown>;
  return (
    typeof user.id === "string" &&
    user.id.length > 0 &&
    typeof user.email === "string" &&
    user.email.length > 0
  );
};

export function requireAuthenticatedUser(value: unknown): AuthenticatedUser {
  if (!isAuthenticatedUser(value)) {
    throw new Error("The server did not return a valid user profile.");
  }
  return value;
}

export async function resolveAuthenticatedSession(
  response: AuthSessionResponse,
  fetchUser: (token: string) => Promise<unknown>,
): Promise<{ token: string; user: AuthenticatedUser }> {
  if (typeof response.token !== "string" || !response.token) {
    throw new Error("The server did not return a valid access token.");
  }

  const user = isAuthenticatedUser(response.user)
    ? response.user
    : await fetchUser(response.token);

  return { token: response.token, user: requireAuthenticatedUser(user) };
}
