/**
 * The 64 districts of Bangladesh, for the volunteer form (PAGES.md /get-involved; API.md "Forms").
 * Fixed reference data, not content: the slug is what is stored (Django uses the same list as choices).
 * Grouped by division; the form sorts them by name in the page language.
 */

/** @type {ReadonlyArray<{ slug: string, bn: string, en: string }>} */
export const DISTRICTS = [
  // Dhaka
  { slug: "dhaka", bn: "ঢাকা", en: "Dhaka" },
  { slug: "faridpur", bn: "ফরিদপুর", en: "Faridpur" },
  { slug: "gazipur", bn: "গাজীপুর", en: "Gazipur" },
  { slug: "gopalganj", bn: "গোপালগঞ্জ", en: "Gopalganj" },
  { slug: "kishoreganj", bn: "কিশোরগঞ্জ", en: "Kishoreganj" },
  { slug: "madaripur", bn: "মাদারীপুর", en: "Madaripur" },
  { slug: "manikganj", bn: "মানিকগঞ্জ", en: "Manikganj" },
  { slug: "munshiganj", bn: "মুন্সীগঞ্জ", en: "Munshiganj" },
  { slug: "narayanganj", bn: "নারায়ণগঞ্জ", en: "Narayanganj" },
  { slug: "narsingdi", bn: "নরসিংদী", en: "Narsingdi" },
  { slug: "rajbari", bn: "রাজবাড়ী", en: "Rajbari" },
  { slug: "shariatpur", bn: "শরীয়তপুর", en: "Shariatpur" },
  { slug: "tangail", bn: "টাঙ্গাইল", en: "Tangail" },
  // Chattogram
  { slug: "bandarban", bn: "বান্দরবান", en: "Bandarban" },
  { slug: "brahmanbaria", bn: "ব্রাহ্মণবাড়িয়া", en: "Brahmanbaria" },
  { slug: "chandpur", bn: "চাঁদপুর", en: "Chandpur" },
  { slug: "chattogram", bn: "চট্টগ্রাম", en: "Chattogram" },
  { slug: "coxs-bazar", bn: "কক্সবাজার", en: "Cox's Bazar" },
  { slug: "cumilla", bn: "কুমিল্লা", en: "Cumilla" },
  { slug: "feni", bn: "ফেনী", en: "Feni" },
  { slug: "khagrachhari", bn: "খাগড়াছড়ি", en: "Khagrachhari" },
  { slug: "lakshmipur", bn: "লক্ষ্মীপুর", en: "Lakshmipur" },
  { slug: "noakhali", bn: "নোয়াখালী", en: "Noakhali" },
  { slug: "rangamati", bn: "রাঙ্গামাটি", en: "Rangamati" },
  // Rajshahi
  { slug: "bogura", bn: "বগুড়া", en: "Bogura" },
  { slug: "joypurhat", bn: "জয়পুরহাট", en: "Joypurhat" },
  { slug: "naogaon", bn: "নওগাঁ", en: "Naogaon" },
  { slug: "natore", bn: "নাটোর", en: "Natore" },
  { slug: "chapainawabganj", bn: "চাঁপাইনবাবগঞ্জ", en: "Chapainawabganj" },
  { slug: "pabna", bn: "পাবনা", en: "Pabna" },
  { slug: "rajshahi", bn: "রাজশাহী", en: "Rajshahi" },
  { slug: "sirajganj", bn: "সিরাজগঞ্জ", en: "Sirajganj" },
  // Khulna
  { slug: "bagerhat", bn: "বাগেরহাট", en: "Bagerhat" },
  { slug: "chuadanga", bn: "চুয়াডাঙ্গা", en: "Chuadanga" },
  { slug: "jashore", bn: "যশোর", en: "Jashore" },
  { slug: "jhenaidah", bn: "ঝিনাইদহ", en: "Jhenaidah" },
  { slug: "khulna", bn: "খুলনা", en: "Khulna" },
  { slug: "kushtia", bn: "কুষ্টিয়া", en: "Kushtia" },
  { slug: "magura", bn: "মাগুরা", en: "Magura" },
  { slug: "meherpur", bn: "মেহেরপুর", en: "Meherpur" },
  { slug: "narail", bn: "নড়াইল", en: "Narail" },
  { slug: "satkhira", bn: "সাতক্ষীরা", en: "Satkhira" },
  // Barishal
  { slug: "barguna", bn: "বরগুনা", en: "Barguna" },
  { slug: "barishal", bn: "বরিশাল", en: "Barishal" },
  { slug: "bhola", bn: "ভোলা", en: "Bhola" },
  { slug: "jhalokati", bn: "ঝালকাঠি", en: "Jhalokati" },
  { slug: "patuakhali", bn: "পটুয়াখালী", en: "Patuakhali" },
  { slug: "pirojpur", bn: "পিরোজপুর", en: "Pirojpur" },
  // Sylhet
  { slug: "habiganj", bn: "হবিগঞ্জ", en: "Habiganj" },
  { slug: "moulvibazar", bn: "মৌলভীবাজার", en: "Moulvibazar" },
  { slug: "sunamganj", bn: "সুনামগঞ্জ", en: "Sunamganj" },
  { slug: "sylhet", bn: "সিলেট", en: "Sylhet" },
  // Rangpur
  { slug: "dinajpur", bn: "দিনাজপুর", en: "Dinajpur" },
  { slug: "gaibandha", bn: "গাইবান্ধা", en: "Gaibandha" },
  { slug: "kurigram", bn: "কুড়িগ্রাম", en: "Kurigram" },
  { slug: "lalmonirhat", bn: "লালমনিরহাট", en: "Lalmonirhat" },
  { slug: "nilphamari", bn: "নীলফামারী", en: "Nilphamari" },
  { slug: "panchagarh", bn: "পঞ্চগড়", en: "Panchagarh" },
  { slug: "rangpur", bn: "রংপুর", en: "Rangpur" },
  { slug: "thakurgaon", bn: "ঠাকুরগাঁও", en: "Thakurgaon" },
  // Mymensingh
  { slug: "jamalpur", bn: "জামালপুর", en: "Jamalpur" },
  { slug: "mymensingh", bn: "ময়মনসিংহ", en: "Mymensingh" },
  { slug: "netrokona", bn: "নেত্রকোণা", en: "Netrokona" },
  { slug: "sherpur", bn: "শেরপুর", en: "Sherpur" },
];

export const DISTRICT_SLUGS = DISTRICTS.map((d) => d.slug);

/**
 * Select options sorted by name in the page language.
 * @param {"bn" | "en"} locale
 */
export function districtOptions(locale) {
  const collator = new Intl.Collator(locale === "en" ? "en" : "bn");
  return DISTRICTS.map((d) => ({ value: d.slug, label: locale === "en" ? d.en : d.bn })).sort((a, b) => collator.compare(a.label, b.label));
}
