import "../styles/marketing.css";

import PublicPageShell from "../components/marketing/PublicPageShell";

function Terms() {
  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Terms & Conditions"
      intro="Readable terms for StudyOS as an independent productivity software project."
    >
      <p className="marketing-document-updated">Last updated: September 30, 2026</p>

      <section>
        <h2>1. About StudyOS</h2>
        <p>
          StudyOS is an independent software project that provides tools for study
          planning, notes, Focus sessions, progress tracking and optional
          leaderboard participation. References to “StudyOS” in these terms mean
          the project and its operator; they do not represent a separate registered
          company unless that changes in the future.
        </p>
      </section>

      <section>
        <h2>2. Using the service</h2>
        <p>
          You may use StudyOS for lawful personal productivity and study-related
          purposes. You are responsible for the information you add, the actions
          taken through your account, and keeping access to your account reasonably
          secure.
        </p>
      </section>

      <section>
        <h2>3. Accounts and Guest Mode</h2>
        <p>
          Some features can be used in Guest Mode without creating an account.
          Account Mode uses Firebase Authentication. Features that depend on an
          account or public identity, including leaderboard participation, may not
          be available to guests.
        </p>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>You agree not to intentionally:</p>
        <ul>
          <li>interfere with or overload StudyOS or its infrastructure;</li>
          <li>attempt to access another person’s account or private data;</li>
          <li>use automated or deceptive activity to manipulate XP or leaderboard results;</li>
          <li>use the service in a way that violates applicable law or third-party rights.</li>
        </ul>
      </section>

      <section>
        <h2>5. Leaderboard</h2>
        <p>
          The leaderboard is an optional product feature intended to reflect
          eligible activity recorded inside StudyOS. Scoring rules can change as
          abuse prevention and product logic improve. StudyOS may remove clearly
          manipulated leaderboard activity or restrict leaderboard participation
          where necessary to protect the feature.
        </p>
      </section>

      <section>
        <h2>6. Your content and backups</h2>
        <p>
          You remain responsible for the study content and information you enter.
          StudyOS includes backup/export functionality as a convenience, but you
          should keep your own copy of information that you cannot afford to lose.
        </p>
      </section>

      <section>
        <h2>7. Availability and changes</h2>
        <p>
          StudyOS is actively developed. Features, limits, infrastructure and
          availability can change, and the service can occasionally be unavailable
          because of maintenance, provider outages, bugs or development changes.
          No uninterrupted-availability guarantee is made.
        </p>
      </section>

      <section>
        <h2>8. Suspension, reset and deletion</h2>
        <p>
          StudyOS may restrict abusive use that threatens the service or other
          users. You can use the deletion/reset controls currently provided in the
          application. Product behavior around account deletion may evolve as the
          project develops.
        </p>
      </section>

      <section>
        <h2>9. No academic guarantee</h2>
        <p>
          StudyOS is a productivity tool. It does not guarantee academic results,
          exam performance, grades, admissions or any specific learning outcome.
          Decisions about how you study remain yours.
        </p>
      </section>

      <section>
        <h2>10. Limitation</h2>
        <p>
          StudyOS is provided on an “as available” basis as an independent software
          project. To the extent permitted by applicable law, the project operator
          is not responsible for indirect losses arising from service interruption,
          lost local data, user error or reliance on the service. Nothing here
          excludes rights or responsibilities that cannot legally be excluded.
        </p>
      </section>

      <section>
        <h2>11. Changes to these terms</h2>
        <p>
          These terms may be updated as StudyOS changes. The “Last updated” date on
          this page indicates the current published version.
        </p>
      </section>
    </PublicPageShell>
  );
}

export default Terms;

