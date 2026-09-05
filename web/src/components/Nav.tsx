"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Wordmark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LOCALES, LOCALE_LABELS, type Dictionary, type Locale } from "@/lib/i18n";

const REPO = "https://github.com/bryankwandou/blindband";

export function Nav({ locale, t }: { locale: Locale; t: Dictionary }) {
  const pathname = usePathname();
  const [lifted, setLifted] = useState(false);

  // The bar only grows a border once the page has moved. A permanent divider
  // under a transparent header is a line that means nothing.
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** Swap only the locale segment, so a switch keeps you on the same page. */
  const swap = (next: Locale) => {
    const rest = pathname.split("/").slice(2).join("/");
    return `/${next}${rest ? `/${rest}` : ""}`;
  };

  const links = [
    { href: `/${locale}/round`, label: t.nav.round },
    { href: `/${locale}/verify`, label: t.nav.verify },
    { href: `/${locale}/docs`, label: t.nav.docs },
  ];

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        lifted ? "border-line bg-ink/85 backdrop-blur-md" : "border-transparent bg-transparent"
      }`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded focus:bg-fill focus:px-3 focus:py-1.5 focus:text-sm focus:font-medium focus:text-on-fill"
      >
        {t.nav.skip}
      </a>

      <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5 sm:px-8">
        <Link href={`/${locale}`} className="shrink-0 transition-opacity hover:opacity-80">
          <Wordmark />
          <span className="sr-only">Blindband</span>
        </Link>

        <div className="ml-auto hidden items-center gap-6 sm:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[13.5px] transition-colors ${
                  active ? "text-ivory" : "text-quiet hover:text-ivory"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
          <ThemeToggle t={t} />

          <div className="flex items-center rounded-full border border-line p-0.5">
            {LOCALES.map((l) => (
              <Link
                key={l}
                href={swap(l)}
                hrefLang={l}
                aria-current={l === locale ? "true" : undefined}
                title={LOCALE_LABELS[l]}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider transition-colors ${
                  l === locale ? "bg-line-bright text-ivory" : "text-faint hover:text-ivory"
                }`}
              >
                {l}
              </Link>
            ))}
          </div>

          <a
            href={REPO}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-2 hidden text-[13.5px] text-quiet transition-colors hover:text-ivory sm:inline"
          >
            {t.nav.source}
          </a>
        </div>
      </nav>

      <div className="flex gap-5 overflow-x-auto border-t border-line px-5 py-2 text-[13px] sm:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="whitespace-nowrap text-quiet">
            {l.label}
          </Link>
        ))}
        <a href={REPO} target="_blank" rel="noreferrer noopener" className="whitespace-nowrap text-quiet">
          {t.nav.source}
        </a>
      </div>
    </header>
  );
}
