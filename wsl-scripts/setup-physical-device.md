# Running on Physical Android Device

## Steps:

1. **Enable Developer Options on your Android device:**
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Developer Options will be enabled

2. **Enable USB Debugging:**
   - Go to Settings > Developer Options
   - Enable "USB Debugging"

3. **Connect your device via USB**

4. **Check if device is detected:**

   ```bash
   wsl bash -c 'export ANDROID_HOME=$HOME/Android/Sdk && export PATH=$PATH:$ANDROID_HOME/platform-tools && adb devices'
   ```

5. **Run the app:**
   ```bash
   wsl bash ./run-android.sh
   ```

## Alternative: Use Android Studio on Windows

Since WSL doesn't support KVM for emulators, you can:

1. Install Android Studio on Windows (not WSL)
2. Use the Android SDK path: `C:\Users\MD SAHIL HASNAIN\AppData\Local\Android\Sdk`
3. Run the app from Windows PowerShell:
   ```powershell
   npm run mobile:android
   ```
