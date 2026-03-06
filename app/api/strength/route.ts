import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const weeks = parseInt(searchParams.get("weeks") ?? "4");
  const userId = getDefaultUserId();
  const since = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);
  const logs = await prisma.strengthLog.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const userId = getDefaultUserId();
  const body = await req.json();
  const log = await prisma.strengthLog.create({
    data: {
      userId,
      date: new Date(body.date),
      type: body.type,
      durationMin: body.durationMin ?? null,
      notes: body.notes ?? null,
      exercises: body.exercises ? JSON.stringify(body.exercises) : null,
    },
  });
  return NextResponse.json(log, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.strengthLog.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
