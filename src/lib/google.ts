declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (opts: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
        };
      };
    };
  }
}

const SCOPE = "https://www.googleapis.com/auth/youtube.readonly";

export function loadGoogleIdentity() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector("script[data-gis]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.gis = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google-Login konnte nicht geladen werden"));
    document.head.appendChild(script);
  });
}

export async function requestYoutubeToken(clientId: string) {
  await loadGoogleIdentity();
  if (!window.google?.accounts.oauth2) {
    throw new Error("Google Identity fehlt");
  }
  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error || "Google-Anmeldung abgebrochen"));
      },
    });
    client.requestAccessToken({ prompt: "consent" });
  });
}
