import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  Download,
  File,
  FileImage,
  FileText,
  LoaderCircle,
  X,
} from "lucide-react";

import {
  formatAttachmentSize,
  getGroupAttachmentDownloadUrl,
} from "../../services/groupAttachmentData";


// =========================================================
// HELPERS
// =========================================================

const isImageAttachment =
  (
    attachment
  ) =>
    String(
      attachment?.mimeType ||
        ""
    ).startsWith(
      "image/"
    );


const getFileIcon =
  (
    attachment
  ) => {
    const mimeType =
      String(
        attachment?.mimeType ||
          ""
      );


    if (
      mimeType.startsWith(
        "image/"
      )
    ) {
      return FileImage;
    }


    if (
      mimeType ===
        "application/pdf" ||
      mimeType.startsWith(
        "text/"
      )
    ) {
      return FileText;
    }


    return File;
  };


// =========================================================
// CHAT ATTACHMENT CARD
// =========================================================

function ChatAttachmentCard({
  groupId,
  messageId,
  attachment,
}) {
  const [
    previewUrl,
    setPreviewUrl,
  ] =
    useState("");


  const [
    previewLoading,
    setPreviewLoading,
  ] =
    useState(false);


  const [
    downloading,
    setDownloading,
  ] =
    useState(false);


  const [
    failedPreview,
    setFailedPreview,
  ] =
    useState(false);


  const [
    previewRefreshKey,
    setPreviewRefreshKey,
  ] =
    useState(0);


  const [
    previewRetryCount,
    setPreviewRetryCount,
  ] =
    useState(0);


  const [
    previewOpen,
    setPreviewOpen,
  ] =
    useState(false);


  const [
    portalHost,
    setPortalHost,
  ] =
    useState(() => {
      if (
        typeof document ===
        "undefined"
      ) {
        return null;
      }


      return (
        document.fullscreenElement ||
        document.body
      );
    });


  const imageAttachment =
    isImageAttachment(
      attachment
    );


  const FileIcon =
    getFileIcon(
      attachment
    );


  // =======================================================
  // KEEP PORTAL HOST CURRENT
  // =======================================================

  useEffect(
    () => {
      const syncPortalHost =
        () => {
          setPortalHost(
            document.fullscreenElement ||
              document.body
          );
        };


      syncPortalHost();


      document.addEventListener(
        "fullscreenchange",
        syncPortalHost
      );


      return () => {
        document.removeEventListener(
          "fullscreenchange",
          syncPortalHost
        );
      };
    },
    []
  );


  // =======================================================
  // IMAGE PREVIEW URL
  // =======================================================

  useEffect(
    () => {
      let active =
        true;


      if (
        !groupId ||
        !messageId ||
        !attachment?.storageKey ||
        !imageAttachment
      ) {
        setPreviewUrl(
          ""
        );

        return () => {};
      }


      const loadPreview =
        async () => {
          try {
            setPreviewLoading(
              true
            );

            setFailedPreview(
              false
            );


            const response =
              await getGroupAttachmentDownloadUrl({
                groupId,

                messageId,

                storageKey:
                  attachment.storageKey,
              });


            if (
              active
            ) {
              setPreviewUrl(
                response.downloadUrl
              );
            }
          } catch (
            error
          ) {
            console.error(
              "Attachment preview failed:",
              error
            );


            if (
              active
            ) {
              setFailedPreview(
                true
              );

              setPreviewUrl(
                ""
              );
            }
          } finally {
            if (
              active
            ) {
              setPreviewLoading(
                false
              );
            }
          }
        };


      loadPreview();


      return () => {
        active =
          false;
      };
    },
    [
      groupId,
      messageId,
      attachment?.storageKey,
      attachment?.mimeType,
      imageAttachment,
      previewRefreshKey,
    ]
  );


  // =======================================================
  // =======================================================
  // PREVIEW URL RECOVERY
  // =======================================================

  const handlePreviewImageLoad =
    () => {
      setFailedPreview(
        false
      );

      setPreviewRetryCount(
        0
      );
    };


  const handlePreviewImageError =
    () => {
      if (
        previewRetryCount >=
        1
      ) {
        setFailedPreview(
          true
        );

        setPreviewLoading(
          false
        );

        return;
      }


      setFailedPreview(
        false
      );

      setPreviewRetryCount(
        1
      );

      setPreviewLoading(
        true
      );

      setPreviewRefreshKey(
        (
          current
        ) =>
          current + 1
      );
    };

  // FULLSCREEN IMAGE PREVIEW
  // =======================================================

  useEffect(
    () => {
      if (
        !previewOpen
      ) {
        return undefined;
      }


      const previousOverflow =
        document.body.style.overflow;


      document.body.style.overflow =
        "hidden";


      const handleKeyDown =
        (
          event
        ) => {
          if (
            event.key !==
            "Escape"
          ) {
            return;
          }


          event.preventDefault();

          event.stopPropagation();

          event.stopImmediatePropagation();


          setPreviewOpen(
            false
          );
        };


      window.addEventListener(
        "keydown",
        handleKeyDown,
        true
      );


      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown,
          true
        );


        document.body.style.overflow =
          previousOverflow;
      };
    },
    [
      previewOpen,
    ]
  );


  // =======================================================
  // OPEN / CLOSE PREVIEW
  // =======================================================

  const openPreview =
    () => {
      if (
        !previewUrl ||
        failedPreview
      ) {
        return;
      }


      setPortalHost(
        document.fullscreenElement ||
          document.body
      );


      setPreviewOpen(
        true
      );
    };


  const closePreview =
    () => {
      setPreviewOpen(
        false
      );
    };


  // =======================================================
  // DOWNLOAD
  // =======================================================

  const handleDownload =
    async (
      event
    ) => {
      event?.stopPropagation();


      if (
        downloading ||
        !groupId ||
        !messageId ||
        !attachment?.storageKey
      ) {
        return;
      }


      try {
        setDownloading(
          true
        );


        const response =
          await getGroupAttachmentDownloadUrl({
            groupId,

            messageId,

            storageKey:
              attachment.storageKey,
          });


        const anchor =
          document.createElement(
            "a"
          );


        anchor.href =
          response.downloadUrl;

        anchor.rel =
          "noopener noreferrer";

        anchor.target =
          "_blank";


        document.body.appendChild(
          anchor
        );


        anchor.click();


        anchor.remove();
      } catch (
        error
      ) {
        console.error(
          "Attachment download failed:",
          error
        );
      } finally {
        setDownloading(
          false
        );
      }
    };


  // =======================================================
  // LIGHTBOX
  // =======================================================

  const lightbox =
    previewOpen &&
    previewUrl &&
    !failedPreview ? (
      <div
        className="chats-image-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={
          attachment?.fileName ||
          "Image preview"
        }
        onMouseDown={(
          event
        ) => {
          if (
            event.target ===
            event.currentTarget
          ) {
            closePreview();
          }
        }}
      >
        <div className="chats-image-lightbox-toolbar">
          <div className="chats-image-lightbox-name">
            {attachment?.fileName ||
              "Image"}
          </div>


          <div className="chats-image-lightbox-actions">
            <button
              type="button"
              onClick={
                handleDownload
              }
              disabled={
                downloading
              }
              aria-label="Download image"
              title="Download"
            >
              {downloading ? (
                <LoaderCircle
                  size={19}
                  className="chats-attachment-spinner"
                />
              ) : (
                <Download
                  size={19}
                />
              )}
            </button>


            <button
              type="button"
              onClick={
                closePreview
              }
              aria-label="Close image preview"
              title="Close"
            >
              <X
                size={21}
              />
            </button>
          </div>
        </div>


        <div
          className="chats-image-lightbox-content"
          onMouseDown={(
            event
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closePreview();
            }
          }}
        >
          <img
            src={
              previewUrl
            }
            alt={
              attachment?.fileName ||
              "Chat attachment"
            }
            draggable="false"
            onLoad={
              handlePreviewImageLoad
            }
            onError={
              handlePreviewImageError
            }
          />
        </div>
      </div>
    ) : null;


  // =======================================================
  // RENDER
  // =======================================================

  return (
    <>
      <div
        className={`chats-attachment-card ${
          imageAttachment
            ? "is-image"
            : "is-file"
        }`}
      >
        {imageAttachment && (
          <div className="chats-attachment-preview">
            {previewLoading ? (
              <div className="chats-attachment-preview-state">
                <LoaderCircle
                  size={20}
                  className="chats-attachment-spinner"
                />
              </div>
            ) : previewUrl &&
              !failedPreview ? (
              <button
                type="button"
                className="chats-attachment-preview-button"
                onClick={
                  openPreview
                }
                aria-label={`Open ${
                  attachment?.fileName ||
                  "image"
                } preview`}
                title="Open image"
              >
                <img
                  src={
                    previewUrl
                  }
                  alt={
                    attachment?.fileName ||
                    "Chat attachment"
                  }
                  loading="lazy"
                  onLoad={
                    handlePreviewImageLoad
                  }
                  onError={
                    handlePreviewImageError
                  }
                />
              </button>
            ) : (
              <div className="chats-attachment-preview-state">
                <FileImage
                  size={22}
                />
              </div>
            )}
          </div>
        )}


        {!imageAttachment && (
          <div className="chats-attachment-info">
            <span className="chats-attachment-file-icon">
              <FileIcon
                size={18}
              />
            </span>


            <div className="chats-attachment-details">
              <strong
                title={
                  attachment?.fileName ||
                  "Attachment"
                }
              >
                {attachment?.fileName ||
                  "Attachment"}
              </strong>


              <span>
                {formatAttachmentSize(
                  attachment?.size
                )}
              </span>
            </div>


            <button
              type="button"
              className="chats-attachment-download"
              onClick={
                handleDownload
              }
              disabled={
                downloading
              }
              aria-label={`Download ${
                attachment?.fileName ||
                "attachment"
              }`}
              title="Download"
            >
              {downloading ? (
                <LoaderCircle
                  size={17}
                  className="chats-attachment-spinner"
                />
              ) : (
                <Download
                  size={17}
                />
              )}
            </button>
          </div>
        )}
      </div>


      {lightbox &&
        portalHost &&
        createPortal(
          lightbox,
          portalHost
        )}
    </>
  );
}


export default ChatAttachmentCard;
