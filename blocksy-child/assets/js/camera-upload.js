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
                
                // Add the professional warning message if not already added
                var $uploaderContainer = $input.closest('.ez-media-uploader, .directorist-form-group');
                if ($uploaderContainer.length > 0 && $uploaderContainer.find('.ph-camera-notice').length === 0) {
                    var noticeHtml = '<div class="ph-camera-notice directorist-mb-15" style="background-color: #f0fdf4; border-right: 4px solid #16a34a; padding: 12px 15px; border-radius: 4px; font-size: 14px; color: #166534; display: flex; align-items: flex-start; gap: 10px; margin-bottom: 15px;">' +
                        '<i class="fas fa-camera" style="color: #16a34a; font-size: 18px; margin-top: 3px;"></i>' +
                        '<div><strong>لتعزيز الموثوقية ومكافحة الغش التجاري:</strong><br>يُرجى التقاط صورة العطر مباشرة عبر الكاميرا لتأكيد امتلاكك للمنتج. (الرفع من الاستديو متاح فقط للحسابات الموثقة).</div>' +
                        '</div>';
                    $uploaderContainer.prepend(noticeHtml);
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
