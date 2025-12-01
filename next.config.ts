import type { NextConfig } from "next";

// Suppress the [DEP0169] warning from Node.js
// This warning is likely caused by a dependency (e.g. Supabase or Next.js internals) using url.parse()
// We suppress it here to keep the build logs clean as we have verified our own code uses new URL()
if (typeof process !== 'undefined') {
  const originalEmit = process.emit;
  // @ts-ignore
  process.emit = function (name, data, ...args) {
    if (
      name === 'warning' &&
      typeof data === 'object' &&
      data &&
      'name' in data &&
      data.name === 'DeprecationWarning' &&
      // @ts-ignore
      data.message && typeof data.message === 'string' && data.message.includes('url.parse()')
    ) {
      return false;
    }
    // @ts-ignore
    return originalEmit.apply(process, [name, data, ...args]);
  };
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
