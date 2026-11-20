// The game's calendar, for a real date: twelve months of 28 days, each named
// for a stone, three to a season. Pure.

export const MONTHS = ["Granite", "Slate", "Felsite", "Hematite", "Malachite", "Galena", "Limestone", "Sandstone", "Timber", "Moonstone", "Opal", "Obsidian"];
const SEASONS = ["Spring", "Summer", "Autumn", "Winter"];
const PARTS = ["Early", "Mid", "Late"];

const ordinal = (n) => {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
};

/** "22nd Sandstone, 2026, Mid-Autumn": the real month is the game's, the day is scaled to 28. */
export function dfDate(date) {
  const month = date.getMonth();
  const daysIn = new Date(date.getFullYear(), month + 1, 0).getDate();
  const day = Math.min(28, Math.ceil((date.getDate() * 28) / daysIn));
  return `${ordinal(day)} ${MONTHS[month]}, ${date.getFullYear()}, ${PARTS[month % 3]}-${SEASONS[Math.floor(month / 3)]}`;
}
