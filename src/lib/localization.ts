const nationalTeamNamesKo: Record<string, string> = {
  ARG: "아르헨티나",
  AUS: "호주",
  AUT: "오스트리아",
  BEL: "벨기에",
  BIH: "보스니아 헤르체고비나",
  BRA: "브라질",
  CAN: "캐나다",
  CHE: "스위스",
  CIV: "코트디부아르",
  COD: "콩고민주공화국",
  COL: "콜롬비아",
  CPV: "카보베르데",
  CUW: "퀴라소",
  CZE: "체코",
  DZA: "알제리",
  ECU: "에콰도르",
  EGY: "이집트",
  ENG: "잉글랜드",
  ESP: "스페인",
  FRA: "프랑스",
  GER: "독일",
  GHA: "가나",
  HRV: "크로아티아",
  HTI: "아이티",
  IRN: "이란",
  IRQ: "이라크",
  JOR: "요르단",
  JPN: "일본",
  KOR: "대한민국",
  MAR: "모로코",
  MEX: "멕시코",
  NLD: "네덜란드",
  NOR: "노르웨이",
  NZL: "뉴질랜드",
  PAN: "파나마",
  PAR: "파라과이",
  PRT: "포르투갈",
  QAT: "카타르",
  RSA: "남아프리카공화국",
  SAU: "사우디아라비아",
  SCT: "스코틀랜드",
  SEN: "세네갈",
  SUI: "스위스",
  SWE: "스웨덴",
  TUN: "튀니지",
  TUR: "튀르키예",
  URY: "우루과이",
  USA: "미국",
  UZB: "우즈베키스탄",
};

export function localizeTeamName(shortName: string | null, fallback: string): string {
  if (!shortName) return fallback;
  const codes = shortName.split("/");
  const localized = codes.map((code) => nationalTeamNamesKo[code]);
  return localized.every(Boolean) ? localized.join("/") : fallback;
}

export function localizeCompetitionName(name: string, code?: string | null): string {
  const namesByCode: Record<string, string> = {
    WC: "2026 FIFA 월드컵",
    PL: "프리미어리그",
    PD: "라리가",
    BL1: "분데스리가",
    SA: "세리에 A",
    FL1: "리그 1",
  };
  if (code && namesByCode[code]) return namesByCode[code];
  return /^WM\s+2026$/i.test(name) ? "2026 FIFA 월드컵" : name;
}

export function localizeStage(stage: string | null): string | undefined {
  if (!stage) return undefined;
  const groupMatch = /^Gruppenphase\s+(\d+)$/i.exec(stage);
  if (groupMatch) return `조별리그 ${groupMatch[1]}차전`;

  const stages: Record<string, string> = {
    Sechzehntelfinale: "32강",
    Achtelfinale: "16강",
    Viertelfinale: "8강",
    Halbfinale: "준결승",
    Finale: "결승",
    "Spiel um Platz 3": "3·4위전",
  };
  return stages[stage] ?? stage;
}
