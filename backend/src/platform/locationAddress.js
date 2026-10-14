const { ExternalServiceError, NotFoundError, RateLimitError } = require('./errors');

// Share the provider budget across pickup/delivery lookups; cache repeated pins.
function createAddressLookup({ fetchImpl = (...args) => fetch(...args), intervalMs = 1100 } = {}) {
  const cache = new Map();
  const pending = new Map();
  let queue = Promise.resolve();
  let nextRequestAt = 0;

  return async function lookup({ latitude, longitude }) {
    const key = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.result;
    if (pending.has(key)) return pending.get(key);
    if (pending.size >= 20) throw new RateLimitError('Address lookup is busy. Please retry shortly.');
    const task = queue.then(async () => {
      const wait = nextRequestAt - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      nextRequestAt = Date.now() + intervalMs;
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.search = new URLSearchParams({ lat: String(latitude), lon: String(longitude), format: 'jsonv2', 'accept-language': 'en', zoom: '18' }).toString();
      let data;
      try {
        const response = await fetchImpl(url, { headers: { 'User-Agent': 'SwiftMove-Logistics/1.0', Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`Geocoder status ${response.status}`);
        data = await response.json();
      } catch (cause) {
        throw new ExternalServiceError('Could not find the address. Please retry or choose another pin.', { expose: true, cause });
      }
      if (typeof data?.display_name !== 'string' || !data.display_name.trim()) {
        throw new NotFoundError('No address was found here. Please choose a nearby pin.');
      }
      // Location names are limited to 180 characters in storage.
      const parts = data.display_name.trim().split(',').map((part) => part.trim()).filter(Boolean);
      while (parts.join(', ').length > 180 && parts.length > 1) parts.splice(parts.length - 2, 1);
      const result = { address: parts.join(', ').slice(0, 180) };
      if (cache.size >= 1000) cache.delete(cache.keys().next().value);
      cache.set(key, { result, expires: Date.now() + 86400000 });
      return result;
    });
    queue = task.catch(() => {});
    pending.set(key, task);
    try { return await task; } finally { pending.delete(key); }
  };
}

module.exports = { createAddressLookup, lookupAddress: createAddressLookup() };
