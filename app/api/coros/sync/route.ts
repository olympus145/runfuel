import { NextResponse } from "next/server";
import {
  fetchCorosActivities,
  mapCorosRun,
  mapCorosBike,
  corosSportCategory,
  refreshCorosToken,
} from "@/lib/coros";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/utils";

export async function POST() {
  const userId = getDefaultUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user?.corosAccessToken) {
    return NextResponse.json(
      { error: "Coros not connected. Please connect your account first." },
      { status: 401 }
    );
  }

  let accessToken = user.corosAccessToken;

  if (user.corosTokenExpiry && user.corosRefreshToken && new Date() >= user.corosTokenExpiry) {
    try {
      const refreshed = await refreshCorosToken(user.corosRefreshToken);
      accessToken = refreshed.access_token;
      await prisma.user.update({
        where: { id: userId },
        data: {
          corosAccessToken: refreshed.access_token,
          corosRefreshToken: refreshed.refresh_token ?? user.corosRefreshToken,
          corosTokenExpiry: new Date(Date.now() + (refreshed.expires_in ?? 3600) * 1000),
        },
      });
    } catch {
      return NextResponse.json({ error: "Failed to refresh Coros token. Please reconnect." }, { status: 401 });
    }
  }

  const endTime = Math.floor(Date.now() / 1000);
  const startTime = endTime - 30 * 24 * 60 * 60;

  try {
    const data = await fetchCorosActivities(accessToken, startTime, endTime);
    const activities = data.data?.activityList ?? data.activityList ?? [];

    let syncedRuns = 0, syncedBikes = 0, skipped = 0;

    for (const act of activities) {
      const category = corosSportCategory(act.sportType ?? 100);

      if (category === "run") {
        const mapped = mapCorosRun(act);
        if (!mapped.corosActivityId) continue;
        const existing = await prisma.run.findUnique({ where: { corosActivityId: mapped.corosActivityId } });
        if (existing) { skipped++; continue; }
        await prisma.run.create({ data: { userId, ...mapped } });
        syncedRuns++;
      } else if (category === "bike") {
        const mapped = mapCorosBike(act);
        if (!mapped.corosActivityId) continue;
        const existing = await prisma.bike.findUnique({ where: { corosActivityId: mapped.corosActivityId } });
        if (existing) { skipped++; continue; }
        await prisma.bike.create({ data: { userId, ...mapped } });
        syncedBikes++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({ success: true, syncedRuns, syncedBikes, skipped, total: activities.length });
  } catch (err) {
    console.error("Coros sync error:", err);
    return NextResponse.json({ error: "Failed to fetch activities from Coros" }, { status: 500 });
  }
}

export async function GET() {
  const userId = getDefaultUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return NextResponse.json({
    connected: !!user?.corosAccessToken,
    corosUserId: user?.corosUserId ?? null,
  });
}
