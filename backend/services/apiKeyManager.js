const axios = require('axios');

/**
 * API Key Manager with rotation, retry logic, and rate limiting
 * Handles multiple Gemini API keys with automatic failover
 */
class ApiKeyManager {
  constructor() {
    // Collect all available API keys
    this.apiKeys = [];
    this.currentKeyIndex = 0;
    this.keyFailures = new Map(); // Track failures per key
    this.keyCooldowns = new Map(); // Track cooldown periods
    this.requestQueue = [];
    this.isProcessingQueue = false;
    
    // Rate limiting: max requests per minute per key
    this.maxRequestsPerMinute = 15; // Conservative limit
    this.requestTimestamps = new Map(); // Track request timestamps per key
    
    // Initialize keys
    this.initializeKeys();
  }

  initializeKeys() {
    // Primary key
    if (process.env.GEMINI_API_KEY) {
      this.apiKeys.push(process.env.GEMINI_API_KEY);
    }
    
    // Additional keys
    if (process.env.GEMINI_API_KEY1) {
      this.apiKeys.push(process.env.GEMINI_API_KEY1);
    }
    if (process.env.GEMINI_API_KEY2) {
      this.apiKeys.push(process.env.GEMINI_API_KEY2);
    }
    if (process.env.GEMINI_API_KEY3) {
      this.apiKeys.push(process.env.GEMINI_API_KEY3);
    }

    if (this.apiKeys.length === 0) {
      console.error('No Gemini API keys found in environment variables!');
    } else {
      console.log(`Initialized ${this.apiKeys.length} Gemini API key(s)`);
    }
  }

  /**
   * Get the next available API key with round-robin rotation
   */
  getNextKey() {
    if (this.apiKeys.length === 0) {
      return null;
    }

    let attempts = 0;
    while (attempts < this.apiKeys.length) {
      const key = this.apiKeys[this.currentKeyIndex];
      const keyId = this.currentKeyIndex;

      // Check if key is in cooldown
      const cooldownUntil = this.keyCooldowns.get(keyId);
      if (cooldownUntil && Date.now() < cooldownUntil) {
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        attempts++;
        continue;
      }

      // Check rate limit
      if (this.isRateLimited(keyId)) {
        this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
        attempts++;
        continue;
      }

      // Return this key
      this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
      return { key, keyId };
    }

    // All keys are rate limited or in cooldown, return first key anyway
    return { key: this.apiKeys[0], keyId: 0 };
  }

  /**
   * Check if a key is rate limited
   */
  isRateLimited(keyId) {
    const timestamps = this.requestTimestamps.get(keyId) || [];
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old timestamps
    const recentTimestamps = timestamps.filter(ts => ts > oneMinuteAgo);
    this.requestTimestamps.set(keyId, recentTimestamps);

    return recentTimestamps.length >= this.maxRequestsPerMinute;
  }

  /**
   * Record a request for rate limiting
   */
  recordRequest(keyId) {
    const timestamps = this.requestTimestamps.get(keyId) || [];
    timestamps.push(Date.now());
    this.requestTimestamps.set(keyId, timestamps);
  }

  /**
   * Mark a key as failed and set cooldown
   */
  markKeyFailed(keyId, error) {
    const failures = this.keyFailures.get(keyId) || 0;
    this.keyFailures.set(keyId, failures + 1);

    // Set cooldown based on error type
    let cooldownMs = 60000; // 1 minute default

    if (error?.response?.status === 429) {
      // Rate limit error - longer cooldown
      cooldownMs = 300000; // 5 minutes
      console.warn(`API key ${keyId} rate limited. Cooldown: ${cooldownMs / 1000}s`);
    } else if (error?.response?.status === 403) {
      // Quota exceeded - very long cooldown
      cooldownMs = 1800000; // 30 minutes
      console.warn(`API key ${keyId} quota exceeded. Cooldown: ${cooldownMs / 1000}s`);
    }

    this.keyCooldowns.set(keyId, Date.now() + cooldownMs);
  }

  /**
   * Reset failure count for a key (on success)
   */
  markKeySuccess(keyId) {
    this.keyFailures.set(keyId, 0);
  }

  /**
   * Make API call with retry logic and key rotation
   */
  async makeRequest(url, data, options = {}, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt++) {
      const keyInfo = this.getNextKey();
      
      if (!keyInfo || !keyInfo.key) {
        throw new Error('No available API keys');
      }

      const { key, keyId } = keyInfo;
      // Construct URL with API key
      const separator = url.includes('?') ? '&' : '?';
      const requestUrl = `${url}${separator}key=${key}`;

      try {
        // Check rate limit before making request
        if (this.isRateLimited(keyId)) {
          if (attempt < retries - 1) {
            // Wait a bit and try next key
            await this.sleep(1000);
            continue;
          }
        }

        const response = await axios.post(requestUrl, data, {
          ...options,
          timeout: 30000, // 30 second timeout
        });

        // Success - record request and reset failures
        this.recordRequest(keyId);
        this.markKeySuccess(keyId);

        return response;
      } catch (error) {
        const status = error?.response?.status;
        const statusText = error?.response?.statusText;

        console.error(`API call failed (attempt ${attempt + 1}/${retries}) with key ${keyId}:`, {
          status,
          statusText,
          message: error.message
        });

        // Mark key as failed
        this.markKeyFailed(keyId, error);

        // If it's a client error (4xx) that's not rate limit, don't retry
        if (status >= 400 && status < 500 && status !== 429) {
          throw error;
        }

        // If last attempt, throw error
        if (attempt === retries - 1) {
          throw error;
        }

        // Exponential backoff: wait before retrying
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        await this.sleep(backoffMs);
      }
    }

    throw new Error('All retry attempts exhausted');
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const apiKeyManager = new ApiKeyManager();

module.exports = apiKeyManager;
