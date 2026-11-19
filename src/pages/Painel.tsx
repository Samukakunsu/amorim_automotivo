import { Link, useNavigate } from 'react-router-dom';
import { dataExtenso, moeda } from '../lib/format';
import { useOrcamentos } from '../lib/dados';
import { useMudarStatus } from '../lib/mutacoes';
import { Carregando, COR_STATUS, SeletorStatus } from '../components/ui';
import { IcMais } from '../components/Icones';
import { STATUS_LISTA } from '../lib/types';

export function Painel() {
  const { data, isLoading, error } = useOrcamentos();
  const mudar = useMudarStatus();
  const nav = useNavigate();
  if (isLoading) return <Carregando />;
  if (error || !data) return <div className="vazio">Não foi possível carregar os orçamentos. Verifique a conexão.</div>;

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  const doMes = data.filter((o) => o.entrada.startsWith(mesAtual));
  const abertos = data.filter((o) => o.status !== 'Entregue');
  const prontos = data.filter((o) => o.status === 'Pronto');
  const aReceber = abertos.reduce((s, o) => s + o.total, 0);

  const stats = [
    { rot: 'Carros na oficina', val: String(abertos.length), cor: COR_STATUS['Em andamento'] },
    { rot: 'Prontos p/ entrega', val: String(prontos.length), cor: COR_STATUS.Pronto },
    { rot: 'Orçamentos no mês', val: String(doMes.length), cor: '#b3241f' },
    { rot: 'Faturado no mês', val: moeda(doMes.reduce((s, o) => s + o.total, 0)), cor: '#1c1917' },
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
        <h2>Últimos orçamentos</h2>
        {data.length === 0 ? <div className="vazio">Nenhum orçamento ainda.</div> : (
          <ul className="lista-simples">
            {data.slice(0, 6).map((o) => (
              <li key={o.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/orcamentos/${o.id}`)}>
                <span><b>#{o.numero}</b> · {o.cliente.nome} · <span className="placa">{o.veiculo.placa}</span></span>
                <span className="valor">{moeda(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
