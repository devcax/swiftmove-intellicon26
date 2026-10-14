/**
 * Where the built-in policies come from when the policy tables cannot be read. The policies module registers its seeds at startup; the
 * store only asks. Kept apart so neither imports the other.
 */
let provider = () => [];

const setSeedProvider = (fn) => { provider = fn; };
const builtInSeeds = () => provider();

module.exports = { setSeedProvider, builtInSeeds };
