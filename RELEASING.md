# How to release a new version

1. Make your changes and push.
2. When you want new downloads, change `"version"` in `package.json` (for example 1.0.0 → 1.0.1) and push.
3. GitHub tests everything and publishes the new zips as a release. The download links in the README point to the latest release, so they update on their own.

If the version number doesn't change, no new release goes out.
