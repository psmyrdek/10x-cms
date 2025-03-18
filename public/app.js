// Legacy-style jQuery initialization
$(document).ready(function() {
    // Initialize Bootstrap tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();

    // Add active class to current nav item
    $('.nav-link').each(function() {
        if ($(this).attr('href') === window.location.pathname) {
            $(this).addClass('active');
        } else {
            $(this).removeClass('active');
        }
    });
});