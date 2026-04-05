import { Hero } from "@/components/hero";
import { Navbar } from "@/components/navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-black w-full text-white selection:bg-indigo-500/30">
      <Navbar />
      <Hero />
    </main>
  );
}
