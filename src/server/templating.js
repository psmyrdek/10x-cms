var fs = require("fs");
var path = require("path");

function readFileSync(filepath) {
  try {
    return fs.readFileSync(filepath, "utf8");
  } catch (err) {
    console.error("Error reading file:", filepath, err);
    return null;
  }
}

function parseMetaTags(content) {
  var meta = {};
  var lines = content.split("\n");

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.startsWith("<!-- @")) {
      var tag = line.replace("<!-- @", "").replace(" -->", "");
      var parts = tag.split(":");
      if (parts.length === 2) {
        meta[parts[0]] = parts[1];
      }
    }
  }

  return meta;
}

function injectComponent(content, componentName, variables) {
  var componentPath = path.join(
    process.cwd(),
    "src/components",
    componentName + ".html"
  );
  var componentContent = readFileSync(componentPath);
  if (!componentContent) {
    return content;
  }
  
  // Process the component content with variables before injecting
  componentContent = renderTemplate(componentContent, variables);
  
  return content.replace(
    "<!-- @inject:" + componentName + " -->",
    componentContent
  );
}

function renderWithLayout(content, layoutName, variables) {
  var layoutPath = path.join(process.cwd(), "src/layout", layoutName + ".html");
  var layoutContent = readFileSync(layoutPath);
  if (!layoutContent) {
    return content;
  }

  layoutContent = layoutContent.replace("<!-- @content -->", content);

  // Pass variables to component injections
  layoutContent = injectComponent(layoutContent, "topbar", variables);
  layoutContent = injectComponent(layoutContent, "footer", variables);

  return renderTemplate(layoutContent, variables);
}

function processConditionals(content, variables) {
  // Process if conditions
  var ifRegex = /<!-- @if:(\w+) -->([\s\S]*?)<!-- @endif -->/g;
  var match;
  
  while ((match = ifRegex.exec(content)) !== null) {
    var condition = match[1];
    var conditionalContent = match[2];
    
    // Check if the condition variable exists and is truthy
    if (variables[condition]) {
      // Replace the entire conditional block with just the content
      content = content.replace(match[0], conditionalContent);
    } else {
      // Remove the entire conditional block
      content = content.replace(match[0], "");
    }
  }
  
  return content;
}

function renderTemplate(template, variables) {
  var content = template;
  
  // First process conditionals
  content = processConditionals(content, variables);
  
  // Then replace variables
  for (var key in variables) {
    if (typeof variables[key] === "string" || typeof variables[key] === "number") {
      content = content.replace(
        new RegExp("{{" + key + "}}", "g"),
        variables[key]
      );
    }
  }
  
  return content;
}

function renderPage(pageName, req) {
  var pagePath = path.join(process.cwd(), "src/pages", pageName + ".html");
  var content = readFileSync(pagePath);

  if (!content) {
    return null;
  }

  var meta = parseMetaTags(content);
  var variables = {
    title: meta.title || "10x CMS",
    currentYear: new Date().getFullYear(),
    // Add authentication status if request object is provided
    isAuthenticated: req && req.cookies && req.cookies.auth ? true : false
  };

  content = content
    .split("\n")
    .filter(function (line) {
      return !line.trim().startsWith("<!-- @");
    })
    .join("\n");

  if (meta.layout) {
    content = renderWithLayout(content, meta.layout, variables);
  }

  return content;
}

module.exports = {
  renderPage: renderPage,
  renderTemplate: renderTemplate,
  renderWithLayout: renderWithLayout,
  parseMetaTags: parseMetaTags
};
