import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { loadRecents, loadSettings, pushRecent, saveSettings, type RecentItem, type Settings } from "./storage";

type SettingsContextValue = {
  settings: Settings;
  recents: RecentItem[];
  update: (patch: Partial<Settings>) => void;
  remember: (item: Omit<RecentItem, "at">) => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [recents, setRecents] = useState<RecentItem[]>(() => loadRecents());

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const remember = useCallback((item: Omit<RecentItem, "at">) => {
    setRecents(pushRecent(item));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      recents,
      update,
      remember,
    }),
    [settings, recents, update, remember]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("SettingsProvider missing");
  return ctx;
}
