import Image from "next/image";
import { paymentLogos } from "@/lib/payment-methods";

/**
 * Logos of the ways to pay, under the footer's newsletter form: five per row on white tiles that share the column
 * width (two rows when both gateways are live). Not links: they only show what the donate form accepts.
 * @param {{ gateways: string[] | undefined, label: string }} props `gateways` is `site.payment_methods`
 */
export default function PaymentLogos({ gateways, label }) {
  const logos = paymentLogos(gateways);
  if (logos.length === 0) return null;
  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-semibold text-sand-200/80">{label}</p>
      <ul className="grid grid-cols-5 gap-1.5" lang="en">
        {logos.map((logo) => (
          <li key={logo.key} className="relative flex aspect-[5/3] items-center justify-center rounded-lg bg-white p-1">
            {/* Third-party marks keep their own colours (DESIGN_SYSTEM.md); SVGs are served as files, not optimised. */}
            <Image src={logo.src} alt={logo.name} width={120} height={72} unoptimized className="h-full w-full object-contain" />
          </li>
        ))}
      </ul>
    </div>
  );
}
