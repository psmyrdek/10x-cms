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
    
    // Collections page functionality
    if (window.location.pathname === '/collections') {
        initCollectionsPage();
    }
    
    // Collection detail page functionality
    if (window.location.pathname.match(/^\/collections\/[^\/]+$/)) {
        initCollectionDetailPage();
    }
});

function initCollectionsPage() {
    // Create collection modal
    var $modal = $('#createCollectionModal');
    var $form = $('#createCollectionForm');
    var $saveBtn = $('#saveCollectionBtn');
    var $addFieldBtn = $('#addFieldBtn');
    
    // Delete collection modal
    var $deleteModal = $('#deleteCollectionModal');
    var $confirmDeleteBtn = $('#confirmDeleteBtn');
    var collectionToDelete = null;
    
    // Show modal when create button is clicked
    $('#createCollectionBtn').on('click', function() {
        $modal.modal('show');
    });
    
    // Add field button click handler
    $addFieldBtn.on('click', function() {
        var $newField = $('.schema-field').first().clone();
        $newField.find('input, select').val('');
        $('#schemaFields').append($newField);
        
        // Initialize remove button for the new field
        $newField.find('.remove-field').on('click', function() {
            $(this).closest('.schema-field').remove();
        });
    });
    
    // Initialize remove buttons for existing fields
    $('.remove-field').on('click', function() {
        $(this).closest('.schema-field').remove();
    });
    
    // Save button click handler
    $saveBtn.on('click', function() {
        // Validate form
        if (!$form[0].checkValidity()) {
            $form[0].reportValidity();
            return;
        }
        
        // Collect form data
        var name = $('#collectionName').val();
        var fieldNames = [];
        var fieldTypes = [];
        
        $('.schema-field').each(function() {
            var fieldName = $(this).find('input[name="fieldName[]"]').val();
            var fieldType = $(this).find('select[name="fieldType[]"]').val();
            
            if (fieldName) {
                fieldNames.push(fieldName);
                fieldTypes.push(fieldType);
            }
        });
        
        // Send AJAX request to create collection
        $.ajax({
            url: '/api/collections',
            method: 'POST',
            data: {
                name: name,
                fieldName: fieldNames,
                fieldType: fieldTypes
            },
            success: function(response) {
                // Hide modal
                $modal.modal('hide');
                
                // Reload page to show new collection
                window.location.reload();
            },
            error: function(xhr) {
                alert('Error creating collection: ' + xhr.responseText);
            }
        });
    });
    
    // Delete collection button click handler
    $('.delete-collection-btn').on('click', function() {
        var $btn = $(this);
        var collectionId = $btn.data('id');
        var collectionName = $btn.data('name');
        
        // Set collection to delete
        collectionToDelete = collectionId;
        
        // Update modal text
        $('#deleteCollectionModal .modal-body').html(
            '<p>Are you sure you want to delete the collection <strong>' + collectionName + '</strong>?</p>' +
            '<p><strong>Warning:</strong> All items in this collection will be permanently deleted.</p>'
        );
        
        // Show delete confirmation modal
        $deleteModal.modal('show');
    });
    
    // Confirm delete button click handler
    $confirmDeleteBtn.on('click', function() {
        if (!collectionToDelete) {
            return;
        }
        
        // Send AJAX request to delete collection
        $.ajax({
            url: '/api/collections/' + collectionToDelete,
            method: 'DELETE',
            success: function(response) {
                // Hide modal
                $deleteModal.modal('hide');
                
                // Navigate to collections page instead of reloading
                window.location.href = '/collections';
            },
            error: function(xhr) {
                // Hide modal
                $deleteModal.modal('hide');
                
                // Show error
                alert('Error deleting collection: ' + xhr.responseText);
            }
        });
    });
}

function initCollectionDetailPage() {
    // Get collection ID from URL
    var collectionId = window.location.pathname.split('/').pop();
    
    // Add item button click handler
    $('#addItemBtn').on('click', function() {
        $('#itemModal').modal('show');
    });
    
    // Save item button click handler
    $('#saveItemBtn').on('click', function() {
        // Validate form
        if (!$('#itemForm')[0].checkValidity()) {
            $('#itemForm')[0].reportValidity();
            return;
        }
        
        // Collect form data
        var formData = {};
        
        $('#itemForm').find('input, textarea, select').each(function() {
            var field = $(this).attr('name');
            var value = $(this).val();
            
            if (field) {
                formData[field] = value;
            }
        });
        
        // Send AJAX request to add item
        $.ajax({
            url: '/api/collections/' + collectionId + '/items',
            method: 'POST',
            data: formData,
            success: function(response) {
                // Hide modal
                $('#itemModal').modal('hide');
                
                // Reload page to show new item
                window.location.reload();
            },
            error: function(xhr) {
                alert('Error adding item: ' + xhr.responseText);
            }
        });
    });
    
    // Edit item button click handler
    $('.edit-item-btn').on('click', function() {
        var $row = $(this).closest('tr');
        var itemId = $row.data('id');
        
        // TODO: Implement edit functionality
        alert('Edit functionality not implemented yet');
    });
    
    // Delete item button click handler
    $('.delete-item-btn').on('click', function() {
        var $row = $(this).closest('tr');
        var itemId = $row.data('id');
        
        // TODO: Implement delete functionality
        alert('Delete functionality not implemented yet');
    });
}