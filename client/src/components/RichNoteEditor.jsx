import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { TaskList, TaskItem } from "@tiptap/extension-list";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Strikethrough, List, ListOrdered, ListChecks, Heading1, Heading2, Code, Quote, Link2, Undo2, Redo2, X } from "./icons";
import { WorkspaceSkeleton } from "./WorkspaceStates";
import { isSafeNoteLink } from "../services/noteLinkSafety";

function EditorButton({
  children,
  label,
  active,
  disabled,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`nr-tool${active ? " is-active" : ""}`}
      data-tooltip={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}


function VisualNoteEditor({ value, onChange }) {
  const lastValue = useRef(value);

  const linkDialogRef = useRef(null);
  const linkInputRef = useRef(null);
  const linkSelection = useRef(null);

  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");
  const changeRef = useRef(onChange);

  changeRef.current = onChange;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          isAllowedUri: (url, context) => context.defaultValidate(url) && isSafeNoteLink(url),
        },
      }),

      TaskList,

      TaskItem.configure({
        nested: true,
      }),

      Placeholder.configure({
        placeholder: "Start writing, or use Markdown shortcuts...",
      }),

      Markdown.configure({
        markedOptions: {
          gfm: true,
          breaks: true,
        },
      }),
    ],

    content: value || "",

    contentType: "markdown",

    immediatelyRender: false,

    shouldRerenderOnTransaction: true,

    editorProps: {
      attributes: {
        class: "nr-document",
        role: "textbox",
        "aria-label": "Note content",
        "aria-multiline": "true",
        spellcheck: "true",
      },
    },

    onUpdate: ({ editor }) => {
      const markdown = editor.getMarkdown();

      lastValue.current = markdown;

      changeRef.current(markdown);
    },
  });

  useEffect(() => {
    if (!editor || lastValue.current === value) return;

    lastValue.current = value;

    editor.commands.setContent(value || "", {
      contentType: "markdown",
      emitUpdate: false,
    });
  }, [editor, value]);

  if (!editor) {
    return (
      <WorkspaceSkeleton kind="rows" count={3} label="note editor" />
    );
  }

  const addLink = () => {
    const dialog = linkDialogRef.current;

    if (!dialog) return;

    linkSelection.current = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };

    setLinkUrl(
      editor.getAttributes("link").href || ""
    );

    setLinkError("");

    dialog.showModal();

    requestAnimationFrame(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    });
  };

  const closeLinkDialog = () => {
    linkDialogRef.current?.close();
    setLinkError("");
  };

  const removeLink = () => {
    const selection = linkSelection.current;

    closeLinkDialog();

    const chain = editor.chain().focus();

    if (selection) {
      chain.setTextSelection(selection);
    }

    chain
      .extendMarkRange("link")
      .unsetLink()
      .run();
  };

  const applyLink = (event) => {
    event.preventDefault();

    let url = linkUrl.trim();

    if (!url) {
      setLinkError("Enter a URL.");
      return;
    }

    if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) {
      url = `https://${url}`;
    }

    try {
      const parsed = new URL(url);

      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        !parsed.hostname
      ) {
        throw new Error("Invalid URL");
      }

      url = parsed.href;
    } catch {
      setLinkError("Enter a valid HTTP or HTTPS URL.");
      return;
    }

    const selection = linkSelection.current;

    closeLinkDialog();

    const chain = editor.chain().focus();

    if (selection) {
      chain.setTextSelection(selection);
    }

    if (
      selection &&
      selection.from === selection.to &&
      !editor.isActive("link")
    ) {
      chain.insertContent({
        type: "text",
        text: url,
        marks: [
          {
            type: "link",
            attrs: { href: url },
          },
        ],
      }).run();

      return;
    }

    chain
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  };

  return (
    <>
      <div
        className="nr-toolbar"
        role="group"
        aria-label="Text formatting"
      >

        <EditorButton
          label="Paragraph"
          active={editor.isActive("paragraph")}
          onClick={() =>
            editor.chain().focus().setParagraph().run()
          }
        >
          <span className="nr-paragraph">T</span>
        </EditorButton>

        <EditorButton
          label="Heading 1"
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          <Heading1 size={17} />
        </EditorButton>

        <EditorButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 size={17} />
        </EditorButton>

        <i className="nr-tool-divider" />

        <EditorButton
          label="Bold (Ctrl+B)"
          active={editor.isActive("bold")}
          onClick={() =>
            editor.chain().focus().toggleBold().run()
          }
        >
          <Bold size={16} />
        </EditorButton>

        <EditorButton
          label="Italic (Ctrl+I)"
          active={editor.isActive("italic")}
          onClick={() =>
            editor.chain().focus().toggleItalic().run()
          }
        >
          <Italic size={16} />
        </EditorButton>

        <EditorButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() =>
            editor.chain().focus().toggleStrike().run()
          }
        >
          <Strikethrough size={16} />
        </EditorButton>

        <i className="nr-tool-divider" />

        <EditorButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() =>
            editor.chain().focus().toggleBulletList().run()
          }
        >
          <List size={17} />
        </EditorButton>

        <EditorButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
        >
          <ListOrdered size={17} />
        </EditorButton>

        <EditorButton
          label="Checklist"
          active={editor.isActive("taskList")}
          onClick={() =>
            editor.chain().focus().toggleTaskList().run()
          }
        >
          <ListChecks size={17} />
        </EditorButton>

        <i className="nr-tool-divider" />

        <EditorButton
          label="Inline code"
          active={editor.isActive("code")}
          onClick={() =>
            editor.chain().focus().toggleCode().run()
          }
        >
          <Code size={17} />
        </EditorButton>

        <EditorButton
          label="Code block"
          active={editor.isActive("codeBlock")}
          onClick={() =>
            editor.chain().focus().toggleCodeBlock().run()
          }
        >
          <span className="nr-code-symbol">{"{ }"}</span>
        </EditorButton>

        <EditorButton
          label="Blockquote"
          active={editor.isActive("blockquote")}
          onClick={() =>
            editor.chain().focus().toggleBlockquote().run()
          }
        >
          <Quote size={16} />
        </EditorButton>

        <EditorButton
          label="Insert or edit link"
          active={editor.isActive("link")}
          onClick={addLink}
        >
          <Link2 size={17} />
        </EditorButton>

        <i className="nr-tool-divider" />

        <EditorButton
          label="Undo"
          disabled={!editor.can().undo()}
          onClick={() =>
            editor.chain().focus().undo().run()
          }
        >
          <Undo2 size={17} />
        </EditorButton>

        <EditorButton
          label="Redo"
          disabled={!editor.can().redo()}
          onClick={() =>
            editor.chain().focus().redo().run()
          }
        >
          <Redo2 size={17} />
        </EditorButton>

      </div>

      <EditorContent editor={editor} />

      <dialog
        ref={linkDialogRef}
        className="nr-link-dialog"
        aria-labelledby="nr-link-heading"
        onCancel={closeLinkDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            closeLinkDialog();
          }
        }}
      >

        <form
          className="nr-link-form"
          onSubmit={applyLink}
          noValidate
        >

          <header className="nr-dialog-header">

            <span className="nr-dialog-icon">
              <Link2 size={19} />
            </span>

            <button
              type="button"
              className="nr-dialog-close"
              aria-label="Close dialog"
              onClick={closeLinkDialog}
            >
              <X size={18} />
            </button>

          </header>

          <h2 id="nr-link-heading">
            {editor.isActive("link")
              ? "Edit link"
              : "Insert link"}
          </h2>

          <p className="nr-dialog-description">
            Add a web link to your note.
          </p>

          <label
            htmlFor="nr-link-url"
            className="nr-dialog-label"
          >
            URL
          </label>

          <div
            className={`nr-url-field${
              linkError ? " is-invalid" : ""
            }`}
          >

            <Link2 size={16} />

            <input
              id="nr-link-url"
              ref={linkInputRef}
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://example.com"
              value={linkUrl}
              aria-invalid={Boolean(linkError)}
              aria-describedby={
                linkError ? "nr-link-error" : undefined
              }
              onChange={(event) => {
                setLinkUrl(event.target.value);
                setLinkError("");
              }}
            />

          </div>

          {linkError && (
            <span
              id="nr-link-error"
              className="nr-link-error"
              role="alert"
            >
              {linkError}
            </span>
          )}

          <footer className="nr-dialog-actions">

            {editor.isActive("link") && (
              <button
                type="button"
                className="nr-remove-link"
                onClick={removeLink}
              >
                Remove link
              </button>
            )}

            <div className="nr-dialog-right">

              <button
                type="button"
                className="nr-cancel"
                onClick={closeLinkDialog}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="nr-apply"
                disabled={!linkUrl.trim()}
              >
                {editor.isActive("link")
                  ? "Save link"
                  : "Insert link"}
              </button>

            </div>

          </footer>

        </form>

      </dialog>
    </>
  );
}


export default function RichNoteEditor({ value, onChange }) {
  const [sourceMode, setSourceMode] = useState(false);

  return (
    <div className="nr-rich-editor">

      <div className="nr-mode-switch">

        <div
          className="nr-mode-options"
          role="group"
          aria-label="Editor mode"
        >
          <button
            type="button"
            className={!sourceMode ? "is-active" : ""}
            aria-pressed={!sourceMode}
            onClick={() => setSourceMode(false)}
          >
            Visual
          </button>

          <button
            type="button"
            className={sourceMode ? "is-active" : ""}
            aria-pressed={sourceMode}
            onClick={() => setSourceMode(true)}
          >
            Markdown
          </button>
        </div>

      </div>

      {sourceMode ? (
        <textarea
          className="nr-markdown-source"
          value={value}
          maxLength={200000}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder="Write Markdown..."
          aria-label="Markdown source"
          spellCheck={false}
        />
      ) : (
        <VisualNoteEditor
          value={value}
          onChange={onChange}
        />
      )}

    </div>
  );
}
