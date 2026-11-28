import { Link } from "react-router";
import "../styles/marketing.css";
import PublicPageShell from "../components/marketing/PublicPageShell";

const guides = [
  ["getting-started", "Getting started"],
  ["focus", "Focus timer & Zen Mode"],
  ["study-rooms", "Study Rooms"],
  ["organize", "Tasks, notes & calendar"],
  ["groups", "Study Groups & leaderboard"],
  ["account-data", "Account & data"],
  ["troubleshooting", "Troubleshooting"],
];

export default function Help() {
  return (
    <PublicPageShell title="Help Center" intro="Find practical answers for using StudyOS, managing your data and getting unstuck.">
      <nav className="public-guide-nav" aria-label="Help topics">
        {guides.map(([id, label]) => <a key={id} href={"#" + id}>{label}</a>)}
      </nav>

      <section id="getting-started">
        <h2>Getting started</h2>
        <p>Use StudyOS in your browser or install it as a web app if your browser offers installation. You can begin with Guest Mode or sign in with Google or email.</p>
        <ol>
          <li>Open <Link to="/get-started">StudyOS</Link> and choose a way to continue.</li>
          <li>Create a subject and add your first task or note.</li>
          <li>Start a Focus session and review your study time in Progress.</li>
        </ol>
        <p>Guest study records stay on the device and browser where they were created. Account Mode makes account-backed features and collaboration available.</p>
      </section>

      <section id="focus">
        <h2>Focus timer & Zen Mode</h2>
        <p>Open Focus, choose a preset or enter a custom duration in minutes or hours, and optionally select a subject. Start the timer and use pause or resume when you need a break. Completed, eligible sessions appear in your study history.</p>
        <p>Use Zen Mode for a distraction-reduced focus view. Choose an available appearance in Settings or a room atmosphere in Study Rooms.</p>
        <p><a href="/focus-timer">Explore the Focus timer</a></p>
      </section>

      <section id="study-rooms">
        <h2>Study Rooms</h2>
        <p>Quiet live spaces for studying alongside other people, without a camera or microphone. Sign in, choose a public room, or join a private room associated with one of your study groups.</p>
        <ul>
          <li>Join a room and start your own Focus timer. See who is studying, on a break or at their desk.</li>
          <li>Keep your room and ambient audio active while using Notes, Tasks or other workspace pages. Use the mini room dock to pause or resume, mute sound, return or leave.</li>
          <li>Choose a personal atmosphere and optional ambient sound. Sound is off until you choose to play it.</li>
          <li>Open Zen inside a room to see your full-screen atmosphere, live desks and Focus timer together. Your sound continues while you enter or exit Zen.</li>
          <li>Choose Customize desk to personalize the character, lamp, study activity and accessories. Plants unlock with saved verified sessions of at least 20 minutes. Optional encouragement and shared milestones are silent.</li>
          <li>Use Invite to share a room link. Recipients choose whether to join. Private links work only for current group members.</li>
          <li>Your display name and room focus status are visible to other room participants. Subject names stay private unless you enable sharing.</li>
          <li>Room time reflects the current visit, not your entire study history. Leaving the room ends your live presence.</li>
        </ul>
        <p><Link to="/app/study-rooms">Open Study Rooms</Link></p>
      </section>

      <section id="organize">
        <h2>Tasks, notes & calendar</h2>
        <p>Create subjects to organize related material. Add tasks with due dates and priorities, and use Notes for revision material. Pin important notes and filter or search for information later. Calendar brings your events and deadlines together.</p>
        <p><a href="/study-planner">Study planner guide</a> · <a href="/notes">Notes guide</a> · <a href="/progress">Progress tracking</a></p>
      </section>

      <section id="groups">
        <h2>Study Groups & leaderboard</h2>
        <p>Sign in to create or join groups. Use an invitation code for private groups, share messages and files only with people who should receive them, and respect other members. Group messaging is not end-to-end encrypted.</p>
        <p>The global leaderboard is optional. Change participation and your public display name in Settings. Private notes, tasks and email addresses are not displayed on the public leaderboard.</p>
        <p><a href="/study-groups">Study Groups guide</a> · <a href="/#leaderboard">Leaderboard overview</a></p>
      </section>

      <section id="account-data">
        <h2>Account & data</h2>
        <dl className="public-faq">
          <dt>How do I keep a backup?</dt>
          <dd>Open Settings and use the available backup/export tools. Keep the exported file somewhere safe and private. Browser storage and account data are not a substitute for your own backup.</dd>
          <dt>Can I move Guest Mode data into an account?</dt>
          <dd>When you sign in, StudyOS can offer to migrate detected guest records. Keep the original browser data until migration has completed.</dd>
          <dt>How do I delete my account?</dt>
          <dd>Open Settings and follow account deletion. You must delete any study groups you own and verify your identity first. Export data you want to keep before deleting it.</dd>
          <dt>Can I disable analytics?</dt>
          <dd>Yes. Optional analytics are off by default and can be controlled in <Link to="/privacy#analytics-preferences">Privacy preferences</Link>.</dd>
        </dl>
      </section>

      <section id="troubleshooting">
        <h2>Troubleshooting</h2>
        <dl className="public-faq">
          <dt>StudyOS is slow to load or cannot connect</dt>
          <dd>Check your internet connection and <Link to="/status">System Status</Link>. The backend can take a moment to wake after being idle. Avoid clearing site data if you have guest records that are not backed up.</dd>
          <dt>I cannot sign in</dt>
          <dd>Check your sign-in method and internet connection, allow the required sign-in window if your browser blocks it, and try again. Never share your password or verification codes with support.</dd>
          <dt>Notifications or room sound are not working</dt>
          <dd>Check browser notification permissions and whether the tab or device is muted. Ambient audio requires you to start it; your browser may restrict background playback.</dd>
        </dl>
      </section>

      <section>
        <h2>Still need help?</h2>
        <p><Link to="/contact">Contact StudyOS</Link> for support, or <a href="https://github.com/Vaibh37/Studyos/issues/new" target="_blank" rel="noreferrer">report a bug</a> with steps to reproduce it. For abuse, privacy or security concerns, <a href="mailto:devvaibhav37@gmail.com?subject=StudyOS%20Support">email privately</a> rather than posting personal information in a public issue.</p>
      </section>
    </PublicPageShell>
  );
}
