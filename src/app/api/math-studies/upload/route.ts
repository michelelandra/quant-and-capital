import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const passedToken =
      req.headers.get("x-admin-token") || "";

    const adminToken =
      process.env.ADMIN_PUBLISH_TOKEN || "";

    if (!adminToken) {
      return NextResponse.json(
        { error: "server_misconfig" },
        { status: 500 }
      );
    }

    if (!passedToken) {
      return NextResponse.json(
        { error: "missing_token" },
        { status: 403 }
      );
    }

    if (passedToken !== adminToken) {
      return NextResponse.json(
        { error: "bad_token" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    const maxSize = 25 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 25 MB." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "video/mp4",
      "video/webm",
      "video/ogg",
    ];

    if (
      file.type &&
      !allowedTypes.includes(file.type)
    ) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      );
    }

    const extension =
      file.name.split(".").pop()?.toLowerCase() ||
      "bin";

    const path =
      `math-studies/${crypto.randomUUID()}.${extension}`;

    const bytes = await file.arrayBuffer();

    const { error: uploadError } =
      await supabaseAdmin.storage
        .from("math-media")
        .upload(path, bytes, {
          contentType:
            file.type ||
            "application/octet-stream",
          upsert: false,
        });

    if (uploadError) {
      console.error(
        "Storage upload error:",
        uploadError
      );

      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data } =
      supabaseAdmin.storage
        .from("math-media")
        .getPublicUrl(path);

    return NextResponse.json({
      ok: true,
      url: data.publicUrl,
      path,
    });
  } catch (err) {
    console.error("Upload route error:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Upload failed",
      },
      { status: 500 }
    );
  }
}