"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Zap } from "lucide-react";
import {
  SiGmail,
  SiGooglecalendar,
  SiSlack,
  SiDiscord,
  SiNotion,
  SiGoogledrive,
  SiGooglemeet,
  SiGoogle,
  SiTrello,
  SiJira,
  SiSalesforce,
  SiDropbox,
  SiZoom,
  SiAsana,
} from "react-icons/si";

const iconConfigs = [
  { Icon: SiGmail, color: "#EA4335" },
  { Icon: SiGooglecalendar, color: "#4285F4" },
  { Icon: SiSlack, color: "#4A154B" },
  { Icon: SiDiscord, color: "#5865F2" },
  { Icon: SiNotion, color: "#ffffff" },
  { Icon: SiGoogledrive, color: "#0F9D58" },
  { Icon: SiGooglemeet, color: "#00832D" },
  { Icon: SiGoogle, color: "#DB4437" },
  { Icon: SiTrello, color: "#0052CC" },
  { Icon: SiJira, color: "#0052CC" },
  { Icon: SiSalesforce, color: "#00A1E0" },
  { Icon: SiDropbox, color: "#0061FF" },
  { Icon: SiZoom, color: "#2D8CFF" },
  { Icon: SiAsana, color: "#F06A6A" },
];

const ORBIT_RADII = [90, 140, 190]; // px
const ORBIT_DURATIONS = [18, 28, 40]; // seconds

export function IntegrationsFeatureSection() {
  const iconsPerOrbit = Math.ceil(iconConfigs.length / ORBIT_RADII.length);

  return (
    <section className="w-full bg-black py-24 px-6 ">
      <div className="max-w-7xl mx-auto rounded-3xl border border-white/10 bg-white/[0.015] overflow-hidden flex flex-col md:flex-row justify-evenly items-center min-h-[32rem]">

        {/* ── Left: text block ── */}
        <div className="flex-1 p-10 md:p-16 flex flex-col justify-center z-10 mx-auto ">
          <h2 className="text-4xl md:text-5xl font-bold mb-5 gradient-text">
            Connect your tools
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed mb-10 max-w-md">
            Omni Copilot integrates natively with Gmail, Calendar, Slack, Drive,
            Meet, and 100+ apps — your AI works where you already do.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <Button asChild className="rounded-full px-6 bg-indigo-600 hover:bg-indigo-500 text-white">
              <Link href="/login">Automate Your Apps</Link>
            </Button>
            <Button variant="outline" className="rounded-full px-6 text-slate-300 border-white/10 hover:bg-white/5">
              Explore Integrations
            </Button>
          </div>
        </div>

        {/* ── Right: orbit animation ── */}
        <div className="flex-shrink-0 flex items-center justify-center py-16 md:py-0 overflow-hidden w-[400px] h-[400px] md:w-[500px] md:h-[500px] lg:w-[560px] lg:h-[560px]">
          {/* orbit stage — responsive size */}
          <div className="relative w-full h-full flex items-center justify-center">

            {/* Center glowing core */}
            <div className="z-10 w-20 h-20 rounded-full bg-indigo-600/20 border border-indigo-500/40 shadow-[0_0_60px_rgba(99,102,241,0.35)] flex items-center justify-center">
              <Zap className="w-10 h-10 text-indigo-400" />
            </div>

            {/* Three orbit rings + icons */}
            {ORBIT_RADII.map((radius, orbitIdx) => {
              const diameter = radius * 2;
              const iconsOnThisRing = iconConfigs.slice(
                orbitIdx * iconsPerOrbit,
                orbitIdx * iconsPerOrbit + iconsPerOrbit
              );
              const angleStep = (2 * Math.PI) / iconsOnThisRing.length;
              const dur = ORBIT_DURATIONS[orbitIdx];
              const reverse = orbitIdx % 2 !== 0;

              return (
                <div
                  key={orbitIdx}
                  className="absolute rounded-full border-2 border-white/30"
                  style={{
                    width: diameter,
                    height: diameter,
                    animationName: "orbit-spin",
                    animationDuration: `${dur}s`,
                    animationTimingFunction: "linear",
                    animationIterationCount: "infinite",
                    animationDirection: reverse ? "reverse" : "normal",
                  }}
                >
                  {iconsOnThisRing.map((cfg, iconIdx) => {
                    const angle = iconIdx * angleStep;
                    // position on the ring edge (percentage of diameter)
                    const cx = 50 + 50 * Math.cos(angle);
                    const cy = 50 + 50 * Math.sin(angle);
                    return (
                      <div
                        key={iconIdx}
                        className="absolute bg-[#0d0d1a] border border-white/10 rounded-full p-2.5 shadow-lg"
                        style={{
                          left: `${cx}%`,
                          top: `${cy}%`,
                          // counter-rotate so icons stay upright
                          animationName: reverse ? "icon-spin-normal" : "icon-spin-reverse",
                          animationDuration: `${dur}s`,
                          animationTimingFunction: "linear",
                          animationIterationCount: "infinite",
                        }}
                      >
                        <cfg.Icon className="w-6 h-6" style={{ color: cfg.color }} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
}
