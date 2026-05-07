import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Hero } from "@/components/sections/Hero";
import { Product } from "@/components/sections/Product";
import { Features } from "@/components/sections/Features";
import { Agents } from "@/components/sections/Agents";
import { DownloadSection } from "@/components/sections/DownloadSection";
import { FinalCTA } from "@/components/sections/FinalCTA";

const Index = () => {
  return (
    <div className="min-h-screen" style={{ background: "#050608" }}>
      <SiteHeader />
      <main>
        <Hero />
        <Product />
        <Features />
        <Agents />
        <DownloadSection />
        <FinalCTA />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Index;
