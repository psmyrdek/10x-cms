/**
 * @param {import("knex").Knex} knex
 */
exports.up = function (knex) {
  return knex.schema
    .createTable("collections", function (table) {
      table.string("id").primary();
      table.string("name").notNullable();
      table.json("schema").notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
    })
    .createTable("items", function (table) {
      table.string("id").primary();
      table.string("collection_id").notNullable();
      table.json("data").notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table
        .foreign("collection_id")
        .references("collections.id")
        .onDelete("CASCADE");
    })
    .createTable("webhooks", function (table) {
      table.string("id").primary();
      table.string("collection_id").notNullable();
      table.string("url").notNullable();
      table.json("events").notNullable();
      table.timestamp("created_at").defaultTo(knex.fn.now());
      table.timestamp("updated_at").defaultTo(knex.fn.now());
      table
        .foreign("collection_id")
        .references("collections.id")
        .onDelete("CASCADE");
    });
};

/**
 * @param {import("knex").Knex} knex
 */
exports.down = function (knex) {
  return knex.schema
    .dropTable("webhooks")
    .dropTable("items")
    .dropTable("collections");
};