/**
 * Central configuration module for the wedding guest list backend.
 * Validates environment variables at startup and provides type-safe access.
 * Fails fast if required configuration is missing.
 */

import path from 'path';

// Configuration validation error
class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

// Environment type
type Environment = 'development' | 'production' | 'test';

interface AuthCredentials {
  username: string;
  password: string;
}

interface Config {
  // Server
  port: number;
  env: Environment;
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;

  // Authentication
  auth: {
    credentials: AuthCredentials[];
    sessionDurationMs: number;
    sessionCleanupIntervalMs: number;
  };

  // Data storage
  data: {
    filePath: string;
    directory: string;
  };

  // CORS
  cors: {
    allowedOrigins: string[];
    enabled: boolean;
  };

  // Validation limits
  validation: {
    maxNameLength: number;
    maxCategoryNameLength: number;
    maxFamilyNameLength: number;
    maxTagsPerGuest: number;
  };
}

/**
 * Validates that a required environment variable is set.
 * Returns the value if present, throws ConfigurationError if missing in production.
 */
function requireEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];

  if (value !== undefined && value.trim() !== '') {
    return value.trim();
  }

  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new ConfigurationError(
    `Required environment variable ${key} is not set. ` +
    `Please set it in your .env file or environment.`
  );
}

/**
 * Gets an optional environment variable with a default value.
 */
function getEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value !== undefined && value.trim() !== '' ? value.trim() : defaultValue;
}

/**
 * Parses an integer from environment variable.
 */
function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ConfigurationError(
      `Environment variable ${key} must be a valid integer, got: ${value}`
    );
  }
  return parsed;
}

/**
 * Parses a comma-separated list from environment variable.
 */
function getEnvList(key: string, defaultValue: string[]): string[] {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }
  return value.split(',').map(item => item.trim()).filter(item => item !== '');
}

/**
 * Builds and validates the configuration object.
 * Called once at startup - subsequent calls return cached config.
 */
function buildConfig(): Config {
  const env = getEnv('NODE_ENV', 'development') as Environment;
  const isProduction = env === 'production';
  const isDevelopment = env === 'development';
  const isTest = env === 'test';

  // In production, require explicit credentials
  // In development/test, allow defaults for convenience
  const credentials: AuthCredentials[] = [];

  if (isProduction) {
    // Production: require explicit credentials, no defaults
    const username1 = requireEnv('AUTH_USERNAME');
    const password1 = requireEnv('AUTH_PASSWORD');
    credentials.push({ username: username1, password: password1 });

    // Second credential pair is optional
    const username2 = process.env.AUTH_USERNAME_2?.trim();
    const password2 = process.env.AUTH_PASSWORD_2?.trim();
    if (username2 && password2) {
      credentials.push({ username: username2, password: password2 });
    }
  } else {
    // Development/Test: use defaults if not provided, but warn
    const username1 = getEnv('AUTH_USERNAME', '');
    const password1 = getEnv('AUTH_PASSWORD', '');

    if (!username1 || !password1) {
      console.warn(
        '\x1b[33m%s\x1b[0m',
        'WARNING: AUTH_USERNAME and AUTH_PASSWORD not set. ' +
        'Using development defaults. Do NOT use in production!'
      );
      credentials.push({ username: 'dev', password: 'dev' });
    } else {
      credentials.push({ username: username1, password: password1 });
    }

    // Second credential pair is optional
    const username2 = process.env.AUTH_USERNAME_2?.trim();
    const password2 = process.env.AUTH_PASSWORD_2?.trim();
    if (username2 && password2) {
      credentials.push({ username: username2, password: password2 });
    }
  }

  // CORS configuration
  const defaultOrigins = isDevelopment
    ? ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000']
    : [];
  const allowedOrigins = getEnvList('CORS_ALLOWED_ORIGINS', defaultOrigins);

  // Security warning for CORS wildcard in production
  if (isProduction && allowedOrigins.includes('*')) {
    console.warn(
      '\x1b[33m%s\x1b[0m',
      'SECURITY WARNING: CORS_ALLOWED_ORIGINS is set to "*" (wildcard) in production. ' +
      'This allows requests from any origin. For better security, specify explicit origins.'
    );
  }

  // Data file path - use env var if set, otherwise resolve relative to backend directory
  const dataFilePathEnv = process.env.DATA_FILE_PATH?.trim();
  const dataFilePath = dataFilePathEnv
    ? path.resolve(dataFilePathEnv)
    : path.join(path.resolve(__dirname, '../../data'), 'data.json');
  const dataDirectory = path.dirname(dataFilePath);

  return {
    port: getEnvInt('PORT', 5000),
    env,
    isProduction,
    isDevelopment,
    isTest,

    auth: {
      credentials,
      sessionDurationMs: getEnvInt('SESSION_DURATION_HOURS', 24) * 60 * 60 * 1000,
      sessionCleanupIntervalMs: getEnvInt('SESSION_CLEANUP_HOURS', 1) * 60 * 60 * 1000,
    },

    data: {
      filePath: dataFilePath,
      directory: dataDirectory,
    },

    cors: {
      allowedOrigins,
      enabled: allowedOrigins.length > 0 || isDevelopment,
    },

    validation: {
      maxNameLength: getEnvInt('MAX_NAME_LENGTH', 100),
      maxCategoryNameLength: getEnvInt('MAX_CATEGORY_NAME_LENGTH', 50),
      maxFamilyNameLength: getEnvInt('MAX_FAMILY_NAME_LENGTH', 100),
      maxTagsPerGuest: getEnvInt('MAX_TAGS_PER_GUEST', 20),
    },
  };
}

// Singleton config instance - built once on first access
let configInstance: Config | null = null;

/**
 * Gets the application configuration.
 * On first call, validates and builds the config.
 * Subsequent calls return the cached config.
 */
export function getConfig(): Config {
  if (configInstance === null) {
    configInstance = buildConfig();
  }
  return configInstance;
}

/**
 * Resets the config instance (useful for testing).
 */
export function resetConfig(): void {
  configInstance = null;
}

// Export the config type for use in other modules
export type { Config, AuthCredentials, Environment };
