import { useSimulation } from '../context/SimulationContext';
import WindowShell from '../components/ui/WindowShell';
import { MenuItemWrapper, ThemeMenuItems, ViewMenuItems, AyudaMenuItems } from '../components/ui/MenuHelpers';
import { getCountryNameEs, getCountryFlagUrl } from '../utils/countries';

function ThirdsMenuBar() {
  const { handleSalir, closeMenu } = useSimulation();
  return (
    <>
      <MenuItemWrapper menuKey="archivo_t" label={<><u>A</u>rchivo</>}>
        <button className="win95-dropdown-item" onClick={() => { handleSalir(); closeMenu(); }}><u>S</u>alir (Reiniciar)</button>
      </MenuItemWrapper>
      <MenuItemWrapper menuKey="ver_t" label={<><u>V</u>er</>}>
        <ViewMenuItems exclude="thirds" />
      </MenuItemWrapper>
      <MenuItemWrapper menuKey="tema_t" label={<><u>T</u>ema</>}>
        <ThemeMenuItems />
      </MenuItemWrapper>
      <MenuItemWrapper menuKey="ayuda_t" label={<>A<u>y</u>uda</>}>
        <AyudaMenuItems />
      </MenuItemWrapper>
    </>
  );
}

export default function ThirdsWindow() {
  const {
    memoizedThirdsList,
    isThirdsOpen, setIsThirdsOpen,
    isThirdsMinimized, setIsThirdsMinimized,
  } = useSimulation();

  const bodyContent = (
    <div className="win95-tab-pane" style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
      <div className="win95-view-content" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <fieldset className="win95-groupbox filter-groupbox">
          <legend>Criterios de Clasificación</legend>
          <div style={{ fontSize: '11px', lineHeight: '1.4', padding: '2px' }}>
            Los <strong>8 mejores terceros</strong> de la fase de grupos avanzan a Dieciseisavos de Final.
            Se ordenan por: <strong>PTS</strong> ➔ <strong>DG</strong> ➔ <strong>GF</strong> ➔ <strong>G (Victorias)</strong>.
          </div>
        </fieldset>

        <div className="win95-group-box-win" style={{ margin: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div className="win95-group-card-title"><span>Tabla General de Terceros Lugares</span></div>
          <div className="win95-sunken table-viewport" style={{ flex: 1, overflowY: 'auto' }}>
            <table className="retro-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}>POS</th>
                  <th style={{ width: '45px' }} className="text-center">Grp</th>
                  <th>Equipo</th>
                  <th className="text-center">PJ</th>
                  <th className="text-center">G</th>
                  <th className="text-center">E</th>
                  <th className="text-center">P</th>
                  <th className="text-center hide-mobile">GF</th>
                  <th className="text-center hide-mobile">GC</th>
                  <th className="text-center">DG</th>
                  <th className="text-center text-bold">PTS</th>
                  <th className="text-center" style={{ width: '80px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {memoizedThirdsList.map((team, idx) => {
                  const isQualifying = idx < 8;
                  const teamEs = getCountryNameEs(team.country, team.name);
                  const flagUrl = getCountryFlagUrl(team.country, team.name);
                  return (
                    <tr key={team.country} className={isQualifying ? 'retro-qualifying' : ''}>
                      <td className="text-center text-bold idx-cell">{idx + 1}</td>
                      <td className="text-center text-bold" style={{ opacity: 0.8 }}>{team.group}</td>
                      <td>
                        <div className="retro-table-team">
                          <img src={flagUrl} alt={teamEs} className="retro-table-flag" />
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
                      <td className="text-center">
                        <span className={`retro-badge-status ${isQualifying ? 'qualify' : 'eliminate'}`} style={{ fontWeight: 'bold', padding: '1px 4px', fontSize: '9px', border: '1px solid', borderColor: isQualifying ? 'var(--color-win-text)' : 'var(--color-loss-text)', color: isQualifying ? 'var(--color-win-text)' : 'var(--color-loss-text)', background: isQualifying ? 'rgba(0,128,0,0.05)' : 'rgba(204,0,0,0.05)' }}>
                          {isQualifying ? 'Clasificado' : 'Eliminado'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <WindowShell
      windowKey="thirds"
      titleIcon="🏆"
      title="Mejores Terceros - MundialStats 2026"
      isOpen={isThirdsOpen}
      isMinimized={isThirdsMinimized}
      onClose={() => setIsThirdsOpen(false)}
      onMinimize={() => setIsThirdsMinimized(true)}
      menuBarContent={<ThirdsMenuBar />}
      statusLeft="Mejores terceros: Clasifican los 8 mejores"
    >
      {bodyContent}
    </WindowShell>
  );
}
