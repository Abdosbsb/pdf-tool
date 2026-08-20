import { NextRequest, NextResponse } from "next/server";
import { getPdfProcessor } from "@/lib/pdf/processor";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const degrees = Number(formData.get("degrees"));

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "file is required" } },
        { status: 400 }
      );
    }

    if (isNaN(degrees)) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_DEGREES", message: "degrees is required" } },
        { status: 400 }
      );
    }

    if (degrees % 90 !== 0) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_DEGREES", message: "degrees must be a multiple of 90" } },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const processor = getPdfProcessor();
    const result = await processor.rotate(arrayBuffer, degrees);
    const resultBuffer = Buffer.from(result);

    return new NextResponse(resultBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="rotated.pdf"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "ROTATE_FAILED", message: "Failed to rotate PDF" } },
      { status: 500 }
    );
  }
}
