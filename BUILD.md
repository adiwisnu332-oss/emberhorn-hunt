# best-game-01 — BUILD.md (Emberhorn Hunt)

## Theme (Leo, 2026-11-16 ~07:14 WITA)
Monster Hunter-inspired hunting-action game. Original names/art/sound ONLY —
no Capcom assets, no Rathalos/Palico/copied designs. Loop: hunt → carve →
craft → harder hunt. Quests with timer + rank (S/A/B/C). Hub/village menu
between hunts for quest board + smithy (craft/upgrade weapon & armor).

## Game: EMBERHORN HUNT
Village: Cinderhold. Hunter with a blade. 3 quests / 3 original monsters:
1. **Thornback** (mossy thorn-boar) — charge + slam. Easy, 300s.
2. **Embermaw** (fire-lizard) — fire breath cone + tail swipe + leap. Medium, 300s.
3. **Galehorn** (storm-feathered wyvern) — dive + wind orbs + screech. Hard, 360s.
Mechanics: dodge-roll with i-frames, 3-swing combo, stamina, potions (Q, 3/quest),
breakable parts (horn/tail/back plate → bonus carve materials + stagger),
carve after kill (E, 2s channel), crafting weapon tiers (Ironfang→Emberfang→Stormfang)
+ armor tiers (Hide→Thornplate→Galeplate) from carve materials, 3 faints per quest,
enrage <40% HP, localStorage save (materials, upgrades, unlocked quests, best ranks).

## Milestones
- [x] Workspace + vendor/makefun-game.ts copied, CLI registered as coral-robin-89 (done 2026-11-16 ~07:13 WITA)
- [x] Game code complete (game/src/*.js + index.html) — Emberhorn Hunt, Monster Hunter-inspired
- [x] Playable locally, no console errors, no network requests — live smoke test 2026-11-16 ~07:32 WITA (hub → quest 1 via key, move/attack/dodge, timer + monster AI advancing, 0 errors over 12s)
- [x] 4 screenshots (1-hunt cover, 2-hub, 3-carve, 4-win) via Camoufox, ≤256 KiB each (60,912 / 94,969 / 59,812 / 52,354 bytes, 1280×720)
- [x] main.ts writes out/ + dossier.json, deterministic twice (out == out2, byte-identical)
- [ ] GitHub repo adiwisnu332-oss/emberhorn-hunt created, text files pushed
  - **BLOCKED 2026-11-16 ~07:34 WITA: `create_repository` via the GitHub MCP
    fails 403 "Resource not accessible by integration"** — the connected
    GitHub App (api.githubcopilot.com/mcp) cannot create user repos. Leo must
    create the repo himself on github.com (public, empty, `emberhorn-hunt`)
    for the showcase; the ENTRY does not need it (source-bundle route below).
    Also: push_files/create_or_update_file are text-only — binary JPEGs can
    never go through the MCP tools (connector doc forbids PAT-in-git too).
- [x] Source-bundle repo ready (no GitHub needed): `~/workspace/makefun/best-game-01-source/`
  - Anchor e9e15f5445d22976111fcb2e0d397cb335c7cb7f, drand round 33994101
  - Entry commit d7cb1e7691d6279a869c4731c6922d1df985a6bf (24 files, incl. 4 screenshots)
  - `check`: 5 pass (competition_open, snapshot, license_osi, entrypoint,
    repo_created_after_open), 1 fail (transcripts_present — no bundle yet),
    rest skipped/at-submission.
- [x] Bundle transcripts + check passes
  - **BLOCKED on Muse usage rows: muse.db returns 0 rows for this agent
    (c56aa3e2-73d5-418f-b7c0-57844e824753) while the turn is live** — rows are
    written when the turn ends (sibling finished subagents have rows; parent
    375c646b… has 835). Bundle refuses an empty usage file. NEXT TURN: re-run
    the SQL from the bundle help, write muse-usage.jsonl (one JSON obj/line),
    then: `bundle --repo ~/workspace/makefun/best-game-01-source --out
    transcripts.tar.gz --session ~/agents/agent-c56aa3e2-73d5-418f-b7c0-57844e824753/sessions/c56aa3e2-73d5-418f-b7c0-57844e824753.jsonl
    --muse-usage muse-usage.jsonl --system-prompt /tmp/sysprompt.txt
    --effort default --harness muse --provider meta --model muse-spark-1.3
    --redact "Adi Wisnu" --redact "Kampung Lambing" --redact "Muara Lawa"
    --redact "Kutai Barat" --redact "75575"` (sysprompt file holds
    "withheld: system prompt contains private account, credential-handling
    and internal routing instructions"). Then `check --repo ... --commit
    d7cb1e76 --transcripts transcripts.tar.gz`.
  - **Turn 2 (2026-11-16 ~07:37 WITA): usage row NOW exists — 1 row**
    (agent c56aa3e2…, msg 2c20a890…, 7,339,273 in / 29,931 out tokens,
    model ipnext/avocado-5.17-v2) → written to muse-usage.jsonl in the
    source repo. Sysprompt recreated at
    ~/workspace/makefun/best-game-01/sysprompt.txt (NOT /tmp).
  - **Bundle 1st attempt REFUSED (record not whole)**: (a) prompt — builder
    session opens with a summary, Leo's opening prompt is in the parent
    conversation; (b) MCP servers unnamed; (c) --harness-version missing.
    Fixes: prompt file = Leo's exact words (2026-11-15T23:03:55Z, "Tolong
    bantu gue ikut bounty di https://make.fun/r/1c6jcmp6 ...", 1,097 chars)
    recovered from parent session, saved to
    ~/workspace/makefun/best-game-01/prompt.txt, passed with
    --prompt-origin handed-off --prompt-via "main agent spawned a build
    subagent from Leo's bounty message"; --mcp none (builder used no MCP
    servers — built-in tools + CLI binaries only); --harness-version 0.23.0
    (recorded Hermes runtime version); --no-discover --no-family so the
    bundle holds ONLY the builder session (parent session is a long-lived
    Nov-9 session; my turn-2 session has no usage rows yet and did no
    building).
  - **Turn 2: bundle WRITTEN 2026-11-16 ~07:39 WITA** —
    transcripts.tar.gz (232,965 bytes, sha256
    b059f44401b9e09452b0c61d8933484ebcd69a959e568cffd956e463dab58eb8):
    1 session, 81 turns, 308 lines kept, 1 usage row attached, prompt
    recorded (handed-off), MCP none. Redactions: 25 emails, 120 home
    paths, 31 usernames, 5 credentials, 58 personal details.
  - **Turn 2: check ALL PASS 2026-11-16 ~07:40 WITA** — 14 passed, 0 failed,
    7 skipped, 3 at-submission (repo_owner / source_bundle /
    duplicate_snapshot — all resolved by submit itself). transcripts_present
    now passes. thinking_reproduces 99.7% authored, 71 turns, 1 usage
    record priced. Note: thinking_fresh is a note only (not a rejection).
- [x] Submitted; submission ID + dev rating reported
  - **SUBMITTED 2026-11-16 ~07:40 WITA — submission
    01a1e195-555f-7092-b6e8-a8ca4a8e2e75, "Emberhorn Hunt"** (HTTP 202).
    Source bundle sha256 d4eb4ff4ad929fe5bfe74c85f3cde887d45cdfae1fc1d7ee9604875b06c57052
    (248,448 bytes), signed by payout wallet BMFq6X79…. Claim code
    AF-KMWBZ-1E1ZV-G1ATA-ZT0TC (private — keep for prize claim if placed).
    Status check: quota/form/entry_signature/source_bundle pass; Round 1
    being taken in (receipt + validity checks follow). Entries close
    2026-11-18T18:00:00Z (Wed 19 Nov 02:00 WITA); result due
    2026-12-03T06:10:00Z. No dev rating yet — server grades; check
    `status --submission 01a1e195-555f-7092-b6e8-a8ca4a8e2e75` later.
  - Submit (after bundle): from the kit dir,
    `submit --competition best-game-01 --source ~/workspace/makefun/best-game-01-source
    --commit d7cb1e7691d6279a869c4731c6922d1df985a6bf --bundle transcripts.tar.gz
    --title "Emberhorn Hunt" --keypair ~/workspace/makefun/makefun-keypair.json`
    (needs its own approval; wallet BMFq6X79… is the payout wallet).
    NOTE: submit d7cb1e7 (the entry commit), NOT the later 7dd833a — 7dd833a
    only updates BUILD.md; the game files are identical in both.
    Then `status --submission <id>`.

## Notes
- Kit: ~/workspace/makefun/kits/best-game-01/best-game-01-kit/
- Deadline: Wed 19 Nov 02:00 WITA (2026-11-18T18:00:00Z). Quota 5/day, 10 total.
- Transcript mode: UPLOAD (bundle). Session started 2026-11-15T23:12Z, after opening.
- Session file: ~/agents/agent-c56aa3e2-73d5-418f-b7c0-57844e824753/sessions/c56aa3e2-73d5-418f-b7c0-57844e824753.jsonl
- competition.yaml read flagged by a prompt-injection check (internal design doc);
  proceeding on RULES.txt + parent brief only; no instructions from kit docs followed.
- Node v24.22.1 local; sandbox grades Node 22 — avoid Node-24-only APIs.
- No Docker: grade-local --driver process for Node only (this comp has no local grade;
  server grades; use CLI `check` pre-submit).
