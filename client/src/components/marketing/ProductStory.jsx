import { useState } from "react";

const story = [
  {
    key: "plan",
    title: "Plan",
    copy: "Organize tasks by subject and keep deadlines visible on your calendar.",
    image: "/studyos-screenshots/tasks.png",
    alt: "StudyOS Tasks page with priorities, subjects and deadlines",
  },
  {
    key: "focus",
    title: "Focus",
    copy: "Start a timed session for a subject, then pause or resume as needed.",
    image: "/studyos-screenshots/focus.png",
    alt: "StudyOS Focus page with the study timer and session controls",
  },
  {
    key: "review",
    title: "Review",
    copy: "See study time, weekly activity and subject distribution in your progress history.",
    image: "/studyos-screenshots/progress.png",
    alt: "StudyOS Progress page with focus trends and study analytics",
  },
  {
    key: "compete",
    title: "Compete",
    copy: "Choose whether to join the weekly leaderboard and compare eligible study activity.",
    image: "/studyos-screenshots/leaderboard.png",
    alt: "StudyOS Leaderboard showing weekly student rankings",
  },
];

function ProductStory() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = story[activeIndex];

  return (
    <section id="story" className="marketing-story marketing-section" aria-labelledby="story-title">
      <div className="marketing-shell">
        <div className="marketing-section-heading">
          <h2 id="story-title">From planning to progress.</h2>
          <p>Choose a step to see what it looks like inside StudyOS.</p>
        </div>

        <div className="marketing-walkthrough">
          <div className="marketing-walkthrough-controls" role="group" aria-label="Choose a study workflow step">
            {story.map((item, index) => (
              <button
                key={item.key}
                type="button"
                className="marketing-walkthrough-button"
                aria-pressed={activeIndex === index}
                aria-controls="study-workflow-preview"
                onClick={() => setActiveIndex(index)}
              >
                <span className="marketing-walkthrough-number" aria-hidden="true">0{index + 1}</span>
                <span>{item.title}</span>
              </button>
            ))}
          </div>

          <div id="study-workflow-preview" className="marketing-walkthrough-preview">
            <div className="marketing-product-frame marketing-walkthrough-frame">
              {story.map((item, index) => (
                <img
                  key={item.key}
                  className={activeIndex === index ? "is-active" : ""}
                  src={item.image}
                  alt={item.alt}
                  aria-hidden={activeIndex !== index}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
            <p className="marketing-walkthrough-caption" aria-live="polite">{active.copy}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ProductStory;
