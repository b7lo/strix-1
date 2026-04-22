<?php
/**
 * Camera-First Upload Validator
 * 
 * Enforces camera-only uploads for unverified merchants by validating EXIF data.
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter( 'wp_handle_upload_prefilter', 'ph_validate_camera_upload_exif' );

function ph_validate_camera_upload_exif( $file ) {
    // 1. Target Action Check (T007)
    // Check if this upload is triggered by the Directorist REST API
    $is_directorist_upload = false;
    
    // Check REST API route
    if ( isset( $_SERVER['REQUEST_URI'] ) && strpos( $_SERVER['REQUEST_URI'], '/directorist/v1/temp-media-upload' ) !== false ) {
        $is_directorist_upload = true;
    }
    
    // Also check standard POST action if it's not going through REST API
    if ( isset( $_POST['action'] ) && $_POST['action'] === 'add_listing_action' ) {
        $is_directorist_upload = true;
    }
    
    if ( ! $is_directorist_upload ) {
        return $file; // Not a listing upload, bypass
    }

    // 2. Verification Check (T012)
    // Check if user is verified
    $user_id = get_current_user_id();
    if ( ! $user_id ) {
        return $file; // Can't verify, fallback (or block, but we leave core auth to handle it)
    }
    
    $is_verified = (bool) get_user_meta( $user_id, 'ph_verified_merchant', true );
    
    if ( $is_verified ) {
        return $file; // Verified merchants are exempt
    }

    // 3. EXIF Validation (T008, T009)
    $tmp_name = $file['tmp_name'];
    $file_type = wp_check_filetype( $file['name'] );
    
    // EXIF is typically only valid for JPEG/TIFF. 
    if ( ! in_array( strtolower( $file_type['ext'] ), ['jpg', 'jpeg', 'tiff', 'tif'] ) ) {
        $file['error'] = 'يجب التقاط الصورة مباشرة من الكاميرا (يُشترط رفع صور بصيغة JPG).';
        return $file;
    }

    // Read EXIF data safely
    $exif_data = @exif_read_data( $tmp_name );
    
    if ( $exif_data === false ) {
        $file['error'] = 'يجب التقاط الصورة مباشرة من الكاميرا. (البيانات الوصفية مفقودة)';
        return $file;
    }

    // Check for camera signature
    $has_date_time = isset( $exif_data['DateTimeOriginal'] ) || isset( $exif_data['DateTimeDigitized'] );
    $has_make_model = isset( $exif_data['Make'] ) || isset( $exif_data['Model'] );
    
    if ( ! $has_date_time && ! $has_make_model ) {
        $file['error'] = 'يجب التقاط الصورة مباشرة من الكاميرا. (صورة غير أصلية)';
        return $file;
    }

    // Check for software editing signatures
    if ( isset( $exif_data['Software'] ) ) {
        $software = strtolower( $exif_data['Software'] );
        $suspicious_software = [ 'photoshop', 'lightroom', 'gimp', 'illustrator', 'canva', 'fotor', 'picsart', 'snapseed', 'vsco' ];
        
        foreach ( $suspicious_software as $suspicious ) {
            if ( strpos( $software, $suspicious ) !== false ) {
                $file['error'] = 'يجب التقاط الصورة مباشرة من الكاميرا. (تم تعديل الصورة ببرنامج)';
                return $file;
            }
        }
    }

    return $file;
}
