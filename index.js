var express = require("express");
var path = require("path");
var templating = require("./src/server/templating");
var storage = require("./src/server/storage");
var bodyParser = require("body-parser");
var dotenv = require("dotenv");
var fs = require("fs");

// Load environment variables
if (fs.existsSync(".env.development")) {
  dotenv.config({path: ".env.development"});
} else {
  dotenv.config();
}

var app = express();

// Middleware
app.use(express.static("public"));
app.use("/vendor", express.static("public/vendor"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Simple cookie middleware
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

  // Add a function to set cookies
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

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.cookies.auth) {
    return res.redirect("/login");
  }
  next();
}

// Routes
function renderPage(req, res) {
  var pageName = req.path === "/" ? "home" : req.path.substring(1);
  var content = templating.renderPage(pageName, req);

  if (!content) {
    return res.status(500).send("Error loading template");
  }

  res.send(content);
}

// Collections routes
app.get("/collections", requireAuth, function (req, res) {
  var collections = storage.getCollections();
  var collectionsHtml = "";

  if (collections.length === 0) {
    collectionsHtml =
      '<div class="col-12"><div class="alert alert-info">No collections found. Create your first collection to get started.</div></div>';
  } else {
    for (var i = 0; i < collections.length; i++) {
      var collection = collections[i];
      collectionsHtml += '<div class="col-md-4 mb-4">';
      collectionsHtml += '<div class="card">';
      collectionsHtml += '<div class="card-body">';
      collectionsHtml += '<h5 class="card-title">' + collection.name + "</h5>";
      collectionsHtml +=
        '<p class="card-text">Items: ' + collection.items.length + "</p>";
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

  var variables = {
    collectionsHtml: collectionsHtml,
  };

  var content = templating.renderPage("collections", req, variables);

  if (!content) {
    return res.status(500).send("Error loading template");
  }

  res.send(content);
});

app.get("/collections/:id", requireAuth, function (req, res) {
  var collectionId = req.params.id;
  var collection = storage.getCollectionById(collectionId);

  if (!collection) {
    return res.status(404).send("Collection not found");
  }

  var itemsHtml = "";
  var formFieldsHtml = "";

  // Generate form fields based on schema
  for (var field in collection.schema) {
    var fieldType = collection.schema[field];
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

  // Generate items HTML
  if (collection.items.length === 0) {
    itemsHtml =
      '<div class="alert alert-info">No items in this collection yet. Add your first item to get started.</div>';
  } else {
    itemsHtml =
      '<div class="table-responsive"><table class="table table-striped">';
    itemsHtml += "<thead><tr>";

    // Table headers from schema
    for (var field in collection.schema) {
      itemsHtml += "<th>" + field + "</th>";
    }
    itemsHtml += "<th>Actions</th></tr></thead>";

    // Table body from items
    itemsHtml += "<tbody>";
    for (var i = 0; i < collection.items.length; i++) {
      var item = collection.items[i];
      itemsHtml += '<tr data-id="' + item.id + '">';

      for (var field in collection.schema) {
        itemsHtml += "<td>" + (item[field] || "") + "</td>";
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
});

// API routes for collections
app.post("/api/collections", requireAuth, function (req, res) {
  var name = req.body.name;
  var schema = {};

  // Process schema fields from form
  if (req.body.fieldName && req.body.fieldType) {
    for (var i = 0; i < req.body.fieldName.length; i++) {
      schema[req.body.fieldName[i]] = req.body.fieldType[i];
    }
  }

  var collection = storage.createCollection(name, schema);
  res.redirect("/collections");
});

app.post("/api/collections/:id/items", requireAuth, function (req, res) {
  var collectionId = req.params.id;
  var collection = storage.getCollectionById(collectionId);

  if (!collection) {
    return res.status(404).json({error: "Collection not found"});
  }

  var item = {};

  // Process item fields from form
  for (var field in collection.schema) {
    if (req.body[field] !== undefined) {
      item[field] = req.body[field];
    }
  }

  var updatedCollection = storage.addItemToCollection(collectionId, item);
  res.json({success: true, item: item});
});

app.delete("/api/collections/:id", requireAuth, function (req, res) {
  var collectionId = req.params.id;
  var success = storage.deleteCollection(collectionId);

  if (success) {
    res.redirect("/collections");
  } else {
    res.status(404).json({error: "Collection not found"});
  }
});

// Login routes
app.get("/login", function (req, res) {
  // If already logged in, redirect to home
  if (req.cookies.auth) {
    return res.redirect("/home");
  }
  renderPage(req, res);
});

app.post("/login", function (req, res) {
  var username = req.body.username;
  var password = req.body.password;

  // Check credentials against environment variables
  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
    // Set auth cookie
    res.setCookie("auth", "authenticated", {
      maxAge: 3600, // 1 hour
      path: "/",
      httpOnly: true,
    });

    return res.status(200).json({success: true});
  }

  return res.status(401).json({error: "Invalid credentials"});
});

app.get("/logout", function (req, res) {
  // Clear auth cookie
  res.setCookie("auth", "", {
    maxAge: -1,
    path: "/",
  });

  res.redirect("/login");
});

// Protected routes
app.get("/", requireAuth, renderPage);
app.get("/home", requireAuth, renderPage);

// Initialize storage
storage.initializeStorage();

// Start server
var server = app.listen(3000, function () {
  console.log("Server is running on port 3000");
});
