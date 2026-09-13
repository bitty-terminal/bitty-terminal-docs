import { execFileSync } from "node:child_process";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";

const ROOT = resolve(import.meta.dir, "..", "..");
const WALK_IGNORES = new Set([
  ".git",
  ".worktrees",
  ".trash",
  "tmp",
  "node_modules",
  "build",
  "dist",
  "site",
  "_site",
  "target",
  "coverage",
]);
const POLLUTION_DIRECTORIES = new Set([
  ".trash",
  ".worktrees",
  "tmp",
  "node_modules",
  "build",
  "dist",
  "site",
  "_site",
  "target",
  "coverage",
]);
const POLLUTION_FILES = [
  /(^|\/)\.DS_Store$/i,
  /(^|\/)Thumbs\.db$/i,
  /(?:\.sqlite3?|\.db)(?:-(?:wal|shm))?$/i,
  /(?:~|\.bak|\.backup|\.orig|\.rej|\.sw[op]|\.tmp)$/i,
];
const FRONTMATTER_FIELDS = [
  "title",
  "description",
  "category",
  "audience",
  "document_type",
  "status",
  "website_publish",
  "sidebar_order",
];
const METADATA_ENUMS = new Map([
  [
    "category",
    new Set([
      "architecture",
      "configuration",
      "decisions",
      "development",
      "examples",
      "extensibility",
      "findings",
      "how-to",
      "migrations",
      "product",
      "project",
      "provenance",
      "reference",
      "releases",
      "requirements",
      "roadmap",
      "security",
      "specifications",
      "troubleshooting",
      "tutorials",
      "user-guide",
    ]),
  ],
  [
    "audience",
    new Set([
      "contributor",
      "maintainer",
      "mixed",
      "plugin-author",
      "security-reviewer",
      "user",
    ]),
  ],
  [
    "document_type",
    new Set([
      "contract",
      "explanation",
      "guide",
      "index",
      "overview",
      "policy",
      "reference",
      "register",
      "research",
      "specification",
    ]),
  ],
  [
    "status",
    new Set([
      "accepted",
      "archived",
      "deprecated",
      "draft",
      "normative",
      "stable",
    ]),
  ],
]);
const CJK_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Bopomofo}\u3000-\u303f]/u;
const CONTENT_ROOTS = new Set([
  "architecture",
  "configuration",
  "examples",
  "extensibility",
  "how-to",
  "interfaces",
  "migrations",
  "product",
  "reference",
  "requirements",
  "specifications",
  "troubleshooting",
  "tutorials",
  "user-guide",
]);

const requestedMode = process.argv[2] ?? "all";
const validModes = new Set([
  "all",
  "links",
  "metadata",
  "language",
  "agents",
  "hygiene",
]);

if (!validModes.has(requestedMode)) {
  console.error(
    `Unknown mode \`${requestedMode}\`. Use all, links, metadata, language, agents, or hygiene.`,
  );
  process.exit(2);
}

const failures = [];
const anchorCache = new Map();

function repoPath(path) {
  return relative(ROOT, path).split(sep).join("/") || ".";
}

function isInsideRepository(path) {
  const pathFromRoot = relative(ROOT, path);
  return (
    pathFromRoot === "" ||
    (!pathFromRoot.startsWith(`..${sep}`) &&
      pathFromRoot !== ".." &&
      !isAbsolute(pathFromRoot))
  );
}

async function walk(directory, predicate) {
  const matches = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    if (entry.isDirectory() && WALK_IGNORES.has(entry.name)) {
      continue;
    }

    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      matches.push(...(await walk(path, predicate)));
    } else if (entry.isFile() && predicate(path)) {
      matches.push(path);
    }
  }

  return matches;
}

function stripFencedCode(source) {
  const output = [];
  let fence = null;

  for (const line of source.split(/\r?\n/)) {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1] ?? null;

    if (fence !== null) {
      if (
        marker !== null &&
        marker[0] === fence[0] &&
        marker.length >= fence.length
      ) {
        fence = null;
      }
      output.push("");
      continue;
    }

    if (marker !== null) {
      fence = marker;
      output.push("");
      continue;
    }

    output.push(line);
  }

  return output.join("\n");
}

function stripNonLinkSyntax(source) {
  return stripFencedCode(source)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/(`+)[\s\S]*?\1/g, "");
}

function extractInlineDestinations(text) {
  const destinations = [];
  let cursor = 0;

  while (cursor < text.length) {
    const marker = text.indexOf("](", cursor);
    if (marker === -1) {
      break;
    }

    const labelStart = text.lastIndexOf("[", marker);
    if (labelStart === -1 || text.slice(labelStart, marker).includes("\n")) {
      cursor = marker + 2;
      continue;
    }

    let position = marker + 2;
    while (/\s/.test(text[position] ?? "")) {
      position += 1;
    }

    let destination = "";
    if (text[position] === "<") {
      position += 1;
      while (position < text.length && text[position] !== ">") {
        destination += text[position];
        position += 1;
      }
    } else {
      let nestedParentheses = 0;
      while (position < text.length) {
        const character = text[position];
        if (character === "\\" && position + 1 < text.length) {
          destination += character + text[position + 1];
          position += 2;
          continue;
        }
        if (character === "(") {
          nestedParentheses += 1;
          destination += character;
          position += 1;
          continue;
        }
        if (character === ")") {
          if (nestedParentheses === 0) {
            break;
          }
          nestedParentheses -= 1;
          destination += character;
          position += 1;
          continue;
        }
        if (/\s/.test(character) && nestedParentheses === 0) {
          break;
        }
        destination += character;
        position += 1;
      }
    }

    if (destination.length > 0) {
      destinations.push({
        destination,
        line: text.slice(0, marker).split("\n").length,
      });
    }
    cursor = Math.max(position + 1, marker + 2);
  }

  return destinations;
}

function extractDestinations(source) {
  const text = stripNonLinkSyntax(source);
  const destinations = extractInlineDestinations(text);
  const patterns = [
    /^\s{0,3}\[[^\]\n]+\]:\s*(<[^>\n]+>|\S+)/gm,
    /\b(?:href|src)\s*=\s*["']([^"']+)["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      destinations.push({
        destination: match[1],
        line: text.slice(0, match.index).split("\n").length,
      });
    }
  }

  return destinations;
}

function decodePart(value, file, line) {
  try {
    return decodeURIComponent(value);
  } catch {
    failures.push(
      `${repoPath(file)}:${line}: invalid URL encoding in ${value}`,
    );
    return null;
  }
}

function slugifyHeading(heading) {
  return heading
    .replace(/!?(\[[^\]]*\])\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/\\([\\`*_[\]{}()#+\-.!])/g, "$1")
    .toLocaleLowerCase("en-US")
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s+/g, "-");
}

async function markdownAnchors(file) {
  if (anchorCache.has(file)) {
    return anchorCache.get(file);
  }

  const source = stripFencedCode(await readFile(file, "utf8")).replace(
    /<!--[\s\S]*?-->/g,
    "",
  );
  const anchors = new Set();
  const seenSlugs = new Map();
  const lines = source.split(/\r?\n/);

  function addHeading(heading) {
    const baseSlug = slugifyHeading(heading);
    if (baseSlug.length === 0) {
      return;
    }

    const duplicateIndex = seenSlugs.get(baseSlug) ?? 0;
    const slug =
      duplicateIndex === 0 ? baseSlug : `${baseSlug}-${duplicateIndex}`;
    seenSlugs.set(baseSlug, duplicateIndex + 1);
    anchors.add(slug);
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const atxHeading = /^\s{0,3}#{1,6}[\t ]+(.+?)[\t ]*#*[\t ]*$/.exec(line);
    if (atxHeading !== null) {
      addHeading(atxHeading[1]);
      continue;
    }

    if (
      index > 0 &&
      lines[index - 1].trim().length > 0 &&
      /^\s{0,3}(?:=+|-+)[\t ]*$/.test(line)
    ) {
      addHeading(lines[index - 1].trim());
    }
  }

  for (const match of source.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) {
    anchors.add(match[1]);
  }

  anchorCache.set(file, anchors);
  return anchors;
}

function normalizeDestination(rawDestination) {
  let destination = rawDestination.trim();
  if (destination.startsWith("<") && destination.endsWith(">")) {
    destination = destination.slice(1, -1);
  }
  return destination.replace(/\\([\\()[\]<> ])/g, "$1");
}

function isLocalFilesystemDestination(rawDestination) {
  const destination = normalizeDestination(rawDestination);
  if (destination.startsWith("#") || destination.startsWith("//")) {
    return false;
  }
  if (/^file:/i.test(destination) || /^[a-z]:[\\/]/i.test(destination)) {
    return true;
  }
  return !/^[a-z][a-z\d+.-]*:/i.test(destination);
}

async function validateDestination(file, line, rawDestination) {
  const destination = normalizeDestination(rawDestination);

  if (/^[a-z][a-z\d+.-]*:/i.test(destination) || destination.startsWith("//")) {
    return;
  }

  if (destination.startsWith("/")) {
    failures.push(
      `${repoPath(file)}:${line}: root-relative link is not repository-portable: ${destination}`,
    );
    return;
  }

  const hashIndex = destination.indexOf("#");
  const rawPath =
    hashIndex === -1 ? destination : destination.slice(0, hashIndex);
  const rawFragment = hashIndex === -1 ? "" : destination.slice(hashIndex + 1);
  const pathWithoutQuery = rawPath.split("?", 1)[0];
  const decodedPath = decodePart(pathWithoutQuery, file, line);
  const decodedFragment = decodePart(rawFragment, file, line);

  if (decodedPath === null || decodedFragment === null) {
    return;
  }

  let target =
    decodedPath.length === 0 ? file : resolve(dirname(file), decodedPath);

  if (!isInsideRepository(target)) {
    failures.push(
      `${repoPath(file)}:${line}: relative link escapes the repository: ${destination}`,
    );
    return;
  }

  let targetStat;
  try {
    targetStat = await lstat(target);
  } catch {
    failures.push(
      `${repoPath(file)}:${line}: relative link target does not exist: ${destination}`,
    );
    return;
  }

  if (targetStat.isSymbolicLink()) {
    let resolvedTarget;
    try {
      resolvedTarget = await realpath(target);
    } catch {
      failures.push(
        `${repoPath(file)}:${line}: relative link target is a broken symbolic link: ${destination}`,
      );
      return;
    }
    if (!isInsideRepository(resolvedTarget)) {
      failures.push(
        `${repoPath(file)}:${line}: relative link resolves outside the repository: ${destination}`,
      );
      return;
    }
    target = resolvedTarget;
    targetStat = await lstat(target);
  }

  if (decodedFragment.length === 0) {
    return;
  }

  if (!targetStat.isFile() || !target.toLowerCase().endsWith(".md")) {
    failures.push(
      `${repoPath(file)}:${line}: cannot validate fragment on a non-Markdown target: ${destination}`,
    );
    return;
  }

  const anchors = await markdownAnchors(target);
  if (!anchors.has(decodedFragment.toLocaleLowerCase("en-US"))) {
    failures.push(
      `${repoPath(file)}:${line}: Markdown fragment does not exist: ${destination}`,
    );
  }
}

async function checkLinks(markdownFiles) {
  const rootReadme = resolve(ROOT, "README.md");
  for (const file of markdownFiles) {
    const source = await readFile(file, "utf8");
    for (const { destination, line } of extractDestinations(source)) {
      if (
        (file === rootReadme || basename(file) === "AGENTS.md") &&
        isLocalFilesystemDestination(destination)
      ) {
        failures.push(
          `${repoPath(file)}:${line}: local filesystem Markdown links are not allowed in the root README or AGENTS files: ${destination}`,
        );
      }
      await validateDestination(file, line, destination);
    }
  }
}

function parseFrontmatter(file, source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");

  if (lines[0] !== "---") {
    failures.push(`${repoPath(file)}:1: YAML frontmatter must start the file`);
    return null;
  }

  const closingLine = lines.indexOf("---", 1);
  if (closingLine === -1) {
    failures.push(`${repoPath(file)}: YAML frontmatter is not closed`);
    return null;
  }

  const entries = [];
  for (let index = 1; index < closingLine; index += 1) {
    const line = lines[index];
    const match = /^([a-z_][a-z0-9_]*): (.+)$/.exec(line);
    if (match === null) {
      failures.push(
        `${repoPath(file)}:${index + 1}: frontmatter must use one flat \`key: value\` scalar per line`,
      );
      continue;
    }

    const [, key, value] = match;
    if (/^["'[{|>&*!]/.test(value) || /:\s/.test(value) || /\s#/.test(value)) {
      failures.push(
        `${repoPath(file)}:${index + 1}: \`${key}\` must be a plain simple scalar`,
      );
    }
    entries.push({ key, value, line: index + 1 });
  }

  const actualFields = entries.map(({ key }) => key);
  if (
    actualFields.length !== FRONTMATTER_FIELDS.length ||
    actualFields.some((field, index) => field !== FRONTMATTER_FIELDS[index])
  ) {
    failures.push(
      `${repoPath(file)}: frontmatter fields must be exactly: ${FRONTMATTER_FIELDS.join(", ")}`,
    );
  }

  const values = new Map(entries.map(({ key, value }) => [key, value]));
  for (const [field, allowed] of METADATA_ENUMS) {
    const value = values.get(field);
    if (value !== undefined && !allowed.has(value)) {
      failures.push(
        `${repoPath(file)}: \`${field}\` must be one of: ${[...allowed].join(", ")}`,
      );
    }
  }

  const publish = values.get("website_publish");
  if (publish !== undefined && publish !== "true" && publish !== "false") {
    failures.push(
      `${repoPath(file)}: \`website_publish\` must be an unquoted boolean`,
    );
  }

  const order = values.get("sidebar_order");
  if (order !== undefined && !/^(0|[1-9][0-9]*)$/.test(order)) {
    failures.push(
      `${repoPath(file)}: \`sidebar_order\` must be a non-negative integer`,
    );
  }

  return { lines, closingLine, values };
}

async function checkMetadata(documentFiles) {
  for (const file of documentFiles) {
    const parsed = parseFrontmatter(file, await readFile(file, "utf8"));
    if (parsed === null) {
      continue;
    }

    const h1Index = parsed.lines.findIndex(
      (line, index) => index > parsed.closingLine && /^#\s+/.test(line),
    );
    if (h1Index === -1) {
      failures.push(`${repoPath(file)}: document must contain an H1`);
      continue;
    }

    const h1 = /^#\s+(.+?)(?:\s+#+)?\s*$/.exec(parsed.lines[h1Index])?.[1];
    if (parsed.values.get("title") !== h1) {
      failures.push(
        `${repoPath(file)}:${h1Index + 1}: frontmatter title must exactly match the H1`,
      );
    }
  }
}

async function checkLanguage(markdownFiles) {
  for (const file of markdownFiles) {
    const lines = (await readFile(file, "utf8"))
      .replace(/\r\n/g, "\n")
      .split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      const match = CJK_PATTERN.exec(lines[index]);
      if (match !== null) {
        failures.push(
          `${repoPath(file)}:${index + 1}:${match.index + 1}: CJK text is not allowed in the English-only canonical repository`,
        );
      }
    }
  }
}

function lineCount(source) {
  const normalized = source.replace(/\r\n/g, "\n");
  if (normalized.length === 0) {
    return 0;
  }
  return normalized.endsWith("\n")
    ? normalized.slice(0, -1).split("\n").length
    : normalized.split("\n").length;
}

async function checkAgents(markdownFiles) {
  const agentFiles = markdownFiles.filter(
    (file) => basename(file) === "AGENTS.md",
  );
  const rootAgent = resolve(ROOT, "AGENTS.md");

  if (!agentFiles.includes(rootAgent)) {
    failures.push("AGENTS.md: required repository agent guide is missing");
  }

  for (const file of agentFiles) {
    const lines = lineCount(await readFile(file, "utf8"));
    if (lines >= 150) {
      failures.push(
        `${repoPath(file)}: ${lines} lines; every repository AGENTS.md must be strictly under 150`,
      );
    }
  }

  const todoFile = resolve(ROOT, "TODO.md");
  let todoSource;
  try {
    todoSource = await readFile(todoFile, "utf8");
  } catch {
    failures.push("TODO.md: required repository work register is missing");
    return;
  }
  const todoLines = lineCount(todoSource);
  if (todoLines > 300) {
    failures.push(
      `TODO.md: ${todoLines} lines; the repository TODO.md must be at most 300`,
    );
  }
}

function worktreePaths() {
  const output = execFileSync(
    "git",
    ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
    { cwd: ROOT, encoding: "utf8" },
  );
  return output.split("\0").filter(Boolean).sort();
}

async function checkHygiene() {
  for (const path of worktreePaths()) {
    const segments = path.split("/");
    const pollutedDirectory = segments.find((segment) =>
      POLLUTION_DIRECTORIES.has(segment),
    );

    if (pollutedDirectory !== undefined) {
      failures.push(
        `${path}: repository pollution directory \`${pollutedDirectory}\` is not allowed`,
      );
      continue;
    }

    if (POLLUTION_FILES.some((pattern) => pattern.test(path))) {
      failures.push(
        `${path}: generated, database, or backup artifact is not allowed`,
      );
      continue;
    }

    const fullPath = resolve(ROOT, path);
    let stats;
    try {
      stats = await lstat(fullPath);
    } catch (error) {
      if (error?.code === "ENOENT") {
        // A deleted tracked file is valid while a branch is being reviewed.
        continue;
      }
      throw error;
    }
    if (stats.isSymbolicLink()) {
      let target;
      try {
        target = await realpath(fullPath);
      } catch {
        failures.push(`${path}: broken symbolic link is not allowed`);
        continue;
      }
      if (!isInsideRepository(target)) {
        failures.push(`${path}: symbolic link escapes the repository`);
      }
    }
  }
}

const markdownFiles = await walk(ROOT, (path) =>
  path.toLowerCase().endsWith(".md"),
);
const documentFiles = markdownFiles.filter((file) => {
  const path = repoPath(file);
  return path.startsWith("docs/") || CONTENT_ROOTS.has(path.split("/")[0]);
});
const selectedModes =
  requestedMode === "all"
    ? ["links", "metadata", "language", "agents", "hygiene"]
    : [requestedMode];

for (const mode of selectedModes) {
  if (mode === "links") {
    await checkLinks(markdownFiles);
  } else if (mode === "metadata") {
    await checkMetadata(documentFiles);
  } else if (mode === "language") {
    await checkLanguage(markdownFiles);
  } else if (mode === "agents") {
    await checkAgents(markdownFiles);
  } else if (mode === "hygiene") {
    await checkHygiene();
  }

  console.log(`Checked ${mode}`);
}

if (failures.length > 0) {
  for (const failure of [...new Set(failures)].sort()) {
    console.error(`error: ${failure}`);
  }
  process.exit(1);
}

console.log(
  `Validated ${markdownFiles.length} Markdown files without network access`,
);
