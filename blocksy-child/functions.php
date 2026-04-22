<?php
/**
 * Blocksy Child Theme Functions
 */

// 1. Asset Management (Strict Separation)
require_once get_stylesheet_directory() . '/inc/class-assets-manager.php';

// 3. إضافة Bottom Nav للجوال في كل الصفحات
add_action('wp_footer', 'ph_add_mobile_bottom_nav');
function ph_add_mobile_bottom_nav() {
    if ( wp_is_mobile() ) {
        $template_path = get_stylesheet_directory() . '/templates/mobile/bottom-nav.php';
        if ( file_exists( $template_path ) ) {
            include $template_path;
        }
    }
}

// 12. Enqueue Subscriptions Assets
add_action( 'wp_enqueue_scripts', function() {
    if ( is_page_template('page-subscriptions.php') || is_page('subscriptions') ) {
        wp_enqueue_style( 'blocksy-child-subscriptions', get_stylesheet_directory_uri() . '/assets/css/subscriptions.css', [], '1.0.2' );
        wp_enqueue_script( 'blocksy-child-subscriptions', get_stylesheet_directory_uri() . '/assets/js/subscriptions.js', [], '1.0.2', true );
    }
}, 99 );

// 13. Enqueue Featured Stores Assets (Home Page Only)
add_action( 'wp_enqueue_scripts', function() {
    if ( is_page_template('home-page.php') || is_front_page() ) {
        wp_enqueue_style( 'blocksy-child-featured-stores', get_stylesheet_directory_uri() . '/assets/css/featured-stores.css', [], '1.5.0' );
        wp_enqueue_script( 'blocksy-child-featured-stores', get_stylesheet_directory_uri() . '/assets/js/featured-stores.js', [], '1.0.0', true );
    }
}, 99 );

// 6. Verified User (Merchant) Feature
// Include verification badge functionality from separate file
require_once get_stylesheet_directory() . '/includes/verified-merchant.php';
require_once get_stylesheet_directory() . '/includes/class-verified-authors.php';

// Camera-First Photo Integrity
require_once get_stylesheet_directory() . '/includes/camera-upload-validator.php';

// Enqueue Camera-First Upload Script for Directorist Add/Edit Listing
add_action( 'wp_enqueue_scripts', function() {
    // Only enqueue on Add/Edit listing pages (Directorist dashboard or specific pages)
    // We can also just enqueue it generally if it only acts on specific classes, but best to restrict if possible.
    // Assuming 'add-listing' or similar is the slug, or we can check if it's a directorist page.
    // For safety, we will enqueue it and the JS will check for the file input.
    wp_enqueue_script( 'ph-camera-upload', get_stylesheet_directory_uri() . '/assets/js/camera-upload.js', ['jquery'], '1.0.0', true );
    
    $is_verified = false;
    if ( is_user_logged_in() ) {
        $is_verified = (bool) get_user_meta( get_current_user_id(), 'ph_verified_merchant', true );
    }
    
    wp_localize_script( 'ph-camera-upload', 'ph_camera_upload_data', [
        'is_verified' => $is_verified
    ]);
}, 99 );

// Tap Payment Integration (Legacy simple handler, kept for reference if needed, but new one supersedes)
// require_once get_stylesheet_directory() . '/includes/tap-payment.php'; 
// Advanced Subscription Handler
require_once get_stylesheet_directory() . '/includes/subscription-handler.php';

// 7. Merchant Restrictions System
// نظام التحكم في صلاحيات المتاجر والأفراد
require_once get_stylesheet_directory() . '/includes/merchant-restrictions.php';

// 8. Multi-Vendor Cart System
// نظام السلة متعددة البائعين
require_once get_stylesheet_directory() . '/includes/class-multi-vendor-cart.php';
require_once get_stylesheet_directory() . '/includes/cart-ui-injection.php';

// 8. Optimization
// Optimize Font Awesome loading
add_action('wp_head', 'ph_optimize_fontawesome_loading', 5);
function ph_optimize_fontawesome_loading() {
    $fa_path = content_url('/plugins/elementor/assets/lib/font-awesome/webfonts/');
    ?>
    <style>
        @font-face {
            font-family: 'Font Awesome 5 Brands';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url("<?php echo $fa_path; ?>fa-brands-400.eot");
            src: url("<?php echo $fa_path; ?>fa-brands-400.eot?#iefix") format("embedded-opentype"),
                 url("<?php echo $fa_path; ?>fa-brands-400.woff2") format("woff2"),
                 url("<?php echo $fa_path; ?>fa-brands-400.woff") format("woff"),
                 url("<?php echo $fa_path; ?>fa-brands-400.ttf") format("truetype"),
                 url("<?php echo $fa_path; ?>fa-brands-400.svg#fontawesome") format("svg");
        }
        
        @font-face {
            font-family: 'Font Awesome 5 Free';
            font-style: normal;
            font-weight: 400;
            font-display: swap;
            src: url("<?php echo $fa_path; ?>fa-regular-400.eot");
            src: url("<?php echo $fa_path; ?>fa-regular-400.eot?#iefix") format("embedded-opentype"),
                 url("<?php echo $fa_path; ?>fa-regular-400.woff2") format("woff2"),
                 url("<?php echo $fa_path; ?>fa-regular-400.woff") format("woff"),
                 url("<?php echo $fa_path; ?>fa-regular-400.ttf") format("truetype"),
                 url("<?php echo $fa_path; ?>fa-regular-400.svg#fontawesome") format("svg");
        }
        
        @font-face {
            font-family: 'Font Awesome 5 Free';
            font-style: normal;
            font-weight: 900;
            font-display: swap;
            src: url("<?php echo $fa_path; ?>fa-solid-900.eot");
            src: url("<?php echo $fa_path; ?>fa-solid-900.eot?#iefix") format("embedded-opentype"),
                 url("<?php echo $fa_path; ?>fa-solid-900.woff2") format("woff2"),
                 url("<?php echo $fa_path; ?>fa-solid-900.woff") format("woff"),
                 url("<?php echo $fa_path; ?>fa-solid-900.ttf") format("truetype"),
                 url("<?php echo $fa_path; ?>fa-solid-900.svg#fontawesome") format("svg");
        }
        
        /* Ensure Font Awesome icons display correctly */
        .fas, .fa-solid {
            font-family: 'Font Awesome 5 Free' !important;
            font-weight: 900 !important;
        }
        
        .far, .fa-regular {
            font-family: 'Font Awesome 5 Free' !important;
            font-weight: 400 !important;
        }
        
        .fab, .fa-brands {
            font-family: 'Font Awesome 5 Brands' !important;
            font-weight: 400 !important;
        }
        
        /* Specific fix for shopping cart icon */
        .fa-shopping-cart:before {
            content: "\f07a";
            font-family: 'Font Awesome 5 Free' !important;
            font-weight: 900 !important;
        }
    </style>
    <?php
}

// 9. Hide Page Titles
// Disable page title rendering via Blocksy filter
add_filter('blocksy:general:page-title:display', '__return_false');

// 10. Fix LiteSpeed Cache Nonce Issue
// Exclude Directorist upload endpoint from cache
add_filter('litespeed_cache_rest_excludes', function($excludes) {
    $excludes[] = '/directorist/v1/temp-media-upload';
    return $excludes;
});

// 11. LiteSpeed Cache - Cookie-Based Isolation (Guaranteed Solution)
add_filter( 'litespeed_vary', function( $list ) {
    $list[] = 'cookie:ph_device_type';
    return $list;
} );

/**
 * Ensure Cart buttons are visible (CSS fallback only)
 * Event handling is fully managed by cart.js v2.0.0
 */
add_action('wp_footer', 'ph_ensure_cart_buttons_visible', 999);
function ph_ensure_cart_buttons_visible() {
    ?>
    <script>
    jQuery(document).ready(function($) {
        // Only ensure buttons are visible - no event binding here
        // All event handling is done in cart.js to avoid duplicate firing
        $('.ph-add-to-cart-btn').css('opacity', '1');
    });
    </script>
    <?php
}

add_action( 'init', function() {
    if ( is_admin() ) return;
    $device = wp_is_mobile() ? 'mobile' : 'desktop';
    if ( ! isset( $_COOKIE['ph_device_type'] ) || $_COOKIE['ph_device_type'] !== $device ) {
        setcookie( 'ph_device_type', $device, time() + ( 86400 * 30 ), '/' );
        if ( defined( 'LSCWP_V' ) ) {
            do_action( 'litespeed_control_set_nocache', 'Setting Device Cookie' );
        }
    }
}, 1 );







// 13. Directorist - Global Order: Newest First (Force Priority)
add_filter('directorist_all_listings_query_arguments', function($args) {
    $args['orderby'] = 'date';
    $args['order'] = 'DESC';
    return $args;
}, 999);

// 14. Global Order Fix for Perfumes - pre_get_posts
add_action('pre_get_posts', function($query) {
    if (!is_admin() && $query->is_main_query() && $query->get('post_type') === 'atbdp_listing') {
        $query->set('orderby', 'date');
        $query->set('order', 'DESC');
    }
});