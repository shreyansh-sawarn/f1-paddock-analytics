/**
 * Constructor colors mapping.
 * Maps Ergast API constructorId strings to brand colors.
 */
export const CONSTRUCTOR_COLORS = {
  // Current grid teams (2024–2026)
  "red_bull": "#3671c6",
  "mercedes": "#27f4d2",
  "ferrari": "#e80020",
  "mclaren": "#ff8000",
  "aston_martin": "#229971",
  "alpine": "#0093cc",
  "williams": "#64c4ff",
  "rb": "#6692ff",
  "haas": "#b6babd",
  "sauber": "#52e252",
  "audi": "#f10056",
  "cadillac": "#ffd700",

  // Legacy/Historical teams
  "alphatauri": "#4e7c9b",
  "alfa": "#c00000",
  "renault": "#fff500",
  "racing_point": "#f596c8",
  "force_india": "#ff5f0f",
  "toro_rosso": "#469bff",
  "lotus_f1": "#e6c229",
  "brawn": "#e3ff00",
  "benetton": "#00a850",
  "jordan": "#e9d700",
  "jaguar": "#004f30",
  "stewart": "#d6d6d6",
  "tyrrell": "#0d2240",
  "brabham": "#244b7e",
  "lotus": "#004225",
  "honda": "#ff0000",
  "bmw_sauber": "#0066b2",
  "toyota": "#e4002b",
  "manor": "#f35e18",
  "marussia": "#ff3c00",
  "caterham": "#004b2f",
  "minardi": "#f3cd00"
};

/**
 * Gets a constructor brand color, or generates a stable fallback color based on name hash.
 * @param {string} constructorId - Ergast constructorId (e.g. "red_bull")
 * @returns {string} Hex or HSL color string
 */
export function getConstructorColor(constructorId) {
  const cleanId = (constructorId || '').toLowerCase().trim();
  if (CONSTRUCTOR_COLORS[cleanId]) {
    return CONSTRUCTOR_COLORS[cleanId];
  }

  // Stable hash-based HSL color generator for older historical teams
  let hash = 0;
  for (let i = 0; i < cleanId.length; i++) {
    hash = cleanId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  // Keep saturation and lightness high enough to glow and look premium in dark mode
  return `hsl(${hue}, 85%, 55%)`;
}
