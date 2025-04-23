var express = require("express");
var router = express.Router();
var storageModule = require("./storage");

/**
 * Get all collections.
 *
 * @param {express.Request} req - Express request object.
 * @param {express.Response} res - Express response object.
 * @returns {Promise<void>}
 */
router.get("/collections", async function (req, res) {
  try {
    var collections = await storageModule.getCollections();
    res.json(collections);
  } catch (error) {
    res.status(500).json({error: "Internal server error"});
  }
});

/**
 * Get a single collection by ID.
 *
 * @param {express.Request} req - Express request object.
 * @param {express.Response} res - Express response object.
 * @returns {Promise<void>}
 */
router.get("/collections/:id", async function (req, res) {
  try {
    var collection = await storageModule.getCollectionById(req.params.id);
    if (!collection) {
      return res.status(404).json({error: "Collection not found"});
    }
    res.json(collection);
  } catch (error) {
    res.status(500).json({error: "Internal server error"});
  }
});

/**
 * Get all items within a specific collection.
 *
 * @param {express.Request} req - Express request object.
 * @param {express.Response} res - Express response object.
 * @returns {Promise<void>}
 */
router.get("/collections/:id/items", async function (req, res) {
  try {
    var collection = await storageModule.getCollectionById(req.params.id);
    if (!collection) {
      return res.status(404).json({error: "Collection not found"});
    }
    res.json(collection.items);
  } catch (error) {
    res.status(500).json({error: "Internal server error"});
  }
});

/**
 * Get a single item from a specific collection by item ID.
 *
 * @param {express.Request} req - Express request object.
 * @param {express.Response} res - Express response object.
 * @returns {Promise<void>}
 */
router.get(
  "/collections/:collectionId/items/:itemId",
  async function (req, res) {
    try {
      var collection = await storageModule.getCollectionById(
        req.params.collectionId
      );
      if (!collection) {
        return res.status(404).json({error: "Collection not found"});
      }

      var item = collection.items.find(function (item) {
        return item.id === req.params.itemId;
      });

      if (!item) {
        return res.status(404).json({error: "Item not found"});
      }

      res.json(item);
    } catch (error) {
      res.status(500).json({error: "Internal server error"});
    }
  }
);

module.exports = router;