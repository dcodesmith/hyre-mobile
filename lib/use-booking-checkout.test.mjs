import assert from "node:assert/strict";
import { mock, test } from "node:test";

class ApiError extends Error {
  constructor(message, { status = 422, code, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

const routerPushCalls = [];
const postJsonWithAuthCalls = [];
let postJsonWithAuthImpl = async () => {
  throw new Error("unexpected postJsonWithAuth");
};

mock.module("react", {
  namedExports: {
    useCallback: (callback) => callback,
    useEffect: () => undefined,
    useRef: (initialValue) => ({ current: initialValue }),
    useState: (initialValue) => [
      typeof initialValue === "function" ? initialValue() : initialValue,
      () => undefined,
    ],
  },
});

mock.module("@tanstack/react-query", {
  namedExports: {
    useQueryClient: () => ({
      invalidateQueries: async () => undefined,
    }),
  },
});

mock.module("expo-crypto", {
  namedExports: {
    randomUUID: () => "018f47a2-7b3c-7d4e-8f90-1234567894a1",
  },
});

mock.module("expo-linking", {
  namedExports: {
    createURL: () => "hyre://payment-status",
  },
});

mock.module("expo-router", {
  namedExports: {
    useRouter: () => ({
      push: (route) => routerPushCalls.push(route),
    }),
  },
});

mock.module("expo-web-browser", {
  namedExports: {
    openAuthSessionAsync: async () => {
      throw new Error("unexpected openAuthSessionAsync");
    },
  },
});

mock.module("@/lib/api-client", {
  namedExports: {
    ApiError,
    getJson: async () => {
      throw new Error("unexpected getJson");
    },
    getJsonWithAuth: async () => {
      throw new Error("unexpected getJsonWithAuth");
    },
    postJson: async () => {
      throw new Error("unexpected postJson");
    },
    postJsonWithAuth: (...args) => {
      postJsonWithAuthCalls.push(args);
      return postJsonWithAuthImpl(...args);
    },
  },
});

mock.module("@/lib/telemetry", {
  namedExports: {
    recordBookingCheckoutStep: () => undefined,
    reportHandledException: () => undefined,
    reportUnexpectedState: () => undefined,
  },
});

mock.module("@/storage/payment-status-token", {
  namedExports: {
    savePaymentStatusToken: async () => undefined,
  },
});

const { useBookingCheckout } = await import("../hooks/use-booking-checkout.ts");

test("authenticated checkout navigates to phone verification when the API requires it", async () => {
  routerPushCalls.length = 0;
  postJsonWithAuthImpl = async () => {
    throw new ApiError("Verify your phone number before creating a booking", {
      code: "BOOKING_PHONE_VERIFICATION_REQUIRED",
    });
  };

  const checkout = useBookingCheckout({
    carId: "car-1",
    isAuthenticated: true,
    requiresFullTank: false,
    useCredits: 0,
    addonIds: [],
    authoritativeTotal: 150_000,
    validate: async () => true,
    getBookingValues: () => ({
      bookingType: "DAY",
      from: new Date("2026-10-05T00:00:00.000Z"),
      to: new Date("2026-10-05T00:00:00.000Z"),
      pickupAddress: "Victoria Island",
      sameLocation: true,
      pickupTime: "9:00 AM",
    }),
    getGuestValues: () => ({
      name: "",
      email: "",
      phoneNumber: "",
    }),
    onPriceChanged: () => undefined,
  });

  await checkout.submit();

  assert.deepEqual(routerPushCalls, [
    {
      pathname: "/phone-verification",
      params: { resumePrevious: "true", reason: "booking" },
    },
  ]);
});

test("authenticated checkout copies searchId onto the booking payload", async () => {
  routerPushCalls.length = 0;
  postJsonWithAuthCalls.length = 0;
  postJsonWithAuthImpl = async () => {
    throw new ApiError("Verify your phone number before creating a booking", {
      code: "BOOKING_PHONE_VERIFICATION_REQUIRED",
    });
  };

  const searchId = "01994a1d-4263-7000-8000-000000000010";
  const checkout = useBookingCheckout({
    carId: "car-1",
    searchId,
    isAuthenticated: true,
    requiresFullTank: false,
    useCredits: 0,
    addonIds: [],
    authoritativeTotal: 150_000,
    validate: async () => true,
    getBookingValues: () => ({
      bookingType: "DAY",
      from: new Date("2026-10-05T00:00:00.000Z"),
      to: new Date("2026-10-05T00:00:00.000Z"),
      pickupAddress: "Victoria Island",
      sameLocation: true,
      pickupTime: "9:00 AM",
    }),
    getGuestValues: () => ({
      name: "",
      email: "",
      phoneNumber: "",
    }),
    onPriceChanged: () => undefined,
  });

  await checkout.submit();

  assert.equal(postJsonWithAuthCalls[0][1].searchId, searchId);
});
