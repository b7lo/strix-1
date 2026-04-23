/**
 * Camera-First Upload Frontend Scripts
 * 
 * Enforces `capture="environment"` on mobile for unverified merchants.
 * On desktop/laptop, blocks file uploads entirely and shows a guidance message.
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
         * Detect if the user is on a mobile device (has camera access).
         * We check for touch support + small screen as a reliable indicator.
         */
        function isMobileDevice() {
            var hasTouchScreen = ('ontouchstart' in window) || 
                                 (navigator.maxTouchPoints > 0) || 
                                 (navigator.msMaxTouchPoints > 0);
            // Consider tablets as mobile too (they have cameras)
            return hasTouchScreen;
        }

        var isDesktop = !isMobileDevice();

        function enforceCameraOnly() {
            // Target only listing image upload fields, not profile/logo uploaders
            $('.directorist-image-upload input[type="file"], .directorist-form-image-upload-field input[type="file"]').each(function() {
                var $input = $(this);

                if (isDesktop) {
                    // === DESKTOP: Block file picker entirely ===
                    // Intercept click on the file input to prevent the file dialog
                    if (!$input.data('ph-desktop-blocked')) {
                        $input.data('ph-desktop-blocked', true);

                        // Block the native file dialog from opening
                        $input.on('click.phBlock', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            // Show a toast notification
                            showDesktopBlockMessage();
                            return false;
                        });

                        // Also block the label that triggers the file input
                        var inputId = $input.attr('id');
                        if (inputId) {
                            $('label[for="' + inputId + '"]').on('click.phBlock', function(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                showDesktopBlockMessage();
                                return false;
                            });
                        }
                    }
                } else {
                    // === MOBILE: Force camera capture ===
                    if (!$input.attr('capture')) {
                        $input.attr('capture', 'environment');
                        $input.attr('accept', 'image/*');
                    }
                }
                
                // Add the professional warning message if not already added
                var $uploaderContainer = $input.closest('.ez-media-uploader, .directorist-form-group, .directorist-form-image-upload-field');
                if ($uploaderContainer.length > 0 && $uploaderContainer.find('.ph-camera-notice').length === 0) {
                    var noticeText = '';
                    if (isDesktop) {
                        noticeText = '<div><strong>إشعار أمني – مكافحة الاحتيال:</strong><br>' +
                            'لضمان أصالة المنتجات، يُرجى استخدام <u>الجوال</u> لإضافة صور العطور عبر التصوير المباشر من الكاميرا.<br>' +
                            '<span style="font-size:12px; opacity:0.8;">(الرفع من الكمبيوتر متاح فقط للحسابات الموثقة)</span></div>';
                    } else {
                        noticeText = '<div><strong>لتعزيز الموثوقية ومكافحة الغش التجاري:</strong><br>' +
                            'يُرجى التقاط صورة العطر مباشرة عبر الكاميرا لتأكيد امتلاكك للمنتج.<br>' +
                            '<span style="font-size:12px; opacity:0.8;">(الرفع من الاستديو متاح فقط للحسابات الموثقة)</span></div>';
                    }

                    var iconClass = isDesktop ? 'fas fa-desktop' : 'fas fa-camera';
                    var borderColor = isDesktop ? '#d97706' : '#16a34a';
                    var bgColor = isDesktop ? '#fffbeb' : '#f0fdf4';
                    var textColor = isDesktop ? '#92400e' : '#166534';
                    var iconColor = isDesktop ? '#d97706' : '#16a34a';

                    var noticeHtml = '<div class="ph-camera-notice directorist-mb-15" style="background-color: ' + bgColor + '; border-right: 4px solid ' + borderColor + '; padding: 12px 15px; border-radius: 4px; font-size: 14px; color: ' + textColor + '; display: flex; align-items: flex-start; gap: 10px; margin-bottom: 15px;">' +
                        '<i class="' + iconClass + '" style="color: ' + iconColor + '; font-size: 18px; margin-top: 3px;"></i>' +
                        noticeText +
                        '</div>';
                    $uploaderContainer.prepend(noticeHtml);
                }
            });

            // Also block drag & drop on desktop for listing image uploaders
            if (isDesktop) {
                $('.directorist-image-upload .ez-media-uploader, .directorist-form-image-upload-field .ez-media-uploader').each(function() {
                    var $uploader = $(this);
                    if (!$uploader.data('ph-drop-blocked')) {
                        $uploader.data('ph-drop-blocked', true);
                        $uploader.on('drop.phBlock dragover.phBlock', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            showDesktopBlockMessage();
                            return false;
                        });
                    }
                });
            }
        }

        /**
         * Show a temporary toast notification for desktop users
         */
        var toastTimeout = null;
        function showDesktopBlockMessage() {
            // Remove any existing toast
            $('.ph-desktop-block-toast').remove();
            clearTimeout(toastTimeout);

            var toast = $('<div class="ph-desktop-block-toast" style="' +
                'position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 99999; ' +
                'background: linear-gradient(135deg, #92400e, #d97706); color: #fff; ' +
                'padding: 16px 28px; border-radius: 12px; font-size: 15px; ' +
                'box-shadow: 0 8px 32px rgba(0,0,0,0.25); text-align: center; ' +
                'max-width: 90%; animation: phToastIn 0.3s ease-out;">' +
                '<i class="fas fa-mobile-alt" style="margin-left: 8px; font-size: 18px;"></i> ' +
                'يرجى استخدام الجوال لإضافة صور العطور (تصوير مباشر من الكاميرا)' +
                '</div>');

            // Add animation keyframes if not already present
            if ($('#ph-toast-style').length === 0) {
                $('head').append('<style id="ph-toast-style">' +
                    '@keyframes phToastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }' +
                    '</style>');
            }

            $('body').append(toast);
            toastTimeout = setTimeout(function() {
                toast.fadeOut(400, function() { $(this).remove(); });
            }, 4000);
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
