// Mapping of FIFA country codes to their localized names and flag ISO codes.
// This is updated for the 48 teams of the 2026 World Cup.
export const countryMap = {
  // Group A
  MEX: { nameEs: "México", nameEn: "Mexico", flagCode: "mx" },
  RSA: { nameEs: "Sudáfrica", nameEn: "South Africa", flagCode: "za" },
  KOR: { nameEs: "Corea del Sur", nameEn: "South Korea", flagCode: "kr" },
  CZE: { nameEs: "Chequia", nameEn: "Czechia", flagCode: "cz" },

  // Group B
  CAN: { nameEs: "Canadá", nameEn: "Canada", flagCode: "ca" },
  BIH: { nameEs: "Bosnia y Herzegovina", nameEn: "Bosnia and Herzegovina", flagCode: "ba" },
  QAT: { nameEs: "Catar", nameEn: "Qatar", flagCode: "qa" },
  SUI: { nameEs: "Suiza", nameEn: "Switzerland", flagCode: "ch" },

  // Group C
  BRA: { nameEs: "Brasil", nameEn: "Brazil", flagCode: "br" },
  MAR: { nameEs: "Marruecos", nameEn: "Morocco", flagCode: "ma" },
  HAI: { nameEs: "Haití", nameEn: "Haiti", flagCode: "ht" },
  SCO: { nameEs: "Escocia", nameEn: "Scotland", flagCode: "gb-sct" },

  // Group D
  USA: { nameEs: "Estados Unidos", nameEn: "USA", flagCode: "us" },
  PAR: { nameEs: "Paraguay", nameEn: "Paraguay", flagCode: "py" },
  AUS: { nameEs: "Australia", nameEn: "Australia", flagCode: "au" },
  TUR: { nameEs: "Turquía", nameEn: "Turkiye", flagCode: "tr" },

  // Group E
  GER: { nameEs: "Alemania", nameEn: "Germany", flagCode: "de" },
  CUW: { nameEs: "Curazao", nameEn: "Curaçao", flagCode: "cw" },
  CIV: { nameEs: "Costa de Marfil", nameEn: "Ivory Coast", flagCode: "ci" },
  ECU: { nameEs: "Ecuador", nameEn: "Ecuador", flagCode: "ec" },

  // Group F
  NED: { nameEs: "Países Bajos", nameEn: "Netherlands", flagCode: "nl" },
  JPN: { nameEs: "Japón", nameEn: "Japan", flagCode: "jp" },
  SWE: { nameEs: "Suecia", nameEn: "Sweden", flagCode: "se" },
  TUN: { nameEs: "Túnez", nameEn: "Tunisia", flagCode: "tn" },

  // Group G
  BEL: { nameEs: "Bélgica", nameEn: "Belgium", flagCode: "be" },
  EGY: { nameEs: "Egipto", nameEn: "Egypt", flagCode: "eg" },
  IRN: { nameEs: "Irán", nameEn: "Iran", flagCode: "ir" },
  NZL: { nameEs: "Nueva Zelanda", nameEn: "New Zealand", flagCode: "nz" },

  // Group H
  CPV: { nameEs: "Cabo Verde", nameEn: "Cape Verde", flagCode: "cv" },
  KSA: { nameEs: "Arabia Saudita", nameEn: "Saudi Arabia", flagCode: "sa" },
  ESP: { nameEs: "España", nameEn: "Spain", flagCode: "es" },
  URU: { nameEs: "Uruguay", nameEn: "Uruguay", flagCode: "uy" },

  // Group I
  FRA: { nameEs: "Francia", nameEn: "France", flagCode: "fr" },
  IRQ: { nameEs: "Irak", nameEn: "Iraq", flagCode: "iq" },
  NOR: { nameEs: "Noruega", nameEn: "Norway", flagCode: "no" },
  SEN: { nameEs: "Senegal", nameEn: "Senegal", flagCode: "sn" },

  // Group J
  ALG: { nameEs: "Argelia", nameEn: "Algeria", flagCode: "dz" },
  ARG: { nameEs: "Argentina", nameEn: "Argentina", flagCode: "ar" },
  AUT: { nameEs: "Austria", nameEn: "Austria", flagCode: "at" },
  JOR: { nameEs: "Jordania", nameEn: "Jordan", flagCode: "jo" },

  // Group K
  COL: { nameEs: "Colombia", nameEn: "Colombia", flagCode: "co" },
  COD: { nameEs: "RD Congo", nameEn: "DR Congo", flagCode: "cd" },
  POR: { nameEs: "Portugal", nameEn: "Portugal", flagCode: "pt" },
  UZB: { nameEs: "Uzbekistán", nameEn: "Uzbekistan", flagCode: "uz" },

  // Group L
  CRO: { nameEs: "Croacia", nameEn: "Croatia", flagCode: "hr" },
  ENG: { nameEs: "Inglaterra", nameEn: "England", flagCode: "gb-eng" },
  GHA: { nameEs: "Ghana", nameEn: "Ghana", flagCode: "gh" },
  PAN: { nameEs: "Panamá", nameEn: "Panama", flagCode: "pa" },

  // Extra/TBD fallbacks
  TBD: { nameEs: "Por definir", nameEn: "To be determined", flagCode: "un" },
  WAL: { nameEs: "Gales", nameEn: "Wales", flagCode: "gb-wls" },
  DEN: { nameEs: "Dinamarca", nameEn: "Denmark", flagCode: "dk" },
  CRC: { nameEs: "Costa Rica", nameEn: "Costa Rica", flagCode: "cr" },
  CMR: { nameEs: "Camerún", nameEn: "Cameroon", flagCode: "cm" },
  SRB: { nameEs: "Serbia", nameEn: "Serbia", flagCode: "rs" }
};

/**
 * Gets the Spanish name for a FIFA country code or team name
 * @param {string} code FIFA country code (e.g. ARG)
 * @param {string} fallbackName Fallback name if code is not found
 * @returns {string} Spanish country name
 */
export function getCountryNameEs(code, fallbackName) {
  const cleanCode = String(code || "").toUpperCase();
  if (countryMap[cleanCode]) {
    return countryMap[cleanCode].nameEs;
  }
  
  if (cleanCode.startsWith("TBD") || fallbackName === "Winner") {
    return "Ganador Playoff";
  }

  // Try matching by English name
  const matched = Object.values(countryMap).find(
    (c) => c.nameEn.toLowerCase() === String(fallbackName || "").toLowerCase()
  );
  if (matched) return matched.nameEs;

  return fallbackName || code;
}

/**
 * Gets the English name for a FIFA country code or team name (used for API queries)
 * @param {string} code FIFA country code (e.g. ARG)
 * @param {string} fallbackName Fallback name if code is not found
 * @returns {string} English country name
 */
export function getCountryNameEn(code, fallbackName) {
  const cleanCode = String(code || "").toUpperCase();
  if (countryMap[cleanCode]) {
    return countryMap[cleanCode].nameEn;
  }
  return fallbackName || code;
}

/**
 * Gets the flag image URL from flagcdn.com for a given FIFA country code
 * @param {string} code FIFA country code
 * @param {string} fallbackName Team name fallback to find flag
 * @returns {string} URL to flag image
 */
export function getCountryFlagUrl(code, fallbackName) {
  const cleanCode = String(code || "").toUpperCase();
  let flagCode = "un"; // default United Nations/Unknown flag

  if (countryMap[cleanCode]) {
    flagCode = countryMap[cleanCode].flagCode;
  } else if (cleanCode.startsWith("TBD") || fallbackName === "Winner") {
    flagCode = "un";
  } else if (fallbackName) {
    const matched = Object.values(countryMap).find(
      (c) => c.nameEn.toLowerCase() === fallbackName.toLowerCase() || c.nameEs.toLowerCase() === fallbackName.toLowerCase()
    );
    if (matched) {
      flagCode = matched.flagCode;
    }
  }

  // flagcdn.com provides free high-quality flags
  return `https://flagcdn.com/w80/${flagCode}.png`;
}
