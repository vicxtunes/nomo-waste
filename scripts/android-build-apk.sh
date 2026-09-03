#!/usr/bin/env bash
# Build a debug APK from the current web build. Regenerates android/ if absent
# (it is gitignored). Requires scripts/android-install-toolchain.sh to have run.
set -eo pipefail
cd "$(dirname "$0")/.."

export JAVA_HOME="${JAVA_HOME:-/usr/local/sdkman/candidates/java/17.0.13-tem}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

GRADLE_VER="8.2.1"
GRADLE_ZIP="gradle-${GRADLE_VER}-bin.zip"

echo ">> web build (static export -> out/)"
npm run build

if [ ! -d android ]; then
  echo ">> npx cap add android"
  npx --yes cap add android
fi

echo ">> npx cap sync android"
npx cap sync android

# Codespaces/CI: the wrapper's download of the Gradle dist is slow and times
# out. Fetch it once with curl and point the wrapper at the local copy.
if [ ! -f "android/gradle/wrapper/$GRADLE_ZIP" ]; then
  echo ">> fetching Gradle $GRADLE_VER distribution"
  curl -sSL --retry 5 --retry-all-errors -o "android/gradle/wrapper/$GRADLE_ZIP" \
    "https://services.gradle.org/distributions/$GRADLE_ZIP"
fi
cat > android/gradle/wrapper/gradle-wrapper.properties <<EOF
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=$GRADLE_ZIP
networkTimeout=60000
validateDistributionUrl=false
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
EOF

mkdir -p "$HOME/.gradle"
grep -q 'org.gradle.jvmargs' "$HOME/.gradle/gradle.properties" 2>/dev/null || cat >> "$HOME/.gradle/gradle.properties" <<'GP'
org.gradle.jvmargs=-Xmx1536m -Dfile.encoding=UTF-8
org.gradle.workers.max=2
org.gradle.daemon=false
GP

echo ">> gradle assembleDebug"
( cd android && ./gradlew --no-daemon assembleDebug )

cp android/app/build/outputs/apk/debug/app-debug.apk ./nomo-waste-debug.apk
echo ">> APK: $(pwd)/nomo-waste-debug.apk"
