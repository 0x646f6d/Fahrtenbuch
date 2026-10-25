import { BookOpen, Map, Plus, Route, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export function BottomNav() {
  return (
    <nav className="bottomnav">
      <NavLink to="/" end>
        <Map size={26} />
        <span>Karte</span>
      </NavLink>
      <NavLink to="/logbuch">
        <BookOpen size={26} />
        <span>Logbuch</span>
      </NavLink>
      <NavLink to="/eintraege" className="nav-add">
        <span className="nav-add-circle">
          <Plus size={34} strokeWidth={3} />
        </span>
        <span>Eintrag</span>
      </NavLink>
      <NavLink to="/fahrten">
        <Route size={26} />
        <span>Fahrten</span>
      </NavLink>
      <NavLink to="/einstellungen">
        <Settings size={26} />
        <span>Mehr</span>
      </NavLink>
    </nav>
  );
}
