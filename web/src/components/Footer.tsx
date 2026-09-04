import Link from "next/link";

import { LogoMark } from "@/components/Logo";
import type { Dictionary, Locale } from "@/lib/i18n";
import { anchor } from "@/lib/round";

export function Footer({ locale, t }: { locale: Locale; t: Dictionary }) {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-8">
        <div className="max-w-sm space-y-3">
          <LogoMark className="h-5 w-5 text-ivory" />
          <p className="text-[13px] leading-relaxed text-faint">{t.footer.disclaimer}</p>
          <p className="text-[13px] text-faint">{t.footer.built}</p>
        </div>

        <div className="flex gap-12 text-[13px]">
          <ul className="space-y-2">
            <li>
              <Link href={`/${locale}/round`} className="text-quiet hover:text-ivory">
                {t.nav.round}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/verify`} className="text-quiet hover:text-ivory">
                {t.nav.verify}
              </Link>
            </li>
            <li>
              <Link href={`/${locale}/docs`} className="text-quiet hover:text-ivory">
                {t.nav.docs}
              </Link>
            </li>
          </ul>
          <ul className="space-y-2">
            <li>
              <a
                href="https://github.com/bryankwandou/blindband"
                target="_blank"
                rel="noreferrer noopener"
                className="text-quiet hover:text-ivory"
              >
                GitHub
              </a>
            </li>
            <li>
              <a
                href={anchor.explorerUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-quiet hover:text-ivory"
              >
                Solana anchor
              </a>
            </li>
            <li>
              <a
                href="https://docs.terminal3.io/developers/adk/get-started/quickstart"
                target="_blank"
                rel="noreferrer noopener"
                className="text-quiet hover:text-ivory"
              >
                Terminal 3 ADK
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
