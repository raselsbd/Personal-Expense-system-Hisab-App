import { getValue, setValue } from '../db/settingsRepo';
import { getSumByTypeInRange } from '../db/personalRepo';
import { getSettings } from '../db/settingsRepo';
import { getEffectiveMonthlyThreshold } from '../db/monthlyThresholdRepo';
import { getCostStatus } from './costStatus';
import { currentMonthRange } from './dateUtils';
import { sendImmediateAlert } from './notifications';

const ALERT_STATE_KEY = 'lastThresholdAlert'; // "yyyy-MM:status"

/**
 * Sends at most one alert per (month, status) combo so re-checking on every
 * dashboard load doesn't spam notifications as the user keeps adding costs.
 */
export async function checkMonthlyThresholdAlert(): Promise<void> {
  const settings = await getSettings();
  const { start, end } = currentMonthRange();
  const monthExpense = await getSumByTypeInRange('expense', start, end);
  const effectiveThreshold = await getEffectiveMonthlyThreshold(start.slice(0, 7), settings.monthlyThreshold);
  const status = getCostStatus(
    monthExpense,
    effectiveThreshold,
    settings.majorThresholdPct,
    settings.criticalThresholdPct
  );

  if (status === 'good') return;

  const monthKey = start.slice(0, 7);
  const stateKey = `${monthKey}:${status}`;
  const lastState = await getValue(ALERT_STATE_KEY);
  if (lastState === stateKey) return;

  await setValue(ALERT_STATE_KEY, stateKey);

  if (status === 'critical') {
    await sendImmediateAlert(
      'Monthly cost is critical',
      `Your personal cost has crossed the critical level of your ${effectiveThreshold} threshold this month.`
    );
  } else {
    await sendImmediateAlert(
      'Monthly cost is running high',
      `Your personal cost has crossed the major level of your monthly threshold.`
    );
  }
}
