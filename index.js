var express = require("express");
var path = require("path");
var templating = require("./src/server/templating");
var storageModule = require("./src/server/storage");
var mediaModule = require("./src/server/media");
var apiRoutes = require("./src/server/api");
var webhooksModule = require("./src/server/webhooks");
var bodyParser = require("body-parser");
var dotenv = require("dotenv");
var fs = require("fs");
var multer = require("multer");

/**
 * Multer disk storage configuration for file uploads.
 * Specifies the destination directory and filename generation logic.
 * @type {multer.StorageEngine}
 */
var multerStorage = multer.diskStorage({
  /**
   * Determines the destination folder for uploaded files.
   * @param {express.Request} req - The Express request object.
   * @param {Express.Multer.File} file - The file being uploaded.
   * @param {function(Error | null, string)} cb - The callback function.
   */
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  /**
   * Determines the filename for uploaded files.
   * @param {express.Request} req - The Express request object.
   * @param {Express.Multer.File} file - The file being uploaded.
   * @param {function(Error | null, string)} cb - The callback function.
   */
  filename: function (req, file, cb) {
    var ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});

/**
 * Multer instance configured for image uploads with specific limits and file filtering.
 * @type {multer.Multer}
 */
var upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  /**
   * Filters files based on their MIME type. Only images are allowed.
   * @param {express.Request} req - The Express request object.
   * @param {Express.Multer.File} file - The file being uploaded.
   * @param {function(Error | null, boolean)} cb - The callback function.
   */
  fileFilter: function (req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Load environment variables from .env file. Prefer .env.development if it exists.
if (fs.existsSync(".env.development")) {
  dotenv.config({path: ".env.development"});
} else {
  dotenv.config();
}

/**
 * The Express application instance.
 * @type {express.Application}
 */
var app = express();

// Serve static files from the 'public' directory
app.use(express.static("public"));
// Serve vendor files separately (example)
app.use("/vendor", express.static("public/vendor"));
// Serve uploaded images separately
app.use("/images", express.static("public/images"));
// Parse URL-encoded bodies (as sent by HTML forms)
app.use(bodyParser.urlencoded({extended: true}));
// Parse JSON bodies (as sent by API clients)
app.use(bodyParser.json());

// Mount API routes
app.use("/api", apiRoutes);

/**
 * Custom middleware to parse cookies and add a setCookie method to the response.
 * Adds a `cookies` object to `req` and a `setCookie` method to `res`.
 * @param {express.Request} req - The Express request object.
 * @property {Object<string, string>} req.cookies - An object containing parsed cookies.
 * @param {express.Response} res - The Express response object.
 * @property {function(string, string, { maxAge?: number, path?: string, httpOnly?: boolean, secure?: boolean }): express.Response} res.setCookie - Method to set a cookie on the response.
 * @param {express.NextFunction} next - The next middleware function.
 */
app.use(function (req, res, next) {
  var cookies = {};
  var cookieHeader = req.headers.cookie;

  if (cookieHeader) {
    cookieHeader.split(";").forEach(function (cookie) {
      var parts = cookie.split("=");
      cookies[parts[0].trim()] = (parts[1] || "").trim();
    });
  }

  req.cookies = cookies;

  /**
   * Sets a cookie on the response object.
   * @param {string} name - The name of the cookie.
   * @param {string} value - The value of the cookie.
   * @param {object} [options={}] - Cookie options.
   * @param {number} [options.maxAge] - Cookie expiry in seconds.
   * @param {string} [options.path] - Cookie path.
   * @param {boolean} [options.httpOnly] - HTTP-only flag.
   * @param {boolean} [options.secure] - Secure flag.
   * @returns {express.Response} The response object for chaining.
   */
  res.setCookie = function (name, value, options) {
    options = options || {};
    var cookieStr = name + "=" + value;

    if (options.maxAge) cookieStr += "; Max-Age=" + options.maxAge;
    if (options.path) cookieStr += "; Path=" + options.path;
    if (options.httpOnly) cookieStr += "; HttpOnly";
    if (options.secure) cookieStr += "; Secure";

    this.setHeader("Set-Cookie", cookieStr);
    return this;
  };

  next();
});

/**
 * Middleware to require authentication. Redirects to login if 'auth' cookie is not present.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @param {express.NextFunction} next - The next middleware function.
 * @returns {void}
 */
function requireAuth(req, res, next) {
  if (!req.cookies.auth) {
    return res.redirect("/login");
  }
  next();
}

/**
 * Renders a page template based on the request path.
 * Determines the template name from the URL and renders it using the templating module.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
function renderPage(req, res) {
  var pageName = req.path === "/" ? "home" : req.path.substring(1);
  var content = templating.renderPage(pageName, req);

  if (!content) {
    return res.status(500).send("Error loading template");
  }

  res.send(content);
}

/**
 * GET /webhooks - Renders the webhooks management page.
 * Requires authentication. Fetches and displays existing webhooks grouped by collection.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<void>}
 */
app.get("/webhooks", requireAuth, async function (req, res) {
  try {
    var webhooksListHtml = "";
    var collections = await storageModule.getCollections();
    var collectionsDropdownHtml = "";

    if (collections.length === 0) {
      collectionsDropdownHtml =
        '<option value="">No collections available</option>';
    } else {
      collectionsDropdownHtml =
        '<option value="">Select collection...</option>';
      for (var collection of collections) {
        collectionsDropdownHtml +=
          '<option value="' +
          collection.id +
          '">' +
          collection.name +
          "</option>";
      }

      var hasWebhooks = false;
      for (var collection of collections) {
        var webhooks = await storageModule.getWebhooks(collection.id);

        if (webhooks.length > 0) {
          hasWebhooks = true;
          webhooksListHtml += '<div class="mb-4">';
          webhooksListHtml += '<h6 class="mb-3">' + collection.name + "</h6>";

          for (var webhook of webhooks) {
            webhooksListHtml += '<div class="card mb-2">';
            webhooksListHtml += '<div class="card-body">';
            webhooksListHtml +=
              '<div class="d-flex justify-content-between align-items-center">';
            webhooksListHtml += "<div>";
            webhooksListHtml +=
              '<p class="mb-1"><strong>URL:</strong> ' + webhook.url + "</p>";
            webhooksListHtml +=
              '<p class="mb-0"><small class="text-muted">Events: ' +
              webhook.events.join(", ") +
              "</small></p>";
            webhooksListHtml += "</div>";
            webhooksListHtml +=
              '<button class="btn btn-danger btn-sm delete-webhook" data-id="' +
              webhook.id +
              '">Delete</button>';
            webhooksListHtml += "</div>";
            webhooksListHtml += "</div>";
            webhooksListHtml += "</div>";
          }

          webhooksListHtml += "</div>";
        }
      }

      if (!hasWebhooks) {
        webhooksListHtml =
          "<p class='alert alert-info text-dark'>No webhooks configured yet.</p>";
      }
    }

    var content = templating.renderPage("webhooks", req, {
      webhooksListHtml: webhooksListHtml,
      collectionsDropdownHtml: collectionsDropdownHtml,
    });

    if (!content) {
      return res.status(500).send("Error loading template");
    }

    res.send(content);
  } catch (error) {
    console.error("Error loading webhooks page:", error);
    res.status(500).send("Error loading webhooks");
  }
});

/**
 * POST /api/webhooks - Creates a new webhook for a collection.
 * Requires authentication. Expects collection ID, URL, and event types in the request body.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<void>}
 */
app.post("/api/webhooks", requireAuth, async function (req, res) {
  try {
    var collectionId = req.body.collection;
    var url = req.body.url;
    var events = req.body.events || [];

    if (!collectionId || !url || events.length === 0) {
      return res.status(400).json({error: "Missing required fields"});
    }

    // Validate that events only contain allowed values
    var allowedEvents = ["create", "update", "delete"];
    var validEvents = events.every(function (event) {
      return allowedEvents.includes(event);
    });

    if (!validEvents) {
      return res.status(400).json({error: "Invalid event types provided"});
    }

    var webhook = await storageModule.addWebhook(collectionId, url, events);
    res.json(webhook);
  } catch (error) {
    console.error("Error creating webhook:", error);
    res.status(500).json({error: "Error creating webhook"});
  }
});

/**
 * DELETE /api/webhooks/:id - Deletes a specific webhook.
 * Requires authentication. Expects the webhook ID in the URL parameters.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<void>}
 */
app.delete("/api/webhooks/:id", requireAuth, async function (req, res) {
  try {
    var success = await storageModule.deleteWebhook(req.params.id);
    if (success) {
      res.json({success: true});
    } else {
      res.status(404).json({error: "Webhook not found"});
    }
  } catch (error) {
    console.error("Error deleting webhook:", error);
    res.status(500).json({error: "Error deleting webhook"});
  }
});

/**
 * GET /collections - Renders the collections management page.
 * Requires authentication. Fetches and displays all collections with item counts.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<void>}
 */
app.get("/collections", requireAuth, async function (req, res) {
  try {
    var collections = await storageModule.getCollections();
    var collectionsHtml = "";

    if (collections.length === 0) {
      collectionsHtml =
        '<div class="col-12"><p class="alert alert-info text-dark">No collections found. Create your first collection to get started.</p></div>';
    } else {
      for (var collection of collections) {
        // Get collection with items using the storage module
        var collectionWithItems = await storageModule.getCollectionById(
          collection.id
        );
        var itemsCount = collectionWithItems.items
          ? collectionWithItems.items.length
          : 0;

        collectionsHtml += '<div class="col-md-4 mb-4">';
        collectionsHtml += '<div class="card">';
        collectionsHtml += '<div class="card-body">';
        collectionsHtml += "<!-- @collectionId:" + collection.id + " -->";
        collectionsHtml +=
          '<h5 class="card-title">' + collection.name + "</h5>";
        collectionsHtml += '<p class="card-text">Items: ' + itemsCount + "</p>";
        collectionsHtml += '<div class="d-flex justify-content-between">';
        collectionsHtml +=
          '<a href="/collections/' +
          collection.id +
          '" class="btn btn-primary">View Collection</a>';
        collectionsHtml +=
          '<button class="btn btn-danger delete-collection-btn" data-id="' +
          collection.id +
          '" data-name="' +
          collection.name +
          '">Delete</button>';
        collectionsHtml += "</div>";
        collectionsHtml += "</div></div></div>";
      }
    }

    var content = templating.renderPage("collections", req, {
      collectionsHtml: collectionsHtml,
    });

    if (!content) {
      return res.status(500).send("Error loading template");
    }

    res.send(content);
  } catch (error) {
    console.error("Error loading collections page:", error);
    res.status(500).send("Error loading collections");
  }
});

/**
 * GET /collections/:id - Renders the details page for a specific collection.
 * Requires authentication. Fetches and displays the collection's items and schema-based form fields.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<void>}
 */
app.get("/collections/:id", requireAuth, async function (req, res) {
  try {
    var collectionId = req.params.id;
    var collection = await storageModule.getCollectionById(collectionId);

    if (!collection) {
      return res.status(404).send("Collection not found");
    }

    var itemsHtml = "";
    var formFieldsHtml = "";

    // Only iterate over actual schema fields, not system fields
    var schema = collection.schema;
    if (typeof schema === "string") {
      try {
        schema = JSON.parse(schema);
      } catch (e) {
        console.error("Error parsing schema:", e);
        schema = {};
      }
    }

    for (var field in schema) {
      var fieldType = schema[field];
      var inputType = "text";

      if (fieldType === "number") {
        inputType = "number";
      } else if (fieldType === "date") {
        inputType = "date";
      }

      formFieldsHtml += '<div class="mb-3">';
      formFieldsHtml +=
        '<label for="' + field + '" class="form-label">' + field + "</label>";

      if (fieldType === "text") {
        formFieldsHtml +=
          '<textarea class="form-control" id="' +
          field +
          '" name="' +
          field +
          '" rows="3"></textarea>';
      } else if (fieldType === "media") {
        formFieldsHtml +=
          '<div class="input-group">' +
          '<input type="hidden" id="' +
          field +
          '" name="' +
          field +
          '" class="media-field-input">' +
          '<input type="text" class="form-control media-field-display" id="' +
          field +
          '_display" readonly placeholder="No image selected">' +
          '<button type="button" class="btn btn-primary media-selector-btn" data-field="' +
          field +
          '">Select Image</button>' +
          "</div>" +
          '<div class="mt-2 media-preview-container" id="' +
          field +
          '_preview"></div>';
      } else {
        formFieldsHtml +=
          '<input type="' +
          inputType +
          '" class="form-control" id="' +
          field +
          '" name="' +
          field +
          '">';
      }

      formFieldsHtml += "</div>";
    }

    if (!collection.items || collection.items.length === 0) {
      itemsHtml =
        '<p class="alert alert-info text-dark">No items in this collection yet. Add your first item to get started.</p>';
    } else {
      itemsHtml =
        '<div class="table-responsive"><table class="table table-striped">';
      itemsHtml += "<thead><tr>";

      // Only show schema fields in table headers
      for (var field in schema) {
        itemsHtml += "<th>" + field + "</th>";
      }
      itemsHtml += "<th>Actions</th></tr></thead>";

      itemsHtml += "<tbody>";
      for (var item of collection.items) {
        itemsHtml += '<tr data-id="' + item.id + '">';

        // Only show schema fields in table cells
        for (var field in schema) {
          var fieldType = schema[field];
          var fieldValue = "";

          // Handle item.data which is stored as JSON in the database
          if (item.data) {
            // If item.data is a string (from JSON), parse it
            if (typeof item.data === "string") {
              try {
                var parsedData = JSON.parse(item.data);
                fieldValue = parsedData[field] || "";
              } catch (e) {
                console.error("Error parsing item data:", e);
              }
            } else {
              // If item.data is already an object
              fieldValue = item.data[field] || "";
            }
          }

          // Convert fieldValue to string for display
          fieldValue = String(fieldValue || "");

          if (fieldType === "media" && fieldValue) {
            itemsHtml +=
              '<td><img src="' +
              fieldValue +
              '" alt="Media" class="img-thumbnail" style="max-width: 50px; max-height: 50px;"></td>';
          } else {
            itemsHtml += "<td>" + fieldValue + "</td>";
          }
        }

        itemsHtml += "<td>";
        itemsHtml +=
          '<button class="btn btn-sm btn-primary edit-item-btn">Edit</button> ';
        itemsHtml +=
          '<button class="btn btn-sm btn-danger delete-item-btn">Delete</button>';
        itemsHtml += "</td></tr>";
      }

      itemsHtml += "</tbody></table></div>";
    }

    var variables = {
      collectionName: collection.name,
      itemsHtml: itemsHtml,
      formFieldsHtml: formFieldsHtml,
      collectionId: collection.id,
    };

    var content = templating.renderPage("collection", req, variables);

    if (!content) {
      return res.status(500).send("Error loading template");
    }

    res.send(content);
  } catch (error) {
    console.error("Error loading collection page:", error);
    res.status(500).send("Error loading collection");
  }
});

// API routes for collections
/**
 * POST /api/collections - Creates a new collection.
 * Requires authentication. Expects collection name and schema fields/types in the request body.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<void>}
 */
app.post("/api/collections", requireAuth, async function (req, res) {
  try {
    var name = req.body.name;
    var schema = {};

    if (req.body.fieldName && req.body.fieldType) {
      for (var i = 0; i < req.body.fieldName.length; i++) {
        schema[req.body.fieldName[i]] = req.body.fieldType[i];
      }
    }

    var collection = await storageModule.createCollection(name, schema);
    res.json({success: true, collection: collection});
  } catch (error) {
    console.error("Error creating collection:", error);
    res.status(500).json({error: "Error creating collection"});
  }
});

/**
 * POST /api/collections/:id/items - Adds a new item to a collection.
 * Requires authentication. Expects collection ID in URL and item data in request body.
 * Triggers item created webhooks.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<void>}
 */
app.post("/api/collections/:id/items", requireAuth, async function (req, res) {
  try {
    const collectionId = req.params.id;
    const collection = await storageModule.getCollectionById(collectionId);

    if (!collection) {
      return res.status(404).json({error: "Collection not found"});
    }

    const addedItem = await storageModule.addItemToCollection(
      collectionId,
      req.body
    );

    try {
      await webhooksModule.onItemCreated(collectionId, addedItem);
    } catch (error) {
      console.error("Error calling webhook for item creation:", error);
    }

    res.json({success: true, item: addedItem});
  } catch (error) {
    console.error("Error creating item:", error);
    res.status(500).json({error: "Error creating item"});
  }
});

/**
 * PUT /api/collections/:collectionId/items/:itemId - Updates an existing item in a collection.
 * Requires authentication. Expects collection ID and item ID in URL and updated item data in request body.
 * Triggers item updated webhooks.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<void>}
 */
app.put(
  "/api/collections/:collectionId/items/:itemId",
  requireAuth,
  async function (req, res) {
    try {
      const {collectionId, itemId} = req.params;
      const collection = await storageModule.getCollectionById(collectionId);

      if (!collection) {
        return res.status(404).json({error: "Collection not found"});
      }

      const result = await storageModule.updateItemInCollection(
        collectionId,
        itemId,
        req.body
      );

      if (!result) {
        return res.status(404).json({error: "Item not found"});
      }

      try {
        await webhooksModule.onItemUpdated(collectionId, result);
      } catch (error) {
        console.error("Error calling webhook for item update:", error);
      }

      res.json({success: true, item: result});
    } catch (error) {
      console.error("Error updating item:", error);
      res.status(500).json({error: "Error updating item"});
    }
  }
);

/**
 * DELETE /api/collections/:collectionId/items/:itemId - Deletes an item from a collection.
 * Requires authentication. Expects collection ID and item ID in URL.
 * Triggers item deleted webhooks.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<void>}
 */
app.delete(
  "/api/collections/:collectionId/items/:itemId",
  requireAuth,
  async function (req, res) {
    try {
      var collectionId = req.params.collectionId;
      var itemId = req.params.itemId;

      var success = await storageModule.deleteItemFromCollection(
        collectionId,
        itemId
      );

      if (success) {
        // Wait for webhook but handle errors silently
        try {
          await webhooksModule.onItemDeleted(collectionId, itemId);
        } catch (error) {
          console.error("Error calling webhook for item deletion:", error);
        }

        res.json({success: true, message: "Item deleted successfully"});
      } else {
        res.status(404).json({error: "Collection or item not found"});
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      res.status(500).json({error: "Error deleting item"});
    }
  }
);

/**
 * DELETE /api/collections/:id - Deletes a collection.
 * Requires authentication. Expects collection ID in URL.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {Promise<void>}
 */
app.delete("/api/collections/:id", requireAuth, async function (req, res) {
  try {
    var collectionId = req.params.id;

    if (!collectionId) {
      return res.status(400).json({error: "Collection ID is required"});
    }

    var success = await storageModule.deleteCollection(collectionId);

    if (success) {
      res.json({success: true, message: "Collection deleted successfully"});
    } else {
      res.status(404).json({error: "Collection not found"});
    }
  } catch (error) {
    console.error("Error deleting collection:", error);
    res.status(500).json({error: "Error deleting collection"});
  }
});

// Login routes
/**
 * GET /login - Renders the login page.
 * Redirects to /home if already authenticated.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
app.get("/login", function (req, res) {
  if (req.cookies.auth) {
    return res.redirect("/home");
  }
  renderPage(req, res);
});

/**
 * POST /login - Handles login submission.
 * Checks credentials against environment variables. Sets auth cookie on success.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
app.post("/login", function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    res.setCookie("auth", "authenticated", {
      maxAge: 3600, // 1 hour
      path: "/",
      httpOnly: true,
    });

    return res.status(200).json({success: true});
  }

  return res.status(401).json({error: "Invalid credentials"});
});

/**
 * GET /logout - Logs out the user.
 * Clears the authentication cookie and redirects to the login page.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
app.get("/logout", function (req, res) {
  res.setCookie("auth", "", {
    maxAge: -1,
    path: "/",
  });

  res.redirect("/login");
});

// Protected routes
app.get("/", requireAuth, renderPage);
app.get("/home", requireAuth, renderPage);

// Media Library routes
/**
 * GET /media - Renders the media library page.
 * Requires authentication. Fetches and displays all uploaded media items.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
app.get("/media", requireAuth, function (req, res) {
  var mediaItems = mediaModule.getAllMedia();
  var mediaHtml = "";

  if (mediaItems.length === 0) {
    mediaHtml =
      '<div class="col-12"><p class="alert alert-info text-dark">No images found. Upload your first image to get started.</p></div>';
  } else {
    for (var i = 0; i < mediaItems.length; i++) {
      var item = mediaItems[i];
      mediaHtml += '<div class="col-md-3 mb-4">';
      mediaHtml += '<div class="card h-100">';
      mediaHtml +=
        '<img src="' +
        item.path +
        '" class="card-img-top" alt="' +
        item.originalname +
        '" style="height: 150px; object-fit: cover;">';
      mediaHtml += '<div class="card-body">';
      // Add meta tag with media ID
      mediaHtml += "<!-- @mediaId:" + item.id + " -->";
      mediaHtml +=
        '<h6 class="card-title text-truncate">' + item.originalname + "</h6>";
      mediaHtml +=
        '<p class="card-text small text-muted">' +
        (item.description || "No description") +
        "</p>";
      mediaHtml += '<div class="d-flex justify-content-between">';
      mediaHtml +=
        '<button class="btn btn-sm btn-primary preview-image-btn" data-id="' +
        item.id +
        '" data-path="' +
        item.path +
        '" data-name="' +
        item.originalname +
        '" data-description="' +
        (item.description || "") +
        '">Preview</button>';
      mediaHtml +=
        '<button class="btn btn-sm btn-danger delete-image-btn" data-id="' +
        item.id +
        '">Delete</button>';
      mediaHtml += "</div>";
      mediaHtml += "</div></div></div>";
    }
  }

  var variables = {
    mediaHtml: mediaHtml,
  };

  var content = templating.renderPage("media", req, variables);

  if (!content) {
    return res.status(500).send("Error loading template");
  }

  res.send(content);
});

// API routes for media
/**
 * POST /api/media - Handles media file upload.
 * Requires authentication and uses the 'upload' multer middleware.
 * Expects a single file named 'image' and an optional 'description' in the request body.
 * @param {express.Request} req - The Express request object, enhanced by multer with a `file` property.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
app.post(
  "/api/media",
  requireAuth,
  upload.single("image"),
  function (req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({error: "No image file uploaded"});
      }

      var description = req.body.description || "";
      var mediaItem = mediaModule.addMedia(req.file, description);

      res.json({success: true, media: mediaItem});
    } catch (err) {
      console.error("Error uploading image:", err);
      res.status(500).json({error: "Error uploading image: " + err.message});
    }
  }
);

/**
 * GET /api/media - Retrieves a list of all media items.
 * Requires authentication.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
app.get("/api/media", requireAuth, function (req, res) {
  try {
    var mediaItems = mediaModule.getAllMedia();
    res.json({success: true, media: mediaItems});
  } catch (err) {
    console.error("Error retrieving media:", err);
    res.status(500).json({error: "Error retrieving media: " + err.message});
  }
});

/**
 * DELETE /api/media/:id - Deletes a specific media item.
 * Requires authentication. Expects the media item ID in the URL parameters.
 * @param {express.Request} req - The Express request object.
 * @param {express.Response} res - The Express response object.
 * @returns {void}
 */
app.delete("/api/media/:id", requireAuth, function (req, res) {
  var mediaId = req.params.id;

  if (!mediaId) {
    return res.status(400).json({error: "Media ID is required"});
  }

  var success = mediaModule.deleteMedia(mediaId);

  if (success) {
    res.json({success: true, message: "Media deleted successfully"});
  } else {
    res.status(404).json({error: "Media not found or could not be deleted"});
  }
});

/**
 * Initializes the database and starts the Express server.
 * This is an immediately invoked async function (IIFE).
 */
(async () => {
  try {
    await storageModule.initializeStorage();
    console.log("Database initialized successfully");

    // Initialize media storage
    mediaModule.initializeMediaStorage();

    // Start server
    var server = app.listen(3000, function () {
      console.log("Server is running on http://localhost:3000");
    });
  } catch (error) {
    console.error("Error initializing database:", error);
    process.exit(1);
  }
})();