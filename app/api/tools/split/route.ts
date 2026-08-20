import { NextRequest, NextResponse } from "next/server";
import { getPdfProcessor } from "@/lib/pdf/processor";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const startPage = Number(formData.get("startPage"));
    const endPage = Number(formData.get("endPage"));

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FILE", message: "file is required" } },
        { status: 400 }
      );
    }

    if (isNaN(startPage) || isNaN(endPage)) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_PAGES", message: "startPage and endPage are required" } },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const processor = getPdfProcessor();
    const results = await processor.split(arrayBuffer, {
      pageRange: { start: startPage, end: endPage },
    });

    const resultBuffer = Buffer.from(results[0]);

    return new NextResponse(resultBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="split.pdf"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "SPLIT_FAILED", message: "Failed to split PDF" } },
      { status: 500 }
    );
  }
}
