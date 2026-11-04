# Zakat & Fitra Policy — needs Shariah advisor sign-off

> **Status: DRAFT, NOT APPROVED.** This doc lists the decisions the foundation's Shariah advisor
> must make. The "Proposed default" column is a common position given only as a starting point
> for discussion, **not a ruling**. Don't build or publish the zakat calculator, zakat texts or
> fitra amounts until the sign-off table at the end is filled in.
>
> AI assistants: don't change any rule here on your own. If something is unclear, ask.

## 1. Decisions needed

| # | Question | Options | Proposed default | Decision |
|---|---|---|---|---|
| Z1 | Which nisab does the calculator use? | (a) silver only, (b) gold only, (c) donor chooses, (d) the lower of the two | (a) silver, 612.36 g (52.5 tola), since it reaches more poor people | TODO |
| Z2 | Gold nisab weight (if used) | 87.48 g (7.5 tola) | 87.48 g | TODO |
| Z3 | Where do gold/silver prices come from and how often are they updated? | Admin enters the Bangladesh Jewellers Association (BAJUS) rate by hand / weekly / before Ramadan | Admin updates in the Django admin (Settings → nisab); the calculator shows the rate and its date; warn the admin if older than 30 days | TODO |
| Z4 | Which gold/silver price: buying or selling rate? Which karat? | 22K / 21K / 18K / traditional | TODO | TODO |
| Z5 | Assets included | cash, bank balance, gold, silver, business stock, receivables, investments/shares, savings certificates (সঞ্চয়পত্র), DPS/FDR, provident fund, crypto | All listed except provident fund (ask) | TODO |
| Z6 | Gold/silver valuation | Market value of the metal content only (not making charges) | yes | TODO |
| Z7 | Debts deducted | Only debts due now / the next 12 months of a long loan / full long-term loan | Short-term debts due now | TODO |
| Z8 | Receivables (money owed to you) | Only debts likely to be repaid / all | Only debts likely to be repaid | TODO |
| Z9 | Zakat rate | 2.5% of zakatable wealth (lunar year) | 2.5% | TODO |
| Z10 | Solar-year option | Some scholars use 2.577% for a solar year | Not offered (lunar only) | TODO |
| Z11 | Who receives zakat from this foundation? | Which of the 8 categories (Surah At-Tawbah 9:60) the foundation serves | TODO: e.g. the poor (fuqara), the needy (masakin), people in debt (gharimin) | TODO |
| Z12 | Can zakat fund orphan support? | Only orphans who are poor / yes for all orphans | Only orphans who are poor and Muslim, with ownership given to the guardian (tamlik) | TODO |
| Z13 | Can zakat fund mosques, madrasa buildings, wells, tree planting? | Most scholars say no (no individual ownership) | **No.** Zakat goes only to programs Z11 approves | TODO |
| Z14 | Admin share from zakat (the "amil" share) | none / up to x% / only for staff who collect and distribute zakat | TODO | TODO |
| Z15 | How long may zakat be held before distribution? | as fast as possible / within the same lunar year | TODO | TODO |
| Z16 | Is "on behalf of" (paying zakat for someone else) allowed? | yes with their permission | Yes, with the form saying "আমি তার অনুমতি নিয়েছি" | TODO |
| Z17 | Monthly zakat (paying in advance in instalments) | allowed / not offered | Allowed as advance payment; receipt says "অগ্রিম যাকাত" | TODO |
| Z18 | Is interest (riba) income allowed into the zakat or sadaqah funds? | separate "interest disposal" fund / not accepted | TODO | TODO |

## 2. Fitra (Sadaqatul Fitr)

| # | Question | Proposed default | Decision |
|---|---|---|---|
| F1 | How is the amount per person set? | Each year, after the national (Islamic Foundation Bangladesh) announcement, admin enters the rates for wheat / barley / dates / raisins / cheese; donor picks one | TODO |
| F2 | Form | Number of people × chosen rate = amount (not a free amount) | TODO |
| F3 | Deadline | Before Eid-ul-Fitr prayer; the form closes or warns after the cut-off date/time set by the admin | TODO |
| F4 | How fitra reaches recipients | Distributed before Eid; if received late, the receipt says it was given late | TODO |
| F5 | Recurring | Not allowed (`allow_recurring = False`) | TODO |

## 3. Calculator spec (fill in after the decisions)

```
zakatable = cash
          + bank balances
          + gold value       (grams × price per gram, karat from Z4)
          + silver value     (grams × price per gram)
          + business stock   (at selling price)
          + receivables      (per Z8)
          + investments      (per Z5)
          − debts            (per Z7)

nisab     = per Z1 (silver grams × silver price, or …)
if zakatable >= nisab:
   zakat = round(zakatable × 0.025)     // whole taka, round up
else:
   zakat = 0  → message "আপনার সম্পদ নিসাব পরিমাণ হয়নি; যাকাত ফরজ নয়।"
```

- Inputs accept Bengali and English digits; store plain numbers; show results with `taka()`.
- Gold and silver can be entered in grams **or** bhori/tola (1 bhori = 11.664 g).
- Nothing the donor types is saved to the server (privacy). The amount only travels to the donate form.
- Show "হিসাবের তারিখ: {nisab rate date}" and the disclaimer from PAGES.md.

## 4. Accounting rules (already decided, see DATA_MODEL.md)

- Zakat donations are only made to `is_zakat_eligible` funds, and are reported separately.
- Zakat money is never moved to a non-zakat fund in any report or admin action.
- The admin "edit donation" screen does not let staff change a donation's fund from zakat to anything else.

## 5. Text the advisor must approve

- [ ] Zakat fund page body (`Fund.body_bn` for `zakat`)
- [ ] Calculator help texts and FAQ
- [ ] Fitra fund page and rates
- [ ] The quote-band hadith wording and reference (CONTENT.md §12)
- [ ] Receipt line for zakat: e.g. "যাকাত হিসেবে গৃহীত"

## Sign-off

| Name | Role | Date | Signature / message link |
|---|---|---|---|
| TODO | Shariah advisor | | |
| TODO | Chairman | | |
