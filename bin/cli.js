#!/usr/bin/env node
"use strict";

/**
 * ai-code-skills installer.
 *
 * Installs one or more Agent Skills into Claude Code and/or Codex, at user or
 * project scope, by copying skill directories into the relevant skills folder.
 * Users choose which skills to install.
 *
 * Usage:
 *   npx ai-code-skills list
 *   npx ai-code-skills install [skills...] [--all] [--user|--project] [--claude|--codex|--both] [--root <path>]
 *   npx ai-code-skills uninstall [skills...] [--all] [...]
 *   npx ai-code-skills where [skills...] [--all] [...]
 *   npx ai-code-skills --help
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const readline = require("readline");

const PKG_ROOT = path.resolve(__dirname, "..");
const SKILLS_DIR = path.join(PKG_ROOT, "skills");

const CLIENTS = {
  claude: { label: "Claude Code", dir: ".claude/skills" },
  codex: { label: "Codex", dir: ".agents/skills" },
};

function log(msg) {
  process.stdout.write(`${msg}\n`);
}
function errLog(msg) {
  process.stderr.write(`${msg}\n`);
}

// ---- Skill discovery -------------------------------------------------------

function parseFrontmatter(skillMdPath) {
  const out = {};
  let text;
  try {
    text = fs.readFileSync(skillMdPath, "utf8");
  } catch {
    return out;
  }
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return out;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(name|description|license):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim();
  }
  return out;
}

function discoverSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs
    .readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        fs.existsSync(path.join(SKILLS_DIR, d.name, "SKILL.md"))
    )
    .map((d) => {
      const fm = parseFrontmatter(path.join(SKILLS_DIR, d.name, "SKILL.md"));
      return {
        name: fm.name || d.name,
        dir: d.name,
        description: fm.description || "",
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function firstSentence(text, max = 120) {
  if (!text) return "";
  const s = text.split(/(?<=\.)\s/)[0];
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

// ---- Arg parsing -----------------------------------------------------------

function parseArgs(argv) {
  const opts = {
    command: null,
    scope: "user",
    clients: null,
    all: false,
    root: null,
    skills: [],
    help: false,
  };
  const selected = new Set();
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    switch (arg) {
      case "list":
      case "install":
      case "uninstall":
      case "where":
      case "help":
        if (!opts.command) opts.command = arg;
        else opts.skills.push(arg);
        break;
      case "--all":
        opts.all = true;
        break;
      case "--user":
        opts.scope = "user";
        break;
      case "--project":
        opts.scope = "project";
        break;
      case "--claude":
        selected.add("claude");
        break;
      case "--codex":
        selected.add("codex");
        break;
      case "--both":
        selected.add("claude");
        selected.add("codex");
        break;
      case "--root":
      case "--dir":
      case "--project-root":
        opts.root = argv[++i];
        if (!opts.root) throw new Error(`${arg} requires a path`);
        break;
      case "-h":
      case "--help":
        opts.help = true;
        break;
      default:
        if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
        opts.skills.push(arg);
    }
    i++;
  }
  opts.clients = selected.size ? [...selected] : ["claude", "codex"];
  if (!opts.command) opts.command = opts.help ? "help" : "install";
  return opts;
}

function helpText(skills) {
  const list = skills.length
    ? skills.map((s) => `    ${s.name.padEnd(22)} ${firstSentence(s.description, 60)}`).join("\n")
    : "    (none found)";
  return `ai-code-skills — install AI code-review Agent Skills for Claude Code & Codex

Usage:
  npx ai-code-skills <command> [skills...] [options]

Commands:
  list                       List the skills available in this package
  install [skills...]        Install the named skills (or use --all)
  uninstall [skills...]      Remove the named skills (or use --all)
  where [skills...]          Show install destinations and whether each is present
  help                       Show this help

Options:
  --all                      Apply to every skill in the package
  --user                     Install for the current user (default)
  --project                  Install into a repository (use --root to set it)
  --root <path>              Project root for --project (default: current directory)
  --claude                   Target Claude Code only   (-> <root>/.claude/skills)
  --codex                    Target Codex only          (-> <root>/.agents/skills)
  --both                     Target both clients (default)
  -h, --help                 Show this help

Available skills:
${list}

Examples:
  npx ai-code-skills list
  npx ai-code-skills install nextjs-pr-review
  npx ai-code-skills install nextjs-pr-review laravel-pr-review --claude
  npx ai-code-skills install --all --project --root ./my-app
  npx ai-code-skills uninstall laravel-pr-review

Running 'install' with no skill names opens an interactive picker (or prints the
list if the terminal is non-interactive — you must choose which skills to install).`;
}

// ---- File ops --------------------------------------------------------------

function resolveRoot(opts) {
  if (opts.scope === "user") return os.homedir();
  const root = path.resolve(opts.root || process.cwd());
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Project root is not a directory: ${root}`);
  }
  return root;
}

function destinationsFor(skill, opts) {
  const root = resolveRoot(opts);
  return opts.clients.map((client) => ({
    client,
    label: CLIENTS[client].label,
    path: path.join(root, CLIENTS[client].dir, skill.dir),
  }));
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else if (entry.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(s), d);
    else {
      fs.copyFileSync(s, d);
      try {
        fs.chmodSync(d, fs.statSync(s).mode);
      } catch {
        /* best effort */
      }
    }
  }
}

// ---- Skill resolution ------------------------------------------------------

function resolveTargets(opts, available) {
  if (opts.all) return available;
  if (opts.skills.length) {
    const byName = new Map(available.map((s) => [s.name, s]));
    const targets = [];
    for (const name of opts.skills) {
      const s = byName.get(name);
      if (!s) throw new Error(`Unknown skill: ${name}. Run 'list' to see options.`);
      targets.push(s);
    }
    return targets;
  }
  return null; // caller decides (prompt or error)
}

function printSkillList(skills) {
  log("Available skills:");
  for (const s of skills) {
    log(`  • ${s.name}`);
    if (s.description) log(`      ${firstSentence(s.description, 100)}`);
  }
}

function promptSelection(skills) {
  return new Promise((resolve) => {
    log("Select skills to install:\n");
    skills.forEach((s, idx) => {
      log(`  ${idx + 1}) ${s.name} — ${firstSentence(s.description, 70)}`);
    });
    log("");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(
      "Enter numbers (comma-separated), 'all', or blank to cancel: ",
      (answer) => {
        rl.close();
        const a = answer.trim().toLowerCase();
        if (!a) return resolve([]);
        if (a === "all") return resolve(skills.slice());
        const picked = [];
        for (const tok of a.split(/[,\s]+/).filter(Boolean)) {
          const n = Number(tok);
          if (Number.isInteger(n) && n >= 1 && n <= skills.length) {
            picked.push(skills[n - 1]);
          }
        }
        resolve([...new Set(picked)]);
      }
    );
  });
}

// ---- Commands --------------------------------------------------------------

function doInstall(targets, opts) {
  for (const skill of targets) {
    const src = path.join(SKILLS_DIR, skill.dir);
    for (const { label, path: dest } of destinationsFor(skill, opts)) {
      fs.rmSync(dest, { recursive: true, force: true });
      copyDir(src, dest);
      log(`Installed ${skill.name} (${label}): ${dest}`);
    }
  }
  log("");
  log("Done. Restart the agent if it was running, then invoke a skill, e.g.:");
  for (const skill of targets) {
    log(`  Claude Code: /${skill.name}    Codex: $${skill.name}`);
  }
}

function doUninstall(targets, opts) {
  for (const skill of targets) {
    for (const { label, path: dest } of destinationsFor(skill, opts)) {
      if (fs.existsSync(dest)) {
        fs.rmSync(dest, { recursive: true, force: true });
        log(`Removed ${skill.name} (${label}): ${dest}`);
      } else {
        log(`Not installed ${skill.name} (${label}): ${dest}`);
      }
    }
  }
}

function doWhere(targets, opts) {
  for (const skill of targets) {
    for (const { label, path: dest } of destinationsFor(skill, opts)) {
      const state = fs.existsSync(dest) ? "present" : "absent";
      log(`${skill.name.padEnd(20)} ${label.padEnd(12)} [${state}] ${dest}`);
    }
  }
}

// ---- Entry -----------------------------------------------------------------

async function main() {
  let opts;
  const skills = discoverSkills();
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    errLog(e.message);
    errLog("Run with --help for usage.");
    process.exit(2);
  }

  if (opts.help || opts.command === "help") {
    log(helpText(skills));
    return;
  }

  if (!skills.length) {
    errLog(`No skills found in ${SKILLS_DIR}`);
    process.exit(1);
  }

  if (opts.command === "list") {
    printSkillList(skills);
    return;
  }

  try {
    let targets = resolveTargets(opts, skills);

    if (!targets) {
      // No skills chosen and not --all: must choose.
      if (opts.command === "install" && process.stdin.isTTY && process.stdout.isTTY) {
        targets = await promptSelection(skills);
        if (!targets.length) {
          log("Nothing selected. Aborted.");
          return;
        }
      } else {
        errLog("Choose which skill(s) to act on by name, or pass --all.\n");
        printSkillList(skills);
        process.exit(2);
      }
    }

    if (opts.command === "install") doInstall(targets, opts);
    else if (opts.command === "uninstall") doUninstall(targets, opts);
    else if (opts.command === "where") doWhere(targets, opts);
    else {
      errLog(`Unknown command: ${opts.command}`);
      process.exit(2);
    }
  } catch (e) {
    errLog(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
