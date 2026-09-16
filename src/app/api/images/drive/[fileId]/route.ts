import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleAuth } from "@/lib/googleAuth";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;

  const auth = getGoogleAuth(["https://www.googleapis.com/auth/drive.readonly"]);
  const drive = google.drive({ version: "v3", auth });

  try {
    const [meta, content] = await Promise.all([
      drive.files.get({ fileId, fields: "mimeType" }),
      drive.files.get({ fileId, alt: "media" }, { responseType: "arraybuffer" }),
    ]);

    return new NextResponse(content.data as ArrayBuffer, {
      headers: {
        "Content-Type": meta.data.mimeType ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
  }
}
