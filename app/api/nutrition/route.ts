import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const userId = getDefaultUserId();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let where: any = { userId };

  if (date) {
    // Single day
    where.date = {
      gte: new Date(`${date}T00:00:00`),
      lte: new Date(`${date}T23:59:59`),
    };
  } else if (start || end) {
    // Date range
    where.date = {};
    if (start) where.date.gte = new Date(`${start}T00:00:00`);
    if (end) where.date.lte = new Date(`${end}T23:59:59`);
  }

  const meals = await prisma.mealLog.findMany({ where, orderBy: { date: "asc" } });
  return NextResponse.json(meals);
}

export async function POST(req: NextRequest) {
  const userId = getDefaultUserId();
  const body = await req.json();
  const meal = await prisma.mealLog.create({
    data: {
      userId,
      date: new Date(body.date),
      mealType: body.mealType,
      name: body.name,
      calories: body.calories,
      proteinG: body.proteinG ?? null,
      carbsG: body.carbsG ?? null,
      fatG: body.fatG ?? null,
      notes: body.notes ?? null,
    },
  });
  return NextResponse.json(meal, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.mealLog.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
