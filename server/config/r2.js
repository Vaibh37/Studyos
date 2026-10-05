const {
  S3Client,
} =
  require(
    "@aws-sdk/client-s3"
  );


// =========================================================
// REQUIRED ENV
// =========================================================

const requiredEnvKeys = [
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
  "R2_BUCKET_NAME",
];


const missingEnvKeys =
  requiredEnvKeys.filter(
    (
      key
    ) =>
      !process.env[
        key
      ]
  );


if (
  missingEnvKeys.length >
  0
) {
  throw new Error(
    `Missing R2 environment variables: ${missingEnvKeys.join(
      ", "
    )}`
  );
}


// =========================================================
// CONFIG
// =========================================================

const R2_BUCKET_NAME =
  process.env.R2_BUCKET_NAME;

const R2_REGION =
  process.env.R2_REGION ||
  "auto";


// =========================================================
// CLIENT
// =========================================================

const r2Client =
  new S3Client({
    region:
      R2_REGION,

    endpoint:
      process.env.R2_ENDPOINT,

    credentials: {
      accessKeyId:
        process.env.R2_ACCESS_KEY_ID,

      secretAccessKey:
        process.env.R2_SECRET_ACCESS_KEY,
    },

    forcePathStyle:
      false,
  });


// =========================================================
// EXPORTS
// =========================================================

module.exports = {
  r2Client,
  R2_BUCKET_NAME,
  R2_REGION,
};