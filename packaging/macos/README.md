# macOS packaging

`build-dmg.sh` assembles `WorkPulse.app` and a `.dmg` from a Release publish. It must run on
macOS (uses `hdiutil`, optionally `codesign`) — Windows can only cross-compile the raw binary,
not produce a real bundle.

## Local build (on a Mac)

```sh
./packaging/macos/build-dmg.sh osx-arm64 2.7.0   # Apple Silicon
./packaging/macos/build-dmg.sh osx-x64   2.7.0   # Intel
```

Output lands in `dist/WorkPulse-<version>-<rid>.dmg`.

## What "ad-hoc signed" gets you

The script ad-hoc signs the app (`codesign --sign -`) if `codesign` is available. That's enough to
stop macOS from calling the app "damaged" after a browser download, but people opening it for the
first time still see an "unidentified developer" warning — right-click → Open bypasses it once.

## Distributing without that warning (Apple Developer Program, $99/yr)

1. Enroll at https://developer.apple.com/programs/.
2. Create a **Developer ID Application** certificate in Xcode (or via `security`/`altool`) and
   import it into the build machine's keychain.
3. Sign with that identity instead of ad-hoc:
   `codesign --force --deep --options runtime --sign "Developer ID Application: Your Name (TEAMID)" WorkPulse.app`
4. Notarize: `xcrun notarytool submit WorkPulse-<version>.dmg --apple-id ... --team-id ... --password ... --wait`
5. Staple the ticket: `xcrun stapler staple WorkPulse-<version>.dmg`

After that, the dmg opens with no Gatekeeper warning at all.

## CI

`.github/workflows/release.yml` runs this script on `macos-latest` GitHub-hosted runners for both
`osx-arm64` and `osx-x64` whenever a `v*` tag is pushed — no local Mac required to get a build,
though it will still be ad-hoc signed only, unless Developer ID secrets are added to the workflow.
