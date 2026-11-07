
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ClipboardPaste,
  Globe2,
  KeyRound,
  LockKeyhole,
  Plus,
} from "lucide-react";

import "../../styles/groups-mobile.css";

const CODE_LENGTH = 8;
const VALID_CODE = /^[A-F0-9]{8}$/;

function cleanInviteCode(raw) {
  const text = String(raw ?? "").trim().toUpperCase();

  const inLink = text.match(
    /[?&#](?:INVITE|CODE)=([A-F0-9]{8})(?:[&#]|$)/
  );

  if (inLink) return inLink[1];

  const standalone = text.match(
    /(?:^|[^A-Z0-9])([A-F0-9]{8})(?=$|[^A-Z0-9])/
  );

  if (standalone) return standalone[1];
  if (text.includes("://")) return "";

  return text
    .replace(/[^A-F0-9]/g, "")
    .slice(0, CODE_LENGTH);
}

function MobileInviteCode({ code, onChange, disabled }) {
  const inputs = useRef([]);
  const [hint, setHint] = useState("");

  const value = cleanInviteCode(code);
  const ready = VALID_CODE.test(value);

  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const shared =
      params.get("invite") || params.get("code");

    if (shared) {
      onChange(cleanInviteCode(shared));
    }
  }, [onChange]);

  const focusSlot = (index) => {
    const position = Math.min(
      CODE_LENGTH - 1,
      Math.max(0, index)
    );

    inputs.current[position]?.focus();
  };

  const updateWholeCode = (raw) => {
    const next = cleanInviteCode(raw);

    onChange(next);
    setHint("");
    focusSlot(next.length);
  };

  const enterSlot = (index, raw) => {
    const entered = cleanInviteCode(raw);

    if (!entered) return;

    if (entered.length > 1) {
      updateWholeCode(entered);
      return;
    }

    const next = (
      value.slice(0, index) +
      entered +
      value.slice(index + 1)
    ).slice(0, CODE_LENGTH);

    onChange(next);
    setHint("");

    if (index < CODE_LENGTH - 1) {
      focusSlot(index + 1);
    } else {
      inputs.current[index]?.blur();
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "Backspace") {
      event.preventDefault();

      const target = value[index]
        ? index
        : Math.max(0, index - 1);

      onChange(
        value.slice(0, target) +
        value.slice(target + 1)
      );

      focusSlot(target);
      setHint("");
    } else if (
      event.key === "ArrowLeft" &&
      index > 0
    ) {
      event.preventDefault();
      focusSlot(index - 1);
    } else if (
      event.key === "ArrowRight" &&
      index < CODE_LENGTH - 1
    ) {
      event.preventDefault();
      focusSlot(index + 1);
    }
  };

  const pasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const next = cleanInviteCode(text);

      if (next) {
        updateWholeCode(next);
      } else {
        setHint("No invite code found in clipboard.");
      }
    } catch {
      setHint(
        "Tap the first box and use your keyboard's Paste option."
      );
      focusSlot(value.length);
    }
  };

  return (
    <div className="sgm-invite">
      <div className="sgm-field-heading">
        <label htmlFor="sgm-code-0">
          Invite code
        </label>

        <button
          type="button"
          className="sgm-paste"
          onClick={pasteCode}
          disabled={disabled}
        >
          <ClipboardPaste
            size={15}
            aria-hidden="true"
          />
          Paste code
        </button>
      </div>

      <div
        className="sgm-code-row"
        role="group"
        aria-label="Eight-character invitation code"
      >
        {Array.from(
          { length: CODE_LENGTH },
          (_, index) => (
            <input
              key={index}
              id={`sgm-code-${index}`}
              ref={(node) => {
                inputs.current[index] = node;
              }}
              className="sgm-digit"
              type="text"
              inputMode="text"
              maxLength={CODE_LENGTH}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete={
                index === 0
                  ? "one-time-code"
                  : "off"
              }
              spellCheck={false}
              placeholder="·"
              value={value[index] || ""}
              disabled={disabled}
              onFocus={() => {
                if (index > value.length) {
                  focusSlot(value.length);
                }
              }}
              onChange={(event) =>
                enterSlot(index, event.target.value)
              }
              onKeyDown={(event) =>
                handleKeyDown(event, index)
              }
              onPaste={(event) => {
                event.preventDefault();

                updateWholeCode(
                  event.clipboardData.getData("text")
                );
              }}
              aria-label={`Invite code character ${
                index + 1
              }`}
            />
          )
        )}
      </div>

      <div
        className="sgm-code-help"
        aria-live="polite"
      >
        <span>
          {hint ||
            (ready
              ? "Code ready"
              : "8 characters · A–F and 0–9")}
        </span>

        <strong>{value.length}/8</strong>
      </div>
    </div>
  );
}

export default function MobileGroupActions({
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
  const [active, setActive] = useState("join");
  const [nameError, setNameError] = useState("");

  const readyToJoin = VALID_CODE.test(
    cleanInviteCode(inviteCode)
  );

  const submitCreate = (event) => {
    if (
      String(groupName ?? "").trim().length < 2
    ) {
      event.preventDefault();
      setNameError(
        "Use at least two characters."
      );
      return;
    }

    setNameError("");
    createGroup(event);
  };

  return (
    <section
      className="sgm-root"
      aria-label="Study group actions"
    >
      {/* JOIN / CREATE NAVIGATION */}

      <div
        className="sgm-tabs"
        aria-label="Group actions"
      >
        <button
          type="button"
          className={
            active === "join" ? "is-active" : ""
          }
          aria-pressed={active === "join"}
          onClick={() => setActive("join")}
        >
          <KeyRound
            size={16}
            aria-hidden="true"
          />
          Join a group
        </button>

        <button
          type="button"
          className={
            active === "create" ? "is-active" : ""
          }
          aria-pressed={active === "create"}
          onClick={() => setActive("create")}
        >
          <Plus
            size={17}
            aria-hidden="true"
          />
          Create a group
        </button>
      </div>

      {active === "join" ? (
        /* JOIN A ROOM */

        <form
          className="sgm-panel"
          onSubmit={joinGroup}
        >
          <div className="sgm-panel-heading">
            <h2>Join a study room</h2>
            <p>
              Got a code from a friend? Enter it below.
            </p>
          </div>

          <MobileInviteCode
            code={inviteCode}
            onChange={setInviteCode}
            disabled={joining}
          />

          <button
            className="sgm-primary"
            type="submit"
            disabled={joining || !readyToJoin}
          >
            <span>
              {joining
                ? "Joining room…"
                : "Join room"}
            </span>

            <ArrowRight
              size={18}
              aria-hidden="true"
            />
          </button>
        </form>
      ) : (
        /* CREATE A ROOM */

        <form
          className="sgm-panel"
          onSubmit={submitCreate}
          noValidate
        >
          <div className="sgm-panel-heading">
            <h2>Create a group</h2>
            <p>
              Study together in your own space.
            </p>
          </div>

          {/* NAME */}

          <div className="sgm-field">
            <div className="sgm-field-heading">
              <label htmlFor="sgm-name">
                Group name
              </label>

              <span>
                {String(groupName ?? "").length}/60
              </span>
            </div>

            <input
              id="sgm-name"
              type="text"
              value={groupName}
              maxLength={60}
              placeholder="e.g. ML Study Club"
              disabled={creating}
              aria-invalid={Boolean(nameError)}
              aria-describedby={
                nameError
                  ? "sgm-name-error"
                  : undefined
              }
              onChange={(event) => {
                setGroupName(event.target.value);
                setNameError("");
              }}
            />

            {nameError && (
              <small
                id="sgm-name-error"
                className="sgm-error"
                role="alert"
              >
                {nameError}
              </small>
            )}
          </div>

          {/* DESCRIPTION */}

          <div className="sgm-field">
            <div className="sgm-field-heading">
              <label htmlFor="sgm-description">
                Description
              </label>

              <span>Optional</span>
            </div>

            <textarea
              id="sgm-description"
              rows={2}
              maxLength={300}
              placeholder="What will you study together?"
              value={groupDescription}
              disabled={creating}
              onChange={(event) =>
                setGroupDescription(
                  event.target.value
                )
              }
            />
          </div>

          {/* VISIBILITY */}

          <fieldset className="sgm-privacy">
            <legend>Visibility</legend>

            <div className="sgm-choice-grid">
              <button
                type="button"
                className={`sgm-choice${
                  groupVisibility === "private"
                    ? " is-selected"
                    : ""
                }`}
                aria-pressed={
                  groupVisibility === "private"
                }
                disabled={creating}
                onClick={() =>
                  setGroupVisibility("private")
                }
              >
                <LockKeyhole
                  size={17}
                  aria-hidden="true"
                />

                <span>Private</span>

                {groupVisibility === "private" && (
                  <Check
                    size={16}
                    className="sgm-choice-check"
                    aria-hidden="true"
                  />
                )}
              </button>

              <button
                type="button"
                className={`sgm-choice${
                  groupVisibility === "public"
                    ? " is-selected"
                    : ""
                }`}
                aria-pressed={
                  groupVisibility === "public"
                }
                disabled={creating}
                onClick={() =>
                  setGroupVisibility("public")
                }
              >
                <Globe2
                  size={17}
                  aria-hidden="true"
                />

                <span>Public</span>

                {groupVisibility === "public" && (
                  <Check
                    size={16}
                    className="sgm-choice-check"
                    aria-hidden="true"
                  />
                )}
              </button>
            </div>

            <p className="sgm-privacy-note">
              {groupVisibility === "public"
                ? "Anyone can discover this group."
                : "Only people with your invite code can join."}
            </p>
          </fieldset>

          {/* SUBMIT */}

          <button
            className="sgm-primary"
            type="submit"
            disabled={creating}
          >
            <span>
              {creating
                ? "Creating group…"
                : "Create group"}
            </span>

            <ArrowRight
              size={18}
              aria-hidden="true"
            />
          </button>
        </form>
      )}
    </section>
  );
}
