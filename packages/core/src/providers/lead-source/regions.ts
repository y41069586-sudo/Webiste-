/**
 * Karten je Bundesland (OpenStreetMap-Auszüge von Geofabrik). Jede Stadt gehört genau einem Bundesland. Die Suche lädt
 * immer nur die Karte des Landes, in dem gerade gesucht wird (Speicher- und Laufzeitgrenze des Servers).
 * 08.11.2026 (Betreiberauftrag „B“): Städte aus allen Bundesländern, je mit deutlicher Einwohnerzahl.
 */
const GEOFABRIK = 'https://download.geofabrik.de/europe/germany';

export interface OsmRegion {
  key: string;
  url: string;
  cities: string[];
}

export const OSM_REGIONS: OsmRegion[] = [
  {
    key: 'nordrhein-westfalen',
    url: `${GEOFABRIK}/nordrhein-westfalen-latest.osm.pbf`,
    cities: [
      'Dortmund',
      'Köln',
      'Düsseldorf',
      'Essen',
      'Duisburg',
      'Bochum',
      'Wuppertal',
      'Bielefeld',
      'Bonn',
      'Münster',
      'Gelsenkirchen',
      'Mönchengladbach',
      'Aachen',
      'Krefeld',
      'Oberhausen',
      'Hagen',
      'Hamm',
      'Herne',
      'Solingen',
      'Leverkusen',
      'Paderborn',
      'Recklinghausen',
    ],
  },
  {
    key: 'bayern',
    url: `${GEOFABRIK}/bayern-latest.osm.pbf`,
    cities: ['München', 'Nürnberg', 'Augsburg', 'Regensburg', 'Würzburg', 'Ingolstadt', 'Fürth', 'Erlangen'],
  },
  {
    key: 'baden-wuerttemberg',
    url: `${GEOFABRIK}/baden-wuerttemberg-latest.osm.pbf`,
    cities: ['Stuttgart', 'Mannheim', 'Karlsruhe', 'Freiburg im Breisgau', 'Heidelberg', 'Ulm', 'Heilbronn', 'Pforzheim'],
  },
  {
    key: 'niedersachsen',
    url: `${GEOFABRIK}/niedersachsen-latest.osm.pbf`,
    cities: ['Hannover', 'Braunschweig', 'Oldenburg', 'Osnabrück', 'Wolfsburg', 'Göttingen', 'Salzgitter'],
  },
  {
    key: 'hessen',
    url: `${GEOFABRIK}/hessen-latest.osm.pbf`,
    cities: ['Frankfurt am Main', 'Wiesbaden', 'Kassel', 'Darmstadt', 'Offenbach am Main'],
  },
  {
    key: 'rheinland-pfalz',
    url: `${GEOFABRIK}/rheinland-pfalz-latest.osm.pbf`,
    cities: ['Mainz', 'Ludwigshafen am Rhein', 'Koblenz', 'Trier', 'Kaiserslautern'],
  },
  { key: 'sachsen', url: `${GEOFABRIK}/sachsen-latest.osm.pbf`, cities: ['Leipzig', 'Dresden', 'Chemnitz'] },
  { key: 'sachsen-anhalt', url: `${GEOFABRIK}/sachsen-anhalt-latest.osm.pbf`, cities: ['Halle (Saale)', 'Magdeburg'] },
  { key: 'thueringen', url: `${GEOFABRIK}/thueringen-latest.osm.pbf`, cities: ['Erfurt', 'Jena', 'Gera'] },
  { key: 'brandenburg', url: `${GEOFABRIK}/brandenburg-latest.osm.pbf`, cities: ['Potsdam', 'Cottbus'] },
  { key: 'berlin', url: `${GEOFABRIK}/berlin-latest.osm.pbf`, cities: ['Berlin'] },
  { key: 'hamburg', url: `${GEOFABRIK}/hamburg-latest.osm.pbf`, cities: ['Hamburg'] },
  { key: 'bremen', url: `${GEOFABRIK}/bremen-latest.osm.pbf`, cities: ['Bremen', 'Bremerhaven'] },
  { key: 'schleswig-holstein', url: `${GEOFABRIK}/schleswig-holstein-latest.osm.pbf`, cities: ['Kiel', 'Lübeck', 'Flensburg'] },
  { key: 'mecklenburg-vorpommern', url: `${GEOFABRIK}/mecklenburg-vorpommern-latest.osm.pbf`, cities: ['Rostock', 'Schwerin'] },
  { key: 'saarland', url: `${GEOFABRIK}/saarland-latest.osm.pbf`, cities: ['Saarbrücken'] },
];

/** Bundesland einer Stadt (exakter Name) oder null, wenn die Stadt keiner Karte zugeordnet ist. */
export function regionOfCity(city: string): OsmRegion | null {
  return OSM_REGIONS.find((r) => r.cities.includes(city)) ?? null;
}
