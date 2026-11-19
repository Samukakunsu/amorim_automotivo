import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dataExtenso, moeda, MESES } from '../lib/format';
import { anosDisponiveis } from '../lib/filtros';
import { useOrcamentos } from '../lib/dados';
import { useMudarStatus } from '../lib/mutacoes';
import { Carregando, COR_STATUS, SeletorStatus } from '../components/ui';
import { IcMais } from '../components/Icones';
import { STATUS_LISTA } from '../lib/types';

export function Painel() {
  const { data, isLoading, error } = useOrcamentos();
  const mudar = useMudarStatus();
  const nav = useNavigate();
  const agora = new Date();
  const [ano, setAno] = useState(String(agora.getFullYear()));
  const [mes, setMes] = useState(String(agora.getMonth() + 1));
  if (isLoading) return <Carregando />;
  if (error || !data) return <div className="vazio">Não foi possível carregar os orçamentos. Verifique a conexão.</div>;

  const doPeriodo = data.filter((o) =>
    (ano === 'Todos' || o.entrada.slice(0, 4) === ano) && (mes === 'Todos' || o.entrada.slice(5, 7) === mes.padStart(2, '0')));
  const periodo = [mes !== 'Todos' ? MESES[Number(mes) - 1] : '', ano !== 'Todos' ? ano : ''].filter(Boolean).join(' de ') || 'todos os períodos';
  const abertos = data.filter((o) => o.status !== 'Entregue');
  const prontos = data.filter((o) => o.status === 'Pronto');
  const aReceber = abertos.reduce((s, o) => s + o.total, 0);

  const stats = [
    { rot: 'Carros na oficina', val: String(abertos.length), cor: COR_STATUS['Em andamento'] },
    { rot: 'Prontos p/ entrega', val: String(prontos.length), cor: COR_STATUS.Pronto },
    { rot: 'Orçamentos no período', val: String(doPeriodo.length), cor: '#b3241f' },
    { rot: 'Faturado no período', val: moeda(doPeriodo.reduce((s, o) => s + o.total, 0)), cor: '#1c1917' },
  ];

  return (
    <>
      <div className="cab">
        <div>
          <h1>Painel</h1>
          <div className="sub">{dataExtenso().replace(/^./, (c) => c.toUpperCase())}</div>
        </div>
        <div className="acoes">
          <Link to="/orcamentos/novo" className="btn primario grande"><IcMais /> Novo orçamento</Link>
        </div>
      </div>

      <div className="cartao" style={{ marginBottom: 16 }}>
        <div className="grade g3" style={{ alignItems: 'end' }}>
          <div className="campo"><label htmlFor="pa">Ano</label>
            <select id="pa" value={ano} onChange={(e) => setAno(e.target.value)}>
              <option>Todos</option>{anosDisponiveis(data).map((a) => <option key={a}>{a}</option>)}
            </select></div>
          <div className="campo"><label htmlFor="pm">Mês</label>
            <select id="pm" value={mes} onChange={(e) => setMes(e.target.value)}>
              <option>Todos</option>{MESES.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select></div>
          <div className="dica" style={{ color: 'var(--fraco)', fontSize: 13 }}>Período dos números abaixo: <b>{periodo}</b>. Os carros na oficina aparecem sempre.</div>
        </div>
      </div>

      <div className="stats">
        {stats.map((s) => (
          <div className="stat" key={s.rot}>
            <div className="barra" style={{ background: s.cor }} />
            <div className="rot">{s.rot}</div>
            <div className="val">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="cab" style={{ marginBottom: 12 }}>
        <div>
          <h2>Carros na oficina</h2>
          <div className="sub">Altere a situação direto aqui; todos os aparelhos veem na hora. Em aberto: {moeda(aReceber)}</div>
        </div>
      </div>

      <div className="quadro">
        {STATUS_LISTA.filter((s) => s !== 'Entregue').map((s) => {
          const col = abertos.filter((o) => o.status === s);
          return (
            <section className="coluna" key={s}>
              <h3><span style={{ borderLeft: `5px solid ${COR_STATUS[s]}`, paddingLeft: 8 }}>{s}</span><span className="contagem">{col.length}</span></h3>
              {col.length === 0 && <div className="vazio" style={{ padding: 16 }}>Nenhum carro</div>}
              {col.map((o) => (
                <div className="carro" key={o.id}>
                  <Link to={`/orcamentos/${o.id}`}>
                    <div className="placa">{o.veiculo.placa}</div>
                    <div className="l2">{[o.veiculo.marca, o.veiculo.modelo].filter(Boolean).join(' ') || 'Veículo'} · {o.cliente.nome}</div>
                  </Link>
                  <div className="rod">
                    <SeletorStatus valor={o.status} desabilitado={mudar.isPending} onMudar={(st) => mudar.mutate({ id: o.id, status: st })} />
                    <span className="valor">{moeda(o.total)}</span>
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      <div className="cartao" style={{ marginTop: 20 }}>
        <h2>Orçamentos — {periodo}</h2>
        {doPeriodo.length === 0 ? <div className="vazio">Nenhum orçamento neste período.</div> : (
          <ul className="lista-simples">
            {doPeriodo.slice(0, 10).map((o) => (
              <li key={o.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/orcamentos/${o.id}`)}>
                <span><b>#{o.numero}</b> · {o.cliente.nome} · <span className="placa">{o.veiculo.placa}</span></span>
                <span className="valor">{moeda(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
        {doPeriodo.length > 10 && <div style={{ marginTop: 12 }}><Link to="/orcamentos" className="btn">Ver todos ({doPeriodo.length})</Link></div>}
      </div>
    </>
  );
}
