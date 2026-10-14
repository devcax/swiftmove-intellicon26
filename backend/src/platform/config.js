/**
 * The only place that reads process.env. Loads .env, parses it once, and exports the frozen
 * config. On a bad setting it prints the names of the bad variables (never the values) and
 * exits with code 1.
 */
require('dotenv').config();
const { parseConfig, ConfigError } = require('./configSchema');

function loadConfig() {
  try {
    return parseConfig(process.env);
  } catch (err) {
    if (!(err instanceof ConfigError)) throw err;
    // The logger needs config, so it cannot be used here.
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  }
}

module.exports = loadConfig();
