import {
  Gamepad2,
  Home,
  LayoutGrid,
  Radio,
  Server,
  Settings,
  Youtube,
} from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/apps", label: "Apps", icon: LayoutGrid },
  { to: "/youtube", label: "YouTube", icon: Youtube },
  { to: "/plex", label: "Plex", icon: Server },
  { to: "/radio", label: "Radio", icon: Radio },
  { to: "/games", label: "Games", icon: Gamepad2 },
  { to: "/settings", label: "Setup", icon: Settings },
];

export function Shell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <nav className="hidden w-28 shrink-0 flex-col border-r border-white/5 bg-ink/80 px-3 py-5 md:flex">
        <div className="mb-6 flex h-14 items-center justify-center rounded-2xl bg-volt/15 font-display text-xl font-extrabold text-volt-2">
          VV
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `rail-btn flex flex-col items-center justify-center rounded-2xl border px-2 text-[11px] uppercase tracking-[0.16em] ${
                    isActive
                      ? "border-volt/40 bg-volt/15 text-volt-2"
                      : "border-transparent text-mist hover:bg-white/5"
                  }`
                }
              >
                <Icon className="mb-1 h-5 w-5" />
                {link.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-y-auto px-6 pb-28 md:pb-8">
          <Outlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 grid grid-cols-7 gap-1 border-t border-white/5 bg-ink/95 px-2 py-2 md:hidden">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center rounded-xl py-2 text-[10px] ${
                    isActive ? "bg-volt/20 text-volt-2" : "text-mist"
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
