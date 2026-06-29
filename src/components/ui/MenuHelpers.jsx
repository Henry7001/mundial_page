import { useSimulation } from '../../context/SimulationContext';

/**
 * Renders a single menu button + its dropdown.
 */
export function MenuItemWrapper({ menuKey, label, children }) {
  const { activeMenu, toggleMenu } = useSimulation();
  return (
    <div className="win95-menu-item-wrapper">
      <button
        className={`win95-menu-btn ${activeMenu === menuKey ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); toggleMenu(menuKey); }}
      >
        {label}
      </button>
      {activeMenu === menuKey && (
        <div className="win95-dropdown-menu">{children}</div>
      )}
    </div>
  );
}

/**
 * Renders the "Tema" submenu items — reused across all window menu bars.
 */
export function ThemeMenuItems() {
  const { theme, toggleTheme, closeMenu } = useSimulation();
  const themes = [
    ['win95', 'Windows 95 / 98'],
    ['winxp', 'Windows XP (Luna)'],
    ['win7', 'Windows 7 (Aero)'],
    ['win10-light', 'Windows 10 Light'],
    ['win10-dark', 'Windows 10 Dark'],
  ];
  return themes.map(([key, label]) => (
    <button key={key} className={`win95-dropdown-item ${theme === key ? 'checked' : ''}`} onClick={() => { toggleTheme(key); closeMenu(); }}>
      {theme === key && '✓ '}{label}
    </button>
  ));
}

/**
 * Renders "Ver" menu items for showing other windows.
 */
export function ViewMenuItems({ exclude = '' }) {
  const {
    setIsMatchesOpen, setIsMatchesMinimized,
    setIsStandingsOpen, setIsStandingsMinimized,
    setIsThirdsOpen, setIsThirdsMinimized,
    setIsBracketOpen, setIsBracketMinimized,
    setFocusedWindow, fetchData, closeMenu,
  } = useSimulation();
  return (
    <>
      {exclude !== 'matches' && (
        <button className="win95-dropdown-item" onClick={() => { setIsMatchesOpen(true); setIsMatchesMinimized(false); setFocusedWindow('matches'); closeMenu(); }}>
          Mostrar <u>P</u>artidos
        </button>
      )}
      {exclude !== 'standings' && (
        <button className="win95-dropdown-item" onClick={() => { setIsStandingsOpen(true); setIsStandingsMinimized(false); setFocusedWindow('standings'); closeMenu(); }}>
          Mostrar Tabla de <u>P</u>osiciones
        </button>
      )}
      {exclude !== 'thirds' && (
        <button className="win95-dropdown-item" onClick={() => { setIsThirdsOpen(true); setIsThirdsMinimized(false); setFocusedWindow('thirds'); closeMenu(); }}>
          Mostrar Mejores <u>T</u>erceros
        </button>
      )}
      {exclude !== 'bracket' && (
        <button className="win95-dropdown-item" onClick={() => { setIsBracketOpen(true); setIsBracketMinimized(false); setFocusedWindow('bracket'); closeMenu(); }}>
          Mostrar Cuadro <u>E</u>liminatorio
        </button>
      )}
      <div className="win95-dropdown-separator" />
      <button className="win95-dropdown-item" onClick={() => { fetchData(); closeMenu(); }}>
        <u>A</u>ctualizar datos (Fetch)
      </button>
    </>
  );
}

/**
 * Renders "Ayuda" menu item — shared across all windows.
 */
export function AyudaMenuItems() {
  const { setIsAboutOpen, setFocusedWindow, closeMenu } = useSimulation();
  return (
    <button className="win95-dropdown-item" onClick={() => { setIsAboutOpen(true); setFocusedWindow('about'); closeMenu(); }}>
      <u>A</u>cerca de MundialStats...
    </button>
  );
}
