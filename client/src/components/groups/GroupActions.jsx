
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ClipboardPaste,
  Globe2,
  KeyRound,
  LockKeyhole,
  Plus,
  UsersRound,
  ChevronDown,
} from "lucide-react";

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

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const invite = query.get("invite") || query.get("code");

    if (invite) onChange(cleanCode(invite));
  }, [onChange]);

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
}) {
  const [createOpen, setCreateOpen] = useState(false);

  const readyToJoin = CODE_PATTERN.test(cleanCode(inviteCode));
  const readyToCreate = groupName.trim().length >= 2;

  return (
    <section
      className="sg3-layout"
      aria-label="Create or join a study group"
    >
      {/* PRIMARY: JOIN ROOM */}

      <form className="sg3-card sg3-join" onSubmit={joinGroup}>
        <div className="sg3-intro">
          <span className="sg3-symbol">
            <KeyRound size={22} aria-hidden="true" />
          </span>

          <span className="sg3-kicker">
            HAVE AN INVITATION?
          </span>

          <h2>Join a study room</h2>

          <p>
            Enter your friend's code to join their room
            and study together.
          </p>
        </div>

        <InviteCodeField
          code={inviteCode}
          onChange={setInviteCode}
          disabled={joining}
        />

        <button
          className="sg3-join-action"
          type="submit"
          disabled={joining || !readyToJoin}
        >
          <span>
            {joining ? "Joining room…" : "Join room"}
          </span>

          <ArrowRight size={19} aria-hidden="true" />
        </button>

        <p className="sg3-footnote">
          <LockKeyhole size={14} aria-hidden="true" />
          Joining doesn't change your existing rooms.
        </p>
      </form>

      {/* SECONDARY: CREATE GROUP */}

      <form
        className={`sg3-card sg3-create${
          createOpen ? " is-open" : ""
        }`}
        onSubmit={createGroup}
      >
        <div className="sg3-create-heading">
          <span className="sg3-symbol sg3-symbol-subtle">
            <UsersRound size={21} aria-hidden="true" />
          </span>

          <div>
            <span className="sg3-kicker">
              START SOMETHING NEW
            </span>

            <h2>Create a group</h2>

            <p>Make a space for your study circle.</p>
          </div>

          <button
            type="button"
            className="sg3-create-toggle"
            onClick={() => setCreateOpen(!createOpen)}
            aria-expanded={createOpen}
            aria-label={
              createOpen
                ? "Collapse create group"
                : "Expand create group"
            }
          >
            <ChevronDown size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="sg3-create-content">
          <div className="sg3-form-field">
            <label htmlFor="sg3-group-name">
              Group name <span>*</span>
            </label>

            <input
              id="sg3-group-name"
              type="text"
              maxLength={60}
              minLength={2}
              required
              placeholder="e.g. Machine Learning Club"
              value={groupName}
              onChange={(event) =>
                setGroupName(event.target.value)
              }
              disabled={creating}
            />
          </div>

          <div className="sg3-form-field">
            <label htmlFor="sg3-group-description">
              Description
              <span className="sg3-optional">
                {" "}Optional
              </span>
            </label>

            <textarea
              id="sg3-group-description"
              rows={2}
              maxLength={300}
              placeholder="What will your group study?"
              value={groupDescription}
              onChange={(event) =>
                setGroupDescription(event.target.value)
              }
              disabled={creating}
            />
          </div>

          <div className="sg3-create-bottom">
            <div className="sg3-form-field sg3-privacy">
              <span
                className="sg3-label"
                id="sg3-privacy-label"
              >
                Visibility
              </span>

              <div
                className="sg3-segmented"
                role="group"
                aria-labelledby="sg3-privacy-label"
              >
                <button
                  type="button"
                  aria-pressed={groupVisibility === "private"}
                  className={
                    groupVisibility === "private"
                      ? "is-selected"
                      : ""
                  }
                  onClick={() => setGroupVisibility("private")}
                  disabled={creating}
                >
                  <LockKeyhole size={15} aria-hidden="true" />
                  Private
                </button>

                <button
                  type="button"
                  aria-pressed={groupVisibility === "public"}
                  className={
                    groupVisibility === "public"
                      ? "is-selected"
                      : ""
                  }
                  onClick={() => setGroupVisibility("public")}
                  disabled={creating}
                >
                  <Globe2 size={15} aria-hidden="true" />
                  Public
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="sg3-create-action"
              disabled={creating || !readyToCreate}
            >
              <Plus size={18} aria-hidden="true" />
              {creating ? "Creating…" : "Create group"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
