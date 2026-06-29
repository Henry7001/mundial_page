import { useSimulation } from '../context/SimulationContext';
import WindowShell from '../components/ui/WindowShell';
import { MenuItemWrapper, ThemeMenuItems, ViewMenuItems, AyudaMenuItems } from '../components/ui/MenuHelpers';
import { getCountryFlagUrl } from '../utils/countries';

function BracketMenuBar() {
  const { handleSalir, closeMenu } = useSimulation();
  return (
    <>
      <MenuItemWrapper menuKey="archivo_b" label={<><u>A</u>rchivo</>}>
        <button className="win95-dropdown-item" onClick={() => { handleSalir(); closeMenu(); }}><u>S</u>alir (Reiniciar)</button>
      </MenuItemWrapper>
      <MenuItemWrapper menuKey="ver_b" label={<><u>V</u>er</>}>
        <ViewMenuItems exclude="bracket" />
      </MenuItemWrapper>
      <MenuItemWrapper menuKey="tema_b" label={<><u>T</u>ema</>}>
        <ThemeMenuItems />
      </MenuItemWrapper>
      <MenuItemWrapper menuKey="ayuda_b" label={<>A<u>y</u>uda</>}>
        <AyudaMenuItems />
      </MenuItemWrapper>
    </>
  );
}

function BracketCard({ m }) {
  const { matches, knockoutScores, handleKnockoutScoreChange, handleKnockoutPensChange, handleResetKnockoutMatch } = useSimulation();
  if (!m) return null;
  const homeFlag = getCountryFlagUrl(m.home.country, m.home.name);
  const awayFlag = getCountryFlagUrl(m.away.country, m.away.name);
  const isSimulated = m.homeScore !== null && m.awayScore !== null;
  const isTied = isSimulated && m.homeScore === m.awayScore;

  let stageEs = 'Dieciseisavos';
  if (m.stage === 'r16') stageEs = 'Octavos';
  else if (m.stage === 'quarter') stageEs = 'Cuartos';
  else if (m.stage === 'semi') stageEs = 'Semifinal';
  else if (m.stage === 'third') stageEs = '3° Puesto';
  else if (m.stage === 'final') stageEs = 'Gran Final';

  const originalMatch = matches.find(om => String(om.id) === String(m.id));
  const isCompletedInApi = originalMatch && originalMatch.status === 'completed';
  const disabledInputs = m.home.isPlaceholder || m.away.isPlaceholder || isCompletedInApi;
  const showReset = isSimulated && !isCompletedInApi;

  return (
    <div key={m.id} className={`win95-match-card-win bracket-card ${isSimulated ? 'simulated' : ''}`} style={{ width: '190px', margin: '4px 0', flexShrink: 0 }}>
      <div className="win95-match-card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1px 4px' }}>
        <span style={{ fontSize: '9px', fontWeight: 'bold' }}>M#{m.id} - {stageEs}</span>
        {isSimulated && <span className="match-badge-retro simulated" style={{ fontSize: '8px', padding: '0px 2px' }}>Sim</span>}
      </div>
      <div className="win95-match-card-body" style={{ padding: '3px' }}>
        <div className="retro-team-rows">
          {/* Home */}
          <div className="retro-team-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden' }}>
              <img src={homeFlag} alt={m.home.label} className="retro-flag" style={{ width: '12px', height: '8px' }} />
              <span className={`retro-name-txt ${m.winner && m.winner.country === m.home.country ? 'winner-bold' : ''}`} style={{ fontSize: '9.5px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '105px', color: m.home.isPlaceholder ? '#888' : 'inherit' }}>{m.home.label}</span>
            </div>
            <input type="number" min="0" className="win95-match-score-input" style={{ width: '24px', height: '15px', fontSize: '9.5px', textAlign: 'center', padding: 0 }}
              value={m.homeScore !== null ? m.homeScore : ''} disabled={disabledInputs} placeholder={disabledInputs ? '-' : ''}
              onChange={(e) => handleKnockoutScoreChange(m.id, 'home', e.target.value === '' ? null : parseInt(e.target.value))}
            />
          </div>
          {/* Away */}
          <div className="retro-team-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden' }}>
              <img src={awayFlag} alt={m.away.label} className="retro-flag" style={{ width: '12px', height: '8px' }} />
              <span className={`retro-name-txt ${m.winner && m.winner.country === m.away.country ? 'winner-bold' : ''}`} style={{ fontSize: '9.5px', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: '105px', color: m.away.isPlaceholder ? '#888' : 'inherit' }}>{m.away.label}</span>
            </div>
            <input type="number" min="0" className="win95-match-score-input" style={{ width: '24px', height: '15px', fontSize: '9.5px', textAlign: 'center', padding: 0 }}
              value={m.awayScore !== null ? m.awayScore : ''} disabled={disabledInputs} placeholder={disabledInputs ? '-' : ''}
              onChange={(e) => handleKnockoutScoreChange(m.id, 'away', e.target.value === '' ? null : parseInt(e.target.value))}
            />
          </div>
        </div>

        {/* Penalties Row */}
        {isTied && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', paddingTop: '2px', borderTop: '1px dashed #ccc', fontSize: '8.5px' }}>
            <span>Pens:</span>
            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
              <input type="text" inputMode="numeric" className="win95-match-pens-input" style={{ width: '24px', height: '16px', fontSize: '10px', textAlign: 'center', padding: 0 }}
                value={m.homePens !== null ? m.homePens : ''} placeholder="P" disabled={disabledInputs}
                onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); handleKnockoutPensChange(m.id, 'home', val === '' ? null : parseInt(val)); }}
              />
              <span>-</span>
              <input type="text" inputMode="numeric" className="win95-match-pens-input" style={{ width: '24px', height: '16px', fontSize: '10px', textAlign: 'center', padding: 0 }}
                value={m.awayPens !== null ? m.awayPens : ''} placeholder="P" disabled={disabledInputs}
                onChange={(e) => { const val = e.target.value.replace(/\D/g, ''); handleKnockoutPensChange(m.id, 'away', val === '' ? null : parseInt(val)); }}
              />
            </div>
          </div>
        )}

        {/* Reset */}
        {showReset && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
            <button className="win95-btn reset-score-btn" onClick={() => handleResetKnockoutMatch(m.id)} style={{ fontSize: '7.5px', padding: '0px 3px', height: '13px', minHeight: 'unset', minWidth: 'unset' }}>Restablecer</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BracketWindow() {
  const {
    memoizedBracketMatches,
    isGroupStageOver,
    showPossibleMatches, setShowPossibleMatches,
    isBracketOpen, setIsBracketOpen,
    isBracketMinimized, setIsBracketMinimized,
  } = useSimulation();

  const bracketMatches = memoizedBracketMatches;

  const r32Order = [73, 75, 74, 77, 81, 82, 83, 84, 76, 78, 79, 80, 85, 87, 86, 88];
  const r16Order = [90, 89, 94, 93, 91, 92, 96, 95];
  const quarterOrder = [97, 98, 99, 100];
  const semiOrder = [101, 102];

  const getMatchesForRound = (stage, order) =>
    Object.values(bracketMatches).filter(m => m.stage === stage).sort((a, b) => order.indexOf(parseInt(a.id)) - order.indexOf(parseInt(b.id)));

  const r32Matches = getMatchesForRound('r32', r32Order);
  const r16Matches = getMatchesForRound('r16', r16Order);
  const quarterMatches = getMatchesForRound('quarter', quarterOrder);
  const semiMatches = getMatchesForRound('semi', semiOrder);
  const finalMatch = Object.values(bracketMatches).find(m => m.stage === 'final');
  const thirdMatch = Object.values(bracketMatches).find(m => m.stage === 'third');

  const champion = finalMatch && finalMatch.winner && !finalMatch.winner.isPlaceholder ? finalMatch.winner : null;
  let runnerUp = null;
  if (champion) {
    runnerUp = finalMatch.home.country === champion.country ? finalMatch.away : finalMatch.home;
    if (runnerUp.isPlaceholder) runnerUp = null;
  }
  const thirdPlace = thirdMatch && thirdMatch.winner && !thirdMatch.winner.isPlaceholder ? thirdMatch.winner : null;

  const championFlag = champion ? getCountryFlagUrl(champion.country, champion.name) : null;
  const runnerUpFlag = runnerUp ? getCountryFlagUrl(runnerUp.country, runnerUp.name) : null;
  const thirdPlaceFlag = thirdPlace ? getCountryFlagUrl(thirdPlace.country, thirdPlace.name) : null;

  const leftR32 = r32Matches.slice(0, 8);
  const rightR32 = r32Matches.slice(8, 16);
  const leftR16 = r16Matches.slice(0, 4);
  const rightR16 = r16Matches.slice(4, 8);
  const leftQuarter = quarterMatches.slice(0, 2);
  const rightQuarter = quarterMatches.slice(2, 4);
  const leftSemi = semiMatches.slice(0, 1);
  const rightSemi = semiMatches.slice(1, 2);

  const colStyle = { display: 'flex', flexDirection: 'column', justifyContent: 'space-around', minHeight: '580px', width: '190px', flexShrink: 0 };
  const colHeaderStyle = { textAlign: 'center', fontWeight: 'bold', fontSize: '10px', borderBottom: '1px solid #ccc', paddingBottom: '3px', color: 'var(--win-text)' };

  const bodyContent = (
    <div className="win95-tab-pane" style={{ flex: 1, overflow: 'hidden', padding: '8px' }}>
      <div className="win95-view-content bracket-container" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* Header toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', borderBottom: '2px solid var(--win-border-dark)', background: 'var(--win-bg)', zIndex: 10 }}>
          <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--win-text)' }}>Árbol de Eliminatorias (Lado a Lado - Final en el Centro)</span>
          {!isGroupStageOver && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px' }}>
              <input type="checkbox" id="showPossible" checked={showPossibleMatches} onChange={(e) => setShowPossibleMatches(e.target.checked)} style={{ margin: 0, cursor: 'pointer' }} />
              <label htmlFor="showPossible" style={{ cursor: 'pointer', userSelect: 'none', color: 'var(--win-text)' }}>Posibles Matches</label>
            </div>
          )}
        </div>

        {/* Bracket Layout */}
        <div className="win95-bracket-columns" style={{ display: 'flex', gap: '16px', padding: '16px', overflowX: 'auto', overflowY: 'auto', flex: 1, background: 'var(--win-bg-sunken, #fff)', minHeight: 0 }}>

          {/* LEFT SIDE */}
          <div className="bracket-column" style={colStyle}>
            <div style={colHeaderStyle}>Dieciseisavos Izq.</div>
            {leftR32.map(m => <BracketCard key={m.id} m={m} />)}
          </div>
          <div className="bracket-column" style={colStyle}>
            <div style={colHeaderStyle}>Octavos Izq.</div>
            {leftR16.map(m => <BracketCard key={m.id} m={m} />)}
          </div>
          <div className="bracket-column" style={colStyle}>
            <div style={colHeaderStyle}>Cuartos Izq.</div>
            {leftQuarter.map(m => <BracketCard key={m.id} m={m} />)}
          </div>
          <div className="bracket-column" style={colStyle}>
            <div style={colHeaderStyle}>Semis Izq.</div>
            {leftSemi.map(m => <BracketCard key={m.id} m={m} />)}
          </div>

          {/* CENTER FINALS */}
          <div className="bracket-column" style={{ ...colStyle, borderLeft: '1px dashed #bbb', borderRight: '1px dashed #bbb', padding: '0 8px' }}>
            <div style={colHeaderStyle}>Gran Final / 3°</div>
            <BracketCard m={finalMatch} />

            {/* Honor Roll */}
            <div className="win95-match-card-win podium-tribute-box" style={{ width: '100%', margin: '6px 0', padding: '6px', background: 'var(--win-bg)', border: '1px solid var(--win-border-dark)', boxShadow: 'none', borderRadius: '4px' }}>
              <div style={{ fontSize: '9px', fontWeight: 'bold', color: 'var(--win-text)', marginBottom: '4px', textAlign: 'center' }}>🎖️ CUADRO DE HONOR 🎖️</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5px', background: '#fff', border: '1px solid var(--win-border-dark)' }}>
                <tbody>
                  <tr style={{ background: champion ? 'linear-gradient(to right, #fff9d6, #ffe885)' : '#f8f8f8', borderBottom: '1px solid #ccc' }}>
                    <td style={{ padding: '3px 4px', fontWeight: 'bold', width: '16px' }}>🥇</td>
                    <td style={{ padding: '3px 4px', fontWeight: 'bold', color: '#111', whiteSpace: 'nowrap' }}>1° Campeón</td>
                    <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                      {champion ? <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}><img src={championFlag} alt={champion.label} style={{ width: '12px', height: '8px' }} /><span style={{ fontWeight: 'bold' }}>{champion.label}</span></div> : <span style={{ color: '#888' }}>-</span>}
                    </td>
                  </tr>
                  <tr style={{ background: runnerUp ? 'linear-gradient(to right, #f2f2f2, #e6e6e6)' : '#f8f8f8', borderBottom: '1px solid #ccc' }}>
                    <td style={{ padding: '3px 4px', fontWeight: 'bold', width: '16px' }}>🥈</td>
                    <td style={{ padding: '3px 4px', color: '#111', whiteSpace: 'nowrap' }}>2° Subcampeón</td>
                    <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                      {runnerUp ? <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}><img src={runnerUpFlag} alt={runnerUp.label} style={{ width: '12px', height: '8px' }} /><span>{runnerUp.label}</span></div> : <span style={{ color: '#888' }}>-</span>}
                    </td>
                  </tr>
                  <tr style={{ background: thirdPlace ? 'linear-gradient(to right, #faebd7, #f4a460)' : '#f8f8f8' }}>
                    <td style={{ padding: '3px 4px', fontWeight: 'bold', width: '16px' }}>🥉</td>
                    <td style={{ padding: '3px 4px', color: '#111', whiteSpace: 'nowrap' }}>3° Puesto</td>
                    <td style={{ padding: '3px 4px', textAlign: 'right' }}>
                      {thirdPlace ? <div style={{ display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'flex-end' }}><img src={thirdPlaceFlag} alt={thirdPlace.label} style={{ width: '12px', height: '8px' }} /><span>{thirdPlace.label}</span></div> : <span style={{ color: '#888' }}>-</span>}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <BracketCard m={thirdMatch} />
          </div>

          {/* RIGHT SIDE */}
          <div className="bracket-column" style={colStyle}>
            <div style={colHeaderStyle}>Semis Der.</div>
            {rightSemi.map(m => <BracketCard key={m.id} m={m} />)}
          </div>
          <div className="bracket-column" style={colStyle}>
            <div style={colHeaderStyle}>Cuartos Der.</div>
            {rightQuarter.map(m => <BracketCard key={m.id} m={m} />)}
          </div>
          <div className="bracket-column" style={colStyle}>
            <div style={colHeaderStyle}>Octavos Der.</div>
            {rightR16.map(m => <BracketCard key={m.id} m={m} />)}
          </div>
          <div className="bracket-column" style={colStyle}>
            <div style={colHeaderStyle}>Dieciseisavos Der.</div>
            {rightR32.map(m => <BracketCard key={m.id} m={m} />)}
          </div>

        </div>
      </div>
    </div>
  );

  return (
    <WindowShell
      windowKey="bracket"
      titleIcon="🏅"
      title="Cuadro Eliminatorio - MundialStats 2026"
      isOpen={isBracketOpen}
      isMinimized={isBracketMinimized}
      onClose={() => setIsBracketOpen(false)}
      onMinimize={() => setIsBracketMinimized(true)}
      menuBarContent={<BracketMenuBar />}
      statusLeft="Fase Eliminatoria: Dieciseisavos a Final"
    >
      {bodyContent}
    </WindowShell>
  );
}
