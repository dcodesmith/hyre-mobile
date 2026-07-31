import airlinesData from "@/data/airlines.json";

export type Airline = {
  id: string;
  name: string;
  alias: string;
  iata: string;
  icao: string;
  callsign: string;
  country: string;
  active: string;
  fliestoNigeria?: boolean;
};

const ACTIVE_AIRLINES = (airlinesData as Airline[]).filter(
  (airline) =>
    airline.active === "Y" &&
    airline.iata &&
    airline.iata !== "" &&
    airline.iata !== "-" &&
    airline.iata !== String.raw`\N` &&
    airline.iata.length >= 2,
);

export function getActiveAirlines(options?: {
  nigeriaOnly?: boolean;
}): Airline[] {
  if (!options?.nigeriaOnly) return ACTIVE_AIRLINES;
  return ACTIVE_AIRLINES.filter((airline) => airline.fliestoNigeria === true);
}

/**
 * Filter airlines by query. Matches IATA (2-char), ICAO (3-letter), or name.
 */
export function filterAirlines(
  query: string,
  options?: { nigeriaOnly?: boolean; limit?: number },
): Airline[] {
  if (!query || query.length < 2) return [];

  const normalizedQuery = query.toLowerCase().trim();
  const match2 = /^([a-z0-9]{2})(\d*)$/i.exec(normalizedQuery);
  const match3 = /^([a-z0-9]{3})(\d*)$/i.exec(normalizedQuery);

  let airlineCode: string | null = null;
  if (match2?.[1]) {
    airlineCode = match2[1].toUpperCase();
  } else if (match3?.[1]) {
    airlineCode = match3[1].toUpperCase();
  }

  const isICAOCode =
    airlineCode?.length === 3 && /^[A-Z]{3}$/.test(airlineCode);
  const airlines = getActiveAirlines(options);
  const limit = options?.limit ?? 10;

  return airlines
    .filter((airline) => {
      if (
        airlineCode &&
        !isICAOCode &&
        airline.iata.toUpperCase() === airlineCode
      ) {
        return true;
      }
      if (
        airlineCode &&
        isICAOCode &&
        airline.icao?.toUpperCase() === airlineCode
      ) {
        return true;
      }
      if (airline.name.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      if (airline.iata.toLowerCase() === normalizedQuery) {
        return true;
      }
      return false;
    })
    .slice(0, limit);
}

/** Digits after the airline IATA/ICAO in the query (e.g. "BA75" → "75"). */
export function extractFlightDigits(query: string, airline: Airline): string {
  const normalizedQuery = query.toUpperCase().replaceAll(/\s+/g, "");
  const airlineIATA = airline.iata.toUpperCase();
  const airlineICAO = airline.icao?.toUpperCase() || "";

  if (normalizedQuery === airlineIATA || normalizedQuery === airlineICAO) {
    return "";
  }

  const iataMatch = new RegExp(String.raw`^${airlineIATA}(\d+)$`).exec(
    normalizedQuery,
  );
  if (iataMatch?.[1]) return iataMatch[1];

  if (airlineICAO) {
    const icaoMatch = new RegExp(String.raw`^${airlineICAO}(\d+)$`).exec(
      normalizedQuery,
    );
    if (icaoMatch?.[1]) return icaoMatch[1];
  }

  return "";
}

/** Format selection as IATA + digits (e.g. "BA123"), or IATA alone if no digits. */
export function formatSelectedFlightNumber(
  query: string,
  airline: Airline,
): string {
  const digits = extractFlightDigits(query, airline);
  const iata = airline.iata.toUpperCase();
  return digits ? `${iata}${digits}` : iata;
}

/** Whether the typed value looks like a partial airline code or full flight number. */
export function shouldShowAirlineSuggestions(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed.length < 2) return false;
  const isPartialCode = /^[a-zA-Z0-9]{2,3}$/.test(trimmed);
  const isFullFlightNumber = /^[a-zA-Z0-9]{2,3}\d+$/.test(trimmed);
  return isPartialCode || isFullFlightNumber;
}
