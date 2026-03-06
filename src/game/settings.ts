import { useState, useEffect, useCallback } from 'react';

export interface Settings {
  joystickEnabled: boolean;
  soundEnabled: boolean;
}

const STORAGE_KEY = 'labyrinth-settings';

const DEFAULTS: Settings = {
  joystickEnabled: false,
  soundEnabled: true,
};

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return { ...DEFAULTS };
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  const settings = getSettings();
  settings[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent('settings-change', { detail: settings }));
}

export function useSettings(): [Settings, <K extends keyof Settings>(key: K, value: Settings[K]) => void] {
  const [settings, setSettings] = useState(getSettings);

  useEffect(() => {
    const handler = (e: Event) => {
      setSettings((e as CustomEvent<Settings>).detail);
    };
    window.addEventListener('settings-change', handler);
    return () => window.removeEventListener('settings-change', handler);
  }, []);

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSetting(key, value);
  }, []);

  return [settings, update];
}
