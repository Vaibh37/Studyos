import "../styles/marketing.css";
import PublicPageShell from "../components/marketing/PublicPageShell";

const updates = [
  {
    date: "2026-11-28", label: "28 November 2026", title: "Study Rooms V6 — Dynamic Environments",
    description: "Make your study atmosphere feel alive.",
    changes: ["Animated rain, drifting clouds, twinkling night sky and an original snowfall scene.", "Auto scenery follows your device's local day and night cycle, with gentle transitions.", "Blend four ambient sounds with independent levels and a master volume, without interrupting Focus or Shared Zen."],
  },
  {
    date: "2026-11-28", label: "28 November 2026", title: "Study Rooms V5 — Living Desks",
    description: "Make your little study space your own.",
    changes: ["Customize your character, lamp, activity and desk accessories, with animated writing, reading, typing and coffee breaks.", "Unlock plants with verified Focus sessions, and share optional quiet encouragement and saved-session milestones.", "Your desk appears live in the room, shared Zen and the mini dock."],
  },
  {
    date: "2026-11-28", label: "28 November 2026", title: "Study Rooms V4",
    description: "A cinematic shared Zen experience that keeps you connected while you focus.",
    changes: ["Full-screen room scenery, live desks and a large independent Focus timer.", "Smooth desk arrivals, live departures and uninterrupted ambient sound.", "Shareable room links with explicit join confirmation and private-room access checks."],
  },
  {
    date: "2026-11-28", label: "28 November 2026", title: "Study Rooms V3",
    description: "Keep studying together without staying on the room page.",
    changes: ["Your live desk, study time and ambient audio stay active when you navigate the workspace.", "A compact room dock with the timer, live count, pause and resume, sound and leave controls.", "The same verified Focus run works across the room and Focus pages. Explicit leave and sign-out stop room presence."],
  },
  {
    date: "2026-11-28", label: "28 November 2026", title: "Help Center & public status",
    description: "Useful product and support information is easier to find.",
    changes: ["A dedicated Help Center, changelog and public System Status page.", "Direct links to privacy preferences, support and the open-source license.", "A more compact, responsive footer."],
  },
  {
    date: "2026-11-28", label: "28 November 2026", title: "Study Rooms V2",
    description: "Discover active rooms before joining and make each session feel more personal.",
    changes: ["Live directory occupancy and study counts.", "Participant search and sorting in larger rooms.", "Personal scenery, ambient audio and remembered room preferences.", "Updated terms and privacy documentation."],
    commit: "3751094357588e2869bfc786c9f5d16846af70c1",
  },
  {
    date: "2026-11-28", label: "28 November 2026", title: "Study Rooms & appearance",
    description: "A new way to study together, with a choice of calm environments.",
    changes: ["Public quiet, rain, cloud and night rooms, plus private rooms for study groups.", "Live desk illustrations, independently controlled timers and optional subject sharing.", "More illustrated appearance themes and improved keyboard focus styling."],
    commit: "264571c6f231fff1cec22baf6f66762482623986",
  },
  {
    date: "2026-11-27", label: "27 November 2026", title: "A more focused dashboard",
    description: "The dashboard was reorganized around daily Focus and weekly activity.",
    changes: ["A clearer dashboard and improved startup and dashboard loading.", "Custom timer durations in minutes or hours.", "Coffee, Cloud, Rain and Stargaze appearance options.", "Optional public-site analytics now require an explicit choice."],
    image: "dashboard.webp", alt: "StudyOS dashboard with focus and progress information",
    commit: "7c2c4d3ee64354c17ee9dd1051b5e72fa85be928",
  },
  {
    date: "2026-11-26", label: "26 November 2026", title: "Reliability & privacy improvements",
    description: "Background improvements to make StudyOS more dependable.",
    changes: ["Scheduled production health and security checks.", "Expanded automated browser regression testing.", "Improved workspace loading, recovery and keyboard accessibility."],
    commit: "0734388df2e945454c4943f6923f3cc2f1454489",
  },
];

export default function Changelog() {
  return (
    <PublicPageShell title="Changelog" intro="A curated history of recent StudyOS releases and improvements.">
      {updates.map(update => (
        <section key={update.title} className="public-changelog-entry">
          <time dateTime={update.date}>{update.label}</time>
          <h2>{update.title}</h2>
          <p>{update.description}</p>
          <ul>{update.changes.map(change => <li key={change}>{change}</li>)}</ul>
          {update.image && (
            <figure>
              <img src={"/studyos-screenshots/" + update.image} alt={update.alt} loading="lazy" decoding="async" width="1200" />
              <figcaption>{update.alt}</figcaption>
            </figure>
          )}
          {update.commit && <p><a href={"https://github.com/Vaibh37/Studyos/commit/" + update.commit} target="_blank" rel="noreferrer">Related source changes</a></p>}
        </section>
      ))}
      <section>
        <h2>Full development history</h2>
        <p>For every code change, visit the <a href="https://github.com/Vaibh37/Studyos/commits/main/" target="_blank" rel="noreferrer">GitHub commit history</a>. Upcoming work is tracked in the <a href="https://github.com/Vaibh37/Studyos#roadmap" target="_blank" rel="noreferrer">roadmap</a>.</p>
      </section>
    </PublicPageShell>
  );
}
