import "../styles/marketing.css";

import PublicPageShell from "../components/marketing/PublicPageShell";

function Terms() {
  return (
    <PublicPageShell
      eyebrow="Legal"
      title="Terms & Conditions"
      intro="The rules for using the hosted StudyOS service, your content, and our responsibilities."
    >
      <p className="marketing-document-updated">Last updated: November 28, 2026</p>

      <section>
        <h2>1. About StudyOS</h2>
        <p>
          StudyOS is an independent software project that provides tools for study
          planning, notes, Focus sessions, progress tracking and optional
          leaderboard participation. References to “StudyOS” in these terms mean
          the independent project and its operator. These terms apply to the
          hosted service at studyos37.space, not to separate rights granted under
          the open-source license. By using the hosted service, you agree to
          these terms to the extent permitted by law. If you do not agree, do
          not use the hosted service.
        </p>
      </section>

      <section>
        <h2>2. Using the service</h2>
        <p>
          You may use the hosted service for lawful productivity and study-related
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
        <p>
          If you are not legally able to accept these terms independently, involve
          your parent or legal guardian. Do not create an account or use features
          requiring parental authorization unless the authorization required by
          applicable law has been obtained. Guest Mode is not a way to avoid
          applicable age or consent requirements.
        </p>
        <p>
          Keep sign-in credentials secure, do not share access with unauthorized
          people, and contact us if you suspect unauthorized activity.
        </p>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>Do not:</p>
        <ul>
          <li>interfere with or overload StudyOS or its infrastructure;</li>
          <li>attempt to access another person’s account or private data, bypass access controls or evade legitimate security restrictions;</li>
          <li>extract private or restricted content, collect personal information without authorization, or use automation that disrupts the hosted service;</li>
          <li>use automated or deceptive activity to manipulate XP or leaderboard results;</li>
          <li>use groups, rooms or messages to harass, threaten, impersonate, spam, exploit others or endanger minors;</li>
          <li>upload malicious files, distribute private information without authorization, or share unlawful content;</li>
          <li>use the service in a way that violates applicable law or third-party rights.</li>
        </ul>
        <p>
          Good-faith security reports are welcome through our private contact
          channel. These restrictions do not limit lawful use of the public
          source code under its license or other rights protected by law.
        </p>
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
          You retain the rights you hold in your notes, tasks, messages, files
          and other original content. You give StudyOS a non-exclusive
          permission to store, process, transmit and display that content only
          as reasonably necessary to provide, secure and maintain the service
          and to carry out the sharing choices you make. This does not transfer
          ownership of your content.
        </p>
        <p>
          Group messages and files may be visible to other authorized members.
          Share only content you have permission to use and distribute. You are
          responsible for what you upload and should avoid sharing confidential
          information or personal information about others without authorization.
          StudyOS provides backup/export functionality as a convenience; keep
          your own copy of important information.
        </p>
      </section>

      <section>
        <h2>7. Intellectual property and open-source licensing</h2>
        <p>
          StudyOS Core is made available under the{" "}
          <a href="https://github.com/Vaibh37/Studyos/blob/main/LICENSE" target="_blank" rel="noreferrer">
            Apache License, Version 2.0
          </a>. You may use, modify and redistribute the licensed materials,
          including for commercial purposes, subject to that license. Nothing
          in these hosted-service terms withdraws or narrows those permissions.
        </p>
        <p>
          The StudyOS name, branding and logos are not licensed for misleading
          claims of affiliation or endorsement. Third-party assets and separately
          licensed materials remain subject to their respective terms. Respect
          applicable attribution and copyright notices, and do not impersonate
          the official StudyOS service.
        </p>
      </section>

      <section>
        <h2>8. Copyright, abuse and complaints</h2>
        <p>
          If you believe content on StudyOS infringes your rights, is unlawful,
          or violates these terms, email the operator privately. Include enough
          information to locate the content (such as a group, message or URL),
          explain the issue and provide a way to contact you. For copyright
          complaints, describe the protected work and your authority to act for
          its owner. Do not send passwords, identity documents or unrelated
          personal information with an initial report.
        </p>
        <p>
          StudyOS may review reports, restrict access to offending content,
          remove it where appropriate, or take action against accounts, subject
          to applicable law. If you believe a moderation decision is mistaken,
          you can contact the operator for review.
        </p>
        <p>
          <a href="mailto:devvaibhav37@gmail.com?subject=StudyOS%20Copyright%20or%20Abuse%20Report">
            Report copyright infringement or abuse
          </a>
        </p>
      </section>

      <section>
        <h2>9. Availability and changes</h2>
        <p>
          StudyOS is actively developed. Features, limits, infrastructure and
          availability can change, and the service can occasionally be unavailable
          because of maintenance, provider outages, bugs or development changes.
          No uninterrupted-availability guarantee is made. The hosted service
          is currently offered free of charge. If paid features are introduced,
          their pricing and applicable billing terms will be presented separately
          before any purchase.
        </p>
      </section>

      <section>
        <h2>10. Suspension, reset and deletion</h2>
        <p>
          StudyOS may limit, suspend or terminate access when reasonably
          necessary to address abuse, security risks, violations of these terms
          or legal obligations. Where appropriate, you may contact the operator
          to request a review of a restriction. You can stop using the service
          at any time and use the available deletion/reset controls in Settings.
          See the <a href="/privacy">Privacy Policy</a> for data handling and
          deletion details.
        </p>
      </section>

      <section>
        <h2>11. No academic guarantee</h2>
        <p>
          StudyOS is a productivity tool. It does not guarantee academic results,
          exam performance, grades, admissions or any specific learning outcome.
          Decisions about how you study remain yours.
        </p>
      </section>

      <section>
        <h2>12. Disclaimer and limitation of liability</h2>
        <p>
          StudyOS is provided on an “as is” and “as available” basis as an independent software
          project. To the extent permitted by applicable law, the project operator
          is not responsible for indirect losses arising from service interruption,
          lost local data, user error or reliance on the service. Nothing here
          excludes rights or responsibilities that cannot legally be excluded.
        </p>
      </section>

      <section>
        <h2>13. Responsibility and limited indemnification</h2>
        <p>
          To the extent permitted by law, a user who is legally competent to
          agree to these terms agrees to reimburse reasonable losses and costs
          arising from third-party claims directly caused by the user's
          deliberate unlawful conduct, unauthorized disclosure of personal
          information or infringement of another person's rights. This does not
          require a user to indemnify StudyOS for StudyOS's own wrongdoing or
          override mandatory consumer protections.
        </p>
      </section>

      <section>
        <h2>14. Governing law and disputes</h2>
        <p>
          These hosted-service terms are governed by the laws of India, subject
          to mandatory protections that apply in your place of residence.
          Contact the operator if a dispute arises so that we can try to resolve
          it. Disputes may be brought before courts with lawful jurisdiction,
          without limiting access to applicable consumer or regulatory remedies.
        </p>
      </section>

      <section>
        <h2>15. Changes to these terms</h2>
        <p>
          These terms may be updated as StudyOS changes. The “Last updated” date on
          this page identifies this version. For material changes, we will provide
          notice and obtain acceptance where required by applicable law. If you
          do not agree to updated terms, you may stop using the hosted service.
          Nothing in these terms limits rights that cannot legally be waived.
        </p>
      </section>

      <section>
        <h2>16. Contact</h2>
        <p>
          StudyOS is independently operated by Vaibhav. For legal questions,
          complaints or requests concerning these terms, contact{" "}
          <a href="mailto:devvaibhav37@gmail.com?subject=StudyOS%20Legal">
            devvaibhav37@gmail.com
          </a>. Please use email rather than a public issue for sensitive matters.
        </p>
      </section>
    </PublicPageShell>
  );
}

export default Terms;

