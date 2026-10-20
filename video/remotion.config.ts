import { Config } from "@remotion/cli/config";

// Use the Chromium that is already installed instead of downloading one.
if (process.env.REMOTION_BROWSER) Config.setBrowserExecutable(process.env.REMOTION_BROWSER);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
