import { useSimulation } from '../context/SimulationContext';
import WindowShell from '../components/ui/WindowShell';

export default function AboutWindow() {
  const { isAboutOpen, setIsAboutOpen, isAboutMinimized, setIsAboutMinimized } = useSimulation();

  const bodyContent = (
    <div className="win95-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '12px', flex: 1, overflowY: 'auto' }}>
      <div className="about-main-info" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
        <div className="about-system-icon" style={{ fontSize: '40px', lineHeight: 1, flexShrink: 0 }}>🏆</div>
        <div className="about-text-content">
          <h2 style={{ margin: '0 0 4px' }}>MundialStats 2026</h2>
          <p style={{ margin: '2px 0', fontSize: '11px' }}>Versión 1.0 (Build 9500)</p>
          <p style={{ margin: '2px 0', fontSize: '11px' }}>Derechos reservados © 2026 Henry7001</p>
          <p className="license-text" style={{ margin: '6px 0 0', fontSize: '11px', color: '#555' }}>
            Este programa está licenciado para el uso interactivo de simulación de la Copa del Mundo 2026.
          </p>
        </div>
      </div>

      <div className="win95-sunken about-description-box" style={{ padding: '8px', fontSize: '11px', lineHeight: '1.5' }}>
        Este software realiza solicitudes HTTP directas a una base de datos pública de fútbol en GitHub
        (<strong>openfootball/worldcup.json</strong>) para obtener los resultados programados del Mundial 2026.
        Permite modificar interactivamente los marcadores de los partidos en vivo para actualizar
        instantáneamente las tablas de posiciones de los Grupos A al L.
      </div>

      <div className="about-btn-row" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4px' }}>
        <button className="win95-btn default-btn" onClick={() => setIsAboutOpen(false)} style={{ minWidth: '80px' }}>
          Aceptar
        </button>
      </div>
    </div>
  );

  return (
    <WindowShell
      windowKey="about"
      titleIcon="❔"
      title="Acerca de MundialStats"
      isOpen={isAboutOpen}
      isMinimized={isAboutMinimized}
      onClose={() => setIsAboutOpen(false)}
      onMinimize={() => setIsAboutMinimized(true)}
      menuBarContent={null}
      statusLeft="MundialStats 2026 — v1.0"
      noResize
      noMaximize
    >
      {bodyContent}
    </WindowShell>
  );
}
