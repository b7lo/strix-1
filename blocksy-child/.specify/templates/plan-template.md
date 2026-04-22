# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: PHP 8.x + JavaScript (Vanilla/jQuery) + CSS3
**Primary Dependencies**: WordPress (latest stable), Blocksy parent theme, Directorist plugin
**Storage**: MySQL via WordPress `$wpdb` / WP Options API / Post Meta
**Testing**: Manual browser testing (mobile + desktop); no automated test suite currently
**Target Platform**: WordPress on LiteSpeed-hosted server; RTL Arabic UI
**Project Type**: WordPress child theme (SaaS directory platform)
**Performance Goals**: Lighthouse mobile ≥ 70; page load ≤ 3s on 4G
**Constraints**: LiteSpeed Cache active; device-vary cookie required; no build pipeline
**Scale/Scope**: Multi-merchant fragrance directory; verified merchants, subscriptions, cart

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with all six Core Principles from `.specify/memory/constitution.md`:

- [ ] **I. WordPress-Native**: All changes are in `blocksy-child/`. No core/plugin files modified.
- [ ] **II. Asset Separation**: CSS in `assets/css/`, JS in `assets/js/`, enqueued conditionally with versioned handles.
- [ ] **III. Mobile–Desktop Isolation**: Device-specific templates/assets conditionally loaded; both form factors tested.
- [ ] **IV. Directorist-First**: Listing data uses `atbdp_listing`; overrides in `directorist/`; filters used before `pre_get_posts`.
- [ ] **V. Security & Roles**: Merchant capabilities enforced server-side; subscription state validated per action.
- [ ] **VI. Camera-First Integrity**: Non-verified uploads blocked to camera-only at UI + server; EXIF validated server-side in `includes/camera-upload-validator.php`; verified merchants (`ph_verified_merchant=1`) exempt.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (WordPress Child Theme — `blocksy-child/`)

```text
blocksy-child/
├── functions.php                        # Hook registration — require_once all includes here
│
├── includes/                            # Backend PHP logic (one file per feature)
│   ├── [feature-name].php               # NEW: feature backend logic
│   └── ...existing files...
│
├── assets/
│   ├── css/
│   │   └── [feature-name].css           # NEW: feature stylesheet (conditionally enqueued)
│   └── js/
│       └── [feature-name].js            # NEW: feature script (conditionally enqueued)
│
├── directorist/                         # Directorist template overrides only
│   └── [mirrored-plugin-path]/
│       └── [override-template].php      # NEW (if listing UI changes needed)
│
├── templates/
│   ├── mobile/                          # Mobile-only templates
│   │   └── [feature-template].php       # NEW (if mobile-specific UI needed)
│   └── desktop/                         # Desktop-only templates
│       └── [feature-template].php       # NEW (if desktop-specific UI needed)
│
└── page-[name].php                      # NEW: only if a new WP page template needed
```

**Structure Decision**: All new files follow the child theme layout above.
Backend logic → `includes/`. Assets → `assets/css/` and `assets/js/`.
Directorist UI → `directorist/`. Device-specific templates → `templates/mobile|desktop/`.
No build pipeline — plain PHP/CSS/JS with versioned enqueue handles.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., modifying Directorist JS directly] | [specific need] | [why override approach is insufficient] |
| [e.g., inline script in template] | [above-the-fold critical path] | [why enqueue is insufficient here] |
