import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";
import { IntegrationsFeatureSection } from "@/components/stack-feature-section";
import { Timeline } from "@/components/timeline";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-black w-full text-white selection:bg-indigo-500/30">
      <Navbar />
      <Hero />
      <IntegrationsFeatureSection />
      <Timeline />
      <Footer />
    </main>
  );
}
