import { createLogger } from "@/lib/utils/logger";

const logger = createLogger({ component: "fashn" });

/**
 * FASHN API Configuration
 */
const FASHN_API_BASE_URL = "https://api.fashn.ai";
const FASHN_API_KEY = process.env.FASHN_API_KEY;

/**
 * FASHN API Types
 */
export interface FashnModelGenerateRequest {
  gender: "male" | "female";
  ethnicity: string;
  body_type: string;
  skin_tone?: string;
  hair?: string;
  eyes?: string;
  pose?: string;
  background?: string;
  style?: string;
  resolution?: number;
}

export interface FashnRunRequest {
  model_name: "model-create";
  inputs: {
    prompt: string;
    aspect_ratio?: "1:1" | "2:3" | "3:4" | "4:5" | "5:4" | "4:3" | "3:2" | "16:9" | "9:16";
    image_reference?: string;
    reference_type?: "pose" | "silhouette";
    seed?: number;
    output_format?: "png" | "jpeg";
  };
}

export interface FashnRunResponse {
  id: string;
  error: null | { name: string; message: string };
}

export interface FashnStatusResponse {
  id: string;
  status: "starting" | "processing" | "succeeded" | "completed" | "failed" | "canceled";
  output: string[] | null;
  error: null | { name: string; message: string };
}

export interface FashnModelGenerateResponse {
  image_url: string;
  model_id?: string;
  [key: string]: unknown;
}

export interface FashnVirtualTryOnRequest {
  garment_image: string | File; // URL or file
  model_image: string | File; // URL or file
  prompt?: string;
  resolution?: number;
}

export interface FashnVirtualTryOnResponse {
  image_url: string;
  request_id?: string;
  [key: string]: unknown;
}

export interface FashnErrorResponse {
  error: string;
  message?: string;
  code?: string;
}

/**
 * FASHN API Client Class
 */
export class FashnClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || FASHN_API_KEY || "";
    this.baseUrl = FASHN_API_BASE_URL;

    if (!this.apiKey) {
      logger.warn("FASHN_API_KEY is not set. API calls will fail.");
    }
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): HeadersInit {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retries = 3
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.debug(`FASHN API request: ${endpoint} (attempt ${attempt}/${retries})`);

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
          const errorData: FashnErrorResponse = await response.json().catch(() => ({
            error: "Unknown error",
            message: `HTTP ${response.status}: ${response.statusText}`,
          }));

          throw new Error(
            errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();
        logger.info(`FASHN API request successful: ${endpoint}`);
        return data as T;
      } catch (error) {
        lastError = error as Error;
        logger.warn(`FASHN API request failed (attempt ${attempt}/${retries}):`, {
          endpoint,
          error: lastError.message,
        });

        if (attempt < retries) {
          // Exponential backoff: wait 1s, 2s, 4s
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    logger.error("FASHN API request failed after all retries", lastError!, {
      endpoint,
      retries,
    });

    throw new Error(
      `FASHN API request failed after ${retries} attempts: ${lastError?.message || "Unknown error"}`
    );
  }

  /**
   * Poll status endpoint until completion
   * Based on FASHN API - status is checked via /v1/status/{id}
   */
  private async pollStatus(
    predictionId: string,
    maxWaitTime = 60000, // 60 seconds max
    pollInterval = 2000 // Poll every 2 seconds
  ): Promise<FashnStatusResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.makeRequest<FashnStatusResponse>(
          `/v1/status/${predictionId}`,
          {
            method: "GET",
          },
          1 // Single retry
        );

        logger.debug("Status poll response", { 
          predictionId, 
          status: status.status,
          hasOutput: !!status.output 
        });

        // FASHN API returns "completed" when successful
        if (status.status === "succeeded" || status.status === "completed") {
          return status;
        }

        if (status.status === "failed" || status.status === "canceled") {
          throw new Error(
            status.error?.message || `Model generation ${status.status}`
          );
        }

        // If processing/starting, wait and continue polling
        if (status.status === "processing" || status.status === "starting") {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          continue;
        }

        // Unexpected status, wait and retry
        logger.warn("Unexpected status", { status: status.status, predictionId });
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      } catch (error) {
        const errorMessage = (error as Error).message;
        // If 404, the prediction might not be ready yet, wait and retry
        if (errorMessage.includes("404")) {
          logger.debug("Status endpoint returned 404, waiting...", { predictionId });
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
          continue;
        }
        // For other errors, throw immediately
        throw error;
      }
    }

    throw new Error("Model generation timed out");
  }

  /**
   * Build prompt from model parameters
   */
  private buildPrompt(params: FashnModelGenerateRequest): string {
    const parts: string[] = [];

    // Gender and body type
    parts.push(`${params.gender} model`);
    if (params.body_type) {
      parts.push(`${params.body_type} body type`);
    }

    // Ethnicity
    if (params.ethnicity) {
      parts.push(`${params.ethnicity} ethnicity`);
    }

    // Skin tone
    if (params.skin_tone) {
      parts.push(`${params.skin_tone} skin`);
    }

    // Hair
    if (params.hair) {
      parts.push(params.hair);
    }

    // Eyes
    if (params.eyes) {
      parts.push(params.eyes);
    }

    // Pose
    if (params.pose) {
      parts.push(params.pose);
    }

    // Background
    if (params.background) {
      parts.push(`${params.background} background`);
    }

    // Style
    if (params.style) {
      parts.push(params.style);
    }

    // Default additions for fashion model
    parts.push("fashion model", "studio photography", "professional lighting");

    return parts.join(", ");
  }

  /**
   * Generate AI model using FASHN API
   * POST /v1/run (Model Create)
   * Based on: https://docs.fashn.ai/api-reference/model-create
   */
  async generateModel(
    params: FashnModelGenerateRequest
  ): Promise<FashnModelGenerateResponse> {
    if (!this.apiKey) {
      throw new Error("FASHN_API_KEY is not configured");
    }

    logger.info("Generating AI model", { gender: params.gender, body_type: params.body_type });

    // Build prompt from parameters
    const prompt = this.buildPrompt(params);

    // Create request in the correct format
    const runRequest: FashnRunRequest = {
      model_name: "model-create",
      inputs: {
        prompt,
        aspect_ratio: "2:3", // Default fashion model aspect ratio
        output_format: "jpeg", // Faster response
      },
    };

    // Submit the request
    const runResponse = await this.makeRequest<FashnRunResponse | FashnStatusResponse>(
      "/v1/run",
      {
        method: "POST",
        body: JSON.stringify(runRequest),
      }
    );

    logger.debug("FASHN /v1/run response", { 
      id: "id" in runResponse ? runResponse.id : undefined,
      status: "status" in runResponse ? runResponse.status : undefined,
      hasError: "error" in runResponse ? !!runResponse.error : false,
    });

    // Check if response already contains status (some APIs return status immediately)
    if ("status" in runResponse && (runResponse.status === "succeeded" || runResponse.status === "completed")) {
      const statusResponse = runResponse as FashnStatusResponse;
      if (statusResponse.output && statusResponse.output.length > 0) {
        return {
          image_url: statusResponse.output[0],
          model_id: statusResponse.id,
        };
      }
    }

    // If it's just an ID response, poll for status
    if ("id" in runResponse && !("status" in runResponse)) {
      if (runResponse.error) {
        throw new Error(runResponse.error.message || "Model generation failed");
      }

      logger.info("Polling for status", { predictionId: runResponse.id });

      // Poll for status using the ID
      const statusResponse = await this.pollStatus(runResponse.id);
      
      if (!statusResponse.output || statusResponse.output.length === 0) {
        throw new Error("No output image URL returned");
      }

      // Return in the expected format
      return {
        image_url: statusResponse.output[0],
        model_id: statusResponse.id,
      };
    }

    // If we get here, the response format is unexpected
    logger.error("Unexpected response format from FASHN API", new Error("Invalid response structure"), {
      hasId: "id" in runResponse,
      hasStatus: "status" in runResponse,
      hasError: "error" in runResponse,
    });
    throw new Error("Unexpected response format from FASHN API");
  }

  /**
   * Virtual try-on using FASHN API
   * POST /api/v1/virtual-try-on
   */
  async virtualTryOn(
    params: FashnVirtualTryOnRequest
  ): Promise<FashnVirtualTryOnResponse> {
    if (!this.apiKey) {
      throw new Error("FASHN_API_KEY is not configured");
    }

    logger.info("Processing virtual try-on");

    // Handle file uploads vs URLs
    const formData = new FormData();

    if (params.garment_image instanceof File) {
      formData.append("garment_image", params.garment_image);
    } else {
      formData.append("garment_image", params.garment_image);
    }

    if (params.model_image instanceof File) {
      formData.append("model_image", params.model_image);
    } else {
      formData.append("model_image", params.model_image);
    }

    if (params.prompt) {
      formData.append("prompt", params.prompt);
    }

    if (params.resolution) {
      formData.append("resolution", params.resolution.toString());
    }

    return this.makeRequest<FashnVirtualTryOnResponse>(
      "/api/v1/virtual-try-on",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          // Don't set Content-Type for FormData, browser will set it with boundary
        },
        body: formData,
      }
    );
  }
}

/**
 * Default FASHN client instance
 */
export const fashnClient = new FashnClient();

/**
 * Helper function to validate FASHN API key
 */
export function validateFashnApiKey(): boolean {
  return !!FASHN_API_KEY && FASHN_API_KEY.trim() !== "";
}

