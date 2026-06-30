import { useEffect, useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import WindowShell from '../components/ui/WindowShell';
import { getCountryNameEs, getCountryNameEn, getCountryFlagUrl } from '../utils/countries';

const translatePosition = (pos) => {
  if (!pos) return '-';
  const p = pos.toLowerCase();
  if (p.includes('goalkeeper') || p.includes('keeper')) return 'Portero';
  if (p.includes('centre-back') || p.includes('center back') || p.includes('defender') || p.includes('centre back')) return 'Defensa Central';
  if (p.includes('left-back') || p.includes('left back')) return 'Lateral Izquierdo';
  if (p.includes('right-back') || p.includes('right back')) return 'Lateral Derecho';
  if (p.includes('defensive midfield')) return 'Mediocentro Defensivo';
  if (p.includes('central midfield')) return 'Mediocentro';
  if (p.includes('attacking midfield')) return 'Mediapunta';
  if (p.includes('left midfield')) return 'Interior Izquierdo';
  if (p.includes('right midfield')) return 'Interior Derecho';
  if (p.includes('midfield')) return 'Mediocampista';
  if (p.includes('left wing')) return 'Extremo Izquierdo';
  if (p.includes('right wing')) return 'Extremo Derecho';
  if (p.includes('wing')) return 'Extremo';
  if (p.includes('forward') || p.includes('striker') || p.includes('centre-forward')) return 'Delantero';
  
  return pos;
};

export default function TeamInfoWindow() {
  const { 
    isTeamInfoOpen, setIsTeamInfoOpen, 
    isTeamInfoMinimized, setIsTeamInfoMinimized, 
    selectedTeamCode, groups, allDisplayMatches 
  } = useSimulation();

  const [loadingApi, setLoadingApi] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [apiTeamData, setApiTeamData] = useState(null);
  const [apiPlayers, setApiPlayers] = useState([]);
  const [translatedDesc, setTranslatedDesc] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!isTeamInfoOpen || !selectedTeamCode) return;

    let isMounted = true;
    setLoadingApi(true);
    setApiError(null);
    setApiTeamData(null);
    setApiPlayers([]);
    setTranslatedDesc(null);

    const fetchApiData = async () => {
      try {
        const teamEn = getCountryNameEn(selectedTeamCode, selectedTeamCode);
        const searchUrl = `/api/sportsdb/api/v1/json/3/searchteams.php?t=${encodeURIComponent(teamEn)}`;
        
        const resTeam = await fetch(searchUrl);
        const dataTeam = await resTeam.json();
        
        if (!dataTeam.teams || dataTeam.teams.length === 0) {
          if (isMounted) setApiError('No se encontraron datos en la API para este equipo.');
          return;
        }

        const team = dataTeam.teams[0];
        if (isMounted) {
          setApiTeamData(team);
          
          if (!team.strDescriptionES && team.strDescriptionEN) {
            setIsTranslating(true);
            try {
              const transUrl = `/api/translate/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=${encodeURIComponent(team.strDescriptionEN)}`;
              const transRes = await fetch(transUrl);
              const transData = await transRes.json();
              if (isMounted && transData && transData[0]) {
                const fullText = transData[0].map(item => item[0]).join('');
                setTranslatedDesc(fullText);
              }
            } catch (e) {
              console.warn("Translation failed", e);
            } finally {
              if (isMounted) setIsTranslating(false);
            }
          }
        }

        const idTeam = team.idTeam;
        const playersUrl = `/api/sportsdb/api/v1/json/3/lookup_all_players.php?id=${idTeam}`;
        const resPlayers = await fetch(playersUrl);
        const dataPlayers = await resPlayers.json();

        if (isMounted && dataPlayers.player) {
          setApiPlayers(dataPlayers.player);
        }
      } catch (err) {
        if (isMounted) setApiError('Error al conectar con la API.');
      } finally {
        if (isMounted) setLoadingApi(false);
      }
    };

    fetchApiData();

    return () => { isMounted = false; };
  }, [isTeamInfoOpen, selectedTeamCode]);

  if (!selectedTeamCode) return null;

  // Gather basic local team info
  const teamNameEs = getCountryNameEs(selectedTeamCode, selectedTeamCode);
  const flagUrl = getCountryFlagUrl(selectedTeamCode, selectedTeamCode);
  
  let groupData = null;
  let teamStandings = null;
  for (const g of groups) {
    const t = g.teams.find(team => team.country === selectedTeamCode);
    if (t) {
      groupData = g;
      teamStandings = t;
      break;
    }
  }

  const teamMatches = allDisplayMatches.filter(m => m.home_team_country === selectedTeamCode || m.away_team_country === selectedTeamCode);

  const bodyContent = (
    <div className="win95-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', flex: 1, overflowY: 'auto' }}>
      
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <img src={apiTeamData?.strBadge || flagUrl} alt={teamNameEs} style={{ width: '64px', height: 'auto', border: apiTeamData?.strBadge ? 'none' : '1px solid #000' }} />
        <div>
          <h2 style={{ margin: '0 0 4px' }}>{teamNameEs}</h2>
          {groupData && <p style={{ margin: '2px 0', fontSize: '12px' }}>Grupo: {groupData.letter}</p>}
          {apiTeamData?.intFormedYear && <p style={{ margin: '2px 0', fontSize: '11px', color: '#555' }}>Fundado en: {apiTeamData.intFormedYear}</p>}
          {apiTeamData?.strManager && <p style={{ margin: '2px 0', fontSize: '11px' }}>DT: {apiTeamData.strManager}</p>}
        </div>
      </div>

      {/* STATS SECTION */}
      {teamStandings && (
        <fieldset className="win95-groupbox">
          <legend>Estadísticas del Grupo</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', fontSize: '11px', textAlign: 'center' }}>
            <div><strong>PJ:</strong><br/>{teamStandings.games_played}</div>
            <div><strong>G:</strong><br/>{teamStandings.wins}</div>
            <div><strong>E:</strong><br/>{teamStandings.draws}</div>
            <div><strong>P:</strong><br/>{teamStandings.losses}</div>
            <div><strong>GF:</strong><br/>{teamStandings.goals_for}</div>
            <div><strong>GC:</strong><br/>{teamStandings.goals_against}</div>
            <div><strong>DG:</strong><br/>{teamStandings.goal_differential}</div>
            <div><strong>PTS:</strong><br/>{teamStandings.group_points}</div>
          </div>
        </fieldset>
      )}

      {/* MATCHES SECTION */}
      <fieldset className="win95-groupbox">
        <legend>Partidos</legend>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '11px', lineHeight: '1.6' }}>
          {teamMatches.map(m => {
            const isHome = m.home_team_country === selectedTeamCode;
            const oppCode = isHome ? m.away_team_country : m.home_team_country;
            const oppName = getCountryNameEs(oppCode, oppCode);
            const score = m.status === 'completed' || m.status === 'in_progress' || m.status === 'simulated' 
              ? ` (${m.home_team?.goals} - ${m.away_team?.goals})` : '';
            const statusLabel = m.status === 'completed' ? 'Finalizado' : m.status === 'in_progress' ? 'En Vivo' : m.status === 'simulated' ? 'Simulado' : 'Programado';
            return (
              <li key={m.id}>
                vs <strong>{oppName}</strong> {score} - <span style={{ fontStyle: 'italic', color: '#555' }}>{statusLabel}</span>
              </li>
            );
          })}
        </ul>
      </fieldset>

      {/* API DATA SECTION (History & Squad) */}
      <fieldset className="win95-groupbox">
        <legend>Info & Plantilla (Live API)</legend>
        
        {loadingApi && (
          <div style={{ textAlign: 'center', padding: '10px', fontSize: '12px' }}>
            <span className="win95-hourglass">⌛</span> Consultando base de datos TheSportsDB...
          </div>
        )}
        
        {!loadingApi && apiError && (
          <div style={{ color: 'var(--color-loss-text)', fontSize: '11px' }}>⚠️ {apiError}</div>
        )}

        {!loadingApi && apiTeamData && (
          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
            <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '8px', border: '1px solid #ccc', padding: '4px', background: 'var(--win-bg-sunken)' }}>
              <strong>Historia / Descripción:</strong><br/>
              {isTranslating ? (
                <span style={{ color: '#666', fontStyle: 'italic' }}>Traduciendo descripción al español...</span>
              ) : (
                apiTeamData.strDescriptionES || translatedDesc || apiTeamData.strDescriptionEN || 'No hay descripción disponible.'
              )}
            </div>

            {apiPlayers.length > 0 ? (
              <div>
                <strong>Jugadores ({apiPlayers.length}):</strong>
                <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '4px', border: '1px solid #ccc', background: 'var(--win-bg-sunken)' }}>
                  <table className="retro-table" style={{ width: '100%', fontSize: '10px' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#e0dfe3', zIndex: 1 }}>
                      <tr>
                        <th style={{ textAlign: 'left', padding: '2px 4px' }}>Jugador</th>
                        <th style={{ textAlign: 'left', padding: '2px 4px' }}>Posición</th>
                        <th style={{ textAlign: 'left', padding: '2px 4px' }}>Club Actual</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiPlayers.map(p => (
                        <tr key={p.idPlayer}>
                          <td style={{ padding: '2px 4px' }}>{p.strPlayer}</td>
                          <td style={{ padding: '2px 4px' }}>{translatePosition(p.strPosition)}</td>
                          <td style={{ padding: '2px 4px' }}>{p.strTeam || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <p>No se encontraron jugadores en la API para este equipo.</p>
            )}
          </div>
        )}
      </fieldset>
      
      <div className="about-btn-row" style={{ display: 'flex', justifyContent: 'center', paddingTop: '8px' }}>
        <button className="win95-btn default-btn" onClick={() => setIsTeamInfoOpen(false)} style={{ minWidth: '80px' }}>
          Cerrar
        </button>
      </div>
    </div>
  );

  return (
    <WindowShell
      windowKey="teamInfo"
      titleIcon="ℹ️"
      title={`Info: ${teamNameEs}`}
      isOpen={isTeamInfoOpen}
      isMinimized={isTeamInfoMinimized}
      onClose={() => setIsTeamInfoOpen(false)}
      onMinimize={() => setIsTeamInfoMinimized(true)}
      menuBarContent={null}
      statusLeft={loadingApi ? "Cargando desde API..." : "Datos del Equipo"}
    >
      {bodyContent}
    </WindowShell>
  );
}
