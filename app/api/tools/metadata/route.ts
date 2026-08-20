import { NextRequest, NextResponse } from "next/server";
import { getPdfProcessor } from "@/lib/pdf/processor";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "file is required" } },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const processor = getPdfProcessor();
    const result = await processor.removeMetadata(arrayBuffer);
    const resultBuffer = Buffer.from(result);

    return new NextResponse(resultBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="cleaned.pdf"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "METADATA_FAILED", message: "Failed to remove metadata" } },
      { status: 500 }
    );
  }
}
