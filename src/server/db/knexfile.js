const path = require("path");

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
       * Enables foreign key constraints on the SQLite connection after creation.
       * @param {object} conn The database connection object.
       * @param {function(): void} cb The callback function to be executed after the command runs.
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
       * Enables foreign key constraints on the SQLite connection after creation.
       * @param {object} conn The database connection object.
       * @param {function(): void} cb The callback function to be executed after the command runs.
       */
      afterCreate: (conn, cb) => {
        conn.run("PRAGMA foreign_keys = ON", cb);
      },
    },
  },
};