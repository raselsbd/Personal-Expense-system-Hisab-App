import type { CostStatus } from '../types';

export function getCostStatus(
  currentMonthCost: number,
  monthlyThreshold: number,
  majorThresholdPct: number,
  criticalThresholdPct: number
): CostStatus {
  if (monthlyThreshold <= 0) return 'good';
  const pct = (currentMonthCost / monthlyThreshold) * 100;
  if (pct >= criticalThresholdPct) return 'critical';
  if (pct >= majorThresholdPct) return 'major';
  return 'good';
}

export function getCostStatusLabel(status: CostStatus): string {
  switch (status) {
    case 'good':
      return 'Good';
    case 'major':
      return 'Major';
    case 'critical':
      return 'Critical';
  }
}
