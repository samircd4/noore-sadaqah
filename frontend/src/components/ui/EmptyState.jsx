import { Inbox } from "lucide-react";
import Button from "./Button";

/**
 * Empty list message (PAGES.md "EmptyState"): icon + one line + optional button, centered, text-em-900/70.
 * @param {object} props
 * @param {string} props.text
 * @param {import("react").ComponentType<{ className?: string, "aria-hidden"?: boolean | "true" }>} [props.icon] a lucide icon
 * @param {{ href: string | object, label: string }} [props.action]
 */
export default function EmptyState({ text, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-sand-300 px-4 py-12 text-center text-em-900/70">
      <Icon aria-hidden="true" className="size-10 text-em-700/60" />
      <p className="max-w-md text-base">{text}</p>
      {action && (
        <Button href={action.href} variant="dark">
          {action.label}
        </Button>
      )}
    </div>
  );
}
