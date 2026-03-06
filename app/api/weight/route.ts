import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const limit = parseInt(searchParams.get("limit") ?? "730"); // default 2 years
  const userId = getDefaultUserId();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };
  if (start || end) {
    where.date = {};
    if (start) where.date.gte = new Date(`${start}T00:00:00`);
    if (end) where.date.lte = new Date(`${end}T23:59:59`);
  }

  const logs = await prisma.weightLog.findMany({
    where,
    orderBy: { date: "asc" },
    take: limit,
  });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const userId = getDefaultUserId();
  const body = await req.json();
  const log = await prisma.weightLog.create({
    data: {
      userId,
      date: new Date(body.date),
      weightLbs: body.weightLbs,
      bodyFatPct: body.bodyFatPct ?? null,
      hrvScore: body.hrvScore ?? null,
      sleepHrs: body.sleepHrs ?? null,
      restingHr: body.restingHr ?? null,
      recoveryScore: body.recoveryScore ?? null,
    },
  });
  await prisma.user.update({ where: { id: userId }, data: { currentWeight: body.weightLbs } });
  return NextResponse.json(log, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.weightLog.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
