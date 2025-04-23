var storage = require("./storage");
var httpClient = require("@10xdevspl/http-client");

/**
 * Retrieves all webhooks for a specific event type within a collection.
 * @param {string} collectionId - The ID of the collection.
 * @param {string} eventType - The type of event to filter webhooks for.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of webhook objects.
 */
async function getWebhooksForEvent(collectionId, eventType) {
  var webhooks = await storage.getWebhooks(collectionId);

  return webhooks.filter(function (webhook) {
    return webhook.events.indexOf(eventType) !== -1;
  });
}

/**
 * Calls a webhook with the provided data.
 * @param {Object} webhook - The webhook object containing the URL.
 * @param {Object} data - The data to send to the webhook.
 * @returns {Promise<Object>} - A promise that resolves with the result of the HTTP POST request.
 */
async function callWebhook(webhook, data) {
  return await httpClient.post(webhook.url, data, {
    "Content-Type": "application/json",
    "User-Agent": "10xCMS-Webhook-Service/1.0",
    "X-Webhook-Event": data.event,
  });
}

/**
 * Notifies webhooks of a specific event type within a collection.
 * @param {string} collectionId - The ID of the collection.
 * @param {string} eventType - The type of event that occurred.
 * @param {Object} data - The data associated with the event.
 */
async function notifyWebhooks(collectionId, eventType, data) {
  var webhooks = await getWebhooksForEvent(collectionId, eventType);

  if (!webhooks || webhooks.length === 0) {
    return;
  }

  var collection = await storage.getCollectionById(collectionId);
  if (!collection) {
    console.error(
      "Collection not found for webhook notification: " + collectionId
    );
    return;
  }

  var payload = {
    event: eventType,
    collection: {
      id: collection.id,
      name: collection.name,
    },
    data: data,
    timestamp: new Date().toISOString(),
  };

  console.log(
    "Notifying " +
      webhooks.length +
      " webhooks for " +
      collection.name +
      " - " +
      eventType
  );

  const promises = webhooks.map(function (webhook) {
    return callWebhook(webhook, payload);
  });

  const results = await Promise.allSettled(promises);

  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(
        "Error calling webhook: " + webhooks[index].url,
        result.reason
      );
    }
  });

  console.log(
    "Webhook notification complete with results:",
    results.map((r) => r.status).join(", ")
  );
}

/**
 * Handles the event when an item is created.
 * @param {string} collectionId - The ID of the collection the item belongs to.
 * @param {Object} item - The created item.
 */
async function onItemCreated(collectionId, item) {
  await notifyWebhooks(collectionId, "create", item);
}

/**
 * Handles the event when an item is updated.
 * @param {string} collectionId - The ID of the collection the item belongs to.
 * @param {Object} item - The updated item.
 */
async function onItemUpdated(collectionId, item) {
  await notifyWebhooks(collectionId, "update", item);
}

/**
 * Handles the event when an item is deleted.
 * @param {string} collectionId - The ID of the collection the item belonged to.
 * @param {string} itemId - The ID of the deleted item.
 */
async function onItemDeleted(collectionId, itemId) {
  await notifyWebhooks(collectionId, "delete", {id: itemId});
}

module.exports = {
  onItemCreated: onItemCreated,
  onItemUpdated: onItemUpdated,
  onItemDeleted: onItemDeleted,
};