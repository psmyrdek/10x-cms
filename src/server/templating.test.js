var expect = require("chai").expect;
var path = require("path");
var templating = require("./templating");

describe("Templating Engine", function () {
  describe("parseMetaTags", function () {
    it("should parse meta tags from content", function () {
      var content = [
        "<!-- @title:Home Page -->",
        "<!-- @layout:main -->",
        "Some content",
      ].join("\n");

      var meta = templating.parseMetaTags(content);
      expect(meta).to.be.an("object");
      expect(meta.title).to.equal("Home Page");
      expect(meta.layout).to.equal("main");
    });

    it("should return empty object when no meta tags", function () {
      var content = "Just some content\nwithout meta tags";
      var meta = templating.parseMetaTags(content);
      expect(meta).to.be.an("object");
      expect(Object.keys(meta)).to.have.length(0);
    });
  });

  describe("renderTemplate", function () {
    it("should replace variables in template", function () {
      var template = "Hello {{name}}! The year is {{year}}.";
      var variables = {
        name: "John",
        year: 2014,
      };

      var result = templating.renderTemplate(template, variables);
      expect(result).to.equal("Hello John! The year is 2014.");
    });

    it("should process conditional blocks correctly", function () {
      var template = [
        "Start",
        "<!-- @if:showGreeting -->",
        "Hello!",
        "<!-- @endif -->",
        "End",
      ].join("\n");

      var resultTrue = templating.renderTemplate(template, {
        showGreeting: true,
      });
      var resultFalse = templating.renderTemplate(template, {
        showGreeting: false,
      });

      expect(resultTrue).to.include("Hello!");
      expect(resultFalse).to.not.include("Hello!");
    });
  });
});