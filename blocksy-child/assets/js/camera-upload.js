/**
 * Camera-First Upload Frontend Scripts
 * 
 * Enforces `capture="environment"` and `accept="image/*"` for unverified merchants.
 */

(function($) {
    'use strict';

    $(document).ready(function() {
        // Check if user is verified (passed from functions.php)
        var isVerified = false;
        if (typeof ph_camera_upload_data !== 'undefined' && ph_camera_upload_data.is_verified) {
            isVerified = true;
        }

        // If verified, do not restrict the upload input
        if (isVerified) {
            return;
        }

        /**
         * Function to enforce camera-only attributes on file inputs
         */
        function enforceCameraOnly() {
            // Find all file inputs within directorist forms or dropzones
            // Directorist uses EzMediaUploader which creates file inputs
            $('input[type="file"]').each(function() {
                var $input = $(this);
                
                // Only modify inputs that don't already have the capture attribute
                if (!$input.attr('capture')) {
                    $input.attr('capture', 'environment');
                    $input.attr('accept', 'image/*');
                }
            });
        }

        // Run initially
        enforceCameraOnly();

        // Directorist often loads uploaders dynamically or via AJAX, 
        // so we use a MutationObserver to catch new file inputs.
        var observer = new MutationObserver(function(mutations) {
            var shouldEnforce = false;
            
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    shouldEnforce = true;
                }
            });
            
            if (shouldEnforce) {
                enforceCameraOnly();
            }
        });

        // Start observing the body for added elements
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
        
        // As a fallback, try to run it when users click the "Add Image" zone
        $(document).on('click', '.ez-media-uploader, .directorist-add-listing-form', function() {
            setTimeout(enforceCameraOnly, 100);
        });
    });

})(jQuery);
