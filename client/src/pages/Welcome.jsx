import { useState } from "react";

import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Mail,
  UserRound,
} from "lucide-react";

import {
  useAuth,
} from "../context/AuthContext";

function Welcome() {
  const {
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    continueAsGuest,
  } = useAuth();

  const [
    emailMode,
    setEmailMode,
  ] = useState(null);

  // null = main screen
  // login = email login
  // register = email register

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    working,
    setWorking,
  ] = useState(false);

  const [error, setError] =
    useState("");

  // =========================================
  // FRIENDLY ERRORS
  // =========================================

  const getFriendlyError = (
    firebaseError
  ) => {
    const code =
      firebaseError?.code || "";

    if (
      code.includes(
        "popup-closed"
      )
    ) {
      return "Sign-in window was closed.";
    }

    if (
      code.includes(
        "email-already-in-use"
      )
    ) {
      return "An account already exists with this email.";
    }

    if (
      code.includes(
        "invalid-credential"
      )
    ) {
      return "Email or password is incorrect.";
    }

    if (
      code.includes(
        "invalid-email"
      )
    ) {
      return "Enter a valid email address.";
    }

    if (
      code.includes(
        "weak-password"
      )
    ) {
      return "Choose a stronger password.";
    }

    return (
      firebaseError?.message ||
      "Something went wrong."
    );
  };

  // =========================================
  // GOOGLE
  // =========================================

  const handleGoogle =
    async () => {
      try {
        setWorking(true);
        setError("");

        await loginWithGoogle();
      } catch (firebaseError) {
        console.error(
          "Google login failed:",
          firebaseError
        );

        setError(
          getFriendlyError(
            firebaseError
          )
        );
      } finally {
        setWorking(false);
      }
    };

  // =========================================
  // EMAIL LOGIN / REGISTER
  // =========================================

  const handleEmail =
    async (event) => {
      event.preventDefault();

      if (working) {
        return;
      }

      try {
        setWorking(true);
        setError("");

        if (
          emailMode ===
          "register"
        ) {
          if (!name.trim()) {
            throw new Error(
              "Enter your name."
            );
          }

          if (
            password.length < 6
          ) {
            throw new Error(
              "Password must be at least 6 characters."
            );
          }

          await registerWithEmail({
            name,
            email,
            password,
          });
        } else {
          await loginWithEmail({
            email,
            password,
          });
        }
      } catch (firebaseError) {
        console.error(
          "Email auth failed:",
          firebaseError
        );

        setError(
          getFriendlyError(
            firebaseError
          )
        );
      } finally {
        setWorking(false);
      }
    };

  // =========================================
  // GUEST
  // =========================================

  const handleGuest =
    async () => {
      try {
        setWorking(true);
        setError("");

        await continueAsGuest();
      } catch (guestError) {
        console.error(
          "Guest mode failed:",
          guestError
        );

        setError(
          "Couldn't start guest mode."
        );
      } finally {
        setWorking(false);
      }
    };

  // =========================================
  // UI
  // =========================================

  return (
    <main className="auth-v1-page">

      <div className="auth-v1-bg auth-v1-bg-one" />
      <div className="auth-v1-bg auth-v1-bg-two" />

      <section className="auth-v1-shell">

        {/* LOGO */}

        <div className="auth-v1-brand">

          <div className="auth-v1-logo">
            <GraduationCap
              size={23}
            />
          </div>

          <span>
            StudyOS
          </span>

        </div>

        {/* HERO */}

        <div className="auth-v1-copy">

          <span className="auth-v1-eyebrow">
            YOUR STUDY SYSTEM
          </span>

          <h1>
            Study without
            the chaos.
          </h1>

          <p>
            Tasks, notes, Focus,
            calendar and progress
            in one place.
          </p>

        </div>

        {/* CARD */}

        <div className="auth-v1-card">

          {!emailMode ? (
            <>

              <h2>
                Welcome to StudyOS
              </h2>

              <p className="auth-v1-card-copy">
                Choose how you want
                to continue.
              </p>

              {error && (
                <div className="auth-v1-error">
                  {error}
                </div>
              )}

              {/* GOOGLE */}

              <button
                type="button"
                className="auth-v1-provider"
                disabled={
                  working
                }
                onClick={
                  handleGoogle
                }
              >

                <span className="auth-v1-provider-icon auth-v1-google">
                  G
                </span>

                <span>
                  Continue with Google
                </span>

                <ArrowRight
                  size={16}
                />

              </button>

              {/* X */}

              <button
                type="button"
                className="auth-v1-provider auth-v1-provider-disabled"
                disabled
              >

                <span className="auth-v1-provider-icon auth-v1-x">
                  𝕏
                </span>

                <span>
                  Continue with X
                </span>

                <small>
                  Soon
                </small>

              </button>

              {/* EMAIL */}

              <button
                type="button"
                className="auth-v1-provider"
                disabled={
                  working
                }
                onClick={() => {
                  setError("");

                  setEmailMode(
                    "login"
                  );
                }}
              >

                <span className="auth-v1-provider-icon">
                  <Mail
                    size={16}
                  />
                </span>

                <span>
                  Continue with Email
                </span>

                <ArrowRight
                  size={16}
                />

              </button>

              {/* DIVIDER */}

              <div className="auth-v1-divider">

                <span />

                <small>
                  or
                </small>

                <span />

              </div>

              {/* GUEST */}

              <button
                type="button"
                className="auth-v1-guest"
                disabled={
                  working
                }
                onClick={
                  handleGuest
                }
              >

                <UserRound
                  size={17}
                />

                Continue as Guest

              </button>

              <p className="auth-v1-guest-note">
                Guest data stays on
                this device. Sign in
                later to sync across
                devices.
              </p>

            </>
          ) : (
            <>

              {/* EMAIL SCREEN */}

              <button
                type="button"
                className="auth-v1-back"
                disabled={
                  working
                }
                onClick={() => {
                  setError("");

                  setEmailMode(
                    null
                  );
                }}
              >
                ← Back
              </button>

              <h2>
                {emailMode ===
                "register"
                  ? "Create account"
                  : "Welcome back"}
              </h2>

              <p className="auth-v1-card-copy">

                {emailMode ===
                "register"
                  ? "Create your StudyOS account."
                  : "Sign in to your StudyOS account."}

              </p>

              {error && (
                <div className="auth-v1-error">
                  {error}
                </div>
              )}

              <form
                className="auth-v1-form"
                onSubmit={
                  handleEmail
                }
              >

                {emailMode ===
                  "register" && (
                  <label>

                    Name

                    <input
                      type="text"
                      value={
                        name
                      }
                      disabled={
                        working
                      }
                      placeholder="Your name"
                      autoComplete="name"
                      onChange={(
                        event
                      ) =>
                        setName(
                          event.target
                            .value
                        )
                      }
                    />

                  </label>
                )}

                <label>

                  Email

                  <input
                    type="email"
                    value={
                      email
                    }
                    disabled={
                      working
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event.target
                          .value
                      )
                    }
                  />

                </label>

                <label>

                  Password

                  <div className="auth-v1-password">

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        password
                      }
                      disabled={
                        working
                      }
                      placeholder="••••••••"
                      required
                      autoComplete={
                        emailMode ===
                        "register"
                          ? "new-password"
                          : "current-password"
                      }
                      onChange={(
                        event
                      ) =>
                        setPassword(
                          event.target
                            .value
                        )
                      }
                    />

                    <button
                      type="button"
                      disabled={
                        working
                      }
                      onClick={() =>
                        setShowPassword(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                    >

                      {showPassword ? (
                        <EyeOff
                          size={16}
                        />
                      ) : (
                        <Eye
                          size={16}
                        />
                      )}

                    </button>

                  </div>

                </label>

                <button
                  type="submit"
                  className="auth-v1-submit"
                  disabled={
                    working
                  }
                >

                  {working
                    ? "Please wait..."
                    : emailMode ===
                      "register"
                    ? "Create Account"
                    : "Sign In"}

                </button>

              </form>

              {/* SWITCH LOGIN/REGISTER */}

              <div className="auth-v1-switch">

                {emailMode ===
                "login" ? (
                  <>

                    <span>
                      New to StudyOS?
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setError("");

                        setEmailMode(
                          "register"
                        );
                      }}
                    >
                      Create account
                    </button>

                  </>
                ) : (
                  <>

                    <span>
                      Already have an
                      account?
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setError("");

                        setEmailMode(
                          "login"
                        );
                      }}
                    >
                      Sign in
                    </button>

                  </>
                )}

              </div>

            </>
          )}

        </div>

      </section>

    </main>
  );
}

export default Welcome;