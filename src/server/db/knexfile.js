const path = require("path");

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: path.join(__dirname, "dev.sqlite3"),
    },
    migrations: {
      directory: path.join(__dirname, "migrations"),
    },
    seeds: {
      directory: path.join(__dirname, "seeds"),
    },
    useNullAsDefault: true,
    pool: {
      /**
       * Runs after a connection is made, enabling foreign keys.
       * @param {any} conn - The database connection object.
       * @param {any} cb - The callback function.
       */
      afterCreate: (conn, cb) => {
        conn.run("PRAGMA foreign_keys = ON", cb);
      },
    },
  },

  test: {
    client: "sqlite3",
    connection: {
      filename: ":memory:",
    },
    migrations: {
      directory: path.join(__dirname, "migrations"),
    },
    seeds: {
      directory: path.join(__dirname, "seeds"),
    },
    useNullAsDefault: true,
  },

  production: {
    client: "sqlite3",
    connection: {
      filename: path.join(__dirname, "prod.sqlite3"),
    },
    migrations: {
      directory: path.join(__dirname, "migrations"),
    },
    seeds: {
      directory: path.join(__dirname, "seeds"),
    },
    useNullAsDefault: true,
    pool: {
      /**
       * Runs after a connection is made, enabling foreign keys.
       * @param {any} conn - The database connection object.
       * @param {any} cb - The callback function.
       */
      afterCreate: (conn, cb) => {
        conn.run("PRAGMA foreign_keys = ON", cb);
      },
    },
  },
};