import { cacheLife } from "next/cache";

/**
 * The current year in Asia/Dhaka. Reading the clock during rendering isn't allowed outside a cache scope
 * with Cache Components, so this is cached for a day.
 */
export async function currentYear() {
  "use cache";
  cacheLife("days");
  return Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date()));
}
