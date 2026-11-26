
import { useEffect, useRef, useState } from "react";
import {
  Check,
  ClipboardPaste,
  Globe2,
  KeyRound,
  LockKeyhole,
  Plus,
  X,
} from "../icons";

const CODE_LENGTH = 8;
const CODE_PATTERN = /^[0-9A-F]{8}$/;

function cleanCode(raw) {
  const text = String(raw ?? "").toUpperCase();

  const embedded = text.match(
    /(?:^|[^0-9A-F])([0-9A-F]{8})(?=$|[^0-9A-F])/
  );

  return embedded
    ? embedded[1]
    : text.replace(/[^0-9A-F]/g, "").slice(0, CODE_LENGTH);
}

function InviteCodeField({ code, onChange, disabled }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const [hint, setHint] = useState("");

  const value = cleanCode(code);
  const ready = CODE_PATTERN.test(value);



  const setValue = (text) => {
    onChange(cleanCode(text));
    setHint("");
  };

  const pasteCode = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        throw new Error("Clipboard unavailable");
      }

      const pasted = cleanCode(
        await navigator.clipboard.readText()
      );

      if (!pasted) {
        setHint("No invite code found. Try Ctrl+V instead.");
      } else {
        setValue(pasted);
      }
    } catch {
      setHint("Use Ctrl+V to paste your invite code.");
    }

    inputRef.current?.focus();
  };

  const focusInput = () => {
    inputRef.current?.focus();

    const length = inputRef.current?.value.length ?? 0;
    inputRef.current?.setSelectionRange(length, length);
  };

  return (
    <div className="sg3-invite">
      <div className="sg3-field-heading">
        <label htmlFor="sg3-code-input">Your invite code</label>
        <span>8 characters</span>
      </div>

      <div
        className={`sg3-code-boxes${focused ? " is-focused" : ""}${
          ready ? " is-ready" : ""
        }`}
        onClick={focusInput}
      >
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={`sg3-code-slot${
              value[index] ? " is-filled" : ""
            }${
              focused &&
              index === Math.min(value.length, CODE_LENGTH - 1) &&
              !ready
                ? " is-current"
                : ""
            }`}
          >
            {value[index] || "·"}
          </span>
        ))}

        <input
          ref={inputRef}
          id="sg3-code-input"
          className="sg3-code-native"
          type="text"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onPaste={(event) => {
            const text = event.clipboardData?.getData("text");

            if (text) {
              event.preventDefault();
              setValue(text);
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onClick={focusInput}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={CODE_LENGTH}
          disabled={disabled}
          aria-describedby="sg3-code-help"
        />
      </div>

      <div
        className="sg3-code-assist"
        id="sg3-code-help"
        aria-live="polite"
      >
        <span>
          {hint ||
            (ready
              ? "Ready to try joining"
              : "Enter the code your friend shared")}
        </span>

        <span className={ready ? "sg3-code-valid" : ""}>
          {ready && <Check size={13} aria-hidden="true" />}
          {value.length}/{CODE_LENGTH}
        </span>
      </div>

      <button
        type="button"
        className="sg3-paste"
        onClick={pasteCode}
        disabled={disabled}
      >
        <ClipboardPaste size={16} aria-hidden="true" />
        Paste from clipboard
      </button>
    </div>
  );
}


export default function GroupActions({
  inviteCode,
  setInviteCode,
  joining,
  joinGroup,
  groupName,
  setGroupName,
  groupDescription,
  setGroupDescription,
  groupVisibility,
  setGroupVisibility,
  creating,
  createGroup,
  error,
  clearError,
}) {
  const dialogRef = useRef(null);

  const [mode, setMode] = useState("join");

  const busy = joining || creating;

  const readyToJoin = CODE_PATTERN.test(
    cleanCode(inviteCode)
  );

  const readyToCreate =
    groupName.trim().length >= 2;

  const open = (next) => {
    clearError?.();

    setMode(next);

    requestAnimationFrame(() => {
      if (!dialogRef.current?.open) {
        dialogRef.current?.showModal();
      }

      dialogRef.current
        ?.querySelector("input")
        ?.focus();
    });
  };

  const close = () => {
    if (!busy) {
      dialogRef.current?.close();
    }
  };

  useEffect(() => {
    const desktop = window.matchMedia(
      "(min-width: 761px)"
    );

    const query = new URLSearchParams(
      window.location.search
    );

    const invite =
      query.get("invite") ||
      query.get("code");

    if (desktop.matches && invite) {
      setInviteCode(cleanCode(invite));

      if (!dialogRef.current?.open) {
        dialogRef.current?.showModal();
      }
    }

    const resize = () => {
      if (!desktop.matches) {
        dialogRef.current?.close();
      }
    };

    desktop.addEventListener(
      "change",
      resize
    );

    return () => {
      desktop.removeEventListener(
        "change",
        resize
      );
    };
  }, [setInviteCode]);

  const submit = async (event) => {
    const ok = await (
      mode === "join"
        ? joinGroup(event)
        : createGroup(event)
    );

    if (ok === true) {
      dialogRef.current?.close();
    }
  };

  return (
    <section
      className="cg-actions"
      aria-label="Group actions"
    >

      <button
        type="button"
        className="cg-button"
        onClick={() => open("join")}
      >
        <KeyRound size={16} />
        Join group
      </button>

      <button
        type="button"
        className="cg-button cg-primary"
        onClick={() => open("create")}
      >
        <Plus size={17} />
        Create group
      </button>

      <dialog
        ref={dialogRef}
        className="cg-dialog"
        aria-labelledby="cg-dialog-title"
        onCancel={(event) => {
          if (busy) {
            event.preventDefault();
          }
        }}
        onClick={(event) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            close();
          }
        }}
      >

        <form
          className="cg-dialog-form"
          onSubmit={submit}
        >

          <header className="cg-dialog-header">

            <div>

              <h2 id="cg-dialog-title">
                {mode === "join"
                  ? "Join a study group"
                  : "Create a group"}
              </h2>

              <p>
                {mode === "join"
                  ? "Enter the invite code shared by a member."
                  : "Set up a room for your study circle."}
              </p>

            </div>

            <button
              type="button"
              className="cg-icon"
              aria-label="Close dialog"
              onClick={close}
              disabled={busy}
            >
              <X size={19} />
            </button>

          </header>

          {mode === "join" ? (

            <InviteCodeField
              code={inviteCode}
              onChange={setInviteCode}
              disabled={busy}
            />

          ) : (

            <div className="cg-fields">

              <label>

                Group name

                <input
                  value={groupName}
                  onChange={(event) =>
                    setGroupName(event.target.value)
                  }
                  required
                  minLength={2}
                  maxLength={60}
                  disabled={busy}
                  placeholder="Machine Learning Club"
                />

              </label>

              <label>

                Description (optional)

                <textarea
                  value={groupDescription}
                  onChange={(event) =>
                    setGroupDescription(
                      event.target.value
                    )
                  }
                  maxLength={300}
                  rows={3}
                  disabled={busy}
                  placeholder="What will your group study?"
                />

              </label>

              <fieldset className="cg-visibility">

                <legend>Visibility</legend>

                {[
                  ["private", LockKeyhole],
                  ["public", Globe2],
                ].map(([value, Icon]) => (

                  <button
                    type="button"
                    key={value}
                    className="cg-button"
                    aria-pressed={
                      groupVisibility === value
                    }
                    disabled={busy}
                    onClick={() =>
                      setGroupVisibility(value)
                    }
                  >

                    <Icon size={16} />

                    {value === "private"
                      ? "Private"
                      : "Public"}

                  </button>

                ))}

              </fieldset>

            </div>

          )}

          {error && (
            <p
              className="cg-dialog-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <footer className="cg-dialog-footer">

            <button
              type="button"
              className="cg-button"
              onClick={close}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="cg-button cg-primary"
              disabled={
                busy ||
                !(mode === "join"
                  ? readyToJoin
                  : readyToCreate)
              }
            >
              {busy
                ? "Working..."
                : mode === "join"
                  ? "Join group"
                  : "Create group"}
            </button>

          </footer>

        </form>

      </dialog>

    </section>
  );
}
