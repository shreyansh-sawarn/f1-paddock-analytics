/**
 * Maps Ergast circuit IDs to our local SVG track files.
 */
const CIRCUIT_MAPS = {
  "albert_park": "/tracks/albert_park.svg",
  "americas": "/tracks/americas.svg",
  "bahrain": "/tracks/bahrain.svg",
  "baku": "/tracks/baku.svg",
  "catalunya": "/tracks/catalunya.svg",
  "hungaroring": "/tracks/hungaroring.svg",
  "interlagos": "/tracks/interlagos.svg",
  "jeddah": "/tracks/jeddah.svg",
  "losail": "/tracks/losail.svg",
  "marina_bay": "/tracks/marina_bay.svg",
  "miami": "/tracks/miami.svg",
  "monaco": "/tracks/monaco.svg",
  "monza": "/tracks/monza.svg",
  "red_bull_ring": "/tracks/red_bull_ring.svg",
  "rodriguez": "/tracks/rodriguez.svg",
  "shanghai": "/tracks/shanghai.svg",
  "silverstone": "/tracks/silverstone.svg",
  "spa": "/tracks/spa.svg",
  "suzuka": "/tracks/suzuka.svg",
  "zandvoort": "/tracks/zandvoort.svg",
  "villeneuve": "/tracks/villeneuve.svg",
  "vegas": "/tracks/vegas.svg",
  "imola": "/tracks/imola.svg",
  "yas_marina": "/tracks/yas_marina.svg",
};

export function getCircuitMap(circuitId) {
  if (!circuitId) return null;
  return CIRCUIT_MAPS[circuitId] || null;
}
