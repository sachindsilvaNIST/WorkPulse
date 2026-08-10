#!/bin/bash
# Builds WorkPulse.app and a distributable .dmg for macOS.
# Must run on macOS (needs hdiutil + optionally codesign). Usage:
#   ./build-dmg.sh <rid: osx-x64|osx-arm64> <version>
set -euo pipefail

RID="${1:?Usage: build-dmg.sh <osx-x64|osx-arm64> <version>}"
VERSION="${2:?Usage: build-dmg.sh <osx-x64|osx-arm64> <version>}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PUBLISH_DIR="$ROOT_DIR/publish/$RID"
APP_DIR="$ROOT_DIR/publish/WorkPulse.app"
DIST_DIR="$ROOT_DIR/dist"

echo "==> Publishing $RID (Release, self-contained)"
dotnet publish "$ROOT_DIR/WorkPulse/WorkPulse.csproj" \
    -c Release -r "$RID" --self-contained true \
    -p:PublishSingleFile=true \
    -o "$PUBLISH_DIR"

echo "==> Assembling WorkPulse.app"
rm -rf "$APP_DIR"
mkdir -p "$APP_DIR/Contents/MacOS" "$APP_DIR/Contents/Resources"

cp "$PUBLISH_DIR/WorkPulse" "$APP_DIR/Contents/MacOS/WorkPulse"
chmod +x "$APP_DIR/Contents/MacOS/WorkPulse"
cp "$ROOT_DIR/WorkPulse/Assets/app-icon.icns" "$APP_DIR/Contents/Resources/app-icon.icns"

sed "s/\${VERSION}/$VERSION/g" "$ROOT_DIR/packaging/macos/Info.plist" > "$APP_DIR/Contents/Info.plist"

# Ad-hoc signing avoids the "app is damaged" Gatekeeper error on download.
# It does NOT remove the "unidentified developer" prompt — that needs a paid
# Apple Developer ID certificate + notarization (see packaging/macos/README.md).
if command -v codesign >/dev/null 2>&1; then
    echo "==> Ad-hoc signing"
    codesign --force --deep --sign - "$APP_DIR"
fi

echo "==> Creating .dmg"
mkdir -p "$DIST_DIR"
DMG_PATH="$DIST_DIR/WorkPulse-$VERSION-$RID.dmg"
rm -f "$DMG_PATH"
hdiutil create -volname "WorkPulse" -srcfolder "$APP_DIR" -ov -format UDZO "$DMG_PATH"

echo "==> Done: $DMG_PATH"
