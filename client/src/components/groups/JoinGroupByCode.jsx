
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ClipboardPaste,
  LockKeyhole,
} from "lucide-react";

const CODE_LENGTH = 8;

// Accept a plain invite code, pasted message,
// or a URL containing an invite code.
function normalizeInviteCode(value) {
  const text = String(value || "").toUpperCase();

  const found = text.match(
    /(?:^|[^A-F0-9])([A-F0-9]{8})(?=$|[^A-F0-9])/
  );

  return found
    ? found[1]
    : text.replace(/[^A-F0-9]/g, "").slice(0, CODE_LENGTH);
}

export default function JoinGroupByCode({
  code,
  onCodeChange,
  joining,
}) {
  const inputRef = useRef(null);
  const [pasteMessage, setPasteMessage] = useState("");

  const value = String(code || "");
  const complete = /^[A-F0-9]{8}$/.test(value);

  // Allows shared links such as:
  // /app/groups?invite=A1B2C3D4

  useEffect(() => {
    const invite = new URLSearchParams(
      window.location.search
    ).get("invite");

    if (invite) {
      onCodeChange(normalizeInviteCode(invite));
    }
  }, [onCodeChange]);

  const updateCode = (raw) => {
    onCodeChange(normalizeInviteCode(raw));
    setPasteMessage("");
  };

  const pasteFromClipboard = async () => {
    try {
      if (!navigator.clipboard?.readText) {
        throw new Error("Clipboard not available");
      }

      const text = await navigator.clipboard.readText();
      const cleaned = normalizeInviteCode(text);

      if (!cleaned) {
        setPasteMessage(
          "No invite code found. Enter it manually."
        );
        inputRef.current?.focus();
        return;
      }

      updateCode(cleaned);
      inputRef.current?.focus();
    } catch {
      setPasteMessage(
        "Use Ctrl+V or your device's Paste option."
      );
      inputRef.current?.focus();
    }
  };

  return (
    <div className="sg-join">
      <div className="sg-join-label-row">
        <label htmlFor="sg-join-code">
          Invitation code
        </label>

        <span>8 characters</span>
      </div>

      <div
        className={`sg-join-field ${
          complete ? "is-complete" : ""
        }`}
      >
        <input
          ref={inputRef}
          id="sg-join-code"
          className="sg-join-code"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          required
          pattern="[A-F0-9]{8}"
          maxLength={CODE_LENGTH}
          placeholder="A1B2C3D4"
          value={value}
          disabled={joining}
          onChange={(event) =>
            updateCode(event.target.value)
          }
          onPaste={(event) => {
            const text =
              event.clipboardData?.getData("text");

            if (text) {
              event.preventDefault();
              updateCode(text);
            }
          }}
          aria-describedby="sg-join-help"
          aria-label="8-character invitation code"
        />

        <button
          className="sg-join-paste"
          type="button"
          disabled={joining}
          onClick={pasteFromClipboard}
          title="Paste invitation code"
        >
          <ClipboardPaste size={16} />
          Paste
        </button>
      </div>

      <div
        className="sg-join-help"
        id="sg-join-help"
        aria-live="polite"
      >
        <span>
          {pasteMessage ||
            (complete
              ? "Code ready. You can join this group."
              : "Enter the code shared by the group owner.")}
        </span>

        <span
          className={`sg-join-count ${
            complete ? "is-complete" : ""
          }`}
        >
          {complete && <Check size={14} />}
          {value.length}/{CODE_LENGTH}
        </span>
      </div>

      <button
        className="sg-join-submit"
        type="submit"
        disabled={joining || !complete}
      >
        <span>
          {joining
            ? "Joining group…"
            : "Join study group"}
        </span>
        <ArrowRight size={18} />
      </button>

      <p className="sg-join-note">
        <LockKeyhole size={14} />
        Your invitation code is checked before you join.
      </p>
    </div>
  );
}
