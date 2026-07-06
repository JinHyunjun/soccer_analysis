import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MatchNotFound() {
  return (
    <main className="detail-shell not-found-shell">
      <span className="brand-ball">S</span>
      <h1>경기를 찾지 못했습니다.</h1>
      <p>삭제됐거나 아직 수집되지 않은 경기일 수 있습니다.</p>
      <Link className="primary-button" href="/#matches"><ArrowLeft size={16} /> 경기 목록으로</Link>
    </main>
  );
}
