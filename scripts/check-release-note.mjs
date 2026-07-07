import { execFileSync } from "node:child_process";

const releaseFile = "src/content/releases.ts";
const featurePaths = [
  /^src\/(?!.*(?:\.test\.|\.spec\.))/, 
  /^workers\/(?!.*(?:\.test\.|\.spec\.))/, 
  /^migrations\//,
  /^wrangler(?:\.[^.]+)?\.jsonc$/,
  /^package(?:-lock)?\.json$/,
];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function workingTreeFiles() {
  const tracked = git(["diff", "--name-only", "HEAD"]).split(/\r?\n/).filter(Boolean);
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/).filter(Boolean);
  return [...new Set([...tracked, ...untracked])];
}

function committedFiles(base, head) {
  try {
    return git(["diff", "--name-only", base, head]).split(/\r?\n/).filter(Boolean);
  } catch {
    return git(["diff", "--name-only", "HEAD^", "HEAD"]).split(/\r?\n/).filter(Boolean);
  }
}

const args = process.argv.slice(2);
const changedFiles = args.includes("--working-tree")
  ? workingTreeFiles()
  : committedFiles(args[0] || "HEAD^", args[1] || "HEAD");
const featureFiles = changedFiles.filter((file) => featurePaths.some((pattern) => pattern.test(file)));

if (featureFiles.length && !changedFiles.includes(releaseFile)) {
  console.error("릴리즈 노트 누락: 기능 또는 운영 코드가 변경되었습니다.");
  console.error(`같은 변경에 ${releaseFile} 업데이트를 포함하세요.`);
  console.error(featureFiles.map((file) => `- ${file}`).join("\n"));
  process.exit(1);
}

console.log(featureFiles.length
  ? `릴리즈 노트 확인 완료: ${featureFiles.length}개 기능 파일과 함께 갱신됨`
  : "릴리즈 노트가 필요한 기능 변경 없음");
