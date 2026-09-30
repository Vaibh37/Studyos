import { Bug, Lightbulb, Mail } from "lucide-react";

import "../styles/marketing.css";

import PublicPageShell from "../components/marketing/PublicPageShell";

const contactOptions = [
  {
    icon: Bug,
    title: "Report a bug",
    copy: "Found something broken in StudyOS? Open a GitHub issue with the steps to reproduce it.",
    label: "Open an issue",
    href: "https://github.com/Vaibh37/Studyos/issues/new",
    external: true,
  },
  {
    icon: Lightbulb,
    title: "Product feedback",
    copy: "Have a feature idea or something that feels rough? Send direct feedback about the workflow or experience.",
    label: "Send feedback",
    href: "mailto:devvaibhav37@gmail.com?subject=StudyOS%20Feedback",
  },
  {
    icon: Mail,
    title: "General contact",
    copy: "For StudyOS questions, collaboration or anything project-related, email the project operator directly.",
    label: "Email Vaibhav",
    href: "mailto:devvaibhav37@gmail.com?subject=StudyOS",
  },
];

function Contact() {
  return (
    <PublicPageShell
      eyebrow="Support"
      title="Contact StudyOS"
      intro="Bug reports, product feedback and project contact — without making you hunt for a way to reach me."
    >
      <div className="marketing-contact-grid">
        {contactOptions.map(({ icon: Icon, title, copy, label, href, external }) => (
          <article key={title} className="marketing-contact-card">
            <span className="marketing-contact-icon"><Icon size={20} /></span>
            <h2>{title}</h2>
            <p>{copy}</p>
            <a
              href={href}
              target={external ? "_blank" : undefined}
              rel={external ? "noreferrer" : undefined}
            >
              {label} →
            </a>
          </article>
        ))}
      </div>

      <section className="marketing-contact-note">
        <Mail size={18} />
        <p>
          Direct email: <a href="mailto:devvaibhav37@gmail.com">devvaibhav37@gmail.com</a>
        </p>
      </section>
    </PublicPageShell>
  );
}

export default Contact;
