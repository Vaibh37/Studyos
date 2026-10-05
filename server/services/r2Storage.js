const crypto =
  require("crypto");

const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require(
  "@aws-sdk/client-s3"
);

const {
  getSignedUrl,
} = require(
  "@aws-sdk/s3-request-presigner"
);

const {
  r2Client,
  R2_BUCKET_NAME,
} = require(
  "../config/r2"
);


// =========================================================
// CONSTANTS
// =========================================================

const UPLOAD_URL_EXPIRES_IN =
  5 * 60;

const DOWNLOAD_URL_EXPIRES_IN =
  10 * 60;


// =========================================================
// FILE NAME HELPERS
// =========================================================

function sanitizeFileName(
  fileName
) {
  if (
    typeof fileName !==
      "string" ||
    !fileName.trim()
  ) {
    return "file";
  }

  const cleaned =
    fileName
      .trim()
      .replace(
        /[^\w.\-() ]+/g,
        "_"
      )
      .replace(
        /\s+/g,
        "_"
      )
      .replace(
        /_+/g,
        "_"
      );

  return (
    cleaned.slice(
      0,
      180
    ) ||
    "file"
  );
}


// =========================================================
// STORAGE KEY
// =========================================================

function createGroupStorageKey(
  groupId,
  fileName
) {
  if (!groupId) {
    throw new Error(
      "groupId is required to create an R2 storage key."
    );
  }

  const safeFileName =
    sanitizeFileName(
      fileName
    );

  const uniqueId =
    crypto.randomUUID();

  return [
    "groups",
    String(groupId),
    uniqueId,
    safeFileName,
  ].join("/");
}


// =========================================================
// PRESIGNED UPLOAD URL
// =========================================================

async function createUploadUrl({
  storageKey,
  mimeType,
}) {
  if (!storageKey) {
    throw new Error(
      "storageKey is required."
    );
  }

  if (!mimeType) {
    throw new Error(
      "mimeType is required."
    );
  }

  const command =
    new PutObjectCommand({
      Bucket:
        R2_BUCKET_NAME,

      Key:
        storageKey,

      ContentType:
        mimeType,
    });

  const uploadUrl =
    await getSignedUrl(
      r2Client,
      command,
      {
        expiresIn:
          UPLOAD_URL_EXPIRES_IN,
      }
    );

  return {
    uploadUrl,

    expiresIn:
      UPLOAD_URL_EXPIRES_IN,
  };
}


// =========================================================
// VERIFY STORED OBJECT
//
// We call this AFTER the browser uploads to R2.
// This proves the object really exists and lets the
// backend read the actual stored size/content type.
// =========================================================

async function getStoredObjectMetadata(
  storageKey
) {
  if (!storageKey) {
    throw new Error(
      "storageKey is required."
    );
  }

  const command =
    new HeadObjectCommand({
      Bucket:
        R2_BUCKET_NAME,

      Key:
        storageKey,
    });

  const response =
    await r2Client.send(
      command
    );

  return {
    size:
      Number(
        response.ContentLength ||
          0
      ),

    mimeType:
      response.ContentType ||
      "application/octet-stream",

    etag:
      response.ETag ||
      null,

    lastModified:
      response.LastModified ||
      null,
  };
}


// =========================================================
// PRESIGNED DOWNLOAD URL
// =========================================================

async function createDownloadUrl({
  storageKey,
  fileName,
}) {
  if (!storageKey) {
    throw new Error(
      "storageKey is required."
    );
  }

  const safeFileName =
    sanitizeFileName(
      fileName ||
        "download"
    );

  const command =
    new GetObjectCommand({
      Bucket:
        R2_BUCKET_NAME,

      Key:
        storageKey,

      ResponseContentDisposition:
        `attachment; filename="${safeFileName}"`,
    });

  const downloadUrl =
    await getSignedUrl(
      r2Client,
      command,
      {
        expiresIn:
          DOWNLOAD_URL_EXPIRES_IN,
      }
    );

  return {
    downloadUrl,

    expiresIn:
      DOWNLOAD_URL_EXPIRES_IN,
  };
}


// =========================================================
// DELETE OBJECT
// =========================================================

async function deleteStoredObject(
  storageKey
) {
  if (!storageKey) {
    return;
  }

  const command =
    new DeleteObjectCommand({
      Bucket:
        R2_BUCKET_NAME,

      Key:
        storageKey,
    });

  await r2Client.send(
    command
  );
}


// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  sanitizeFileName,
  createGroupStorageKey,
  createUploadUrl,
  getStoredObjectMetadata,
  createDownloadUrl,
  deleteStoredObject,
};