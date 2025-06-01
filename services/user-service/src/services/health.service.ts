import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    memory: HealthCheck;
    dependencies: HealthCheck;
  };
}

export interface HealthCheck {
  status: 'pass' | 'fail' | 'warn';
  responseTime?: number;
  details?: Record<string, unknown>;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const checks = await this.performHealthChecks();
    const overallStatus = this.determineOverallStatus(checks);

    return {
      status: overallStatus,
      service: 'user-service',
      version: process.env.npm_package_version || '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      checks,
    };
  }

  private async performHealthChecks() {
    const [database, memory, dependencies] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkMemory(),
      this.checkDependencies(),
    ]);

    return {
      database: database.status === 'fulfilled' ? database.value : this.createFailCheck(database.reason),
      memory: memory.status === 'fulfilled' ? memory.value : this.createFailCheck(memory.reason),
      dependencies: dependencies.status === 'fulfilled' ? dependencies.value : this.createFailCheck(dependencies.reason),
    };
  }

  private async checkDatabase(): Promise<HealthCheck> {
    const startTime = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'pass',
        responseTime: Date.now() - startTime,
        details: {
          connection: 'active',
          database: this.dataSource.options.database,
        },
      };
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      return {
        status: 'fail',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  private async checkMemory(): Promise<HealthCheck> {
    try {
      const memUsage = process.memoryUsage();
      const totalMemory = memUsage.heapTotal;
      const usedMemory = memUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;

      return {
        status: memoryUsagePercent > 90 ? 'warn' : 'pass',
        details: {
          usedMemory: Math.round(usedMemory / 1024 / 1024), // MB
          totalMemory: Math.round(totalMemory / 1024 / 1024), // MB
          usagePercent: Math.round(memoryUsagePercent * 100) / 100,
        },
      };
    } catch (error) {
      return this.createFailCheck(error);
    }
  }

  private async checkDependencies(): Promise<HealthCheck> {
    try {
      // Check if critical environment variables are set
      const requiredEnvVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'KEYCLOAK_URL',
      ];

      const missingVars = requiredEnvVars.filter(
        (varName) => !this.configService.get(varName.toLowerCase().replace('_', '.'))
      );

      if (missingVars.length > 0) {
        return {
          status: 'fail',
          error: `Missing required environment variables: ${missingVars.join(', ')}`,
        };
      }

      return {
        status: 'pass',
        details: {
          requiredEnvVars: requiredEnvVars.length,
          configuredVars: requiredEnvVars.length - missingVars.length,
        },
      };
    } catch (error) {
      return this.createFailCheck(error);
    }
  }

  private createFailCheck(error: unknown): HealthCheck {
    return {
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  private determineOverallStatus(checks: Record<string, HealthCheck>): 'healthy' | 'unhealthy' | 'degraded' {
    const checkValues = Object.values(checks);
    const hasFailures = checkValues.some(check => check.status === 'fail');
    const hasWarnings = checkValues.some(check => check.status === 'warn');

    if (hasFailures) return 'unhealthy';
    if (hasWarnings) return 'degraded';
    return 'healthy';
  }
}