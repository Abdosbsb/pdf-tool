import { NextRequest, NextResponse } from "next/server";
import { getPdfProcessor } from "@/lib/pdf/processor";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const password = formData.get("password") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "file is required" } },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PASSWORD", message: "password is required" } },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const processor = getPdfProcessor();
    const result = await processor.removePassword(arrayBuffer, password);
    const resultBuffer = Buffer.from(result);

    return new NextResponse(resultBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="unlocked.pdf"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "UNLOCK_FAILED", message: "Failed to unlock PDF" } },
      { status: 500 }
    );
  }
}
