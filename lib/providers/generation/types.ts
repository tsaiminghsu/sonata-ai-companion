// Framework-agnostic: no `next`/`react` imports.

export type GenerationJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface CreateImageJobInput {
  prompt: string;
  parameters?: Record<string, unknown>;
}

export interface CreateVideoJobInput {
  prompt: string;
  parameters?: Record<string, unknown>;
}

export interface CreateJobOutput {
  providerJobId: string;
  status: Extract<GenerationJobStatus, 'QUEUED' | 'PROCESSING'>;
}

export interface JobStatusOutput {
  status: GenerationJobStatus;
  outputUrl?: string;
  error?: string;
}

export interface GenerationProvider {
  createImageJob(input: CreateImageJobInput): Promise<CreateJobOutput>;
  createVideoJob(input: CreateVideoJobInput): Promise<CreateJobOutput>;
  getJobStatus(providerJobId: string): Promise<JobStatusOutput>;
  cancelJob?(providerJobId: string): Promise<void>;
}
