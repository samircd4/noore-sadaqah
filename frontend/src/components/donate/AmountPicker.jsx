"use client";

import { taka } from "@/lib/format";

/**
 * Preset amount chips as a radio group (HOME_PAGE.md fix 4). The selected chip is em-700, the others em-500.
 * Reused by the full donate form in F3.
 * @param {object} props
 * @param {number[]} props.presets
 * @param {number | null} props.selected the current amount; a chip is checked when it equals a preset
 * @param {(amount: number) => void} props.onSelect
 * @param {"bn" | "en"} props.locale
 * @param {string} props.name radio group name
 * @param {string} [props.chipClassName] layout classes for each chip
 */
export default function AmountPicker({ presets, selected, onSelect, locale, name, chipClassName = "" }) {
  return presets.map((amount) => (
    <label key={amount} className={`relative block cursor-pointer ${chipClassName}`}>
      <input
        type="radio"
        name={name}
        value={amount}
        checked={selected === amount}
        onChange={() => onSelect(amount)}
        className="peer sr-only"
      />
      <span
        className="flex h-11 items-center justify-center rounded-lg bg-em-500 px-2 font-bold text-white transition hover:bg-em-700 peer-checked:bg-em-700 peer-checked:shadow-md peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-em-950 motion-reduce:transition-none"
      >
        {taka(amount, locale)}
      </span>
    </label>
  ));
}
