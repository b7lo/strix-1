<!--
  SYNC IMPACT REPORT
  ==================
  Version Change:    1.0.0 → 1.1.0
  Modified Principles: None (existing principles unchanged)
  Added Sections:
    - Core Principle VI: Camera-First Photo Integrity (new)
  Removed Sections: N/A
  Templates Updated:
    - .specify/templates/plan-template.md    ✅ Constitution Check updated (6 gates)
    - .specify/templates/spec-template.md    ✅ aligned (no changes required)
    - .specify/templates/tasks-template.md   ✅ aligned (no changes required)
  Deferred TODOs:
    - None
-->

# منصة بيع العطور (PerfumeHubs) Constitution

## Core Principles

### I. WordPress-Native — Override, Never Fork

All customizations MUST be implemented through the Blocksy child theme located at
`/wp-content/themes/blocksy-child/`. Direct modification of parent theme files, plugin
source files (e.g., `wp-content/plugins/directorist/`), or WordPress core is strictly
forbidden. Directorist template overrides MUST be placed in `blocksy-child/directorist/`
following the plugin's original path structure. Custom backend logic MUST live in
`blocksy-child/includes/` and MUST be registered via `functions.php`.

**Rationale**: Ensures all customizations survive WordPress/plugin updates without merge
conflicts and keeps the codebase auditable in a single location.

### II. Strict Asset Separation

CSS MUST be placed in `assets/css/` and JavaScript in `assets/js/`. Global styles belong in
`style.css`. Page-specific or feature-specific assets MUST be enqueued conditionally via
`wp_enqueue_scripts` with appropriate page checks (e.g., `is_page_template()`,
`is_front_page()`). Inline `<style>` or `<script>` tags in PHP templates are allowed ONLY
for critical above-the-fold content; all other styles/scripts MUST be enqueued through the
WordPress API with versioned handles to support cache busting.

**Rationale**: Prevents style/script conflicts, enables efficient cache invalidation (especially
with LiteSpeed Cache), and keeps code maintainable across desktop and mobile contexts.

### III. Mobile–Desktop Isolation (NON-NEGOTIABLE)

The platform MUST deliver distinct experiences on mobile and desktop. Device detection MUST
use `wp_is_mobile()` server-side. The LiteSpeed Cache Vary group MUST be keyed on the
`ph_device_type` cookie (set on `init` with priority 1). Any template, component, or asset
that differs between devices MUST be conditionally loaded and MUST be tested on both form
factors before a feature is considered complete. Mobile-only UI (e.g., bottom nav) MUST live
in `templates/mobile/`; desktop-only UI MUST live in `templates/desktop/`.

**Rationale**: The storefront's core UX diverges significantly between mobile and desktop
(bottom nav, listing layouts). Caching without device isolation causes cross-device UI bleed.

### IV. Directorist-First for Listings

All listing (perfume/store) data MUST be managed through Directorist's data model
(`atbdp_listing` post type). Custom query modifications (ordering, filtering) MUST use
Directorist's provided filters (e.g., `directorist_all_listings_query_arguments`) with
`pre_get_posts` as a fallback scoped strictly to `atbdp_listing` post type on the main
query. New listing-related UI MUST be implemented as Directorist template overrides, not
standalone custom post type queries.

**Rationale**: Coupling listing logic tightly to Directorist keeps the data model consistent
and leverages the plugin's built-in search, filtering, and map features without duplication.

### V. Security, Roles & Subscription Integrity

Merchant capabilities (listing creation, editing, featured placement) MUST be enforced
server-side via the Merchant Restrictions system (`includes/merchant-restrictions.php`).
Subscription state MUST be validated on every protected action, not only at login.
Verified merchant status MUST be stored as user meta and exposed through the badge system
(`includes/verified-merchant.php`). Payment callbacks (Tap Payment or equivalent) MUST
be validated with a server-side secret check before altering any subscription or user state.
Session lifetime for authenticated users is set to 30 days via `auth_cookie_expiration`.

**Rationale**: A SaaS directory platform where merchants pay for placement has real financial
consequences if authorization checks are bypassed or subscription state is stale.

### VI. Camera-First Photo Integrity (NON-NEGOTIABLE)

When a non-verified merchant submits a new perfume listing, ALL uploaded images MUST be
captured directly via the device camera. Gallery/studio/file-picker access MUST be blocked
at the UI level by setting `accept="image/*" capture="environment"` on the file input and
MUST be enforced again at the server level. Server-side enforcement MUST verify that the
uploaded image contains valid EXIF metadata consistent with a live camera capture
(e.g., `DateTimeOriginal` present, no software-editing flags). Images that fail EXIF
validation MUST be rejected with a clear Arabic-language error message and the listing
submission MUST be blocked.

**Exception — Verified Merchants**: Users whose account carries the verified merchant badge
(user meta `ph_verified_merchant = 1`) MAY upload images from any source (camera or
gallery/studio). This exemption MUST be checked server-side on every upload request; the
client-side UI MUST reflect the exemption by removing the `capture` attribute restriction
only after server confirmation of verified status.

**Implementation constraints**:
- EXIF parsing MUST use a PHP library (e.g., `exif_read_data()` built-in or a vetted
  Composer package) executed inside a WordPress REST API endpoint or an `admin-ajax.php`
  handler — never relying on client-reported metadata alone.
- The validation logic MUST live in `includes/camera-upload-validator.php`.
- The front-end camera UI MUST live in `assets/js/camera-upload.js`.
- Any bypass attempt (spoofed EXIF, stripped metadata) that cannot be conclusively verified
  as a live capture MUST default to rejection (fail-closed policy).

**Rationale**: The platform's trust model depends on listings representing real, physically
present products. Allowing gallery uploads for unverified merchants creates an easy vector
for fraudulent or stock-photo listings that undermine buyer confidence and platform
credibility.

## Technology Stack & Constraints

**Platform**: WordPress (latest stable) on shared/managed hosting with LiteSpeed Web Server.
**Parent Theme**: Blocksy (latest stable) — child theme path: `blocksy-child/`.
**Core Plugin**: Directorist — listing management, search, author pages, map integration.
**Custom Plugins (in-house)**: Merchant Restrictions, Verified Merchants, Multi-Vendor Cart,
Subscription Handler, Tap Payment integration, Camera Upload Validator.
**Cache**: LiteSpeed Cache — Vary group MUST include `ph_device_type` cookie.
**Languages**: PHP 8.x, JavaScript (vanilla + jQuery where WordPress requires it), CSS3.
**No build pipeline** is required; assets are plain CSS/JS files with manual version strings.
**Performance target**: All pages MUST achieve a Lighthouse mobile performance score ≥ 70
and load within 3 seconds on a 4G connection.
**RTL Support**: The platform serves Arabic-speaking users. All templates and CSS MUST
support RTL layout. Use logical CSS properties where possible.

## Development Workflow

1. **Feature branches** MUST be created before any specification work begins
   (`speckit.git.feature` hook handles this automatically).
2. **Specification-first**: Every non-trivial feature MUST have a `spec.md` before
   implementation begins.
3. **File placement rules**:
   - Backend logic → `includes/<feature-name>.php`, registered in `functions.php`.
   - Frontend templates → `templates/mobile/` or `templates/desktop/` as appropriate.
   - Directorist overrides → `directorist/<original-path>`.
   - Feature assets → `assets/css/<feature>.css` and `assets/js/<feature>.js`.
4. **Cache invalidation**: After any CSS/JS change, increment the version string in the
   `wp_enqueue_*` call. Do NOT rely on browser cache-busting via URL query strings alone.
5. **Testing**: Every feature MUST be manually verified on both mobile (≤768px viewport)
   and desktop (≥1024px viewport) before merging. LiteSpeed Cache MUST be purged between
   mobile and desktop test runs.
6. **No orphan code**: Commented-out `require_once` calls in `functions.php` indicate
   deprecated files. These MUST be removed along with the associated files within the same
   PR that deprecates them.

## Governance

This constitution supersedes all other informal practices. Amendments require:
1. A written rationale describing what changed and why.
2. An increment to `CONSTITUTION_VERSION` following semantic versioning:
   - **MAJOR**: Removal or redefinition of a Core Principle.
   - **MINOR**: Addition of a new principle or section.
   - **PATCH**: Clarification, wording fix, or non-semantic refinement.
3. The `LAST_AMENDED_DATE` MUST be updated to the amendment date in `YYYY-MM-DD` format.
4. All `.specify/templates/*.md` files MUST be reviewed for alignment after any amendment.

All implementation plans and task lists MUST include a "Constitution Check" section
confirming compliance with the six Core Principles before implementation begins.
Use `README.md` as the primary runtime developer guidance document.

**Version**: 1.1.0 | **Ratified**: 2026-04-22 | **Last Amended**: 2026-04-22
