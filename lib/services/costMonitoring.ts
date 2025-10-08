/**
 * Cost Monitoring Service
 * Track and monitor operational costs
 * Requirements: 10.1, 10.2, 10.4
 */

import { alertingService, AlertType, AlertSeverity } from './alerting';
import { monitoringService, MetricType } from './monitoring';

export interface CostMetrics {
  transcription: number;
  aiProcessing: number;
  storage: number;
  database: number;
  total: number;
}

export interface UsageMetrics {
  activeUsers: number;
  transcriptionMinutes: number;
  aiRequests: number;
  storageGB: number;
}

class CostMonitoringService {
  // Cost per unit (in USD)
  private readonly COSTS = {
    deepgram: 0.0043, // per minute
    assemblyai: 0.00025, // per second
    openai_gpt4o: 0.005, // per 1K tokens (input)
    openai_gpt4o_output: 0.015, // per 1K tokens (output)
    storage: 0.023, // per GB per month
    database: 0.0001, // per query (estimated)
  };

  private usageMetrics: UsageMetrics = {
    activeUsers: 0,
    transcriptionMinutes: 0,
    aiRequests: 0,
    storageGB: 0,
  };

  private costMetrics: CostMetrics = {
    transcription: 0,
    aiProcessing: 0,
    storage: 0,
    database: 0,
    total: 0,
  };

  /**
   * Track transcription cost
   */
  trackTranscriptionCost(
    provider: 'deepgram' | 'assemblyai',
    durationSeconds: number
  ): void {
    let cost = 0;

    if (provider === 'deepgram') {
      cost = (durationSeconds / 60) * this.COSTS.deepgram;
    } else {
      cost = durationSeconds * this.COSTS.assemblyai;
    }

    this.costMetrics.transcription += cost;
    this.costMetrics.total += cost;
    this.usageMetrics.transcriptionMinutes += durationSeconds / 60;

    monitoringService.log('debug', 'Transcription cost tracked', {
      provider,
      durationSeconds,
      cost,
    });

    this.checkCostThresholds();
  }

  /**
   * Track AI processing cost
   */
  trackAIProcessingCost(inputTokens: number, outputTokens: number): void {
    const inputCost = (inputTokens / 1000) * this.COSTS.openai_gpt4o;
    const outputCost = (outputTokens / 1000) * this.COSTS.openai_gpt4o_output;
    const totalCost = inputCost + outputCost;

    this.costMetrics.aiProcessing += totalCost;
    this.costMetrics.total += totalCost;
    this.usageMetrics.aiRequests++;

    monitoringService.log('debug', 'AI processing cost tracked', {
      inputTokens,
      outputTokens,
      cost: totalCost,
    });

    this.checkCostThresholds();
  }

  /**
   * Track storage cost
   */
  trackStorageCost(sizeGB: number): void {
    const monthlyCost = sizeGB * this.COSTS.storage;
    const dailyCost = monthlyCost / 30;

    this.costMetrics.storage += dailyCost;
    this.costMetrics.total += dailyCost;
    this.usageMetrics.storageGB = sizeGB;

    monitoringService.log('debug', 'Storage cost tracked', {
      sizeGB,
      dailyCost,
    });
  }

  /**
   * Track database cost
   */
  trackDatabaseCost(queryCount: number): void {
    const cost = queryCount * this.COSTS.database;

    this.costMetrics.database += cost;
    this.costMetrics.total += cost;

    monitoringService.log('debug', 'Database cost tracked', {
      queryCount,
      cost,
    });
  }

  /**
   * Update active user count
   */
  updateActiveUsers(count: number): void {
    this.usageMetrics.activeUsers = count;
    this.checkCostThresholds();
  }

  /**
   * Get cost per user
   */
  getCostPerUser(): number {
    if (this.usageMetrics.activeUsers === 0) {
      return 0;
    }
    return this.costMetrics.total / this.usageMetrics.activeUsers;
  }

  /**
   * Get cost metrics
   */
  getCostMetrics(): CostMetrics & { costPerUser: number } {
    return {
      ...this.costMetrics,
      costPerUser: this.getCostPerUser(),
    };
  }

  /**
   * Get usage metrics
   */
  getUsageMetrics(): UsageMetrics {
    return { ...this.usageMetrics };
  }

  /**
   * Check cost thresholds and create alerts
   */
  private checkCostThresholds(): void {
    const costPerUser = this.getCostPerUser();

    // Record metric
    monitoringService.recordMetric(
      MetricType.COST_PER_USER,
      costPerUser,
      'USD'
    );

    // Check threshold (target: $0.31, alert: $0.35)
    if (costPerUser > 0.35) {
      alertingService.checkCostThresholds(costPerUser);
    }

    // Check if approaching budget limit
    if (costPerUser > 0.40) {
      monitoringService.log('critical', 'Cost per user exceeds critical threshold', {
        costPerUser,
        target: 0.31,
        threshold: 0.35,
        critical: 0.40,
      });
    }
  }

  /**
   * Reset metrics (for new billing period)
   */
  resetMetrics(): void {
    this.costMetrics = {
      transcription: 0,
      aiProcessing: 0,
      storage: 0,
      database: 0,
      total: 0,
    };

    this.usageMetrics = {
      activeUsers: 0,
      transcriptionMinutes: 0,
      aiRequests: 0,
      storageGB: 0,
    };

    monitoringService.log('info', 'Cost metrics reset for new billing period');
  }

  /**
   * Get cost breakdown
   */
  getCostBreakdown(): {
    breakdown: Array<{ category: string; cost: number; percentage: number }>;
    total: number;
  } {
    const total = this.costMetrics.total;

    const breakdown = [
      {
        category: 'Transcription',
        cost: this.costMetrics.transcription,
        percentage: total > 0 ? (this.costMetrics.transcription / total) * 100 : 0,
      },
      {
        category: 'AI Processing',
        cost: this.costMetrics.aiProcessing,
        percentage: total > 0 ? (this.costMetrics.aiProcessing / total) * 100 : 0,
      },
      {
        category: 'Storage',
        cost: this.costMetrics.storage,
        percentage: total > 0 ? (this.costMetrics.storage / total) * 100 : 0,
      },
      {
        category: 'Database',
        cost: this.costMetrics.database,
        percentage: total > 0 ? (this.costMetrics.database / total) * 100 : 0,
      },
    ];

    return { breakdown, total };
  }

  /**
   * Get cost projection
   */
  getCostProjection(daysElapsed: number): {
    currentDaily: number;
    projectedMonthly: number;
    projectedPerUser: number;
  } {
    const currentDaily = this.costMetrics.total / Math.max(daysElapsed, 1);
    const projectedMonthly = currentDaily * 30;
    const projectedPerUser =
      this.usageMetrics.activeUsers > 0
        ? projectedMonthly / this.usageMetrics.activeUsers
        : 0;

    return {
      currentDaily,
      projectedMonthly,
      projectedPerUser,
    };
  }
}

// Singleton instance
export const costMonitoringService = new CostMonitoringService();
