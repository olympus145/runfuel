import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateDailyCoaching } from "@/lib/coaching";
import { getDefaultUserId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const userId = getDefaultUserId();

  const log = await prisma.coachingLog.findFirst({
    where: {
      userId,
      date: { gte: new Date(`${date}T00:00:00`), lte: new Date(`${date}T23:59:59`) },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(log ?? null);
}

export async function POST(req: NextRequest) {
  try {
  const userId = getDefaultUserId();
  const body = await req.json();
  const date = body.date ?? new Date().toISOString().slice(0, 10);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Gather week's training data
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [runs, bikes, strengthLogs, meals, history] = await Promise.all([
    prisma.run.findMany({ where: { userId, date: { gte: weekAgo } }, orderBy: { date: "desc" } }),
    prisma.bike.findMany({ where: { userId, date: { gte: weekAgo } }, orderBy: { date: "desc" } }),
    prisma.strengthLog.findMany({ where: { userId, date: { gte: weekAgo } } }),
    prisma.mealLog.findMany({
      where: {
        userId,
        date: { gte: new Date(`${date}T00:00:00`), lte: new Date(`${date}T23:59:59`) },
      },
    }),
    prisma.coachingLog.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 10,
    }),
  ]);

  // Build week summary
  type RunRow = (typeof runs)[0];
  const avgV02maxRuns = runs.filter((r: RunRow) => r.vo2max);
  const avgHrvRuns = runs.filter((r: RunRow) => r.hrv);

  const week = {
    runs: runs.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      miles: r.distanceMiles,
      paceSecMile: r.avgPaceSecMile,
      avgHr: r.avgHeartRate,
      type: r.type,
    })),
    totalRunMiles: runs.reduce((s, r) => s + r.distanceMiles, 0),
    totalRunMin: Math.round(runs.reduce((s, r) => s + r.durationSeconds, 0) / 60),
    bikes: bikes.map((b) => ({
      date: b.date.toISOString().slice(0, 10),
      miles: b.distanceMiles,
      durationMin: Math.round(b.durationSeconds / 60),
      avgHr: b.avgHeartRate,
    })),
    totalBikeMiles: bikes.reduce((s, b) => s + b.distanceMiles, 0),
    totalBikeMin: Math.round(bikes.reduce((s, b) => s + b.durationSeconds, 0) / 60),
    strengthDays: strengthLogs.filter((s) => s.type === "strength" || s.type === "hiit" || s.type === "crossfit").length,
    coreDays: strengthLogs.filter((s) => s.type === "core" || s.type === "yoga").length,
    avgV02max: avgV02maxRuns.length > 0 ? avgV02maxRuns.reduce((s, r) => s + r.vo2max!, 0) / avgV02maxRuns.length : null,
    avgHrv: avgHrvRuns.length > 0 ? avgHrvRuns.reduce((s, r) => s + r.hrv!, 0) / avgHrvRuns.length : null,
  };

  const nutrition = {
    totalCalories: meals.reduce((s, m) => s + m.calories, 0),
    totalProteinG: meals.reduce((s, m) => s + (m.proteinG ?? 0), 0),
    totalCarbsG: meals.reduce((s, m) => s + (m.carbsG ?? 0), 0),
    totalFatG: meals.reduce((s, m) => s + (m.fatG ?? 0), 0),
    meals: meals.map((m) => ({ mealType: m.mealType, name: m.name, calories: m.calories })),
  };

  const coaching = await generateDailyCoaching(
    week,
    nutrition,
    {
      weeklyRunMilesGoal: user.weeklyRunMilesGoal,
      weeklyBikeMilesGoal: user.weeklyBikeMilesGoal,
      strengthDaysGoal: user.strengthDaysGoal,
      coreDaysGoal: user.coreDaysGoal,
      dailyCalorieGoal: user.dailyCalorieGoal,
      dailyProteinGoal: user.dailyProteinGoal,
      weightGoal: user.weightGoal,
      currentWeight: user.currentWeight,
    },
    date,
    history.map((h) => ({
      date: h.date.toISOString().slice(0, 10),
      feedback: h.feedback,
      overallScore: h.overallScore,
      focusArea: h.focusArea,
    }))
  );

  const log = await prisma.coachingLog.create({
    data: {
      userId,
      date: new Date(`${date}T12:00:00`),
      feedback: coaching.feedback,
      highlights: JSON.stringify(coaching.highlights),
      runScore: coaching.runScore,
      nutritionScore: coaching.nutritionScore,
      recoveryScore: coaching.recoveryScore,
      overallScore: coaching.overallScore,
      focusArea: coaching.focusArea,
    },
  });

  return NextResponse.json(log, { status: 201 });
  } catch (err) {
    console.error("Coaching generation error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate coaching";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
