const db = require("./db/connection");

async function createCollection(name, schema) {
  const collection = {
    id: Date.now().toString(),
    name: name,
    schema: schema || {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db("collections").insert(collection);
  return collection;
}

async function getCollections() {
  return await db("collections").select("*");
}

async function getCollectionById(id) {
  const collection = await db("collections").where({id}).first();
  if (collection) {
    collection.items = await db("items").where({collection_id: id});
  }
  return collection;
}

async function updateCollection(id, updates) {
  const updateData = {
    ...updates,
    updated_at: new Date().toISOString(),
  };

  await db("collections").where({id}).update(updateData);

  return await getCollectionById(id);
}

async function deleteCollection(id) {
  const deleted = await db("collections").where({id}).delete();

  return deleted > 0;
}

async function addItemToCollection(collectionId, item) {
  const newItem = {
    id: Date.now().toString(),
    collection_id: collectionId,
    data: item,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db("items").insert(newItem);
  return newItem;
}

async function updateItemInCollection(collectionId, itemId, updates) {
  const updateData = {
    data: JSON.stringify(updates),
    updated_at: new Date().toISOString(),
  };

  await db("items")
    .where({
      id: itemId,
      collection_id: collectionId,
    })
    .update(updateData);

  return await db("items").where({id: itemId}).first();
}

async function deleteItemFromCollection(collectionId, itemId) {
  const deleted = await db("items")
    .where({
      id: itemId,
      collection_id: collectionId,
    })
    .delete();

  return deleted > 0;
}

async function getWebhooks(collectionId) {
  return await db("webhooks").where({collection_id: collectionId}).select("*");
}

async function addWebhook(collectionId, url, events) {
  const webhook = {
    id: Date.now().toString(),
    collection_id: collectionId,
    url: url,
    events: events,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await db("webhooks").insert(webhook);
  return webhook;
}

async function deleteWebhook(webhookId) {
  const deleted = await db("webhooks").where({id: webhookId}).delete();

  return deleted > 0;
}

async function initializeStorage() {
  await db.migrate.latest();
}

module.exports = {
  createCollection,
  getCollections,
  getCollectionById,
  updateCollection,
  deleteCollection,
  addItemToCollection,
  updateItemInCollection,
  deleteItemFromCollection,
  getWebhooks,
  addWebhook,
  deleteWebhook,
  initializeStorage,
};
