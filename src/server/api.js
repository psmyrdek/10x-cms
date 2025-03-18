var express = require('express');
var router = express.Router();
var storageModule = require('./storage');

// Get all collections
router.get('/collections', function(req, res) {
    var collections = storageModule.getCollections();
    res.json(collections);
});

// Get single collection
router.get('/collections/:id', function(req, res) {
    var collection = storageModule.getCollectionById(req.params.id);
    if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
    }
    res.json(collection);
});

// Get collection items
router.get('/collections/:id/items', function(req, res) {
    var collection = storageModule.getCollectionById(req.params.id);
    if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
    }
    res.json(collection.items);
});

// Get single item
router.get('/collections/:collectionId/items/:itemId', function(req, res) {
    var collection = storageModule.getCollectionById(req.params.collectionId);
    if (!collection) {
        return res.status(404).json({ error: 'Collection not found' });
    }
    
    var item = collection.items.find(function(item) {
        return item.id === req.params.itemId;
    });
    
    if (!item) {
        return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
});

module.exports = router;
