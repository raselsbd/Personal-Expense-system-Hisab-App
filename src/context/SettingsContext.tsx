import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getSettings, updateSettings as persistSettings } from '../db/settingsRepo';
import type { AppSettings } from '../types';

interface SettingsContextValue {
  settings: AppSettings | null;
  refresh: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const refresh = useCallback(async () => {
    const s = await getSettings();
    setSettings(s);
  }, []);

  const updateSettings = useCallback(
    async (partial: Partial<AppSettings>) => {
      await persistSettings(partial);
      await refresh();
    },
    [refresh]
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <SettingsContext.Provider value={{ settings, refresh, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
