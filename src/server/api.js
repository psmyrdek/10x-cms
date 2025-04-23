var express = require("express");
var router = express.Router();
var storageModule = require("./storage");

/**
 * @swagger
 * /collections:
 *   get:
 *     summary: Get all collections
 *     description: Retrieve a list of all collections from the storage module.
 *     responses:
 *       200:
 *         description: A list of collections.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object # Adjust based on actual collection structure
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
/**
 * Express route handler for GET /collections.
 * Retrieves all collections from the storage module and sends them as a JSON response.
 * Handles potential errors during retrieval.
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
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
 * @swagger
 * /collections/{id}:
 *   get:
 *     summary: Get a single collection by ID
 *     description: Retrieve a specific collection based on its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string # Or integer, depending on ID type
 *         description: The ID of the collection to retrieve.
 *     responses:
 *       200:
 *         description: The collection object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object # Adjust based on actual collection structure
 *       404:
 *         description: Collection not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
/**
 * Express route handler for GET /collections/:id.
 * Retrieves a single collection by its ID from the storage module.
 * Sends the collection as JSON if found, otherwise sends a 404 or 500 error.
 * @param {object} req - The Express request object, containing the collection ID in `req.params.id`.
 * @param {object} res - The Express response object.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
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
 * @swagger
 * /collections/{id}/items:
 *   get:
 *     summary: Get items for a specific collection
 *     description: Retrieve the list of items belonging to a collection identified by its ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string # Or integer, depending on ID type
 *         description: The ID of the collection whose items are to be retrieved.
 *     responses:
 *       200:
 *         description: An array of items within the collection.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object # Adjust based on actual item structure
 *       404:
 *         description: Collection not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
/**
 * Express route handler for GET /collections/:id/items.
 * Retrieves a single collection by its ID and sends its items as a JSON response.
 * Sends a 404 if the collection is not found, or a 500 error on internal issues.
 * @param {object} req - The Express request object, containing the collection ID in `req.params.id`.
 * @param {object} res - The Express response object.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
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
 * @swagger
 * /collections/{collectionId}/items/{itemId}:
 *   get:
 *     summary: Get a single item from a collection
 *     description: Retrieve a specific item from a collection using both collection ID and item ID.
 *     parameters:
 *       - in: path
 *         name: collectionId
 *         required: true
 *         schema:
 *           type: string # Or integer
 *         description: The ID of the collection.
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string # Or integer
 *         description: The ID of the item to retrieve.
 *     responses:
 *       200:
 *         description: The item object.
 *         content:
 *           application/json:
 *             schema:
 *               type: object # Adjust based on actual item structure
 *       404:
 *         description: Collection or Item not found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
/**
 * Express route handler for GET /collections/:collectionId/items/:itemId.
 * Retrieves a single collection by collectionId, finds an item within it by itemId.
 * Sends the item as JSON if both are found, otherwise sends a 404 or 500 error.
 * @param {object} req - The Express request object, containing collectionId and itemId in `req.params`.
 * @param {object} res - The Express response object.
 * @returns {Promise<void>} - A promise that resolves when the response is sent.
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