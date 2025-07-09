import { promises as fs } from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const FILE_PATH = path.join(process.cwd(), "data", "portfolio.json");


export async function GET() {
  try {
    const jsonData = await fs.readFile(FILE_PATH, "utf-8");
    const data = JSON.parse(jsonData);
    return NextResponse.json(data);
  } catch {
  return NextResponse.json({ cash: 10000, history: [] });
}

}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await fs.writeFile(FILE_PATH, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json({ status: "error", message: String(err) }, { status: 500 });
  }
}

