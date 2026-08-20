import { NextRequest, NextResponse } from "next/server";
import { createJob, listJobs } from "@/lib/jobs";
import { ApiResponse } from "@/types";

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const body = await request.json();
    const { tool, inputFiles, inputSize, options } = body;

    if (!tool || !inputFiles || !inputSize) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "tool, inputFiles, and inputSize are required" } },
        { status: 400 }
      );
    }

    if (!Array.isArray(inputFiles)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "inputFiles must be an array" } },
        { status: 400 }
      );
    }

    const job = createJob(tool, inputFiles, inputSize, options);

    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "JOB_CREATE_FAILED", message: "Failed to create job" } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const jobs = listJobs(userId);

    return NextResponse.json({ success: true, data: jobs });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "LIST_JOBS_FAILED", message: "Failed to list jobs" } },
      { status: 500 }
    );
  }
}
