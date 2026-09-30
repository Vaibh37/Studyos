import { useEffect, useRef, useState } from "react";

function Reveal({ as: Tag = "div", className = "", children, ...props }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return undefined;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      setVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.12,
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`marketing-reveal ${visible ? "is-visible" : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </Tag>
  );
}

export default Reveal;

