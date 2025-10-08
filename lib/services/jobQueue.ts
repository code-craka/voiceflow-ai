/**
 * Job Queue Service
 * In-memory job queue for audio processing with parallel execution
 * For production, consider using Redis-based queue (Bull, BullMQ)
 */

import type {
  Job,
  JobData,
  JobStatus,
  JobType,
  JobResult,
  QueueStats,
} from "@/types/job";

export class JobQueue {
  private jobs: Map<string, Job> = new Map();
  private processingJobs: Set<string> = new Set();
  private maxConcurrent: number;
  private currentlyProcessing: number = 0;

  constructor(maxConcurrent: number = 5) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Add a job to the queue
   */
  async addJob<T extends JobData>(
    type: JobType,
    data: T,
    priority: number = 0,
    maxAttempts: number = 3
  ): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: Job<T> = {
      id: jobId,
      type,
      status: "pending",
      data,
      priority,
      attempts: 0,
      maxAttempts,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job as Job);
    
    console.log(`Job ${jobId} added to queue (type: ${type}, priority: ${priority})`);
    
    return jobId;
  }

  /**
   * Get next job to process (highest priority first)
   */
  private getNextJob(): Job | null {
    const pendingJobs = Array.from(this.jobs.values())
      .filter((job) => job.status === "pending")
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    return pendingJobs[0] || null;
  }

  /**
   * Process jobs with parallel execution
   */
  async processJobs(
    processor: (job: Job) => Promise<JobResult>
  ): Promise<void> {
    while (this.currentlyProcessing < this.maxConcurrent) {
      const job = this.getNextJob();
      
      if (!job) {
        break; // No more pending jobs
      }

      // Mark as processing
      job.status = "processing";
      job.startedAt = new Date();
      job.attempts++;
      this.processingJobs.add(job.id);
      this.currentlyProcessing++;

      // Process job asynchronously
      this.processJob(job, processor)
        .finally(() => {
          this.processingJobs.delete(job.id);
          this.currentlyProcessing--;
          
          // Try to process more jobs
          this.processJobs(processor);
        });
    }
  }

  /**
   * Process a single job
   */
  private async processJob(
    job: Job,
    processor: (job: Job) => Promise<JobResult>
  ): Promise<void> {
    const startTime = Date.now();

    try {
      console.log(`Processing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);
      
      const result = await processor(job);
      
      if (result.success) {
        job.status = "completed";
        job.completedAt = new Date();
        job.processingTime = Date.now() - startTime;
        console.log(`Job ${job.id} completed in ${job.processingTime}ms`);
      } else {
        throw new Error(result.error || "Job processing failed");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Job ${job.id} failed:`, errorMessage);
      
      job.error = errorMessage;

      // Retry if attempts remaining
      if (job.attempts < job.maxAttempts) {
        job.status = "retrying";
        
        // Add exponential backoff delay
        const delay = Math.min(1000 * Math.pow(2, job.attempts - 1), 10000);
        console.log(`Retrying job ${job.id} in ${delay}ms`);
        
        setTimeout(() => {
          job.status = "pending";
          this.processJobs(processor);
        }, delay);
      } else {
        job.status = "failed";
        job.completedAt = new Date();
        console.error(`Job ${job.id} failed after ${job.attempts} attempts`);
      }
    }
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get job status
   */
  getJobStatus(jobId: string): JobStatus | null {
    const job = this.jobs.get(jobId);
    return job ? job.status : null;
  }

  /**
   * Wait for job completion
   */
  async waitForJob(jobId: string, timeoutMs: number = 60000): Promise<Job> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const job = this.jobs.get(jobId);
      
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (job.status === "completed") {
        return job;
      }

      if (job.status === "failed") {
        throw new Error(`Job ${jobId} failed: ${job.error}`);
      }

      // Wait 100ms before checking again
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    throw new Error(`Job ${jobId} timed out after ${timeoutMs}ms`);
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const jobs = Array.from(this.jobs.values());
    
    const pending = jobs.filter((j) => j.status === "pending").length;
    const processing = jobs.filter((j) => j.status === "processing").length;
    const completed = jobs.filter((j) => j.status === "completed").length;
    const failed = jobs.filter((j) => j.status === "failed").length;

    const completedJobs = jobs.filter((j) => j.status === "completed" && j.processingTime);
    const totalProcessingTime = completedJobs.reduce((sum, j) => sum + (j.processingTime || 0), 0);
    const averageProcessingTime = completedJobs.length > 0 
      ? totalProcessingTime / completedJobs.length 
      : 0;

    return {
      pending,
      processing,
      completed,
      failed,
      totalProcessingTime,
      averageProcessingTime,
    };
  }

  /**
   * Clear completed and failed jobs
   */
  clearFinishedJobs(): number {
    const initialSize = this.jobs.size;
    
    const jobsArray = Array.from(this.jobs.entries());
    for (const [id, job] of jobsArray) {
      if (job.status === "completed" || job.status === "failed") {
        this.jobs.delete(id);
      }
    }

    const cleared = initialSize - this.jobs.size;
    console.log(`Cleared ${cleared} finished jobs`);
    
    return cleared;
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get current queue size
   */
  get size(): number {
    return this.jobs.size;
  }

  /**
   * Check if queue is empty
   */
  get isEmpty(): boolean {
    return this.jobs.size === 0;
  }
}

// Export singleton instance
export const jobQueue = new JobQueue(5); // Process up to 5 jobs concurrently
