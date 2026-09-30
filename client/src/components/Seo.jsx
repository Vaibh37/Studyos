import {
  useEffect,
} from "react";

const SITE_URL =
  "https://studyos37.vercel.app";

const DEFAULT_IMAGE =
  "https://studyos37.vercel.app/studyos-screenshots/dashboard.png";

const ensureMeta =
  (
    selector,
    attributes
  ) => {
    let element =
      document.head.querySelector(
        selector
      );

    if (!element) {
      element =
        document.createElement(
          "meta"
        );

      document.head.appendChild(
        element
      );
    }

    Object.entries(
      attributes
    ).forEach(
      ([
        key,
        value,
      ]) => {
        element.setAttribute(
          key,
          value
        );
      }
    );

    return element;
  };

const ensureCanonical =
  (
    href
  ) => {
    let link =
      document.head.querySelector(
        'link[rel="canonical"]'
      );

    if (!link) {
      link =
        document.createElement(
          "link"
        );

      link.setAttribute(
        "rel",
        "canonical"
      );

      document.head.appendChild(
        link
      );
    }

    link.setAttribute(
      "href",
      href
    );
  };

function Seo({
  title,
  description,
  path = "/",
  image = DEFAULT_IMAGE,
  structuredData = null,
}) {
  useEffect(
    () => {
      const normalizedPath =
        path === "/"
          ? "/"
          : `/${String(path)
              .replace(
                /^\/+|\/+$/g,
                ""
              )}`;

      const canonicalUrl =
        `${SITE_URL}${normalizedPath}`;

      document.title =
        title;

      ensureMeta(
        'meta[name="description"]',
        {
          name:
            "description",

          content:
            description,
        }
      );

      ensureMeta(
        'meta[name="robots"]',
        {
          name:
            "robots",

          content:
            "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
        }
      );

      ensureMeta(
        'meta[property="og:type"]',
        {
          property:
            "og:type",

          content:
            "website",
        }
      );

      ensureMeta(
        'meta[property="og:site_name"]',
        {
          property:
            "og:site_name",

          content:
            "StudyOS",
        }
      );

      ensureMeta(
        'meta[property="og:url"]',
        {
          property:
            "og:url",

          content:
            canonicalUrl,
        }
      );

      ensureMeta(
        'meta[property="og:title"]',
        {
          property:
            "og:title",

          content:
            title,
        }
      );

      ensureMeta(
        'meta[property="og:description"]',
        {
          property:
            "og:description",

          content:
            description,
        }
      );

      ensureMeta(
        'meta[property="og:image"]',
        {
          property:
            "og:image",

          content:
            image,
        }
      );

      ensureMeta(
        'meta[name="twitter:card"]',
        {
          name:
            "twitter:card",

          content:
            "summary_large_image",
        }
      );

      ensureMeta(
        'meta[name="twitter:title"]',
        {
          name:
            "twitter:title",

          content:
            title,
        }
      );

      ensureMeta(
        'meta[name="twitter:description"]',
        {
          name:
            "twitter:description",

          content:
            description,
        }
      );

      ensureMeta(
        'meta[name="twitter:image"]',
        {
          name:
            "twitter:image",

          content:
            image,
        }
      );

      ensureCanonical(
        canonicalUrl
      );

      const scriptId =
        "studyos-structured-data";

      const existingScript =
        document.getElementById(
          scriptId
        );

      if (
        structuredData
      ) {
        const script =
          existingScript ||
          document.createElement(
            "script"
          );

        script.id =
          scriptId;

        script.type =
          "application/ld+json";

        script.textContent =
          JSON.stringify(
            structuredData
          );

        if (
          !existingScript
        ) {
          document.head.appendChild(
            script
          );
        }
      } else if (
        existingScript
      ) {
        existingScript.remove();
      }
    },
    [
      title,
      description,
      path,
      image,
      structuredData,
    ]
  );

  return null;
}

export default Seo;
