import {
  useRef,
  useState,
} from "react";

import {
  LoaderCircle,
  Paperclip,
} from "lucide-react";

import {
  uploadGroupAttachment,
} from "../../services/groupAttachmentData";


// =========================================================
// ACCEPTED FILE TYPES
// =========================================================

const ACCEPTED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",

  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",

  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",

  "application/zip",
  "application/x-zip-compressed",
].join(",");


const MAX_FILES_PER_UPLOAD =
  10;


// =========================================================
// CHAT ATTACHMENT BUTTON
// =========================================================

function ChatAttachmentButton({
  groupId,
  message = "",
  disabled = false,

  // New staged-file flow.
  onFilesSelected,

  // Existing upload flow kept temporarily
  // for backwards compatibility.
  onUploaded,
  onError,
  onUploadStart,
  onUploadEnd,
}) {
  const fileInputRef =
    useRef(null);


  const [
    uploading,
    setUploading,
  ] =
    useState(false);


  // =======================================================
  // OPEN FILE PICKER
  // =======================================================

  const openFilePicker =
    () => {
      if (
        disabled ||
        uploading ||
        !groupId
      ) {
        return;
      }


      fileInputRef.current?.click();
    };


  // =======================================================
  // FILES SELECTED
  // =======================================================

  const handleFileChange =
    async (
      event
    ) => {
      const files =
        Array.from(
          event.target.files ||
            []
        );


      event.target.value =
        "";


      if (
        files.length ===
        0
      ) {
        return;
      }


      if (
        files.length >
        MAX_FILES_PER_UPLOAD
      ) {
        onError?.(
          new Error(
            `You can select up to ${MAX_FILES_PER_UPLOAD} files at once.`
          )
        );

        return;
      }


      // ===================================================
      // STAGED ATTACHMENT FLOW
      //
      // If Chats.jsx provides onFilesSelected,
      // NOTHING is uploaded yet.
      // ===================================================

      if (
        typeof onFilesSelected ===
        "function"
      ) {
        onFilesSelected(
          files
        );

        return;
      }


      // ===================================================
      // OLD FLOW
      //
      // Temporary fallback until Chats.jsx is migrated.
      // ===================================================

      try {
        setUploading(
          true
        );


        onUploadStart?.(
          files
        );


        for (
          let index = 0;
          index < files.length;
          index += 1
        ) {
          const file =
            files[
              index
            ];


          const uploadedMessage =
            await uploadGroupAttachment({
              groupId,

              file,

              message:
                index === 0
                  ? message
                  : "",
            });


          onUploaded?.(
            uploadedMessage,
            file
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Chat attachment upload failed:",
          error
        );


        onError?.(
          error
        );
      } finally {
        setUploading(
          false
        );


        onUploadEnd?.();
      }
    };


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <>
      <input
        ref={
          fileInputRef
        }
        type="file"
        multiple
        accept={
          ACCEPTED_FILE_TYPES
        }
        className="chats-attachment-input"
        onChange={
          handleFileChange
        }
        tabIndex={-1}
        aria-hidden="true"
      />


      <button
        type="button"
        className={`chats-attachment-button ${
          uploading
            ? "is-uploading"
            : ""
        }`}
        onClick={
          openFilePicker
        }
        disabled={
          disabled ||
          uploading ||
          !groupId
        }
        aria-label={
          uploading
            ? "Uploading attachments"
            : "Attach files"
        }
        title={
          uploading
            ? "Uploading..."
            : "Attach files"
        }
      >
        {uploading ? (
          <LoaderCircle
            size={18}
            className="chats-attachment-spinner"
          />
        ) : (
          <Paperclip
            size={18}
          />
        )}
      </button>
    </>
  );
}


export default ChatAttachmentButton;