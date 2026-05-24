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
  "red_bull":
    "https://upload.wikimedia.org/wikipedia/en/7/7a/Red_Bull_Racing_logo.svg",
  "mercedes":
    "https://upload.wikimedia.org/wikipedia/commons/f/fb/Mercedes_AMG_Petronas_F1_Logo.svg",
  "ferrari":
    "https://upload.wikimedia.org/wikipedia/en/a/a7/Scuderia_Ferrari_Logo.svg",
  "mclaren":
    "https://upload.wikimedia.org/wikipedia/en/6/66/McLaren_Racing_logo.svg",
  "aston_martin":
    "https://upload.wikimedia.org/wikipedia/en/1/1e/Aston_Martin_F1_Logo.svg",
  "alpine":
    "https://upload.wikimedia.org/wikipedia/commons/7/7e/Alpine_F1_Team_Logo.svg",
  "williams":
    "https://upload.wikimedia.org/wikipedia/commons/f/f9/Williams_Racing_2020_logo.svg",
  "rb":
    "https://upload.wikimedia.org/wikipedia/commons/e/ee/Racing_Bulls_logo.svg",
  "haas":
    "https://upload.wikimedia.org/wikipedia/commons/d/d4/MoneyGram_Haas_F1_Team_logo.svg",
  "sauber":
    "https://upload.wikimedia.org/wikipedia/commons/c/c4/Stake_F1_Team_Kick_Sauber_logo.svg",
  "cadillac":
    "https://upload.wikimedia.org/wikipedia/commons/2/22/Cadillac_logo.svg",

  // ── Historical / Legacy IDs ──────────────────────────────────
  "alphatauri":
    "https://upload.wikimedia.org/wikipedia/commons/e/ee/Racing_Bulls_logo.svg",
  "alfa":
    "https://upload.wikimedia.org/wikipedia/commons/c/c4/Stake_F1_Team_Kick_Sauber_logo.svg",
  "renault":
    "https://upload.wikimedia.org/wikipedia/commons/7/7e/Alpine_F1_Team_Logo.svg",
  "racing_point":
    "https://upload.wikimedia.org/wikipedia/en/1/1e/Aston_Martin_F1_Logo.svg",
  "force_india":
    "https://upload.wikimedia.org/wikipedia/en/1/1e/Aston_Martin_F1_Logo.svg",
  "toro_rosso":
    "https://upload.wikimedia.org/wikipedia/commons/e/ee/Racing_Bulls_logo.svg",
  "lotus_f1":
    "https://upload.wikimedia.org/wikipedia/commons/7/7e/Alpine_F1_Team_Logo.svg",
  "brawn":
    "https://upload.wikimedia.org/wikipedia/commons/f/fb/Mercedes_AMG_Petronas_F1_Logo.svg",
  "benetton":
    "https://upload.wikimedia.org/wikipedia/commons/7/7e/Alpine_F1_Team_Logo.svg",
  "jordan":
    "https://upload.wikimedia.org/wikipedia/en/1/1e/Aston_Martin_F1_Logo.svg",
  "jaguar":
    "https://upload.wikimedia.org/wikipedia/en/7/7a/Red_Bull_Racing_logo.svg",
  "stewart":
    "https://upload.wikimedia.org/wikipedia/en/7/7a/Red_Bull_Racing_logo.svg",
  "tyrrell":
    "https://upload.wikimedia.org/wikipedia/commons/d/d9/Tyrrell_logo.svg",
  "brabham":
    "https://upload.wikimedia.org/wikipedia/commons/6/62/Brabham_logo.svg",
  "lotus":
    "https://upload.wikimedia.org/wikipedia/en/4/49/Lotus_Cars_logo.svg",
  "honda":
    "https://upload.wikimedia.org/wikipedia/commons/3/38/Honda.svg",
  "bmw_sauber":
    "https://upload.wikimedia.org/wikipedia/commons/c/c4/Stake_F1_Team_Kick_Sauber_logo.svg",
  "toyota":
    "https://upload.wikimedia.org/wikipedia/commons/e/e7/Toyota.svg",
  "manor":
    "https://upload.wikimedia.org/wikipedia/en/0/01/Manor_Marussia_F1_Team_logo.svg",
  "marussia":
    "https://upload.wikimedia.org/wikipedia/en/0/01/Manor_Marussia_F1_Team_logo.svg",
  "caterham":
    "https://upload.wikimedia.org/wikipedia/en/0/0c/Caterham_F1.svg",
  "minardi":
    "https://upload.wikimedia.org/wikipedia/en/2/27/Minardi_Logo.svg",
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
