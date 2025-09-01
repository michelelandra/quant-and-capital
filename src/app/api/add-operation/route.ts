// src/app/api/add-operation/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(e => ({ parseError: String(e) }));
  return NextResponse.json({
    ok: true,
    received: body,
    ts: new Date().toISOString(),
  });
}




