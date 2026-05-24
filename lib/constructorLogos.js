/**
 * Constructor logo mapping
 * Maps Ergast API constructorId strings to team logo image URLs.
 * Uses Wikimedia Commons SVG files served via upload.wikimedia.org for reliability.
 * 
 * Covers: Current 2025 grid teams + major historical constructors.
 * Falls back to null for unknown teams.
 */

const CONSTRUCTOR_LOGOS = {
  // ── 2024–2026 Grid ───────────────────────────────────────────
  "red_bull": "/logos/red_bull.png",
  "mercedes": { light: "/logos/mercedes_black.png", dark: "/logos/mercedes_white.png" },
  "ferrari": "/logos/ferrari.png",
  "mclaren": "/logos/mclaren.png",
  "aston_martin": { light: "/logos/aston_martin_black.png", dark: "/logos/aston_martin_white.png" },
  "alpine": "/logos/alpine.png",
  "williams": "/logos/williams.png",
  "rb": "/logos/rb.png",
  "haas": "/logos/haas.png",
  "sauber": "/logos/sauber.png",
  "audi": { light: "/logos/audi_black.png", dark: "/logos/audi_white.png" },
  "cadillac": { light: "/logos/cadillac_black.png", dark: "/logos/cadillac_white.png" },

  // ── Historical / Legacy IDs ──────────────────────────────────
  "alphatauri": "/logos/alphatauri.png",
  "alfa": "/logos/alfa.svg",
  "renault": "/logos/renault.png",
  "racing_point": "/logos/racing_point.png",
  "force_india": "/logos/force_india.png",
  "toro_rosso": "/logos/toro_rosso.png",
  "lotus_f1": "/logos/lotus_f1.png",
  "brawn": "/logos/brawn.png",
  "benetton": "/logos/benetton.png",
  "jordan": "/logos/jordan.png",
  "jaguar": "/logos/jaguar.png",
  "stewart": "/logos/stewart.png",
  "tyrrell": "/logos/tyrrell.png",
  "brabham": "/logos/brabham.png",
  "lotus": "/logos/lotus.png",
  "honda": "/logos/honda.svg",
  "bmw_sauber": "/logos/bmw_sauber.png",
  "toyota": "/logos/toyota.svg",
  "manor": "/logos/manor.png",
  "marussia": "/logos/marussia.png",
  "caterham": "/logos/caterham.png",
  "minardi": "/logos/minardi.png",
};

/**
 * Get the logo URL for a given constructor.
 * @param {string} constructorId - The Ergast API constructor ID
 * @returns {string|null} URL string, or null if not found
 */
export function getConstructorLogo(constructorId) {
  if (!constructorId) return null;
  return CONSTRUCTOR_LOGOS[constructorId.toLowerCase()] || null;
}

/**
 * Get the logo URL for a given constructor name (fuzzy match).
 * Useful for archive data that may only provide the constructor name, not ID.
 * @param {string} constructorName - The constructor display name
 * @returns {string|null} URL string, or null if not found
 */
export function getConstructorLogoByName(constructorName) {
  if (!constructorName) return null;
  
  const name = constructorName.toLowerCase();

  // Direct constructor name → ID lookup
  const NAME_TO_ID = {
    "red bull": "red_bull",
    "red bull racing": "red_bull",
    "red bull racing honda rbpt": "red_bull",
    "red bull racing honda": "red_bull",
    "mercedes": "mercedes",
    "mercedes-amg petronas f1 team": "mercedes",
    "ferrari": "ferrari",
    "scuderia ferrari": "ferrari",
    "scuderia ferrari hp": "ferrari",
    "mclaren": "mclaren",
    "mclaren mercedes": "mclaren",
    "mclaren f1 team": "mclaren",
    "aston martin": "aston_martin",
    "aston martin aramco f1 team": "aston_martin",
    "alpine f1 team": "alpine",
    "alpine": "alpine",
    "williams": "williams",
    "williams racing": "williams",
    "rb f1 team": "rb",
    "racing bulls": "rb",
    "visa cash app rb": "rb",
    "haas f1 team": "haas",
    "haas": "haas",
    "moneygram haas f1 team": "haas",
    "stake f1 team kick sauber": "sauber",
    "kick sauber": "sauber",
    "sauber": "sauber",
    "audi": "audi",
    "alfa romeo": "alfa",
    "alphatauri": "alphatauri",
    "scuderia alphatauri": "alphatauri",
    "renault": "renault",
    "racing point": "racing_point",
    "force india": "force_india",
    "toro rosso": "toro_rosso",
    "brawn": "brawn",
    "brawn gp": "brawn",
    "benetton": "benetton",
    "jordan": "jordan",
    "lotus": "lotus",
    "team lotus": "lotus",
    "lotus f1": "lotus_f1",
    "honda": "honda",
    "bmw sauber": "bmw_sauber",
    "toyota": "toyota",
    "manor": "manor",
    "manor marussia": "manor",
    "marussia": "marussia",
    "caterham": "caterham",
    "minardi": "minardi",
    "cadillac": "cadillac",
    "tyrrell": "tyrrell",
    "brabham": "brabham",
    "jaguar": "jaguar",
    "stewart": "stewart",
  };

  // Try exact match first
  const id = NAME_TO_ID[name];
  if (id) return CONSTRUCTOR_LOGOS[id] || null;

  // Try partial / includes match
  for (const [key, val] of Object.entries(NAME_TO_ID)) {
    if (name.includes(key) || key.includes(name)) {
      return CONSTRUCTOR_LOGOS[val] || null;
    }
  }

  return null;
}

export default CONSTRUCTOR_LOGOS;
