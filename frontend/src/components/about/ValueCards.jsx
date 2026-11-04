import { BookOpen, Handshake, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";

/**
 * The three value cards (HOME_PAGE.md §5), shared by the home AboutPreview and /about "Principles" (PAGES.md).
 * @param {{ className?: string }} props grid classes (columns and gaps) from the caller
 */
export default async function ValueCards({ className = "mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4" }) {
  const t = await getTranslations("about");
  const values = [
    { Icon: ShieldCheck, title: t("transparencyTitle"), text: t("transparencyText") },
    { Icon: Handshake, title: t("trustTitle"), text: t("trustText") },
    { Icon: BookOpen, title: t("shariahTitle"), text: t("shariahText") },
  ];

  return (
    <ul className={className}>
      {values.map(({ Icon, title, text }) => (
        <li key={title} className="rounded-lg border border-em-100 bg-em-50 p-4">
          <Icon aria-hidden="true" className="size-8 text-em-700" />
          <p className="mt-2 font-bold">{title}</p>
          <p className="text-sm leading-6 text-em-900/70">{text}</p>
        </li>
      ))}
    </ul>
  );
}
