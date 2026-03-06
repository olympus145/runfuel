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

  const runs = await prisma.run.findMany({
    where,
    orderBy: { date: "desc" },
    take: start || end ? undefined : limit,
  });
  return NextResponse.json(runs);
}

export async function POST(req: NextRequest) {
  const userId = getDefaultUserId();
  const body = await req.json();
  const run = await prisma.run.create({
    data: {
      userId,
      date: new Date(body.date),
      name: body.name ?? "Run",
      type: body.type ?? "run",
      distanceMiles: body.distanceMiles,
      durationSeconds: body.durationSeconds,
      avgPaceSecMile: body.avgPaceSecMile ?? null,
      avgHeartRate: body.avgHeartRate ?? null,
      maxHeartRate: body.maxHeartRate ?? null,
      elevationFt: body.elevationFt ?? null,
      calories: body.calories ?? null,
    },
  });
  return NextResponse.json(run, { status: 201 });
}
