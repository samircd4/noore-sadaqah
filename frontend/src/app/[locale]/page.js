import { getTranslations } from "next-intl/server";

/**
 * Temporary placeholder so the F0 setup can be checked (fonts, palette, bn/en routing).
 * Replaced by the real home page in phase F1 (docs/HOME_PAGE.md).
 */
export default async function SetupPage() {
  const t = await getTranslations("setup");
  return (
    <main className="mx-auto flex min-h-dvh max-w-7xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-head text-[2rem] font-extrabold leading-snug text-em-900 min-[360px]:text-4xl">
        {t("title")}
      </h1>
      <p className="text-em-900/80">{t("body")}</p>
    </main>
  );
}
