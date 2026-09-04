import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import { LOCALES, getDictionary, isLocale, type Locale } from "@/lib/i18n";

/**
 * The locale segment is the root layout. There is no locale-less page — every
 * route carries its language in the path, so a link someone pastes into a chat
 * arrives in the language they were reading.
 */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);

  return {
    title: t.meta.title,
    description: t.meta.description,
    metadataBase: new URL("https://bryankwandou.github.io/blindband"),
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      title: t.meta.title,
      description: t.meta.description,
      locale,
      type: "website",
    },
    icons: {
      icon: [{ url: "/mark.svg", type: "image/svg+xml" }],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale as Locale);

  return (
    <html lang={locale}>
      <body className="min-h-screen antialiased">
        <Nav locale={locale as Locale} t={t} />
        <main id="main">{children}</main>
        <Footer locale={locale as Locale} t={t} />
      </body>
    </html>
  );
}
