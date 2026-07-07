import { describe, expect, it } from "vitest";
import { parseNotionReleaseBlocks } from "./notion-releases";

function block(type: string, text: string) {
  return { type, [type]: { rich_text: [{ plain_text: text }] } };
}

describe("Notion release parser", () => {
  it("parses versions, sections, dates and validation", () => {
    const releases = parseNotionReleaseBlocks([
      block("heading_2", "📦 v0.4.1 — Notion 연동"),
      block("paragraph", "2026-07-07"),
      block("paragraph", "Notion을 단일 원본으로 사용합니다."),
      block("heading_3", "신규 기능"),
      block("bulleted_list_item", "릴리즈 페이지 연동"),
      block("heading_3", "검증"),
      block("bulleted_list_item", "운영 URL 200 확인"),
    ]);

    expect(releases).toEqual([expect.objectContaining({
      version: "0.4.1",
      date: "2026-07-07",
      title: "Notion 연동",
      summary: "Notion을 단일 원본으로 사용합니다.",
      highlights: ["신규 기능: 릴리즈 페이지 연동"],
      validation: ["운영 URL 200 확인"],
    })]);
  });

  it("ignores content before the first version heading", () => {
    expect(parseNotionReleaseBlocks([
      block("paragraph", "공개 원칙"),
      block("bulleted_list_item", "아직 릴리즈 아님"),
    ])).toEqual([]);
  });
});
