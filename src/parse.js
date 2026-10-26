// SliceCheck parser.
// Reads a pasted ticket and finds each section named in rules.yaml.
// Works in Node and in the browser (no dependencies).
//
// A line starts a section when, after trimming bullets, "#" and "**", it is
// exactly one of the section's aliases, or starts with an alias followed by
// ":". Longer aliases win, so "Approved Requirements PDF:" is not read as
// "Approved". Everything until the next section line belongs to that section.

const clean = (s) =>
  s.replace(/^[\s>#*\-•]+/, "").replace(/[*_]+/g, "").replace(/\s+/g, " ").trim();

const lower = (s) => clean(s).toLowerCase();

export function buildAliasIndex(rules) {
  const index = [];
  for (const [name, def] of Object.entries(rules.sections || {})) {
    for (const alias of def.aliases || []) {
      index.push({ name, alias: alias.toLowerCase() });
    }
  }
  // Longest alias first so specific names beat short ones.
  return index.sort((a, b) => b.alias.length - a.alias.length);
}

// Returns { name, rest } if the line opens a section, else null.
export function matchHeader(line, index) {
  const l = lower(line);
  if (!l) return null;
  for (const { name, alias } of index) {
    if (l === alias || l === alias + ":") return { name, rest: "" };
    if (l.startsWith(alias + ":")) {
      return { name, rest: clean(line).slice(alias.length + 1).trim() };
    }
    // "Organizational Readiness Message - Sun Team", "Process Flow (optional)"
    if (l.startsWith(alias + " - ") || l.startsWith(alias + " (")) return { name, rest: "" };
  }
  return null;
}

function compile(patterns = []) {
  return patterns.map((p) => new RegExp(p, "i"));
}

export function parseTicket(text, rules) {
  const p = rules.parsing || {};
  const templateRx = compile(p.template_lines);
  const index = buildAliasIndex(rules);
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");

  const sections = {};
  const fields = new Set(
    Object.entries(rules.sections || {}).filter(([, d]) => d.field).map(([n]) => n)
  );
  let current = null;

  lines.forEach((raw, i) => {
    const header = matchHeader(raw, index);
    if (header) {
      current = header.name;
      // Keep the first occurrence; later repeats append (some tools repeat labels).
      if (!sections[current]) sections[current] = { found: true, line: i + 1, lines: [] };
      if (header.rest) {
        sections[current].lines.push(header.rest);
        if (fields.has(current)) current = null;
      }
      return;
    }
    if (!current) return;
    const c = clean(raw);
    if (!c) return;
    if (templateRx.some((rx) => rx.test(c))) return;
    sections[current].lines.push(c);
    // Single-value fields take one value, then stop (field lists put the
    // next label right after the value).
    if (fields.has(current)) current = null;
  });

  for (const s of Object.values(sections)) s.content = s.lines.join("\n");

  return {
    text: String(text || ""),
    lines,
    sections,
    stage: detectStage(lines, sections, rules),
  };
}

// Stage comes from the status section if there is one; otherwise from any
// short line near the top that is exactly a known stage word (Wrike-style
// pastes put the status on its own line with no label).
export function detectStage(lines, sections, rules) {
  const stages = rules.stages || {};
  const lookup = (value) => {
    const v = lower(value);
    for (const [stage, words] of Object.entries(stages)) {
      if (words.some((w) => v === w.toLowerCase() || v.startsWith(w.toLowerCase() + " ("))) {
        return stage;
      }
    }
    return null;
  };
  const status = sections.status;
  if (status) {
    for (const l of status.lines) {
      const s = lookup(l);
      if (s) return s;
    }
  }
  for (const l of lines.slice(0, 40)) {
    const s = lookup(l);
    if (s) return s;
  }
  return "unknown";
}

// Helpers shared with the checker.
export function isEmptyValue(content, rules) {
  const empties = (rules.parsing?.empty_values || [""]).map((v) => v.toLowerCase());
  const body = (content || "").split("\n").map((l) => l.trim().toLowerCase()).filter(Boolean);
  return body.length === 0 || body.every((l) => empties.includes(l));
}

export function isNaValue(content, rules) {
  const nas = (rules.parsing?.na_values || []).map((v) => v.toLowerCase());
  const body = (content || "").split("\n").map((l) => l.trim().toLowerCase().replace(/[.:]$/, "")).filter(Boolean);
  return body.length > 0 && body.every((l) => nas.includes(l));
}

export function hasPlaceholder(content, rules) {
  return compile(rules.parsing?.placeholder_patterns).some((rx) => rx.test(content || ""));
}
