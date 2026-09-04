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
