import { useSimulation } from '../context/SimulationContext';
import WindowShell from '../components/ui/WindowShell';
import { MenuItemWrapper, ThemeMenuItems, ViewMenuItems, AyudaMenuItems } from '../components/ui/MenuHelpers';
import { getCountryNameEs, getCountryFlagUrl } from '../utils/countries';

function StandingsMenuBar() {
  const { handleSalir, closeMenu } = useSimulation();
  return (
    <>
      <MenuItemWrapper menuKey="archivo_s" label={<><u>A</u>rchivo</>}>
        <button className="win95-dropdown-item" onClick={() => { handleSalir(); closeMenu(); }}><u>S</u>alir (Reiniciar)</button>
      </MenuItemWrapper>
      <MenuItemWrapper menuKey="ver_s" label={<><u>V</u>er</>}>
        <ViewMenuItems exclude="standings" />
      </MenuItemWrapper>
      <MenuItemWrapper menuKey="tema_s" label={<><u>T</u>ema</>}>
        <ThemeMenuItems />
      </MenuItemWrapper>
      <MenuItemWrapper menuKey="ayuda_s" label={<>A<u>y</u>uda</>}>
        <AyudaMenuItems />
      </MenuItemWrapper>
    </>
  );
}

export default function StandingsWindow() {
  const {
    groups,
    isStandingsOpen, setIsStandingsOpen,
    isStandingsMinimized, setIsStandingsMinimized,
    openTeamInfo,
  } = useSimulation();

  const bodyContent = (
    <div className="win95-tab-pane" style={{ flex: 1, overflowY: 'auto' }}>
      <div className="win95-standings-grid">
        {groups.map((group) => (
          <div key={group.letter} className="win95-group-box-win">
            <div className="win95-group-card-title"><span>Grupo {group.letter}</span></div>
            <div className="win95-sunken table-viewport">
              <table className="retro-table">
                <thead>
                  <tr>
                    <th style={{ width: '30px' }}>POS</th>
                    <th>Equipo</th>
                    <th className="text-center">PJ</th>
                    <th className="text-center">G</th>
                    <th className="text-center">E</th>
                    <th className="text-center">P</th>
                    <th className="text-center hide-mobile">GF</th>
                    <th className="text-center hide-mobile">GC</th>
                    <th className="text-center">DG</th>
                    <th className="text-center text-bold">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {group.teams.map((team, idx) => {
                    const isQualifying = idx < 2;
                    const teamEs = getCountryNameEs(team.country, team.name);
                    const flagUrl = getCountryFlagUrl(team.country, team.name);
                    return (
                      <tr key={team.country} className={isQualifying ? 'retro-qualifying' : ''}>
                        <td className="text-center text-bold idx-cell">{idx + 1}</td>
                        <td>
                          <div className="retro-table-team">
                            <img src={flagUrl} alt={teamEs} className="retro-table-flag" onClick={() => openTeamInfo(team.country)} style={{ cursor: 'pointer' }} />
                            <span className="retro-table-team-name" title={teamEs}>{teamEs}</span>
                          </div>
                        </td>
                        <td className="text-center">{team.games_played}</td>
                        <td className="text-center">{team.wins}</td>
                        <td className="text-center">{team.draws}</td>
                        <td className="text-center">{team.losses}</td>
                        <td className="text-center hide-mobile">{team.goals_for}</td>
                        <td className="text-center hide-mobile">{team.goals_against}</td>
                        <td className="text-center dg-cell" style={{ color: team.goal_differential > 0 ? 'var(--color-win-text)' : team.goal_differential < 0 ? 'var(--color-loss-text)' : 'inherit' }}>
                          {team.goal_differential > 0 ? `+${team.goal_differential}` : team.goal_differential}
                        </td>
                        <td className="text-center text-bold pts-cell">{team.group_points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <WindowShell
      windowKey="standings"
      titleIcon="📊"
      title="Tabla de Posiciones - MundialStats 2026"
      isOpen={isStandingsOpen}
      isMinimized={isStandingsMinimized}
      onClose={() => setIsStandingsOpen(false)}
      onMinimize={() => setIsStandingsMinimized(true)}
      menuBarContent={<StandingsMenuBar />}
      statusLeft="Tablas de Posiciones: Grupos A - L"
    >
      {bodyContent}
    </WindowShell>
  );
}
