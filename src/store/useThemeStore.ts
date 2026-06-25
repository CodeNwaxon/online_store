import { create } from 'zustand';
import { useEffect } from 'react';

interface ThemeState {
  isPartnershipDarkMode: boolean;
  _hydrated: boolean;
  setIsPartnershipDarkMode: (isDark: boolean) => void;
  _hydrate: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isPartnershipDarkMode: true, // SSR-safe default
  _hydrated: false,
  setIsPartnershipDarkMode: (isDark) => {
    try { localStorage.setItem('partnershipDarkMode', String(isDark)); } catch {}
    set({ isPartnershipDarkMode: isDark });
  },
  _hydrate: () => {
    try {
      const stored = localStorage.getItem('partnershipDarkMode');
      if (stored !== null) {
        set({ isPartnershipDarkMode: stored === 'true', _hydrated: true });
      } else {
        set({ _hydrated: true });
      }
    } catch {
      set({ _hydrated: true });
    }
  },
}));

/** Call this hook once in any component that needs the persisted theme on mount */
export function useHydrateTheme() {
  const hydrate = useThemeStore((s) => s._hydrate);
  const hydrated = useThemeStore((s) => s._hydrated);
  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrate, hydrated]);
}
