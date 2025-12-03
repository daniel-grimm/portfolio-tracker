/**
 * Account types and constants for brokerage account management.
 */

export interface Account {
  id: string;
  name: string;
  platform: Platform;
}

export type Platform =
  | "Fidelity"
  | "Robinhood"
  | "Vanguard"
  | "Schwab"
  | "TD Ameritrade"
  | "E*TRADE"
  | "Other";

export const PLATFORMS: Platform[] = [
  "Fidelity",
  "Robinhood",
  "Vanguard",
  "Schwab",
  "TD Ameritrade",
  "E*TRADE",
  "Other",
];
