var storage = require("./storage");
var httpClient = require("@10xdevspl/http-client");

function getWebhooksForEvent(collectionId, eventType) {
  var webhooks = storage.getWebhooks(collectionId);

  return webhooks.filter(function (webhook) {
    return webhook.events.indexOf(eventType) !== -1;
  });
}

async function callWebhook(webhook, data) {
  return await httpClient.post(webhook.url, data, {
    "Content-Type": "application/json",
    "User-Agent": "10xCMS-Webhook-Service/1.0",
    "X-Webhook-Event": data.event,
  });
}

async function notifyWebhooks(collectionId, eventType, data) {
  var webhooks = getWebhooksForEvent(collectionId, eventType);

  if (!webhooks || webhooks.length === 0) {
    return;
  }

  var collection = storage.getCollectionById(collectionId);
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

async function onItemCreated(collectionId, item) {
  await notifyWebhooks(collectionId, "create", item);
}

async function onItemUpdated(collectionId, item) {
  await notifyWebhooks(collectionId, "update", item);
}

async function onItemDeleted(collectionId, itemId) {
  await notifyWebhooks(collectionId, "delete", {id: itemId});
}

module.exports = {
  onItemCreated: onItemCreated,
  onItemUpdated: onItemUpdated,
  onItemDeleted: onItemDeleted,
};
