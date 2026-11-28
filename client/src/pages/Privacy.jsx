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
      <p className="marketing-document-updated">Last updated: November 28, 2026</p>

      <section>
        <h2>1. What StudyOS stores</h2>
        <p>
          StudyOS supports two ways to use the product. In <strong>Guest Mode</strong>,
          study data is stored locally in your browser using IndexedDB. In
          <strong> Account Mode</strong>, StudyOS uses Firebase Authentication for
          sign-in and sends application data through the StudyOS Express API for
          storage in MongoDB.
        </p>
        <p>Depending on the mode and features you use, information may include:</p>
        <ul>
          <li>Account and profile data: user identifier, display name, email address and authentication information.</li>
          <li>Workspace data: tasks, subjects, notes, calendar events, focus activity, study and visit streaks, XP and preferences you save.</li>
          <li>Collaboration data: group memberships, messages, reactions, attachments, room presence and eligible shared study activity.</li>
          <li>Technical data: request and device information, IP addresses, security events and optional public-site analytics as described below.</li>
        </ul>
      </section>

      <section>
        <h2>2. Authentication data</h2>
        <p>
          Account sign-in is handled with Firebase Authentication. StudyOS uses
          the authenticated Firebase user and Firebase ID token to verify account
          requests with the backend. The app can use basic profile information
          supplied by your authentication method, such as your display name and
          email address, for account functionality. Firebase handles sign-in
          credentials; StudyOS does not store your raw sign-in password in its
          application database.
        </p>
      </section>

      <section>
        <h2>3. Why we process this information</h2>
        <ul>
          <li>Authenticate your account and provide, synchronize and restore your study workspace.</li>
          <li>Calculate study progress, focus totals, streaks and eligible leaderboard results.</li>
          <li>Deliver group messaging, file sharing and live study room features.</li>
          <li>Diagnose technical problems, respond to support requests, prevent abuse and protect accounts.</li>
          <li>Measure selected public-site visits only if you enable optional analytics.</li>
          <li>Handle complaints and meet applicable legal obligations.</li>
        </ul>
        <p>
          StudyOS does not sell or rent your personal information or offer
          targeted advertising. Private study content is not published by
          StudyOS as public leaderboard information.
        </p>
      </section>

      <section>
        <h2>4. Guest Mode</h2>
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
        <h2>5. Leaderboard privacy</h2>
        <p>
          Leaderboard participation is opt-in. StudyOS does not publish your email,
          tasks, notes, subject content or calendar details on the leaderboard.
          Public leaderboard information can include your chosen public display
          name, ranking and aggregate StudyOS activity used to calculate ranking.
        </p>
      </section>

      <section>
        <h2>6. Study groups and messages</h2>
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
        <p>
          Joining a Study Room shares your display name, current focus status and
          elapsed room focus time with other people in that room. Public rooms
          can be joined by signed-in StudyOS users; private rooms are restricted
          to their study group members. Subject names are shared only if you
          enable the room's subject-sharing option. While you remain joined,
          presence and enabled subject sharing continue when you navigate other
          StudyOS workspace pages. Leave the room or sign out to stop sharing.
          Live presence is temporary and separate from your saved study history
          and leaderboard score. Your selected desk appearance is visible in the
          joined room and saved on your device. Accessory unlocks use qualifying
          verified study history; the count is shown only to you. Silent
          encouragement and shared session milestones are opt-in; reactions go
          only to the recipient, and no subject or session duration is sent with
          a milestone.
        </p>
      </section>

      <section>
        <h2>7. Browser notifications</h2>
        <p>
          StudyOS includes optional browser-notification settings. Notification
          permission is controlled by your browser. You can deny or revoke that
          permission from your browser or site settings.
        </p>
      </section>

      <section>
        <h2>8. Backup and restore</h2>
        <p>
          StudyOS can create portable JSON backups containing StudyOS data and
          preferences. A backup file is handled wherever you choose to save it.
          Keep exported backups private if they contain information you consider
          sensitive.
        </p>
      </section>

      <section>
        <h2>9. Data reset and deletion</h2>
        <p>
          StudyOS includes data-reset and account-deletion controls in Settings.
          Review the confirmation shown in the application before using destructive
          actions. Account deletion requires recent identity verification, and
          you must delete any study groups you own before the account deletion
          can proceed. If deletion fails or is unavailable, contact us privately.
          Guest data can also be removed by clearing the relevant site data
          from your browser.
        </p>
        <p>
          The account deletion process is designed to remove account-linked
          workspace records, authentication records, group memberships, messages
          authored by the account and associated uploaded files from the active
          service. Other members may retain copies or information they shared
          independently. Deletion from the active service does not necessarily
          remove historical backups, provider logs or security records at the
          same time.
        </p>
      </section>

      <section>
        <h2>10. Infrastructure providers and service security</h2>
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
        <p>
          This information may be processed by service providers in countries
          other than your own, depending on their infrastructure and configuration.
          Access to your content may also be provided to other users through
          your sharing choices, or disclosed where required by law. Providers
          handle information according to their own service arrangements and
          privacy notices.
        </p>
      </section>

      <section id="analytics-preferences">
        <h2>11. Browser storage and optional analytics</h2>
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
        <h2>12. Retention and security monitoring</h2>
        <p>
          Account-linked study records are generally kept while needed to
          provide the account and its features, until you delete them, reset
          your data or complete account deletion. Guest data remains on your
          device until removed. Room presence is temporary.
        </p>
        <p>
          Infrastructure logs, backups, historical analytics and security records
          may have separate retention periods. StudyOS processes network
          addresses and request information for abuse prevention, including
          temporary or permanent IP restrictions where necessary. Expired
          temporary restrictions are no longer applied and their records are
          removed through background database cleanup. Records may be kept
          longer where reasonably necessary to address abuse, legal obligations
          or disputes. Exact provider retention periods depend on their service
          configuration; contact us for information about a specific category.
        </p>
      </section>

      <section>
        <h2>13. Your privacy choices and requests</h2>
        <p>
          You may use the app's available controls to change study records,
          disable public leaderboard participation, export study data, withdraw
          optional analytics permission or request deletion. Depending on the
          law that applies to you, you may also request access to personal data,
          correction, erasure, restriction, portability, or withdrawal of consent
          for processing that relies on consent, and raise a complaint with an
          applicable data protection authority.
        </p>
        <p>
          For requests or grievances relating to personal data, email{" "}
          <a href="mailto:devvaibhav37@gmail.com?subject=StudyOS%20Privacy%20Request">
            the StudyOS operator
          </a>{" "}
          with a description of your request. We may need to confirm your
          identity or authority before disclosing or changing account information.
          Do not include passwords or unnecessary sensitive information in email.
        </p>
      </section>

      <section>
        <h2>14. Children and guardians</h2>
        <p>
          StudyOS provides study tools that may be of interest to younger
          people. If a parent or guardian's authorization is required by
          applicable law, do not create an account or use features that process
          a child's personal data without the required authorization. The
          service does not currently provide a dedicated age-verification or
          guardian-consent workflow.
        </p>
        <p>
          If you are a parent or guardian and believe a child has provided
          personal data without required authorization, contact us privately so
          we can investigate and address access or deletion as appropriate.
          Do not submit another person's private information without authorization.
        </p>
      </section>

      <section>
        <h2>15. Security</h2>
        <p>
          StudyOS uses the authentication and access controls implemented in the
          current application and backend, but no online service can promise
          absolute security. Do not store information in StudyOS that you would not
          be comfortable keeping in a personal productivity service.
        </p>
      </section>

      <section>
        <h2>16. Changes and contact</h2>
        <p>
          We will update this policy as our data practices change and provide
          additional notice or request consent where required by applicable law.
          This policy explains our data practices; it is not a substitute for
          consent where consent is legally required. For privacy questions or
          grievances, contact the independent StudyOS operator, Vaibhav.
          Do not include personal data in public bug reports.
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
