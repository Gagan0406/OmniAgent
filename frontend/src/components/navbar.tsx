"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { LogOut, User, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getInitials = () => {
    if (session?.user?.name) {
      return session.user.name.charAt(0).toUpperCase();
    }
    if (session?.user?.email) {
      return session.user.email.charAt(0).toUpperCase();
    }
    return <User className="w-4 h-4" />;
  };

  return (
    <div className="fixed top-6 inset-x-0 w-full flex justify-center z-50">
      <nav className="flex items-center justify-between px-6 py-3 w-[95%] max-w-5xl bg-neutral-900/40 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl transition-all h-16">
        <Link href="/" className="flex items-center space-x-2 transition-transform hover:scale-105 cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-tight hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-300 drop-shadow-md">
            Omni Copilot
          </span>
        </Link>

      <div className="flex items-center space-x-4">
        {status === "loading" ? (
          <div className="w-10 h-10 rounded-full bg-white/10 animate-pulse"></div>
        ) : session?.user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium hover:ring-2 ring-white/50 transition-all focus:outline-none"
            >
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                getInitials()
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1e1b4b] border border-white/10 rounded-xl shadow-xl py-1 overflow-hidden origin-top-right">
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-sm text-white font-medium truncate">
                    {session.user.name || "User"}
                  </p>
                  <p className="text-xs text-indigo-200 truncate mt-0.5">
                    {session.user.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center space-x-3">
            <Link href="/login">
              <Button variant="ghost" className="rounded-full px-5 hover:bg-white/10 hover:text-white font-semibold">
                Login
              </Button>
            </Link>
            <Link href="/login?tab=signup">
              <Button className="rounded-full px-5 font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-900/30">
                Sign up
              </Button>
            </Link>
          </div>
        )}
      </div>
      </nav>
    </div>
  );
}
