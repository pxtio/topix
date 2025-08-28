/**
 * Utility functions for date and time formatting
 */

/**
 * Formats an ISO date string into a more readable format for UI display.
 * Example: "2023-10-05T14:48:00.000Z" -> "Oct 5, 2023, 2:48 PM"
 *
 * @param isoString - The ISO date string to format.
 * @param locale - The locale string for formatting (default is "en-US").
 * @returns A formatted date string.
 */
export function formatDateForUI(isoString: string, locale: string = "en-US"): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }

    return date.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return isoString; // fallback
  }
}