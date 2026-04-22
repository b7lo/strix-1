# Data Model: Camera-First Photo Integrity

## Entities

### Merchant Account (User)
* **Description**: The WordPress User entity representing the merchant.
* **Fields**:
  * `ID`: (Integer) Standard WP User ID.
  * `ph_verified_merchant`: (User Meta, Boolean/Integer) Flag indicating if the merchant is verified. `1` or `true` means verified.

### Listing Image (Attachment)
* **Description**: The uploaded media file processed by WordPress.
* **Validation Rules** (During Upload):
  * **Target Action**: Upload requests destined for Directorist (`/directorist/v1/temp-media-upload` or via Directorist forms).
  * **Rule 1**: If `ph_verified_merchant` != 1, the uploaded file's temporary path (`tmp_name`) MUST contain valid EXIF data.
  * **Rule 2**: Valid EXIF data requires the presence of `DateTimeOriginal` or `Make`/`Model` tags.
  * **Rule 3**: Valid EXIF data MUST NOT contain software modification markers indicating gallery/studio editing (e.g., `Software` tag containing 'Photoshop').
  * **Failure State**: Return `WP_Error` with Arabic message: "يجب التقاط الصورة مباشرة من الكاميرا".

## State Transitions

1. **Upload Initiated**: User selects file via camera or gallery.
2. **Prefilter Hook**: `wp_handle_upload_prefilter` executes.
3. **Verification Check**: System checks if user is verified.
   - **Yes**: Bypass EXIF validation. -> **Upload Accepted**.
   - **No**: Proceed to EXIF parsing.
4. **EXIF Parsing**: System reads EXIF from `tmp_name`.
   - **Success (Live Photo)**: Proceed with upload. -> **Upload Accepted**.
   - **Failure (Missing/Edited)**: Inject error into file array. -> **Upload Rejected**.
