import { useCallback } from 'react';
import { useSettings } from '../context/SettingsContext';
import { translations, TranslationKey } from './translations';
import type { AccountType } from '../types';

export function useTranslation() {
  const { settings } = useSettings();
  const lang = settings?.language ?? 'en';

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[key][lang] || translations[key].en;
    },
    [lang]
  );

  return { t, lang };
}

const CATEGORY_KEY_MAP: Record<string, TranslationKey> = {
  Salary: 'catSalary',
  Freelance: 'catFreelance',
  Gift: 'catGift',
  Other: 'catOther',
  Food: 'catFood',
  Transport: 'catTransport',
  Bills: 'catBills',
  Shopping: 'catShopping',
  Health: 'catHealth',
  'Project Settlement': 'catProjectSettlement',
  'Loan Given': 'catLoanGiven',
  'Loan Returned': 'catLoanReturned',
  Transfer: 'catTransfer',
};

const ACCOUNT_KEY_MAP: Record<AccountType, TranslationKey> = {
  cash: 'accountCash',
  bkash: 'accountBkash',
  bank: 'accountBank',
};

export function translateAccount(account: AccountType, lang: 'en' | 'bn'): string {
  const key = ACCOUNT_KEY_MAP[account] ?? 'accountCash';
  return translations[key][lang] || translations[key].en;
}

export function translateCategory(category: string, lang: 'en' | 'bn'): string {
  const key = CATEGORY_KEY_MAP[category];
  if (!key) return category;
  return translations[key][lang] || category;
}
