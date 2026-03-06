import { NextResponse } from "next/server";
import { getCorosAuthUrl } from "@/lib/coros";
import crypto from "crypto";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");
  const authUrl = getCorosAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
