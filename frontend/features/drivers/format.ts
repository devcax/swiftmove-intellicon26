import { subscriberDigits } from "./schemas";

export const vehicleTypes = ["Prime Mover", "Rigid Lorry", "Tipper", "Box Truck", "Flatbed", "Van"];

function groupSubscriber(digits: string): string {
  const parts: string[] = [];
  if (digits.length > 0) parts.push(digits.slice(0, 2));
  if (digits.length > 2) parts.push(digits.slice(2, 5));
  if (digits.length > 5) parts.push(digits.slice(5, 9));
  return parts.join(" ");
}

/** What the phone box shows while typing: 77 123 4567. */
export function formatPhoneInput(raw: string): string {
  return groupSubscriber(subscriberDigits(raw));
}

/** A stored number for display: +94 77 123 4567. */
export function formatPhoneDisplay(e164: string): string {
  const digits = subscriberDigits(e164);
  if (digits.length === 0) return e164 ?? "";
  return `+94 ${groupSubscriber(digits)}`;
}

/** +94771234567, or null when the digits are not a Sri Lankan mobile number. */
export function toE164(raw: string): string | null {
  const digits = subscriberDigits(raw);
  return /^7\d{8}$/.test(digits) ? `+94${digits}` : null;
}

/** What the plate box shows while typing: letters, a hyphen, then digits. */
export function formatPlateInput(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const letters = cleaned.replace(/[0-9]/g, "").slice(0, 6);
  const digits = cleaned.replace(/[A-Z]/g, "").slice(0, 4);
  return digits ? `${letters}-${digits}` : letters;
}

/** Does a driver match what the person typed in the search box (name, number, or current job)? */
export function driverMatchesQuery(driver: { name: string; phone: string; currentJob: string | null }, query: string): boolean {
  const needle = query.toLowerCase();
  return (
    driver.name.toLowerCase().includes(needle) ||
    driver.phone.includes(query) ||
    formatPhoneDisplay(driver.phone).toLowerCase().includes(needle) ||
    (driver.currentJob ?? "").toLowerCase().includes(needle)
  );
}
