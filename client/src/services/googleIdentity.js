const GOOGLE_CLIENT_ID =
  "767583378958-25g3o975bq88kraaij2o8f9eshcim76q.apps.googleusercontent.com";

const GOOGLE_GSI_SRC =
  "https://accounts.google.com/gsi/client";

let scriptPromise =
  null;

// =========================================================
// LOAD GOOGLE IDENTITY SERVICES
// =========================================================

export const loadGoogleIdentity =
  () => {
    if (
      window.google?.accounts
        ?.oauth2
    ) {
      return Promise.resolve(
        window.google
      );
    }

    if (
      scriptPromise
    ) {
      return scriptPromise;
    }

    scriptPromise =
      new Promise(
        (
          resolve,
          reject
        ) => {
          const existing =
            document.querySelector(
              `script[src="${GOOGLE_GSI_SRC}"]`
            );

          const finish =
            () => {
              if (
                window.google
                  ?.accounts
                  ?.oauth2
              ) {
                resolve(
                  window.google
                );
              } else {
                reject(
                  new Error(
                    "Google Identity Services failed to initialize."
                  )
                );
              }
            };

          if (
            existing
          ) {
            if (
              window.google
                ?.accounts
                ?.oauth2
            ) {
              finish();

              return;
            }

            existing.addEventListener(
              "load",
              finish,
              {
                once:
                  true,
              }
            );

            existing.addEventListener(
              "error",
              () => {
                reject(
                  new Error(
                    "Google Identity Services failed to load."
                  )
                );
              },
              {
                once:
                  true,
              }
            );

            return;
          }

          const script =
            document.createElement(
              "script"
            );

          script.src =
            GOOGLE_GSI_SRC;

          script.async =
            true;

          script.defer =
            true;

          script.onload =
            finish;

          script.onerror =
            () => {
              reject(
                new Error(
                  "Google Identity Services failed to load."
                )
              );
            };

          document.head.appendChild(
            script
          );
        }
      );

    return scriptPromise;
  };

// =========================================================
// MAP GIS POPUP ERRORS
// =========================================================

const createGoogleError =
  (
    type
  ) => {
    const error =
      new Error(
        type ===
          "popup_closed"
          ? "Sign-in window was closed."
          : type ===
              "popup_failed_to_open"
            ? "Google sign-in window could not be opened."
            : "Google sign-in failed."
      );

    if (
      type ===
      "popup_closed"
    ) {
      error.code =
        "auth/popup-closed-by-user";
    } else if (
      type ===
      "popup_failed_to_open"
    ) {
      error.code =
        "auth/popup-blocked";
    } else {
      error.code =
        "auth/google-sign-in-failed";
    }

    return error;
  };

// =========================================================
// REQUEST GOOGLE ACCESS TOKEN
//
// This uses Google's own Identity Services popup instead of
// Firebase's popup resolver/window.closed polling path.
// =========================================================

export const requestGoogleAccessToken =
  async () => {
    const google =
      await loadGoogleIdentity();

    return new Promise(
      (
        resolve,
        reject
      ) => {
        const tokenClient =
          google.accounts.oauth2
            .initTokenClient({
              client_id:
                GOOGLE_CLIENT_ID,

              scope:
                "openid email profile",

              callback:
                (
                  response
                ) => {
                  if (
                    response.error
                  ) {
                    const error =
                      new Error(
                        response.error_description ||
                          response.error
                      );

                    error.code =
                      "auth/google-sign-in-failed";

                    reject(
                      error
                    );

                    return;
                  }

                  if (
                    !response.access_token
                  ) {
                    const error =
                      new Error(
                        "Google did not return an access token."
                      );

                    error.code =
                      "auth/google-sign-in-failed";

                    reject(
                      error
                    );

                    return;
                  }

                  resolve(
                    response.access_token
                  );
                },

              error_callback:
                (
                  errorResponse
                ) => {
                  reject(
                    createGoogleError(
                      errorResponse
                        ?.type ||
                        "unknown"
                    )
                  );
                },
            });

        /*
          Empty prompt means we do not force Google's account
          chooser on every login. Google can reuse the current
          account/session when appropriate.
        */

        tokenClient
          .requestAccessToken({
            prompt:
              "",
          });
      }
    );
  };

export {
  GOOGLE_CLIENT_ID,
};
