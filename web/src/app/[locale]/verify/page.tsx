import Link from "next/link";
import { notFound } from "next/navigation";

import { Reveal } from "@/components/Reveal";
import { Verifier } from "@/components/Verifier";
import { getDictionary, isLocale } from "@/lib/i18n";
import { anchor, roundRaw, sampleReceipts } from "@/lib/round";

export default async function VerifyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);

  return (
    <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
      <Link href={`/${locale}`} className="text-[13px] text-quiet hover:text-ivory">
        ← {t.pages.verify.back}
      </Link>

      <Reveal>
        <h1 className="mt-6 text-[2rem] font-semibold tracking-[-0.025em] text-ivory sm:text-[2.6rem]">
          {t.pages.verify.title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-[1.7] text-quiet">
          {t.pages.verify.lede}
        </p>
      </Reveal>

      <Reveal delay={0.06}>
        <div className="mt-10">
          <Verifier t={t} roundRaw={roundRaw} anchor={anchor} samples={sampleReceipts} />
        </div>
      </Reveal>

      {/* The middle check has no widget, because it is the one the browser
          cannot do alone — it is stated here so the numbering is not a lie. */}
      <Reveal delay={0.1}>
        <section className="mt-4 rounded-xl border border-line bg-ink-raised p-6">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.14em] text-faint">02</p>
          <h2 className="mt-2 text-[17px] font-medium text-ivory">{t.verify.step2}</h2>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-quiet">
            {t.verify.step2Body}
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[12px] text-faint">signature</dt>
              <dd className="mt-1 break-all font-mono text-[12px] text-quiet">{anchor.signature}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-faint">slot</dt>
              <dd className="mt-1 font-mono text-[12px] text-quiet">{anchor.slot}</dd>
            </div>
            <div>
              <dt className="text-[12px] text-faint">anchored at</dt>
              <dd className="mt-1 font-mono text-[12px] text-quiet">
                {anchor.anchoredAt.replace("T", " ").slice(0, 19)} UTC
              </dd>
            </div>
          </dl>
        </section>
      </Reveal>

      <Reveal delay={0.12}>
        <p className="mt-8 max-w-3xl text-[13.5px] leading-relaxed text-faint">
          {t.verify.sampleNote.split("`").map((part, i) =>
            i % 2 === 1 ? (
              <code key={i} className="font-mono text-quiet">
                {part}
              </code>
            ) : (
              part
            ),
          )}
        </p>
      </Reveal>
    </div>
  );
}
