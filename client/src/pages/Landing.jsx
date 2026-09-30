import "../styles/marketing.css";

import Seo from "../components/Seo";
import MarketingNav from "../components/marketing/MarketingNav";
import Hero from "../components/marketing/Hero";
import ProductStory from "../components/marketing/ProductStory";
import ConnectedSystem from "../components/marketing/ConnectedSystem";
import FeatureShowcase from "../components/marketing/FeatureShowcase";
import HowItWorks from "../components/marketing/HowItWorks";
import GuestModeSection from "../components/marketing/GuestModeSection";
import PrivacySection from "../components/marketing/PrivacySection";
import FinalCTA from "../components/marketing/FinalCTA";
import MarketingFooter from "../components/marketing/MarketingFooter";

const homeStructuredData = {
  "@context":
    "https://schema.org",

  "@graph": [
    {
      "@type":
        "WebSite",

      "@id":
        "https://studyos37.vercel.app/#website",

      url:
        "https://studyos37.vercel.app/",

      name:
        "StudyOS",

      alternateName:
        "Study OS",

      description:
        "Plan tasks, organize subjects and notes, run focus sessions, track progress, and use an optional leaderboard in one student productivity workspace.",
    },

    {
      "@type":
        "WebApplication",

      "@id":
        "https://studyos37.vercel.app/#app",

      url:
        "https://studyos37.vercel.app/",

      name:
        "StudyOS",

      applicationCategory:
        "EducationalApplication",

      operatingSystem:
        "Any",

      description:
        "Plan tasks, organize subjects and notes, run focus sessions, track progress, and use an optional leaderboard in one student productivity workspace.",
    },
  ],
};

function Landing() {
  return (
    <div className="marketing-page">
      <Seo
        title="StudyOS — Study Planner, Focus Timer & Productivity Workspace"
        description="Plan tasks, organize subjects and notes, run focus sessions, track progress, and use an optional leaderboard in one student productivity workspace."
        path="/"
        structuredData={homeStructuredData}
      />

      <div id="marketing-top-sentinel" aria-hidden="true" />
      <MarketingNav />

      <main>
        <Hero />
        <ProductStory />
        <ConnectedSystem />
        <FeatureShowcase />
        <HowItWorks />
        <GuestModeSection />
        <PrivacySection />
        <FinalCTA />
      </main>

      <MarketingFooter />
    </div>
  );
}

export default Landing;
