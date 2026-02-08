/**
 * MongoDB Connection Module
 * 
 * Centralized database connection management for ModelSnapper.ai
 * 
 * Usage:
 * 
 * 1. In Next.js API routes and server components:
 *    ```typescript
 *    import { connectDB } from "@/lib/db";
 *    await connectDB();
 *    // Use Mongoose models...
 *    ```
 * 
 * 2. In standalone scripts:
 *    ```typescript
 *    import { connectDB, disconnectDB } from "@/lib/db";
 *    await connectDB();
 *    // Use Mongoose models...
 *    await disconnectDB(); // Optional, but recommended for scripts
 *    ```
 * 
 * Environment Variables:
 * - MONGO_URI (preferred) or MONGODB_URI: MongoDB connection string
 * 
 * Features:
 * - Automatic environment variable loading from .env.local for scripts
 * - Connection retry logic with exponential backoff
 * - Connection state tracking and health checks
 * - Graceful shutdown handling
 * - Works seamlessly in both Next.js and standalone scripts
 */

import mongoose from "mongoose";
import { createLogger } from "@/lib/utils/logger";
import { config } from "dotenv";
import { resolve } from "path";

const logger = createLogger({ component: "database" });

/**
 * Load environment variables from .env.local if not already loaded
 * This is useful for scripts that run outside of Next.js
 */
function ensureEnvLoaded(): void {
  // Check if MONGO_URI or MONGODB_URI is already set
  const mongoUri = getMongoUri();
  
  if (!mongoUri) {
    try {
      // Try to load from .env.local
      const envPath = resolve(process.cwd(), ".env.local");
      const result = config({ path: envPath });
      
      if (result.error) {
        // File doesn't exist or can't be read
        logger.debug("Could not load .env.local", { 
          error: result.error.message,
          path: envPath 
        });
      } else {
        // Successfully loaded (even if no new vars were added)
        logger.debug("Attempted to load environment variables from .env.local", { 
          path: envPath,
          loaded: !!getMongoUri() // Check if MONGO_URI is now available
        });
      }
    } catch (error) {
      // Unexpected error loading .env.local
      logger.warn("Error loading .env.local", {
        error: (error as Error).message,
        path: resolve(process.cwd(), ".env.local")
      });
    }
  } else {
    logger.debug("MongoDB URI already available, skipping .env.local load");
  }
}

// Get database name from environment or use default
function getDatabaseName(): string {
  return process.env.MONGODB_DATABASE || process.env.MONGO_DATABASE || "model_snap_local";
}

// Database connection configuration (without dbName - set at connection time)
const DB_CONFIG_BASE = {
  // Connection timeout in milliseconds
  connectTimeoutMS: 30000, // 30 seconds
  // Socket timeout in milliseconds
  socketTimeoutMS: 45000, // 45 seconds
  // Server selection timeout in milliseconds
  serverSelectionTimeoutMS: 30000, // 30 seconds
  // Retry writes for transient failures
  retryWrites: true,
  // Write concern
  w: "majority" as const,
};

// Retry configuration (handled at application level)
const RETRY_CONFIG = {
  // Maximum number of retries
  maxRetries: 3,
  // Retry delay in milliseconds
  retryDelay: 1000,
} as const;

// Connection state tracking
let connectionAttempts = 0;
let lastConnectionAttempt = 0;
let isConnecting = false;

/**
 * Get MongoDB URI from environment variables
 * Supports both MONGO_URI and MONGODB_URI for compatibility
 */
function getMongoUri(): string | undefined {
  return process.env.MONGO_URI || process.env.MONGODB_URI;
}

/**
 * Validate MongoDB URI and environment variables
 */
function validateEnvironment(): { isValid: boolean; error?: string } {
  const mongoUri = getMongoUri();
  
  if (!mongoUri) {
    return {
      isValid: false,
      error: "MONGO_URI or MONGODB_URI environment variable is not set",
    };
  }
  
  if (mongoUri === "your_mongodb_connection_string_here") {
    return {
      isValid: false,
      error: "MONGO_URI is set to placeholder value. Please set a valid MongoDB connection string.",
    };
  }
  
  // Basic URI format validation
  try {
    new URL(mongoUri);
  } catch (error) {
    return {
      isValid: false,
      error: "MONGO_URI is not a valid URL format",
    };
  }
  
  return { isValid: true };
}

/**
 * Get connection state information
 */
export function getConnectionState(): {
  readyState: number;
  host: string;
  port: number;
  name: string;
  isConnected: boolean;
  connectionAttempts: number;
  lastConnectionAttempt: number;
} {
  const connection = mongoose.connection;
  
  return {
    readyState: connection.readyState,
    host: connection.host || "unknown",
    port: connection.port || 0,
    name: connection.name || "unknown",
    isConnected: connection.readyState === 1,
    connectionAttempts,
    lastConnectionAttempt,
  };
}

/**
 * Check if database is connected
 */
export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

/**
 * Wait for database connection with timeout
 */
export async function waitForConnection(timeoutMs: number = 10000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const checkConnection = () => {
      if (mongoose.connection.readyState === 1) {
        resolve(true);
        return;
      }
      
      if (Date.now() - startTime > timeoutMs) {
        resolve(false);
        return;
      }
      
      setTimeout(checkConnection, 100);
    };
    
    checkConnection();
  });
}

/**
 * Disconnect from database
 */
export async function disconnectDB(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      logger.info("Database disconnected successfully");
    }
  } catch (error) {
    logger.error("Error disconnecting from database", error as Error);
    throw error;
  }
}

/**
 * Connect to MongoDB with comprehensive error handling and retry logic
 * Works in both Next.js API routes and standalone scripts
 */
export const connectDB = async (): Promise<void> => {
  try {
    // Ensure environment variables are loaded (for scripts)
    ensureEnvLoaded();
    
    // Validate environment variables
    const validation = validateEnvironment();
    if (!validation.isValid) {
      const error = new Error(`Database configuration error: ${validation.error}`);
      logger.error("Database configuration validation failed", error);
      throw error;
    }
    
    // Check if already connected
    if (mongoose.connection.readyState >= 1) {
      logger.debug("Database already connected", {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        name: mongoose.connection.name,
      });
      return;
    }
    
    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
      logger.warn("Database connection already in progress, waiting...");
      const connected = await waitForConnection(30000); // Wait up to 30 seconds
      if (!connected) {
        throw new Error("Database connection timeout - another connection attempt is in progress");
      }
      return;
    }
    
    isConnecting = true;
    connectionAttempts++;
    lastConnectionAttempt = Date.now();
    
    const mongoUri = getMongoUri()!;
    
    logger.info("Attempting to connect to database", {
      attempt: connectionAttempts,
      host: new URL(mongoUri).hostname,
    });
    
    // Set up connection event listeners
    setupConnectionListeners();
    
    // Attempt connection with retry logic
    await connectWithRetry(mongoUri);
    
    logger.info("Database connected successfully", {
      host: mongoose.connection.host,
      port: mongoose.connection.port,
      name: mongoose.connection.name,
      readyState: mongoose.connection.readyState,
    });
    
  } catch (error) {
    const err = error as Error;
    logger.error("Database connection failed", err, {
      attempt: connectionAttempts,
      readyState: mongoose.connection.readyState,
    });
    
    // Reset connection state on failure
    isConnecting = false;
    
    throw new Error(`Database connection failed: ${err.message}`);
  } finally {
    isConnecting = false;
  }
};

/**
 * Connect to MongoDB with retry logic
 */
async function connectWithRetry(uri: string): Promise<void> {
  let lastError: Error | null = null;

  // Get database name at connection time (after env vars are loaded)
  const dbName = getDatabaseName();
  logger.debug("Using database", { dbName, source: process.env.MONGODB_DATABASE || process.env.MONGO_DATABASE || "default" });
  
  const DB_CONFIG = {
    ...DB_CONFIG_BASE,
    dbName,
  };

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      await mongoose.connect(uri, DB_CONFIG);
      return; // Success
    } catch (error) {
      lastError = error as Error;

      logger.warn(`Database connection attempt ${attempt} failed`, {
        error: lastError.message,
        attempt,
        maxRetries: RETRY_CONFIG.maxRetries,
      });

      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = RETRY_CONFIG.retryDelay * attempt; // Exponential backoff
        logger.info(`Retrying database connection in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Database connection failed after all retry attempts");
}

/**
 * Set up MongoDB connection event listeners
 */
function setupConnectionListeners(): void {
  const connection = mongoose.connection;
  
  connection.on("connected", () => {
    logger.info("MongoDB connected", {
      host: connection.host,
      port: connection.port,
      name: connection.name,
    });
  });
  
  connection.on("error", (error) => {
    logger.error("MongoDB connection error", error, {
      readyState: connection.readyState,
      host: connection.host,
    });
  });
  
  connection.on("disconnected", () => {
    logger.warn("MongoDB disconnected", {
      readyState: connection.readyState,
      host: connection.host,
    });
  });
  
  connection.on("reconnected", () => {
    logger.info("MongoDB reconnected", {
      host: connection.host,
      port: connection.port,
      name: connection.name,
    });
  });
  
  connection.on("close", () => {
    logger.info("MongoDB connection closed");
  });
  
  // Handle process termination
  process.on("SIGINT", async () => {
    logger.info("Received SIGINT, closing database connection...");
    try {
      await disconnectDB();
      process.exit(0);
    } catch (error) {
      logger.error("Error closing database connection", error as Error);
      process.exit(1);
    }
  });
  
  process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM, closing database connection...");
    try {
      await disconnectDB();
      process.exit(0);
    } catch (error) {
      logger.error("Error closing database connection", error as Error);
      process.exit(1);
    }
  });
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  status: "healthy" | "unhealthy" | "connecting";
  message: string;
  details: {
    readyState: number;
    host: string;
    port: number;
    name: string;
    connectionAttempts: number;
    lastConnectionAttempt: number;
  };
}> {
  try {
    const state = getConnectionState();
    
    if (state.isConnected) {
      return {
        status: "healthy",
        message: "Database connection is healthy",
        details: state,
      };
    }
    
    if (isConnecting) {
      return {
        status: "connecting",
        message: "Database connection is in progress",
        details: state,
      };
    }
    
    return {
      status: "unhealthy",
      message: "Database is not connected",
      details: state,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      message: `Database health check failed: ${(error as Error).message}`,
      details: {
        readyState: 0,
        host: "unknown",
        port: 0,
        name: "unknown",
        connectionAttempts,
        lastConnectionAttempt,
      },
    };
  }
}
