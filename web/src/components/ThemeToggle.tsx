"use client";

import { useEffect, useState } from "react";

import type { Dictionary } from "@/lib/i18n";

export type Theme = "dark" | "light";

/**
 * The theme switch, and the one piece of state on this site that outlives a
 * page view.
 *
 * The choice is made three times, in this order: a stored preference, then the
 * operating system's, then dark. That order matters — a reader who has told
 * their machine they want light interfaces should not have to tell this site
 * separately, and a reader who has told *this site* should not be overruled by
 * their machine.
 *
 * The attribute is set by an inline script in the document head (see
 * `THEME_BOOTSTRAP`) rather than here, because a `useEffect` runs after first
 * paint and the reader would watch a dark page turn light. This component only
 * reads what that script already decided and offers to change it.
 */
export const THEME_STORAGE_KEY = "blindband:theme";

export const THEME_BOOTSTRAP = `(function(){try{var s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});var m=window.matchMedia("(prefers-color-scheme: light)").matches;document.documentElement.dataset.theme=s==="light"||s==="dark"?s:(m?"light":"dark")}catch(e){document.documentElement.dataset.theme="dark"}})()`;

export function ThemeToggle({ t }: { t: Dictionary }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    setTheme(current === "light" ? "light" : "dark");
  }, []);

  function choose(next: Theme) {
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // A browser with storage blocked still gets the switch, for this visit.
    }
  }

  // Until the effect has run the button would render the wrong icon on a
  // light-themed machine, so it renders a fixed-size placeholder instead. It
  // reserves the space, which keeps the nav from shifting when it fills in.
  if (theme === null) {
    return <div className="h-7 w-7" aria-hidden="true" />;
  }

  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => choose(next)}
      aria-label={theme === "dark" ? t.nav.themeLight : t.nav.themeDark}
      title={theme === "dark" ? t.nav.themeLight : t.nav.themeDark}
      className="grid h-7 w-7 place-items-center rounded-full text-quiet transition-colors hover:text-ivory"
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <g stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
        <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2" />
        <path d="M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4L17 7M7 17l-1.6 1.6" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[15px] w-[15px]" fill="none" aria-hidden="true">
      <path
        d="M20 14.2A8.4 8.4 0 019.8 4a8.4 8.4 0 1010.2 10.2z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
