/**
 * Render Status Poller
 * Utility for polling render status updates
 */

export interface RenderStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  modelType: "AI_AVATAR" | "HUMAN_MODEL";
  outputS3Url?: string;
  renderedImageUrl?: string;
  errorMessage?: string;
  retryCount?: number;
  maxRetries?: number;
  failureReason?: string;
  failureCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PollOptions {
  interval?: number; // Polling interval in ms (default: 2000)
  maxAttempts?: number; // Maximum polling attempts (default: 150 = 5 minutes)
  onUpdate?: (status: RenderStatus) => void;
  onComplete?: (status: RenderStatus) => void;
  onError?: (error: Error) => void;
}

/**
 * Poll render status until completion or failure
 */
export async function pollRenderStatus(
  renderId: string,
  options: PollOptions = {}
): Promise<RenderStatus> {
  const {
    interval = 2000,
    maxAttempts = 150,
    onUpdate,
    onComplete,
    onError,
  } = options;

  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;

        const response = await fetch(`/api/render/${renderId}/status`);
        const data = await response.json();

        if (data.status === "error") {
          const error = new Error(data.message || "Failed to fetch render status");
          onError?.(error);
          reject(error);
          return;
        }

        const renderStatus: RenderStatus = data.data;

        // Call update callback
        onUpdate?.(renderStatus);

        // Check if completed or failed
        if (renderStatus.status === "completed" || renderStatus.status === "failed") {
          onComplete?.(renderStatus);
          resolve(renderStatus);
          return;
        }

        // Check max attempts
        if (attempts >= maxAttempts) {
          const error = new Error("Polling timeout - maximum attempts reached");
          onError?.(error);
          reject(error);
          return;
        }

        // Continue polling
        setTimeout(poll, interval);
      } catch (error) {
        onError?.(error as Error);
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}

/**
 * Poll batch render status
 */
export async function pollBatchStatus(
  batchId: string,
  options: PollOptions = {}
): Promise<any> {
  const {
    interval = 3000,
    maxAttempts = 100,
    onUpdate,
    onComplete,
    onError,
  } = options;

  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;

        const response = await fetch(`/api/render/batch/${batchId}`);
        const data = await response.json();

        if (data.status === "error") {
          const error = new Error(data.message || "Failed to fetch batch status");
          onError?.(error);
          reject(error);
          return;
        }

        const batchStatus = data.data;

        // Call update callback
        onUpdate?.(batchStatus);

        // Check if completed or failed
        if (batchStatus.status === "completed" || batchStatus.status === "failed") {
          onComplete?.(batchStatus);
          resolve(batchStatus);
          return;
        }

        // Check max attempts
        if (attempts >= maxAttempts) {
          const error = new Error("Polling timeout - maximum attempts reached");
          onError?.(error);
          reject(error);
          return;
        }

        // Continue polling
        setTimeout(poll, interval);
      } catch (error) {
        onError?.(error as Error);
        reject(error);
      }
    };

    // Start polling
    poll();
  });
}

