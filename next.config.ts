import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "@prisma/adapter-better-sqlite3",
    "better-sqlite3",
    "pg",
    "prisma",
  ],
};

export default nextConfig;
