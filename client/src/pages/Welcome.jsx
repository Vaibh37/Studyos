import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Mail,
  Moon,
  Sun,
  UserRound,
} from "lucide-react";

import {
  Link,
} from "react-router";

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

  const [
    name,
    setName,
  ] = useState("");

  const [
    email,
    setEmail,
  ] = useState("");

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

  const [
    error,
    setError,
  ] = useState("");

  const [
    theme,
    setTheme,
  ] = useState(() => {
    return localStorage.getItem(
      "studyos_theme"
    ) === "light"
      ? "light"
      : "dark";
  });

  useEffect(() => {
    const isLight =
      theme === "light";

    document.body.classList.toggle(
      "light-theme",
      isLight
    );

    localStorage.setItem(
      "studyos_theme",
      theme
    );

    window.dispatchEvent(
      new Event(
        "studyos-theme-updated"
      )
    );
  }, [
    theme,
  ]);

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

  return (
    <main className="auth-v2-page">

      <div
        className="auth-v2-grid"
        aria-hidden="true"
      />

      <header className="auth-v2-topbar">

        <Link
          to="/"
          className="auth-v2-home-link"
        >
          <ArrowLeft
            size={15}
          />

          Back to StudyOS
        </Link>

        <button
          type="button"
          className="auth-v2-theme-toggle"
          aria-label={
            theme === "dark"
              ? "Switch to light theme"
              : "Switch to dark theme"
          }
          onClick={() =>
            setTheme(
              (current) =>
                current === "dark"
                  ? "light"
                  : "dark"
            )
          }
        >
          {theme === "dark" ? (
            <Sun
              size={17}
            />
          ) : (
            <Moon
              size={17}
            />
          )}
        </button>

      </header>

      <section className="auth-v2-layout">

        <div className="auth-v2-intro">

          <div className="auth-v2-brand">

            <span className="auth-v2-brand-mark">
              <GraduationCap
                size={21}
              />
            </span>

            <span>
              StudyOS
            </span>

          </div>

          <div className="auth-v2-intro-copy">

            <span className="auth-v2-eyebrow">
              YOUR STUDY SYSTEM
            </span>

            <h1>
              Turn plans into
              <span>
                actual progress.
              </span>
            </h1>

            <p>
              Organize the work,
              focus on what matters,
              and keep a clear view
              of where your study time
              actually goes.
            </p>

          </div>

          <div className="auth-v2-flow">
            <span>
              Plan
            </span>

            <span
              aria-hidden="true"
            >
              →
            </span>

            <span>
              Focus
            </span>

            <span
              aria-hidden="true"
            >
              →
            </span>

            <span>
              Review
            </span>
          </div>

          <div className="auth-v2-intro-note">

            <span className="auth-v2-status-dot" />

            Guest mode is available.
            No account required to start.

          </div>

        </div>

        <div className="auth-v2-panel-wrap">

          <div className="auth-v2-panel">

            {!emailMode ? (
              <>

                <div className="auth-v2-panel-heading">

                  <span className="auth-v2-panel-kicker">
                    ENTER STUDYOS
                  </span>

                  <h2>
                    Choose how you want
                    to continue.
                  </h2>

                  <p>
                    Sign in for cloud
                    persistence, or start
                    locally as a guest.
                  </p>

                </div>

                {error && (
                  <div className="auth-v1-error">
                    {error}
                  </div>
                )}

                <div className="auth-v2-provider-stack">

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

                </div>

                <div className="auth-v1-divider">

                  <span />

                  <small>
                    or continue locally
                  </small>

                  <span />

                </div>

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

                  <ArrowRight
                    size={16}
                  />

                </button>

                <p className="auth-v1-guest-note">
                  Guest data stays on
                  this device. You can
                  sign in later and move
                  your local StudyOS data
                  into your account.
                </p>

              </>
            ) : (
              <>

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
                  <ArrowLeft
                    size={14}
                  />

                  All sign-in options
                </button>

                <div className="auth-v2-panel-heading auth-v2-panel-heading-email">

                  <span className="auth-v2-panel-kicker">
                    EMAIL
                  </span>

                  <h2>
                    {emailMode ===
                    "register"
                      ? "Create your account."
                      : "Welcome back."}
                  </h2>

                  <p>
                    {emailMode ===
                    "register"
                      ? "Create a StudyOS account and keep your study history in the cloud."
                      : "Sign in to continue to your StudyOS workspace."}
                  </p>

                </div>

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
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
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

                    {!working && (
                      <ArrowRight
                        size={16}
                      />
                    )}

                  </button>

                </form>

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

          <p className="auth-v2-legal">
            By continuing, you agree
            to the{" "}

            <Link to="/terms">
              Terms
            </Link>

            {" "}and acknowledge the{" "}

            <Link to="/privacy">
              Privacy Policy
            </Link>.
          </p>

        </div>

      </section>

    </main>
  );
}

export default Welcome;
