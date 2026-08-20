import { v4 as uuidv4 } from "uuid";
import { Job, JobStatus, ToolId } from "@/types";

const JOB_TTL_MS = 60 * 60 * 1000;

const jobStore = new Map<string, Job>();

export function createJob(
  tool: ToolId,
  inputFiles: string[],
  inputSize: number,
  options?: Record<string, unknown>
): Job {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + JOB_TTL_MS).toISOString();

  const job: Job = {
    id: uuidv4(),
    tool,
    status: "PENDING",
    inputFiles,
    inputSize,
    options,
    createdAt: now,
    expiresAt,
  };

  jobStore.set(job.id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobStore.get(id);
}

export function updateJobStatus(id: string, status: JobStatus, data?: Partial<Job>): Job | undefined {
  const job = jobStore.get(id);
  if (!job) return undefined;
  job.status = status;
  if (data) Object.assign(job, data);
  jobStore.set(id, job);
  return job;
}

export function deleteJob(id: string): boolean {
  return jobStore.delete(id);
}

export function listJobs(userId?: string): Job[] {
  const jobs = Array.from(jobStore.values());
  if (userId) return jobs.filter((j) => j.userId === userId);
  return jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function cleanupExpiredJobs(): number {
  const now = Date.now();
  let count = 0;
  for (const [id, job] of jobStore.entries()) {
    if (new Date(job.expiresAt).getTime() < now) {
      jobStore.delete(id);
      count++;
    }
  }
  return count;
}
