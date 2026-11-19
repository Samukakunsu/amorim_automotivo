import { Link, useNavigate, useParams } from 'react-router-dom';
import { dataBR, moeda } from '../lib/format';
import { useOrcamento, useUrlFoto } from '../lib/dados';
import { useExcluirOrcamento, useMudarStatus } from '../lib/mutacoes';
import { Carregando, SeletorStatus } from '../components/ui';
import { IcImpressora, IcLapis, IcLixeira } from '../components/Icones';

export function OrcamentoDetalhe() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: o, isLoading } = useOrcamento(id);
  const { data: foto } = useUrlFoto(o?.foto_path);
  const mudar = useMudarStatus();
  const excluir = useExcluirOrcamento();

  if (isLoading) return <Carregando />;
  if (!o) return <div className="vazio">Orçamento não encontrado (pode ter sido excluído em outro aparelho). <Link to="/orcamentos">Voltar</Link></div>;
  const v = o.veiculo;
  const servTotal = o.servicos.reduce((s, x) => s + x.valor, 0);

  return (
    <>
      <div className="cab">
        <div>
          <h1>Orçamento #{o.numero}</h1>
          <div className="sub">{o.cliente.nome} · <b>{v.placa}</b></div>
        </div>
        <div className="acoes">
          <SeletorStatus valor={o.status} desabilitado={mudar.isPending} onMudar={(s) => mudar.mutate({ id: o.id, status: s })} />
          <button className="btn grande" onClick={() => nav(`/orcamentos/${o.id}/editar`)}><IcLapis /> Editar</button>
          <button className="btn grande verde" onClick={() => nav(`/orcamentos/${o.id}/recibo`)}><IcImpressora /> Imprimir</button>
          <button className="btn grande perigo" onClick={async () => { if (await excluir(o.id, `O orçamento #${o.numero} (${v.placa})`)) nav('/orcamentos'); }}><IcLixeira /> Excluir</button>
        </div>
      </div>

      <div className="detalhe-grade">
        <div>
          <section className="cartao">
            <h2>Cliente e veículo</h2>
            <div className="info">
              <div><div className="rot">CLIENTE</div><div className="val">{o.cliente.nome}</div></div>
              <div><div className="rot">TELEFONE</div><div className="val">{o.cliente.telefone || '-'}</div></div>
              <div><div className="rot">VEÍCULO</div><div className="val">{[v.marca, v.modelo].filter(Boolean).join(' ') || '-'}</div></div>
              <div><div className="rot">ANO / COR</div><div className="val">{[v.ano, v.cor].filter(Boolean).join(' · ') || '-'}</div></div>
              <div><div className="rot">ENTRADA</div><div className="val">{dataBR(o.entrada)}</div></div>
              <div><div className="rot">SAÍDA</div><div className="val">{dataBR(o.saida) || '-'}</div></div>
            </div>
          </section>
          <section className="cartao">
            <h2>Serviços</h2>
            {o.servicos.length === 0 ? <div className="sub">Nenhum serviço marcado.</div> : (
              <ul className="lista-simples">{o.servicos.map((s) => (<li key={s.nome}><span>{s.nome}</span><span className="valor">{moeda(s.valor)}</span></li>))}</ul>
            )}
          </section>
          <section className="cartao">
            <h2>Avarias e observações</h2>
            {o.avarias.length ? <div className="chips">{o.avarias.map((a) => <span className="chip" key={a}>{a}</span>)}</div> : <div className="sub">Nenhuma avaria registrada.</div>}
            <div className="rotulo" style={{ marginTop: 16 }}>OBSERVAÇÕES</div>
            <div style={{ whiteSpace: 'pre-wrap', marginTop: 4 }}>{o.observacoes || '-'}</div>
          </section>
        </div>
        <div>
          <section className="resumo">
            <h2>Valores</h2>
            <div className="linha-val"><span>Serviços</span><span>{moeda(servTotal)}</span></div>
            <div className="linha-val"><span>Peças</span><span>{moeda(o.pecas)}</span></div>
            <div className="linha-val total"><span>Total</span><strong>{moeda(o.total)}</strong></div>
          </section>
          <section className="cartao" style={{ marginTop: 16 }}>
            <h2>Foto</h2>
            {foto ? <img className="foto-detalhe" src={foto} alt="Foto do veículo" /> : <div className="sub">{o.foto_path ? 'Carregando foto…' : 'Sem foto.'}</div>}
          </section>
        </div>
      </div>
    </>
  );
}
