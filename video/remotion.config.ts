import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// The site is dark and the type is thin; anything below this and the hairlines
// start to crawl on a compressed upload.
Config.setCrf(18);
