import apiRequest from "./api";


// =========================================================
// LIMITS
// =========================================================

const MAX_FILE_SIZE =
  25 *
  1024 *
  1024;


const MAX_ATTACHMENTS =
  10;


const ALLOWED_MIME_TYPES =
  new Set([
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
  ]);


// =========================================================
// HELPERS
// =========================================================

const validateGroupId =
  (
    groupId
  ) => {
    const value =
      String(
        groupId ||
        ""
      ).trim();


    if (!value) {
      throw new Error(
        "Group ID is required."
      );
    }


    return value;
  };


const validateFile =
  (
    file
  ) => {
    if (
      !file ||
      typeof file !==
        "object"
    ) {
      throw new Error(
        "Select a file first."
      );
    }


    if (
      !file.name
    ) {
      throw new Error(
        "The selected file has no name."
      );
    }


    if (
      !file.type ||
      !ALLOWED_MIME_TYPES.has(
        file.type
      )
    ) {
      throw new Error(
        `${file.name} has an unsupported file type.`
      );
    }


    if (
      !Number.isFinite(
        file.size
      ) ||
      file.size <=
        0
    ) {
      throw new Error(
        `${file.name} is empty.`
      );
    }


    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      throw new Error(
        `${file.name} is larger than 25 MB.`
      );
    }


    return file;
  };


// =========================================================
// REQUEST PRESIGNED UPLOAD URL
// =========================================================

const createAttachmentUploadTarget =
  async ({
    groupId,
    file,
  }) => {
    const safeGroupId =
      validateGroupId(
        groupId
      );


    const safeFile =
      validateFile(
        file
      );


    const response =
      await apiRequest(
        `/api/groups/${safeGroupId}/attachments/upload-url`,
        {
          method:
            "POST",

          body:
            JSON.stringify({
              fileName:
                safeFile.name,

              mimeType:
                safeFile.type,

              size:
                safeFile.size,
            }),
        }
      );


    const uploadUrl =
      response?.uploadUrl;


    const attachment =
      response?.attachment;


    const storageKey =
      attachment?.storageKey;


    if (
      !uploadUrl ||
      !storageKey
    ) {
      throw new Error(
        "The server did not return a valid upload URL."
      );
    }


    return {
      uploadUrl,

      storageKey,

      fileName:
        attachment?.fileName ||
        safeFile.name,

      mimeType:
        attachment?.mimeType ||
        safeFile.type,

      size:
        Number(
          attachment?.size
        ) ||
        safeFile.size,
    };
  };


// =========================================================
// PUT FILE DIRECTLY TO R2
// =========================================================

const uploadFileToStorage =
  async ({
    uploadUrl,
    file,
  }) => {
    const response =
      await fetch(
        uploadUrl,
        {
          method:
            "PUT",

          headers: {
            "Content-Type":
              file.type,
          },

          body:
            file,
        }
      );


    if (
      !response.ok
    ) {
      throw new Error(
        `Upload failed for ${file.name}.`
      );
    }


    return true;
  };


// =========================================================
// PREPARE ONE ATTACHMENT
// =========================================================

export const prepareGroupAttachment =
  async ({
    groupId,
    file,
  }) => {
    const safeGroupId =
      validateGroupId(
        groupId
      );


    const safeFile =
      validateFile(
        file
      );


    const target =
      await createAttachmentUploadTarget({
        groupId:
          safeGroupId,

        file:
          safeFile,
      });


    await uploadFileToStorage({
      uploadUrl:
        target.uploadUrl,

      file:
        safeFile,
    });


    return {
      storageKey:
        target.storageKey,

      fileName:
        target.fileName,

      mimeType:
        target.mimeType,

      size:
        target.size,
    };
  };


// =========================================================
// FINALIZE ATTACHMENTS
// =========================================================

export const finalizeGroupAttachments =
  async ({
    groupId,
    attachments,
    message = "",
    replyToMessageId = "",
  }) => {
    const safeGroupId =
      validateGroupId(
        groupId
      );


    const safeAttachments =
      Array.isArray(
        attachments
      )
        ? attachments
        : [];


    if (
      safeAttachments.length ===
      0
    ) {
      throw new Error(
        "At least one attachment is required."
      );
    }


    if (
      safeAttachments.length >
      MAX_ATTACHMENTS
    ) {
      throw new Error(
        `You can attach up to ${MAX_ATTACHMENTS} files at once.`
      );
    }


    const response =
      await apiRequest(
        `/api/groups/${safeGroupId}/attachments/finalize`,
        {
          method:
            "POST",

          body:
            JSON.stringify({
              attachments:
                safeAttachments,

              message:
                String(
                  message ||
                  ""
                ),

              replyToMessageId:
                String(
                  replyToMessageId ||
                  ""
                ).trim(),
            }),
        }
      );


    if (
      !response?.message
    ) {
      throw new Error(
        "The server did not return the created message."
      );
    }


    return response.message;
  };


// =========================================================
// BATCH UPLOAD
// =========================================================

export const uploadGroupAttachments =
  async ({
    groupId,
    files,
    message = "",
    replyToMessageId = "",
    onFileStateChange,
  }) => {
    const safeGroupId =
      validateGroupId(
        groupId
      );


    const safeFiles =
      Array.from(
        files ||
        []
      );


    if (
      safeFiles.length ===
      0
    ) {
      throw new Error(
        "Select at least one file."
      );
    }


    if (
      safeFiles.length >
      MAX_ATTACHMENTS
    ) {
      throw new Error(
        `You can attach up to ${MAX_ATTACHMENTS} files at once.`
      );
    }


    for (
      const file
      of safeFiles
    ) {
      validateFile(
        file
      );
    }


    const uploadedAttachments =
      [];


    for (
      let index = 0;
      index <
      safeFiles.length;
      index += 1
    ) {
      const file =
        safeFiles[
          index
        ];


      try {
        onFileStateChange?.({
          index,
          file,
          status:
            "uploading",
        });


        const attachment =
          await prepareGroupAttachment({
            groupId:
              safeGroupId,

            file,
          });


        uploadedAttachments.push(
          attachment
        );


        onFileStateChange?.({
          index,
          file,
          status:
            "uploaded",

          attachment,
        });
      } catch (
        error
      ) {
        onFileStateChange?.({
          index,
          file,
          status:
            "error",

          error,
        });


        throw error;
      }
    }


    return finalizeGroupAttachments({
      groupId:
        safeGroupId,

      attachments:
        uploadedAttachments,

      message,

      replyToMessageId,
    });
  };


// =========================================================
// LEGACY SINGLE-FILE UPLOAD
// =========================================================

export const uploadGroupAttachment =
  async ({
    groupId,
    file,
    message = "",
    replyToMessageId = "",
  }) => {
    const attachment =
      await prepareGroupAttachment({
        groupId,
        file,
      });


    return finalizeGroupAttachments({
      groupId,

      attachments: [
        attachment,
      ],

      message,

      replyToMessageId,
    });
  };


// =========================================================
// DOWNLOAD URL
//
// Keep response object compatibility with ChatAttachmentCard.
// =========================================================

export const getGroupAttachmentDownloadUrl =
  async ({
    groupId,
    messageId,
    storageKey,
  }) => {
    const safeGroupId =
      validateGroupId(
        groupId
      );


    const safeMessageId =
      String(
        messageId ||
        ""
      ).trim();


    const safeStorageKey =
      String(
        storageKey ||
        ""
      ).trim();


    if (
      !safeMessageId
    ) {
      throw new Error(
        "Message ID is required."
      );
    }


    if (
      !safeStorageKey
    ) {
      throw new Error(
        "Attachment storage key is required."
      );
    }


    const response =
      await apiRequest(
        `/api/groups/${safeGroupId}/messages/${safeMessageId}/attachments/download-url?storageKey=${encodeURIComponent(
          safeStorageKey
        )}`
      );


    const downloadUrl =
      response?.downloadUrl ||
      response?.url;


    if (
      !downloadUrl
    ) {
      throw new Error(
        "The server did not return a download URL."
      );
    }


    return {
      ...response,

      downloadUrl,
    };
  };


// =========================================================
// FILE SIZE FORMATTER
// =========================================================

export const formatAttachmentSize =
  (
    bytes
  ) => {
    const size =
      Number(
        bytes
      );


    if (
      !Number.isFinite(
        size
      ) ||
      size <=
        0
    ) {
      return "0 B";
    }


    if (
      size <
      1024
    ) {
      return `${Math.round(
        size
      )} B`;
    }


    const kilobytes =
      size /
      1024;


    if (
      kilobytes <
      1024
    ) {
      return `${kilobytes.toFixed(
        kilobytes >=
          100
          ? 0
          : 1
      )} KB`;
    }


    const megabytes =
      kilobytes /
      1024;


    if (
      megabytes <
      1024
    ) {
      return `${megabytes.toFixed(
        megabytes >=
          100
          ? 0
          : 1
      )} MB`;
    }


    const gigabytes =
      megabytes /
      1024;


    return `${gigabytes.toFixed(
      gigabytes >=
        100
        ? 0
        : 1
    )} GB`;
  };