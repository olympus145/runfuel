import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/utils";

export async function GET() {
  const userId = getDefaultUserId();
  let user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    user = await prisma.user.create({
      data: { id: userId, email: "user@runfuel.app", name: "Runner" },
    });
  }
  const { corosAccessToken, corosRefreshToken, ...safe } = user;
  void corosAccessToken; void corosRefreshToken;
  return NextResponse.json({ ...safe, corosConnected: !!user.corosAccessToken });
}

export async function PATCH(req: NextRequest) {
  const userId = getDefaultUserId();
  const body = await req.json();
  const updated = await prisma.user.upsert({
    where: { id: userId },
    create: {
      id: userId, email: "user@runfuel.app",
      name: body.name ?? "Runner",
      weeklyRunMilesGoal: body.weeklyRunMilesGoal ?? null,
      weeklyBikeMilesGoal: body.weeklyBikeMilesGoal ?? null,
      strengthDaysGoal: body.strengthDaysGoal ?? null,
      coreDaysGoal: body.coreDaysGoal ?? null,
      dailyCalorieGoal: body.dailyCalorieGoal ?? null,
      dailyProteinGoal: body.dailyProteinGoal ?? null,
      weightGoal: body.weightGoal ?? null,
      currentWeight: body.currentWeight ?? null,
    },
    update: {
      name: body.name,
      weeklyRunMilesGoal: body.weeklyRunMilesGoal,
      weeklyBikeMilesGoal: body.weeklyBikeMilesGoal,
      strengthDaysGoal: body.strengthDaysGoal,
      coreDaysGoal: body.coreDaysGoal,
      dailyCalorieGoal: body.dailyCalorieGoal,
      dailyProteinGoal: body.dailyProteinGoal,
      weightGoal: body.weightGoal,
      currentWeight: body.currentWeight,
    },
  });
  const { corosAccessToken, corosRefreshToken, ...safe } = updated;
  void corosAccessToken; void corosRefreshToken;
  return NextResponse.json({ ...safe, corosConnected: !!updated.corosAccessToken });
}
