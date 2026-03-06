import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") ?? "30");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const userId = getDefaultUserId();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };
  if (start || end) {
    where.date = {};
    if (start) where.date.gte = new Date(`${start}T00:00:00`);
    if (end) where.date.lte = new Date(`${end}T23:59:59`);
  }

  const bikes = await prisma.bike.findMany({
    where,
    orderBy: { date: "desc" },
    take: start || end ? undefined : limit,
  });
  return NextResponse.json(bikes);
}

export async function POST(req: NextRequest) {
  const userId = getDefaultUserId();
  const body = await req.json();
  const bike = await prisma.bike.create({
    data: {
      userId,
      date: new Date(body.date),
      name: body.name ?? "Ride",
      type: body.type ?? "bike",
      distanceMiles: body.distanceMiles,
      durationSeconds: body.durationSeconds,
      avgSpeedMph: body.avgSpeedMph ?? null,
      avgHeartRate: body.avgHeartRate ?? null,
      elevationFt: body.elevationFt ?? null,
      calories: body.calories ?? null,
      avgPower: body.avgPower ?? null,
      cadenceRpm: body.cadenceRpm ?? null,
    },
  });
  return NextResponse.json(bike, { status: 201 });
}
