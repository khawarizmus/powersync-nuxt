import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
} from "@powersync/web";
import { connect } from "./ConnectionManager";

export interface Credentials {
  token: string;
  endpoint: string;
}

export class TokenConnector implements PowerSyncBackendConnector {
  async fetchCredentials() {
    const value = localStorage.getItem("powersync_credentials");
    if (value == null) {
      return null;
    }
    return JSON.parse(value);
  }

  async uploadData(database: AbstractPowerSyncDatabase) {
    // Discard any data
    const tx = await database.getNextCrudTransaction();
    await tx?.complete();
  }

  async signIn(credentials: Credentials) {
    console.log("signIn", credentials);
    validateSecureContext(credentials.endpoint);
    checkJWT(credentials.token);
    console.log("all good");
    try {
      console.log("setting credentials");
      localStorage.setItem(
        "powersync_credentials",
        JSON.stringify(credentials)
      );
      console.log("connecting");
      await connect();
      console.log("connected");
    } catch (e) {
      console.error("error", e);
      this.clearCredentials();
      throw e;
    }
  }

  hasCredentials() {
    return localStorage.getItem("powersync_credentials") != null;
  }

  clearCredentials() {
    localStorage.removeItem("powersync_credentials");
  }
}

function validateSecureContext(url: string) {
  if (!location.href.startsWith("https:")) {
    return;
  }
  const parsedUrl = new URL(url);
  const secure =
    parsedUrl.protocol === "https:" ||
    parsedUrl.hostname === "localhost" ||
    parsedUrl.hostname === "127.0.0.1" ||
    parsedUrl.hostname === "::1";
  if (!secure) {
    throw new Error(`Cannot connect to http endpoints from the hosted diagnostics app.
Run either the PowerSync endpoint on http://localhost, or the diagnostics app on http://localhost.`);
  }
}

function checkJWT(token: string) {
  // Split the token into parts by "."
  const parts = token.split(".");

  // Check that it has exactly three parts (header, payload, signature)
  if (parts.length !== 3) {
    throw new Error(
      `Token must be a JWT: Expected 3 parts, got ${parts.length}`
    );
  }

  // Check that each part is base64 or base64url encoded
  const base64UrlRegex = /^[A-Za-z0-9-_]+$/;

  const isBase64 = parts.every((part) => base64UrlRegex.test(part));
  if (!isBase64) {
    throw new Error(`Token must be a JWT: Not all parts are base64 encoded`);
  }
}
