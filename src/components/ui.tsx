import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { STATUS_LISTA, type Status } from '../lib/types';

/* ---------- avisos e confirmação ---------- */
interface Aviso { id: number; texto: string; tipo: 'sucesso' | 'erro' }
interface Conf { titulo: string; texto: string; ok: string; perigo?: boolean; resolver: (v: boolean) => void }
interface Ctx {
  avisar: (texto: string, tipo?: 'sucesso' | 'erro') => void;
  confirmar: (titulo: string, texto: string, ok?: string, perigo?: boolean) => Promise<boolean>;
}
const UiCtx = createContext<Ctx | null>(null);
export const useUi = () => {
  const c = useContext(UiCtx);
  if (!c) throw new Error('UiProvider ausente');
  return c;
};

export function UiProvider({ children }: { children: ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [conf, setConf] = useState<Conf | null>(null);
  const seq = useRef(0);

  const avisar = useCallback((texto: string, tipo: 'sucesso' | 'erro' = 'sucesso') => {
    const id = ++seq.current;
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), tipo === 'erro' ? 6000 : 3200);
  }, []);

  const confirmar = useCallback(
    (titulo: string, texto: string, ok = 'Confirmar', perigo = false) =>
      new Promise<boolean>((resolver) => setConf({ titulo, texto, ok, perigo, resolver })),
    [],
  );
  const fechar = (v: boolean) => { conf?.resolver(v); setConf(null); };
  const valor = useMemo(() => ({ avisar, confirmar }), [avisar, confirmar]);

  return (
    <UiCtx.Provider value={valor}>
      {children}
      <div className="avisos" role="status" aria-live="polite">
        {avisos.map((a) => (<div key={a.id} className={`aviso ${a.tipo}`}>{a.texto}</div>))}
      </div>
      {conf && (
        <div className="veu noprint" role="dialog" aria-modal="true" onClick={() => fechar(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{conf.titulo}</h2>
            <p>{conf.texto}</p>
            <div className="botoes">
              <button className="btn grande" onClick={() => fechar(false)} autoFocus>Cancelar</button>
              <button className={`btn grande ${conf.perigo ? 'perigo' : 'primario'}`} onClick={() => fechar(true)}>{conf.ok}</button>
            </div>
          </div>
        </div>
      )}
    </UiCtx.Provider>
  );
}

export function Modal({ titulo, onFechar, children, largo }: { titulo: string; onFechar: () => void; children: ReactNode; largo?: boolean }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onFechar]);
  return (
    <div className="veu noprint" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className={`modal ${largo ? 'largo' : ''}`}>
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  );
}

/* ---------- situação ---------- */
export const classeStatus = (s: string) => `st-${s.replace(/\s+/g, '-')}`;
export const Selo = ({ status }: { status: string }) => <span className={`selo ${classeStatus(status)}`}>{status}</span>;

export function SeletorStatus({ valor, onMudar, desabilitado }: { valor: Status; onMudar: (s: Status) => void; desabilitado?: boolean }) {
  return (
    <select
      className={`sel-status ${classeStatus(valor)}`}
      value={valor}
      disabled={desabilitado}
      aria-label="Situação do serviço"
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onMudar(e.target.value as Status)}
    >
      {STATUS_LISTA.map((s) => (<option key={s} value={s}>{s}</option>))}
    </select>
  );
}

export const COR_STATUS: Record<Status, string> = {
  Aguardando: '#a89f90', 'Em andamento': '#e0a325', Pronto: '#3f6b3a', Entregue: '#71717a',
};

/* ---------- mensagens de erro ---------- */
export const msgErro = (e: unknown) => (e instanceof Error ? e.message : String(e ?? 'Erro desconhecido'));

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return <div className="vazio">{texto}</div>;
}
