var fs = require("fs");
var path = require("path");

/**
 * Reads a file synchronously.
 * @param {string} filepath - The path to the file.
 * @returns {string|null} The file content as a string, or null if an error occurred.
 */
function readFileSync(filepath) {
  try {
    return fs.readFileSync(filepath, "utf8");
  } catch (err) {
    console.error("Error reading file:", filepath, err);
    return null;
  }
}

/**
 * Parses meta tags from a string.
 * @param {string} content - The string to parse.
 * @returns {object} An object containing the meta tags.
 */
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

/**
 * Injects a component into a string.
 * @param {string} content - The string to inject the component into.
 * @param {string} componentName - The name of the component to inject.
 * @param {object} variables - The variables to pass to the component.
 * @returns {string} The string with the component injected.
 */
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

/**
 * Renders content with a layout.
 * @param {string} content - The content to render.
 * @param {string} layoutName - The name of the layout to use.
 * @param {object} variables - The variables to pass to the layout.
 * @returns {string} The rendered content.
 */
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

/**
 * Processes conditional blocks in the content based on the provided variables.
 *
 * @param {string} content - The content string to process.
 * @param {object} variables - An object containing variables used in the conditional blocks.
 * @returns {string} The processed content with conditional blocks evaluated.
 */
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

/**
 * Renders a template string with the given variables.
 * @param {string} template - The template string.
 * @param {object} variables - An object containing the variables to replace in the template.
 * @returns {string} The rendered template.
 */
function renderTemplate(template, variables) {
  var content = template;

  // First process conditionals
  content = processConditionals(content, variables);

  // Then replace variables
  for (var key in variables) {
    if (
      typeof variables[key] === "string" ||
      typeof variables[key] === "number"
    ) {
      content = content.replace(
        new RegExp("{{" + key + "}}", "g"),
        variables[key]
      );
    }
  }

  return content;
}

/**
 * Renders a page.
 * @param {string} pageName - The name of the page to render.
 * @param {object} req - The request object.
 * @param {object} customVariables - The custom variables to pass to the page.
 * @returns {string|null} The rendered page, or null if an error occurred.
 */
function renderPage(pageName, req, customVariables) {
  var pagePath = path.join(process.cwd(), "src/pages", pageName + ".html");
  var content = readFileSync(pagePath);

  if (!content) {
    return null;
  }

  var meta = parseMetaTags(content);
  var variables = {
    title: meta.title || "10xCMS",
    currentYear: new Date().getFullYear(),
    // Add authentication status if request object is provided
    isAuthenticated: req && req.cookies && req.cookies.auth ? true : false,
  };

  // Merge custom variables if provided
  if (customVariables) {
    for (var key in customVariables) {
      variables[key] = customVariables[key];
    }
  }

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
  parseMetaTags: parseMetaTags,
};