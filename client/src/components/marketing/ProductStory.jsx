import { useEffect, useRef, useState } from "react";

import Reveal from "./Reveal";

const story = [
  {
    key: "plan",
    number: "01",
    title: "Plan",
    headline: "Organize what matters.",
    copy: "Tasks, subjects, deadlines and calendar events stay connected instead of living in separate tools.",
    image: "/studyos-screenshots/tasks.png",
    alt: "StudyOS Tasks page with priorities, subjects and deadlines",
  },
  {
    key: "focus",
    number: "02",
    title: "Focus",
    headline: "Turn plans into actual work.",
    copy: "Run subject-linked Focus sessions and build an accurate history of where your study time went.",
    image: "/studyos-screenshots/focus.png",
    alt: "StudyOS Focus page with the study timer and session controls",
  },
  {
    key: "review",
    number: "03",
    title: "Review",
    headline: "See what your effort adds up to.",
    copy: "Understand Focus time, consistency, subject distribution and weekly study patterns without manual tracking.",
    image: "/studyos-screenshots/progress.png",
    alt: "StudyOS Progress page with focus trends and study analytics",
  },
  {
    key: "compete",
    number: "04",
    title: "Compete",
    headline: "Make consistency visible.",
    copy: "Earn XP through real StudyOS activity and, if you choose, take part in the weekly leaderboard.",
    image: "/studyos-screenshots/leaderboard.png",
    alt: "StudyOS Leaderboard showing weekly student rankings",
  },
];

function ProductStory() {
  const stepRefs = useRef([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const index = Number(visible.target.dataset.storyIndex);
          setActiveIndex(index);
        }
      },
      {
        rootMargin: "-20% 0px -35% 0px",
        threshold: [0.2, 0.45, 0.7],
      }
    );

    stepRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="story" className="marketing-story marketing-section" aria-labelledby="story-title">
      <div className="marketing-shell">
        <Reveal className="marketing-section-heading marketing-section-heading-wide">
          <span className="marketing-kicker">Plan → Focus → Review</span>
          <h2 id="story-title">A study workflow that stays connected.</h2>
          <p>
            StudyOS is built around the loop that matters: decide what to do,
            do the work, then understand the result.
          </p>
        </Reveal>

        <div className="marketing-story-grid">
          <div className="marketing-story-steps">
            {story.map((item, index) => (
              <article
                key={item.key}
                ref={(node) => {
                  stepRefs.current[index] = node;
                }}
                data-story-index={index}
                className={`marketing-story-step ${activeIndex === index ? "is-active" : ""}`}
              >
                <span className="marketing-story-number">{item.number}</span>
                <span className="marketing-story-label">{item.title}</span>
                <h3>{item.headline}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>

          <div className="marketing-story-sticky" aria-live="polite">
            <div className="marketing-story-visual">
              <div className="marketing-product-frame-bar" aria-hidden="true">
                <span />
                <span />
                <span />
                <small>StudyOS / {story[activeIndex].title}</small>
              </div>

              <div className="marketing-story-images">
                {story.map((item, index) => (
                  <img
                    key={item.key}
                    className={activeIndex === index ? "is-active" : ""}
                    src={item.image}
                    alt={item.alt}
                    loading="lazy"
                    decoding="async"
                    aria-hidden={activeIndex !== index}
                  />
                ))}
              </div>
            </div>

            <div className="marketing-story-progress" aria-hidden="true">
              {story.map((item, index) => (
                <span key={item.key} className={index <= activeIndex ? "is-active" : ""} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductStory;

