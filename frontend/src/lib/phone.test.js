import { describe, expect, it } from "vitest";
import { telDigits, whatsappDigits } from "./phone";

describe("telDigits", () => {
  it("keeps digits and the leading +, from Latin or Bengali digits", () => {
    expect(telDigits("+880 1712-345678")).toBe("+8801712345678");
    expect(telDigits("০১৭১২-৩৪৫৬৭৮")).toBe("01712345678");
  });

  it("returns null for placeholders and empty values", () => {
    expect(telDigits("+880 1XXX-XXXXXX")).toBeNull();
    expect(telDigits("")).toBeNull();
    expect(telDigits(undefined)).toBeNull();
  });
});

describe("whatsappDigits", () => {
  it("adds the 880 country code to a BD mobile in any form", () => {
    expect(whatsappDigits("01711-000000")).toBe("8801711000000");
    expect(whatsappDigits("+880 1711 000000")).toBe("8801711000000");
    expect(whatsappDigits("০১৭১১০০০০০০")).toBe("8801711000000");
  });

  it("keeps a foreign number given with +, and refuses anything else", () => {
    expect(whatsappDigits("+44 20 7946 0958")).toBe("442079460958");
    expect(whatsappDigits("020 7946 0958")).toBeNull();
    expect(whatsappDigits("+880 1XXX-XXXXXX")).toBeNull();
  });
});
