import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const nextConfig: NextConfig = {
  output: "standalone", 
};

export default withSentryConfig(nextConfig, {
  org: "garmandsk",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,

  // tunnelRoute: "/monitoring",

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  }
});