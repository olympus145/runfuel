import { NextRequest, NextResponse } from "next/server";
import { exchangeCorosCode } from "@/lib/coros";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/settings?error=coros_denied`, req.url)
    );
  }

  try {
    const tokenData = await exchangeCorosCode(code);
    const userId = getDefaultUserId();

    const expiresAt = new Date(
      Date.now() + (tokenData.expires_in ?? 3600) * 1000
    );

    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email: "user@runfuel.app",
        corosAccessToken: tokenData.access_token,
        corosRefreshToken: tokenData.refresh_token ?? null,
        corosTokenExpiry: expiresAt,
        corosUserId: tokenData.openId ?? tokenData.userId ?? null,
      },
      update: {
        corosAccessToken: tokenData.access_token,
        corosRefreshToken: tokenData.refresh_token ?? null,
        corosTokenExpiry: expiresAt,
        corosUserId: tokenData.openId ?? tokenData.userId ?? null,
      },
    });

    return NextResponse.redirect(new URL("/settings?success=coros", req.url));
  } catch (err) {
    console.error("Coros callback error:", err);
    return NextResponse.redirect(
      new URL("/settings?error=coros_failed", req.url)
    );
  }
}
