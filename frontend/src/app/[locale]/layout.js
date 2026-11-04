import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Noto_Sans_Bengali, Noto_Serif_Bengali } from "next/font/google";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { routing } from "@/i18n/routing";
import { THEME_COLOR } from "@/lib/theme";
import "../globals.css";

// Only the weights the design uses (docs/RESPONSIVE.md §12). Body font preloaded, heading font not.
const notoSans = Noto_Sans_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-sans",
});

const notoSerif = Noto_Serif_Bengali({
  subsets: ["bengali", "latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-noto-serif",
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// docs/RESPONSIVE.md §11: never disable zoom; viewport-fit=cover for safe-area insets.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: THEME_COLOR,
};

export async function generateMetadata() {
  const t = await getTranslations("meta");
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: { default: t("siteName"), template: t("titleTemplate") },
    description: t("description"),
  };
}

export default async function LocaleLayout({ children }) {
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} className={`${notoSans.variable} ${notoSerif.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
