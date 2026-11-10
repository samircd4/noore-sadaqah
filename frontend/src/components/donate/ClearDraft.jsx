"use client";

import { useEffect } from "react";
import { clearDraft } from "@/lib/donation-draft";

/**
 * Removes the donation draft once Django reports the donation PAID (on /donate/success), so the donor's name and
 * phone don't stay in sessionStorage and the next form starts empty. Renders nothing.
 */
export default function ClearDraft() {
  useEffect(() => clearDraft(), []);
  return null;
}
