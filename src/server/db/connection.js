const knex = require("knex");
const config = require("./knexfile");

const environment = process.env.NODE_ENV || "development";
const connectionConfig = config[environment];

/**
 * Database connection instance.
 * @type {knex}
 */
const db = knex(connectionConfig);

module.exports = db;