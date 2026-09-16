import { Cast, Home, LayoutGrid, Server, Settings, Youtube } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { TopBar } from "./TopBar";

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/youtube", label: "YouTube", icon: Youtube },
  { to: "/plex", label: "Plex", icon: Server },
  { to: "/apps", label: "Apps", icon: LayoutGrid, soon: true },
  { to: "/mirror", label: "Mirror", icon: Cast, soon: true },
  { to: "/settings", label: "Setup", icon: Settings },
];

export function Shell() {
  return (
    <div className="app-shell">
      <a href="#inhalt" className="sr-only">
        Zum Inhalt
      </a>
      <TopBar />
      <nav aria-label="Hauptnavigation" className="tab-nav">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) => `tab-link${isActive ? " is-on" : ""}`}
            >
              <Icon className="tab-icon" />
              {link.label}
              {link.soon ? <span className="tab-soon">soon</span> : null}
            </NavLink>
          );
        })}
      </nav>
      <main id="inhalt" className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
