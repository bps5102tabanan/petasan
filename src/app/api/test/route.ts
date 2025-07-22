import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const all = await prisma.informasiSLS.findMany();

  const safeData = all.map((row) => ({
    ...row,
    id: row.id.toString(),
  }));

  return NextResponse.json(safeData);
}
