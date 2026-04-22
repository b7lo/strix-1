<?php
/**
 * Camera-First Upload Validator
 * 
 * Enforces camera-only uploads for unverified merchants by validating EXIF data.
 * 
 * @package BlocksyChild
 */

// Prevent direct access.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter( 'wp_handle_upload_prefilter', 'ph_validate_camera_upload_exif' );

/**
 * Validates EXIF data for uploads to enforce camera usage.
 *
 * @param array $file Reference to a single element of $_FILES.
 * @return array Modified file array with error if validation fails.
 */
function ph_validate_camera_upload_exif( $file ) {
    // 1. Target Action Check (T007)
    $is_directorist_upload = false;
    
    // phpcs:disable WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
    // phpcs:disable WordPress.Security.ValidatedSanitizedInput.MissingUnslash
    // phpcs:disable WordPress.Security.NonceVerification.Missing
    
    // Check REST API route safely.
    if ( isset( $_SERVER['REQUEST_URI'] ) && strpos( esc_url_raw( wp_unslash( $_SERVER['REQUEST_URI'] ) ), '/directorist/v1/temp-media-upload' ) !== false ) {
        $is_directorist_upload = true;
    }
    
    // Also check standard POST action if it's not going through REST API.
    if ( isset( $_POST['action'] ) && 'add_listing_action' === sanitize_text_field( wp_unslash( $_POST['action'] ) ) ) {
        $is_directorist_upload = true;
    }
    
    if ( ! $is_directorist_upload ) {
        return $file; // Not a listing upload, bypass.
    }

    // 2. Verification Check (T012)
    $user_id = get_current_user_id();
    if ( ! $user_id ) {
        return $file; // Can't verify, fallback.
    }
    
    $is_verified = (bool) get_user_meta( $user_id, 'is_verified_merchant', true );
    
    if ( $is_verified ) {
        return $file; // Verified merchants are exempt.
    }

    // 2.5 Only restrict main listing images, not profile logos (avater).
    if ( isset( $_REQUEST['field'] ) ) {
        $field = sanitize_text_field( wp_unslash( $_REQUEST['field'] ) );
        if ( 'avater' === $field || 'profile_pic' === $field ) {
            return $file; // Allow logos to be uploaded from gallery.
        }
    }
    
    // phpcs:enable

    // 3. EXIF Validation (T008, T009)
    $tmp_name  = $file['tmp_name'];
    $file_type = wp_check_filetype( $file['name'] );
    
    // EXIF is typically only valid for JPEG/TIFF. 
    $allowed_exts = array( 'jpg', 'jpeg', 'tiff', 'tif' );
    if ( ! in_array( strtolower( (string) $file_type['ext'] ), $allowed_exts, true ) ) {
        $file['error'] = 'يجب التقاط الصورة مباشرة من الكاميرا (يُشترط رفع صور بصيغة JPG).';
        return $file;
    }

    if ( ! function_exists( 'exif_read_data' ) ) {
        return $file; // EXIF extension not loaded, can't validate.
    }

    // Read EXIF data safely (suppress warnings if image is malformed).
    // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
    $exif_data = @exif_read_data( $tmp_name );
    
    if ( false === $exif_data || ! is_array( $exif_data ) ) {
        $file['error'] = 'يجب التقاط الصورة مباشرة من الكاميرا. (البيانات الوصفية مفقودة)';
        return $file;
    }

    // Check for camera signature.
    $has_date_time  = isset( $exif_data['DateTimeOriginal'] ) || isset( $exif_data['DateTimeDigitized'] );
    $has_make_model = isset( $exif_data['Make'] ) || isset( $exif_data['Model'] );
    
    if ( ! $has_date_time && ! $has_make_model ) {
        $file['error'] = 'يجب التقاط الصورة مباشرة من الكاميرا. (صورة غير أصلية)';
        return $file;
    }

    // Check for software editing signatures.
    if ( isset( $exif_data['Software'] ) ) {
        $software            = strtolower( (string) $exif_data['Software'] );
        $suspicious_software = array( 'photoshop', 'lightroom', 'gimp', 'illustrator', 'canva', 'fotor', 'picsart', 'snapseed', 'vsco' );
        
        foreach ( $suspicious_software as $suspicious ) {
            if ( strpos( $software, $suspicious ) !== false ) {
                $file['error'] = 'يجب التقاط الصورة مباشرة من الكاميرا. (تم تعديل الصورة ببرنامج)';
                return $file;
            }
        }
    }

    return $file;
}
