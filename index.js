var express = require("express");
var path = require("path");
var templating = require("./src/server/templating");
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

// Start server
var server = app.listen(3000, function () {
  console.log("Server is running on port 3000");
});
