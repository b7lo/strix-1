# Feature Specification: Camera-First Photo Integrity

**Feature Branch**: `001-camera-first-upload`  
**Created**: 2026-04-22  
**Status**: Draft  
**Input**: User description: "نبي نمنع اي شخص لما يبي ينزل عطر جديد من انه يقدر ينزله من الاستديو او الملفات فقط يفتح له خيار التقاط من الكمرة مباشرة عشان نضمن ان المستخدم ليس محتال و ان العطر موجود عنده فعلًا ويكون على مستوى و الموقع و متسوى السيرفر يكون هذا يعني مانكتفي فقط بانه يصور مباشرة لا بعد ذلك يتحقق السيرفر انه فعلًا تم التقاطه مباشرة من الكمره ولكن هناك استثناءات للاشخاص الموثقين وعندهم علامة توثيق يستطيع رفع من الاستديو او الكمره"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unverified Merchant Uploads Perfume (Priority: P1)

As an unverified merchant adding a new perfume listing, I must only be able to capture images directly from my device's camera so that the platform can guarantee I physically possess the item.

**Why this priority**: This is the core anti-fraud mechanism that protects buyers from fake listings.

**Independent Test**: Can be fully tested by attempting to upload a pre-existing photo from the gallery (should fail) and attempting to take a live photo (should succeed) using a standard merchant account.

**Acceptance Scenarios**:

1. **Given** I am logged in as an unverified merchant, **When** I tap the "add photo" button for my listing, **Then** my device's camera opens directly without offering the file gallery/studio option.
2. **Given** I try to bypass the UI restriction by modifying the request or uploading an edited photo, **When** the server processes the image, **Then** the server rejects it and shows an Arabic error message stating "يجب التقاط الصورة مباشرة من الكاميرا".
3. **Given** I take a live photo using the camera, **When** the server processes it, **Then** the image is accepted and added to the listing.

---

### User Story 2 - Verified Merchant Exemption (Priority: P1)

As a verified merchant (has verification badge), I want to be able to upload images from both my camera and my gallery/studio, so that I can use professionally edited photos for my trusted listings.

**Why this priority**: Ensures high-quality trusted sellers are not penalized and can maintain professional storefronts.

**Independent Test**: Can be fully tested by logging in as a verified merchant and confirming that gallery access is permitted and server-side EXIF blocks are bypassed.

**Acceptance Scenarios**:

1. **Given** I am logged in as a verified merchant, **When** I tap the "add photo" button, **Then** I am presented with the choice to use the camera or select from my files/gallery.
2. **Given** I upload a pre-existing or edited image from my gallery, **When** the server processes it, **Then** the server accepts the image without requiring live-camera EXIF metadata.

---

### Edge Cases

- What happens if a user's device/browser strips EXIF data for privacy reasons even when using the live camera? (System should fail-closed: reject the image to maintain integrity, advising the user to use a compatible browser/device).
- What happens if an unverified merchant uses a third-party app to spoof EXIF data? (The system will validate specific metadata markers, but sophisticated spoofing might bypass basic checks. However, the UI friction combined with basic EXIF checks mitigates >95% of casual fraud).
- How does the system handle image formats that don't natively support EXIF (like PNG or WebP) uploaded by unverified merchants? (Unverified merchants should be forced to upload formats that support EXIF, typically JPEG).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST restrict the file input field to camera-only access (`capture="environment"`) for non-verified merchants on the listing submission/edit forms.
- **FR-002**: The system MUST allow file/gallery selection for verified merchants (`ph_verified_merchant = 1`).
- **FR-003**: The server MUST validate the origin of uploaded images for non-verified merchants by analyzing EXIF metadata.
- **FR-004**: The server MUST reject images from non-verified merchants if EXIF data is missing, indicates software editing, or lacks expected camera capture timestamps.
- **FR-005**: The server MUST accept images from verified merchants without EXIF camera validation.
- **FR-006**: The system MUST display clear, localized Arabic error messages when an image is rejected due to EXIF validation failure.
- **FR-007**: The server-side validation MUST fail-closed; if origin cannot be verified for an unverified merchant, the upload is rejected.

### Key Entities

- **Listing Image**: The media file being uploaded, which contains embedded EXIF metadata if captured via camera.
- **Merchant Account**: User entity with a specific capability/meta flag (`ph_verified_merchant`) determining their upload privileges.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of non-verified merchant image uploads submitted via the UI invoke the device camera directly.
- **SC-002**: 100% of server-side processed images from non-verified merchants pass EXIF validation for live capture.
- **SC-003**: 0% of verified merchants are blocked from uploading gallery images.
- **SC-004**: Upload failure rates due to missing EXIF on legitimate camera captures are kept below 5% (to ensure the restriction doesn't break core functionality for honest users).

## Assumptions

- We assume the target audience's mobile browsers support the `capture` HTML attribute.
- We assume PHP's EXIF reading capabilities are sufficient to extract necessary metadata without excessive performance overhead.
- We assume the existing Directorist media upload endpoints can be intercepted or overridden to inject the custom validation logic.
- We assume JPEG is the standard format produced by mobile browser camera capture.
