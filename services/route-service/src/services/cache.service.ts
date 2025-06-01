import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, { value: unknown; expiry: number }>();
  private readonly redisEnabled = false; // TODO: Implement Redis integration

  constructor(private readonly _configService: ConfigService) {
    // Start cleanup interval for in-memory cache
    setInterval(() => this.cleanup(), 60000); // Cleanup every minute
    // TODO: Use configService for Redis configuration in the future
    void this._configService;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redisEnabled) {
        // TODO: Implement Redis get
        return null;
      }

      const item = this.cache.get(key);
      if (!item) {
        return null;
      }

      if (Date.now() > item.expiry) {
        this.cache.delete(key);
        return null;
      }

      return item.value as T;
    } catch (error) {
      this.logger.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      if (this.redisEnabled) {
        // TODO: Implement Redis set
        return;
      }

      const expiry = Date.now() + ttlSeconds * 1000;
      this.cache.set(key, { value, expiry });
    } catch (error) {
      this.logger.error(`Cache set error for key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.redisEnabled) {
        // TODO: Implement Redis delete
        return;
      }

      this.cache.delete(key);
    } catch (error) {
      this.logger.error(`Cache delete error for key ${key}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.redisEnabled) {
        // TODO: Implement Redis clear
        return;
      }

      this.cache.clear();
    } catch (error) {
      this.logger.error('Cache clear error:', error);
    }
  }

  private cleanup(): void {
    if (this.redisEnabled) {
      return; // Redis handles expiry automatically
    }

    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.cache.delete(key));

    if (keysToDelete.length > 0) {
      this.logger.debug(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  getStats(): { size: number; keys: string[] } {
    if (this.redisEnabled) {
      // TODO: Implement Redis stats
      return { size: 0, keys: [] };
    }

    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
