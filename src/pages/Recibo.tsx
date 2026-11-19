import { useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { dataBR, moeda } from '../lib/format';
import { useConfig, useOrcamento, useAvariasCat, useServicosCat } from '../lib/dados';
import { Carregando } from '../components/ui';
import { IcImpressora } from '../components/Icones';

export function Recibo() {
  const { id } = useParams();
  const [qs] = useSearchParams();
  const { data: o, isLoading } = useOrcamento(id);
  const { data: cfg } = useConfig();
  const { data: catS } = useServicosCat();
  const { data: catA } = useAvariasCat();
  const ref = useRef<HTMLDivElement>(null);
  const pronto = Boolean(o && cfg && catS && catA);

  // Garante UMA página A4: se o conteúdo for maior que a folha, ele é reduzido (inclui o horário de funcionamento).
  const ajustar = () => {
    const c = ref.current;
    if (!c) return;
    c.style.zoom = '1';
    const limite = 1010; // altura útil de uma A4 (277 mm) em px, com folga
    const h = c.getBoundingClientRect().height;
    if (h > limite) c.style.zoom = String(limite / h);
  };
  useLayoutEffect(() => { if (pronto) ajustar(); });
  useEffect(() => {
    window.addEventListener('beforeprint', ajustar);
    return () => window.removeEventListener('beforeprint', ajustar);
  }, []);
  useEffect(() => {
    if (pronto && qs.get('imprimir') === '1') {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [pronto, qs]);

  if (isLoading || (o && !pronto)) return <Carregando />;
  if (!o || !cfg) return <div className="vazio">Orçamento não encontrado.</div>;

  const mapa = new Map(o.servicos.map((s) => [s.nome, s.valor]));
  const nomesServ = [...(catS ?? []).filter((s) => s.ativo || mapa.has(s.nome)).map((s) => s.nome)];
  for (const s of o.servicos) if (!nomesServ.includes(s.nome)) nomesServ.push(s.nome);
  const nomesAv = [...(catA ?? []).filter((a) => a.ativo || o.avarias.includes(a.nome)).map((a) => a.nome)];
  for (const a of o.avarias) if (!nomesAv.includes(a)) nomesAv.push(a);
  const v = o.veiculo;

  return (
    <div className="recibo-pagina">
      <div className="recibo-barra noprint">
        <Link to={`/orcamentos/${o.id}`} className="btn">← Voltar</Link>
        <button className="btn primario grande" onClick={() => window.print()}><IcImpressora /> Imprimir</button>
      </div>
      <div className="recibo-folha">
        {cfg.fundo_recibo_path && <img className="recibo-marca" src={api.urlEmpresa(cfg.fundo_recibo_path)} alt="" />}
        <div className="recibo-conteudo" ref={ref}>
          <div className="rc-empresa">
            {cfg.logo_path && <img src={api.urlEmpresa(cfg.logo_path)} alt="" />}
            <div className="nome">{cfg.nome}</div>
            <div className="end">{cfg.endereco}</div>
            <div className="end">{cfg.telefones}</div>
          </div>
          <div className="rc-titulo">Orçamento / Ordem de Serviço</div>
          <div className="rc-numero">Nº {o.numero}</div>

          <div className="rc-linha"><div><b>Entrada:</b> {dataBR(o.entrada) || '-'}</div><div><b>Saída:</b> {dataBR(o.saida) || '-'}</div></div>
          <div className="rc-linha"><div><b>Cliente:</b> {o.cliente.nome}</div><div><b>Tel:</b> {o.cliente.telefone || '-'}</div></div>
          <div className="rc-linha"><div><b>Veículo:</b> {v.marca || '-'}</div><div><b>Ano:</b> {v.ano || '-'}</div></div>
          <div className="rc-linha"><div><b>Modelo:</b> {v.modelo || '-'}</div><div><b>Placa:</b> {v.placa}</div><div><b>Cor:</b> {v.cor || '-'}</div></div>

          <div className="rc-cols">
            <div>
              <div className="rc-col-titulo">Avarias já existentes no carro</div>
              {nomesAv.map((a) => (<div className="rc-item" key={a}><span>{a}</span><span className="box">{o.avarias.includes(a) ? '[X]' : '[ ]'}</span></div>))}
            </div>
            <div>
              <div className="rc-col-titulo">Serviços</div>
              {nomesServ.map((n) => (<div className="rc-item" key={n}><span>{n}</span><span className="box">{mapa.has(n) ? `[X] ${moeda(mapa.get(n))}` : '[ ]'}</span></div>))}
            </div>
          </div>

          <div className="rc-col-titulo">Observações</div>
          <div className="rc-obs">{o.observacoes || '-'}</div>

          <div className="rc-valores">
            <div>Peças<b>{moeda(o.pecas)}</b></div>
            <div>Total<b>{moeda(o.total)}</b></div>
          </div>

          <div className="rc-ass"><div><div className="l" /><div>Assinatura do cliente</div></div></div>

          <div className="rc-rodape">
            <div>1) Prazo para retirar: 90 dias. Garantia de 90 dias.</div>
            <div>2) Garantia e entrega somente com a Ordem de Serviço (O.S).</div>
            <div>3) Reajuste de 10% a cada 30 dias vencidos (taxa de conservação).</div>
            <div>4) O veículo somente será liberado após realização do pagamento.</div>
            <div className="destaque">NÃO ACEITAMOS CHEQUES</div>
            <div className="horario">Horário de funcionamento: Segunda a sexta, das 8:00 às 17:30h</div>
          </div>
        </div>
      </div>
    </div>
  );
}
