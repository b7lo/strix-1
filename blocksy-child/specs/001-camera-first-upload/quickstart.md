# Quickstart: Camera-First Photo Integrity

This document outlines the implementation of the Camera-First Photo Integrity feature.

## Overview

The feature prevents non-verified merchants from uploading pre-existing photos for their perfume listings. It forces them to use their device's live camera, verifying this server-side via EXIF metadata. Verified merchants are exempt.

## Components to Build

1. **Backend Validator (`includes/camera-upload-validator.php`)**:
   - Hooks into `wp_handle_upload_prefilter`.
   - Checks if the request is for a listing upload (e.g., checks `$_SERVER['REQUEST_URI']` for `directorist/v1/temp-media-upload`).
   - Checks `ph_verified_merchant` user meta.
   - If not verified, reads EXIF data from `$file['tmp_name']` using `exif_read_data()`.
   - Validates presence of `DateTimeOriginal` and absence of editing software signatures.
   - Returns `$file` with an error if validation fails.
   - Hook this file into `functions.php`.

2. **Frontend UI Enforcer (`assets/js/camera-upload.js`)**:
   - Enqueued via `functions.php` on listing submission pages.
   - Receives localized data: `ph_is_verified_merchant`.
   - If `ph_is_verified_merchant` is false:
     - Uses a `MutationObserver` or interval to find the Directorist file input (`input[type="file"]`).
     - Adds attributes: `accept="image/*"` and `capture="environment"`.

## Testing the Implementation

1. **Unverified Merchant**:
   - Log in. Go to Add Listing.
   - Tap the Add Photo button. It should instantly open the camera (no gallery option).
   - Try to bypass this using browser dev tools by removing the `capture` attribute and uploading a downloaded image.
   - The server should return an error: "يجب التقاط الصورة مباشرة من الكاميرا".
2. **Verified Merchant**:
   - Ensure the account has `ph_verified_merchant = 1`.
   - Go to Add Listing.
   - Tap the Add Photo button. It should offer the gallery/files option.
   - Upload a downloaded/edited image.
   - The server should accept the upload successfully.
