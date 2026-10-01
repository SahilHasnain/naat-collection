import { Account, Client, IdTokenProvider, OAuthProvider } from "react-native-appwrite";
import { Platform } from "react-native";
import { appwriteConfig } from "../config/appwrite";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const brand = require("../brand.config.js");

const client = new Client()
  .setEndpoint(appwriteConfig.endpoint)
  .setProject(appwriteConfig.projectId);

const account = new Account(client);

export const googleWebClientId = brand.auth.googleWebClientId as string;

export const authService = {
  getCurrentUser() {
    return account.get();
  },

  async signInWithGoogle() {
    if (Platform.OS === "web") {
      const redirectUrl = window.location.origin;
      const loginUrl = account.createOAuth2Session({
        provider: OAuthProvider.Google,
        success: redirectUrl,
        failure: redirectUrl,
      });
      window.location.assign(String(loginUrl));
      return;
    }

    const { GoogleSignin, isSuccessResponse } = await import(
      "@react-native-google-signin/google-signin"
    );

    GoogleSignin.configure({ webClientId: googleWebClientId });
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!isSuccessResponse(response) || !response.data.idToken) {
      throw new Error("Google sign-in did not return an ID token.");
    }

    await account.createIdTokenSession({
      provider: IdTokenProvider.Google,
      idToken: response.data.idToken,
    });
  },

  async signOut() {
    await account.deleteSession("current");
  },
};
