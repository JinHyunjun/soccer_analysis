import { describe, expect, it } from "vitest";
import { localizeCompetitionName, localizeStage, localizeTeamName } from "./localization";

describe("football display localization", () => {
  it("uses national-team codes instead of provider-language names", () => {
    expect(localizeTeamName("KOR", "Südkorea")).toBe("대한민국");
    expect(localizeTeamName("EGY", "Ägypten")).toBe("이집트");
  });

  it("localizes unresolved knockout pairings code by code", () => {
    expect(localizeTeamName("USA/BEL", "USA/BEL")).toBe("미국/벨기에");
  });

  it("keeps an unknown club or country name unchanged", () => {
    expect(localizeTeamName("XYZ", "Example FC")).toBe("Example FC");
  });

  it("localizes the World Cup competition and round", () => {
    expect(localizeCompetitionName("WM 2026")).toBe("2026 FIFA 월드컵");
    expect(localizeStage("Achtelfinale")).toBe("16강");
    expect(localizeStage("Gruppenphase 2")).toBe("조별리그 2차전");
  });
});
