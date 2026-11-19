import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { dataBR, moeda, MESES, nomeArquivoSeguro } from '../lib/format';
import { useConfig, useOrcamentos } from '../lib/dados';
import { anosDisponiveis, filtrar, filtroVazio, type Filtro } from '../lib/filtros';
import { useExcluirOrcamento, useMudarStatus } from '../lib/mutacoes';
import { Carregando, SeletorStatus, useUi, msgErro } from '../components/ui';
import { IcImpressora, IcLapis, IcLixeira, IcMais, IcPlanilha } from '../components/Icones';
import { FILTRO_STATUS_ABERTOS, FILTRO_STATUS_TODOS, STATUS_LISTA, type Orcamento } from '../lib/types';
import { gerarPlanilha } from '../lib/excel';
import { baixar } from '../lib/download';

export function Orcamentos() {
  const { data, isLoading, error } = useOrcamentos();
  const { data: cfg } = useConfig();
  const [f, setF] = useState<Filtro>(filtroVazio);
  const nav = useNavigate();
  const mudar = useMudarStatus();
  const excluir = useExcluirOrcamento();
  const { avisar } = useUi();

  const lista = useMemo(() => filtrar(data ?? [], f), [data, f]);
  const total = lista.reduce((s, o) => s + o.total, 0);
  const set = (p: Partial<Filtro>) => setF((a) => ({ ...a, ...p }));

  if (isLoading) return <Carregando />;
  if (error || !data) return <div className="vazio">Não foi possível carregar os orçamentos.</div>;

  async function planilha() {
    try {
      const periodo = f.busca ? `busca "${f.busca}"` : [f.mes !== 'Todos' ? MESES[Number(f.mes) - 1] : '', f.ano !== 'Todos' ? f.ano : ''].filter(Boolean).join(' / ') || 'todos os períodos';
      const blob = await gerarPlanilha(lista, cfg?.nome || 'Amorim Pintura Automotiva', periodo);
      baixar(blob, `orcamentos_${nomeArquivoSeguro(periodo)}.xlsx`);
    } catch (e) { avisar(msgErro(e), 'erro'); }
  }

  const acoes = (o: Orcamento) => (
    <>
      <button className="btn pequeno" onClick={(e) => { e.stopPropagation(); nav(`/orcamentos/${o.id}/editar`); }}><IcLapis /> Editar</button>
      <button className="btn pequeno" onClick={(e) => { e.stopPropagation(); nav(`/orcamentos/${o.id}/recibo`); }}><IcImpressora /> Imprimir</button>
      <button className="btn pequeno perigo" aria-label="Excluir" onClick={(e) => { e.stopPropagation(); void excluir(o.id, `O orçamento #${o.numero} (${o.veiculo.placa})`); }}><IcLixeira /></button>
    </>
  );

  return (
    <>
      <div className="cab">
        <div><h1>Orçamentos</h1><div className="sub">{lista.length} encontrado(s) · {moeda(total)}</div></div>
        <div className="acoes">
          <button className="btn grande" onClick={() => void planilha()} disabled={!lista.length}><IcPlanilha /> Exportar Excel</button>
          <Link to="/orcamentos/novo" className="btn primario grande"><IcMais /> Novo orçamento</Link>
        </div>
      </div>

      <div className="cartao">
        <div className="filtros">
          <div className="campo busca">
            <label htmlFor="b">Buscar (placa, cliente, veículo, modelo — em todos os períodos)</label>
            <input id="b" type="search" placeholder="Ex.: ABC1D23, Maria, Gol…" value={f.busca} onChange={(e) => set({ busca: e.target.value })} />
          </div>
          <div className="campo"><label htmlFor="m">Mês</label>
            <select id="m" value={f.mes} onChange={(e) => set({ mes: e.target.value })}>
              <option>Todos</option>{MESES.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </select></div>
          <div className="campo"><label htmlFor="a">Ano</label>
            <select id="a" value={f.ano} onChange={(e) => set({ ano: e.target.value })}>
              <option>Todos</option>{anosDisponiveis(data).map((a) => <option key={a}>{a}</option>)}
            </select></div>
          <div className="campo"><label htmlFor="s">Situação</label>
            <select id="s" value={f.status} onChange={(e) => set({ status: e.target.value })}>
              <option>{FILTRO_STATUS_TODOS}</option><option>{FILTRO_STATUS_ABERTOS}</option>
              {STATUS_LISTA.map((s) => <option key={s}>{s}</option>)}
            </select></div>
          <div className="linha-acoes">
            <span className="dica" style={{ color: 'var(--fraco)', fontSize: 13 }}>Ao buscar, mês e ano são ignorados.</span>
            <button className="btn pequeno" onClick={() => setF(filtroVazio)}>Limpar filtros</button>
          </div>
        </div>

        {lista.length === 0 ? <div className="vazio">Nenhum orçamento encontrado.</div> : (
          <>
            <div className="tabela-wrap">
              <table className="tabela">
                <thead><tr><th>Nº</th><th>Entrada</th><th>Cliente</th><th>Veículo</th><th>Placa</th><th className="dir">Total</th><th>Situação</th><th></th></tr></thead>
                <tbody>
                  {lista.map((o) => (
                    <tr key={o.id} onClick={() => nav(`/orcamentos/${o.id}`)}>
                      <td className="num">{o.numero}</td>
                      <td>{dataBR(o.entrada)}</td>
                      <td><div className="cortado">{o.cliente.nome}</div></td>
                      <td><div className="cortado">{[o.veiculo.marca, o.veiculo.modelo].filter(Boolean).join(' ')}</div></td>
                      <td className="placa">{o.veiculo.placa}</td>
                      <td className="dir valor">{moeda(o.total)}</td>
                      <td><SeletorStatus valor={o.status} desabilitado={mudar.isPending} onMudar={(s) => mudar.mutate({ id: o.id, status: s })} /></td>
                      <td><div className="acoes">{acoes(o)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lista-cartoes">
              {lista.map((o) => (
                <div className="cartao-orc" key={o.id} onClick={() => nav(`/orcamentos/${o.id}`)}>
                  <div className="topo"><span className="placa">{o.veiculo.placa}</span><span className="valor">{moeda(o.total)}</span></div>
                  <div className="linha">#{o.numero} · {dataBR(o.entrada)} · {o.cliente.nome}</div>
                  <div className="linha">{[o.veiculo.marca, o.veiculo.modelo].filter(Boolean).join(' ')}</div>
                  <div className="rodape"><SeletorStatus valor={o.status} desabilitado={mudar.isPending} onMudar={(s) => mudar.mutate({ id: o.id, status: s })} /></div>
                  <div className="botoes">{acoes(o)}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
