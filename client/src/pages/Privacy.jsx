import "../styles/marketing.css";

import PublicPageShell from "../components/marketing/PublicPageShell";
import AnalyticsPreference from "../components/AnalyticsPreference";

function Privacy() {
  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Privacy Policy"
      intro="How StudyOS handles your account, study content, groups, and privacy choices."
    >
      <p className="marketing-document-updated">Last updated: November 27, 2026</p>

      <section>
        <h2>1. What StudyOS stores</h2>
        <p>
          StudyOS supports two ways to use the product. In <strong>Guest Mode</strong>,
          study data is stored locally in your browser using IndexedDB. In
          <strong> Account Mode</strong>, StudyOS uses Firebase Authentication for
          sign-in and sends application data through the StudyOS Express API for
          storage in MongoDB.
        </p>
      </section>

      <section>
        <h2>2. Authentication data</h2>
        <p>
          Account sign-in is handled with Firebase Authentication. StudyOS uses
          the authenticated Firebase user and Firebase ID token to verify account
          requests with the backend. The app can use basic profile information
          supplied by your authentication method, such as your display name and
          email address, for account functionality.
        </p>
      </section>

      <section>
        <h2>3. Guest Mode</h2>
        <p>
          Guest Mode does not require an account. Tasks, subjects, notes, calendar
          events and Focus-session data created as a guest are stored in IndexedDB
          in the browser you are using. Clearing browser/site data can remove this
          local data.
        </p>
        <p>
          If you later sign in, StudyOS can detect guest records and offer to move
          them into your account. The current migration flow does not clear guest
          records unless the migration completes successfully.
        </p>
      </section>

      <section>
        <h2>4. Leaderboard privacy</h2>
        <p>
          Leaderboard participation is opt-in. StudyOS does not publish your email,
          tasks, notes, subject content or calendar details on the leaderboard.
          Public leaderboard information can include your chosen public display
          name, ranking and aggregate StudyOS activity used to calculate ranking.
        </p>
      </section>

      <section>
        <h2>5. Study groups and messages</h2>
        <p>
          Account users can participate in study groups. StudyOS processes group
          membership, display names, messages, reactions, study activity and
          uploaded files to provide these features. Information you share in a
          group may be visible to other authorized members. Group messaging is
          not offered as end-to-end encrypted communication; avoid sharing
          sensitive personal information or information about other people.
        </p>
        <p>
          Group records are stored in the backend database. Attachments are stored
          in Cloudflare R2 and access is controlled by the application's group
          authorization rules.
        </p>
      </section>

      <section>
        <h2>6. Browser notifications</h2>
        <p>
          StudyOS includes optional browser-notification settings. Notification
          permission is controlled by your browser. You can deny or revoke that
          permission from your browser or site settings.
        </p>
      </section>

      <section>
        <h2>7. Backup and restore</h2>
        <p>
          StudyOS can create portable JSON backups containing StudyOS data and
          preferences. A backup file is handled wherever you choose to save it.
          Keep exported backups private if they contain information you consider
          sensitive.
        </p>
      </section>

      <section>
        <h2>8. Data reset and deletion</h2>
        <p>
          StudyOS includes data-reset and account-deletion controls in Settings.
          Review the confirmation shown in the application before using destructive
          actions. Guest data can also be removed by clearing the relevant site data
          from your browser.
        </p>
        <p>
          Other members may retain information they copied or received outside
          StudyOS. Backup and security records may have separate retention
          periods. For questions about deletion, access or correction, use the
          privacy contact below.
        </p>
      </section>

      <section>
        <h2>9. Infrastructure providers and service security</h2>
        <p>
          StudyOS currently relies on third-party infrastructure to operate:
          Firebase for authentication, Vercel for the frontend, Render for the
          backend, MongoDB Atlas for account and group data, and Cloudflare R2
          for group attachments. Google Identity Services supports Google sign-in,
          and Google reCAPTCHA/Firebase App Check and Cloudflare Turnstile may
          operate for abuse prevention when configured. Providers may process
          technical information, including IP address, device and request
          information, to deliver and secure the service. Hosting and security
          logs are separate from optional audience analytics.
        </p>
      </section>

      <section>
        <h2>10. Browser storage and optional analytics</h2>
        <p>
          StudyOS uses browser storage for authentication, preferences, guest
          data and application functionality. These features do not depend on
          optional audience analytics.
        </p>
        <p>
          Google Analytics was previously used but is no longer loaded by
          StudyOS. Optional Vercel Web Analytics is disabled unless you enable it
          below. It measures visits to selected public informational pages and
          may process visit timestamps, page address, referrer, approximate
          location, browser and device information. StudyOS excludes workspace
          and sign-in routes and removes query parameters and fragments from
          the measured page address. It does not intentionally send your study
          content, chat messages or account identity as analytics events.
        </p>
        <p>
          You can withdraw your preference at any time here using the same
          browser. Your choice is stored locally and does not apply automatically
          to another device. Global Privacy Control is respected.
        </p>
        <AnalyticsPreference />
      </section>

      <section>
        <h2>11. Children and guardians</h2>
        <p>
          StudyOS is used for study-related activities, which may include younger
          people. Parents and guardians can contact the project operator with
          questions about a child's information, access or deletion. Do not
          submit another person's private information without authorization.
        </p>
      </section>

      <section>
        <h2>12. Security</h2>
        <p>
          StudyOS uses the authentication and access controls implemented in the
          current application and backend, but no online service can promise
          absolute security. Do not store information in StudyOS that you would not
          be comfortable keeping in a personal productivity service.
        </p>
      </section>

      <section>
        <h2>13. Changes and contact</h2>
        <p>
          This policy may change as StudyOS changes. Material product changes should
          be reflected in an updated version of this page. For privacy questions or
          direct project contact, email the StudyOS operator. Bug reports can also be
          filed through the public GitHub issue tracker.
        </p>
        <p>
          <a href="mailto:devvaibhav37@gmail.com?subject=StudyOS%20Privacy">
            devvaibhav37@gmail.com →
          </a>
        </p>
        <p>
          <a href="https://github.com/Vaibh37/Studyos/issues" target="_blank" rel="noreferrer">
            Open StudyOS issues on GitHub →
          </a>
        </p>
      </section>
    </PublicPageShell>
  );
}

export default Privacy;
