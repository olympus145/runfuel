/**
 * /api/stats?start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Returns daily aggregated stats for the requested range:
 * [{ date, caloriesIn, caloriesBurned, net, protein, weight }]
 *
 * net = caloriesIn - caloriesBurned
 * (negative net = caloric deficit, positive = surplus)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  if (!start || !end) {
    return NextResponse.json({ error: "start and end required" }, { status: 400 });
  }

  const userId = getDefaultUserId();
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59`);

  // Fetch all data in parallel
  const [meals, runs, bikes, weights] = await Promise.all([
    prisma.mealLog.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      select: { date: true, calories: true, proteinG: true },
    }),
    prisma.run.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      select: { date: true, calories: true, distanceMiles: true },
    }),
    prisma.bike.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      select: { date: true, calories: true, distanceMiles: true },
    }),
    prisma.weightLog.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      select: { date: true, weightLbs: true },
      orderBy: { date: "asc" },
    }),
  ]);

  // Build a map keyed by YYYY-MM-DD
  const dayMap = new Map<string, {
    caloriesIn: number;
    caloriesBurned: number;
    protein: number;
    weight: number | null;
  }>();

  // Helper: get or init a day entry
  const getDay = (d: Date) => {
    const key = d.toISOString().slice(0, 10);
    if (!dayMap.has(key)) dayMap.set(key, { caloriesIn: 0, caloriesBurned: 0, protein: 0, weight: null });
    return dayMap.get(key)!;
  };

  // Calories IN from meals
  for (const m of meals) {
    const day = getDay(m.date);
    day.caloriesIn += m.calories;
    day.protein += m.proteinG ?? 0;
  }

  // Calories BURNED from runs
  for (const r of runs) {
    const day = getDay(r.date);
    // Use logged calories if available, otherwise estimate ~100 kcal/mile
    day.caloriesBurned += r.calories ?? Math.round(r.distanceMiles * 100);
  }

  // Calories BURNED from bikes
  for (const b of bikes) {
    const day = getDay(b.date);
    // Use logged calories if available, otherwise estimate ~40 kcal/mile
    day.caloriesBurned += b.calories ?? Math.round(b.distanceMiles * 40);
  }

  // Weight (use latest reading per day)
  for (const w of weights) {
    const day = getDay(w.date);
    day.weight = w.weightLbs;
  }

  // Generate full date range (fill gaps with 0)
  const result: Array<{
    date: string;
    caloriesIn: number;
    caloriesBurned: number;
    net: number;
    protein: number;
    weight: number | null;
  }> = [];

  const cur = new Date(startDate);
  while (cur <= endDate) {
    const key = cur.toISOString().slice(0, 10);
    const d = dayMap.get(key) ?? { caloriesIn: 0, caloriesBurned: 0, protein: 0, weight: null };
    result.push({
      date: key,
      caloriesIn: d.caloriesIn,
      caloriesBurned: d.caloriesBurned,
      net: d.caloriesIn - d.caloriesBurned,
      protein: Math.round(d.protein),
      weight: d.weight,
    });
    cur.setDate(cur.getDate() + 1);
  }

  return NextResponse.json(result);
}
