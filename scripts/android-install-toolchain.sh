#!/usr/bin/env bash
# One-time: install the JDK + Android SDK needed to build the APK on Linux
# (a Codespace / CI box). No emulator, no iOS. Idempotent.
set -eo pipefail

JDK_ID="17.0.13-tem"          # Gradle 8.2.1 (Capacitor 6 template) needs JDK 17
ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
CMDLINE_TOOLS_ZIP="commandlinetools-linux-11076708_latest.zip"

echo ">> JDK $JDK_ID via sdkman"
set +u; source /usr/local/sdkman/bin/sdkman-init.sh; set -u
sdk install java "$JDK_ID" < /dev/null || true

echo ">> Android SDK at $ANDROID_HOME"
mkdir -p "$ANDROID_HOME/cmdline-tools"
if [ ! -d "$ANDROID_HOME/cmdline-tools/latest/bin" ]; then
  tmp="$(mktemp -d)"
  curl -sSL --retry 5 --retry-all-errors -o "$tmp/cmdtools.zip" \
    "https://dl.google.com/android/repository/$CMDLINE_TOOLS_ZIP"
  unzip -q "$tmp/cmdtools.zip" -d "$tmp"
  mkdir -p "$ANDROID_HOME/cmdline-tools/latest"
  mv "$tmp"/cmdline-tools/* "$ANDROID_HOME/cmdline-tools/latest/"
  rm -rf "$tmp"
fi

export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
yes | sdkmanager --licenses >/dev/null 2>&1 || true
sdkmanager --install "platform-tools" "platforms;android-34" "build-tools;34.0.0"

echo ">> done. Add to your shell:"
echo "   export JAVA_HOME=/usr/local/sdkman/candidates/java/$JDK_ID"
echo "   export ANDROID_HOME=$ANDROID_HOME"
