import "server-only";
// Coros Open API integration — https://open.coros.com

export const COROS_BASE_URL = "https://open.coros.com";
export const COROS_AUTH_URL = `${COROS_BASE_URL}/oauth2/authorize`;
export const COROS_TOKEN_URL = `${COROS_BASE_URL}/oauth2/accesstoken`;

export function getCorosAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.COROS_CLIENT_ID!,
    redirect_uri: process.env.COROS_REDIRECT_URI!,
    response_type: "code",
    state,
  });
  return `${COROS_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCorosCode(code: string) {
  const res = await fetch(COROS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.COROS_CLIENT_ID!,
      client_secret: process.env.COROS_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: process.env.COROS_REDIRECT_URI!,
    }),
  });
  if (!res.ok) throw new Error(`Coros token exchange failed: ${res.status}`);
  return res.json();
}

export async function refreshCorosToken(refreshToken: string) {
  const res = await fetch(COROS_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.COROS_CLIENT_ID!,
      client_secret: process.env.COROS_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Coros token refresh failed: ${res.status}`);
  return res.json();
}

export async function fetchCorosActivities(
  accessToken: string,
  startTime: number,
  endTime: number
) {
  const params = new URLSearchParams({
    token: accessToken,
    startDate: startTime.toString(),
    endDate: endTime.toString(),
    size: "100",
    pageNumber: "1",
  });
  const res = await fetch(`${COROS_BASE_URL}/v2/coros/activity/query?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Coros activities fetch failed: ${res.status}`);
  return res.json();
}

// Coros sport type constants
// https://open.coros.com/docs/sport-types
const SPORT_TYPES: Record<number, "run" | "bike" | "other"> = {
  // Running variants
  100: "run", 101: "run", 102: "run", 103: "run", 104: "run",
  // Cycling variants  
  200: "bike", 201: "bike", 202: "bike", 203: "bike",
};

export function corosSportCategory(sportType: number): "run" | "bike" | "other" {
  return SPORT_TYPES[sportType] ?? "other";
}

export function corosSportName(sportType: number): string {
  const names: Record<number, string> = {
    100: "run", 101: "trail", 102: "track", 103: "treadmill", 104: "run",
    200: "bike", 201: "indoor_bike", 202: "bike", 203: "bike",
  };
  return names[sportType] ?? "run";
}

// Meters to miles
const M_TO_MI = 0.000621371;
// Meters to feet
const M_TO_FT = 3.28084;
// Sec/km to sec/mile
const SECPERKM_TO_SECPERMILE = 1.60934;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCorosRun(act: any) {
  const distM = (act.distance ?? 0) * (act.distance > 100 ? 1 : 1000); // handle km vs m
  const paceSecKm = act.avgPace ?? null;
  return {
    corosActivityId: String(act.labelId ?? act.activityId ?? ""),
    date: new Date((act.startTime ?? act.date) * 1000),
    name: act.name ?? act.sportName ?? "Run",
    type: corosSportName(act.sportType ?? 100),
    distanceMiles: distM * M_TO_MI,
    durationSeconds: act.totalTime ?? act.duration ?? 0,
    avgPaceSecMile: paceSecKm ? paceSecKm * SECPERKM_TO_SECPERMILE : null,
    avgHeartRate: act.avgHr ?? act.avgHeartRate ?? null,
    maxHeartRate: act.maxHr ?? act.maxHeartRate ?? null,
    elevationFt: act.climbEle ? act.climbEle * M_TO_FT : null,
    calories: act.calorie ?? act.calories ?? null,
    trainingLoad: act.trainingLoad ?? null,
    vo2max: act.vo2Max ?? act.vo2max ?? null,
    aerobicEffect: act.aerobicEffect ?? null,
    anaerobicEffect: act.anaerobicEffect ?? null,
    cadence: act.avgCadence ?? act.cadence ?? null,
    hrv: act.hrv ?? act.hrvScore ?? null,
    recoveryTime: act.recoveryTime ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCorosBike(act: any) {
  const distM = (act.distance ?? 0) * (act.distance > 100 ? 1 : 1000);
  const durationS = act.totalTime ?? act.duration ?? 0;
  const speedMph = durationS > 0 ? (distM * M_TO_MI) / (durationS / 3600) : null;
  return {
    corosActivityId: String(act.labelId ?? act.activityId ?? ""),
    date: new Date((act.startTime ?? act.date) * 1000),
    name: act.name ?? act.sportName ?? "Ride",
    type: corosSportName(act.sportType ?? 200),
    distanceMiles: distM * M_TO_MI,
    durationSeconds: durationS,
    avgSpeedMph: speedMph,
    avgHeartRate: act.avgHr ?? null,
    maxHeartRate: act.maxHr ?? null,
    elevationFt: act.climbEle ? act.climbEle * M_TO_FT : null,
    calories: act.calorie ?? null,
    avgPower: act.avgPower ?? null,
    cadenceRpm: act.avgCadence ?? null,
    trainingLoad: act.trainingLoad ?? null,
  };
}
