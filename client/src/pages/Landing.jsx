import "../styles/marketing.css";

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

function Landing() {
  return (
    <div className="marketing-page">
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

