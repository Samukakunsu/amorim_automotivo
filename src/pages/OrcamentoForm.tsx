import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { hojeISO, moeda, normalizaPlaca, paraNumero } from '../lib/format';
import { useAvariasCat, useOrcamento, useServicosCat, useUrlFoto } from '../lib/dados';
import { comprimirFoto } from '../lib/imagem';
import { Carregando, msgErro, useUi } from '../components/ui';
import { IcCamera, IcLixeira } from '../components/Icones';
import { STATUS_LISTA, type Status } from '../lib/types';

interface Linha { marcado: boolean; valor: string }

export function OrcamentoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const { avisar } = useUi();
  const { data: orc, isLoading } = useOrcamento(id);
  const { data: catS } = useServicosCat();
  const { data: catA } = useAvariasCat();

  const [nome, setNome] = useState('');
  const [tel, setTel] = useState('');
  const [clienteId, setClienteId] = useState<string | undefined>();
  const [autoNome, setAutoNome] = useState<string | null>(null);
  const [marca, setMarca] = useState(''); const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState(''); const [placa, setPlaca] = useState(''); const [cor, setCor] = useState('');
  const [entrada, setEntrada] = useState(hojeISO());
  const [saida, setSaida] = useState('');
  const [status, setStatus] = useState<Status>('Aguardando');
  const [pecas, setPecas] = useState('');
  const [obs, setObs] = useState('');
  const [servicos, setServicos] = useState<Record<string, Linha>>({});
  const [extras, setExtras] = useState<{ nome: string; valor: string }[]>([]);
  const [avarias, setAvarias] = useState<string[]>([]);
  const [fotoPath, setFotoPath] = useState<string | null>(null);
  const [fotoPrevia, setFotoPrevia] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [placaMsg, setPlacaMsg] = useState('');
  const carregado = useRef(false);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const { data: urlFoto } = useUrlFoto(fotoPath && !fotoPrevia ? fotoPath : null);

  // carrega dados ao editar (uma vez, para não sobrescrever o que a pessoa está digitando)
  useEffect(() => {
    if (!orc || !catS || carregado.current) return;
    carregado.current = true;
    setNome(orc.cliente.nome); setTel(orc.cliente.telefone ?? ''); setClienteId(orc.cliente.id);
    setMarca(orc.veiculo.marca ?? ''); setModelo(orc.veiculo.modelo ?? ''); setAno(orc.veiculo.ano ?? '');
    setPlaca(orc.veiculo.placa); setCor(orc.veiculo.cor ?? '');
    setEntrada(orc.entrada); setSaida(orc.saida ?? ''); setStatus(orc.status);
    setPecas(orc.pecas ? String(orc.pecas).replace('.', ',') : ''); setObs(orc.observacoes ?? '');
    setAvarias(orc.avarias); setFotoPath(orc.foto_path);
    const mapa: Record<string, Linha> = {}; const ex: { nome: string; valor: string }[] = [];
    const nomes = new Set(catS.map((s) => s.nome));
    for (const s of orc.servicos) {
      if (nomes.has(s.nome)) mapa[s.nome] = { marcado: true, valor: String(s.valor).replace('.', ',') };
      else ex.push({ nome: s.nome, valor: String(s.valor).replace('.', ',') });
    }
    setServicos(mapa); setExtras(ex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orc, catS]);
  function setPl(v: string) { setPlaca(v.toUpperCase()); }

  // preenche pelo histórico ao digitar uma placa já conhecida (só em orçamento novo)
  useEffect(() => {
    if (editando) return;
    const n = normalizaPlaca(placa);
    if (n.length < 7) { setPlacaMsg(''); return; }
    let vivo = true;
    void api.buscarPorPlaca(n).then((r) => {
      if (!vivo || !r) { if (vivo) setPlacaMsg(''); return; }
      setMarca(r.veiculo.marca ?? ''); setModelo(r.veiculo.modelo ?? ''); setAno(r.veiculo.ano ?? ''); setCor(r.veiculo.cor ?? '');
      setNome(r.cliente.nome); setTel(r.cliente.telefone ?? ''); setClienteId(r.cliente.id); setAutoNome(r.cliente.nome);
      setPlacaMsg(`Veículo já cadastrado — dados de ${r.cliente.nome} preenchidos.`);
    }).catch(() => undefined);
    return () => { vivo = false; };
  }, [placa, editando]);

  // se a pessoa trocar o nome depois do preenchimento automático, vira outro cliente
  function mudarNome(v: string) {
    setNome(v);
    if (!editando && autoNome !== null && v !== autoNome) { setClienteId(undefined); setAutoNome(null); }
  }

  const totalServ = useMemo(() => {
    const a = Object.values(servicos).filter((l) => l.marcado).reduce((s, l) => s + paraNumero(l.valor), 0);
    return a + extras.reduce((s, e) => s + (e.nome.trim() ? paraNumero(e.valor) : 0), 0);
  }, [servicos, extras]);
  const total = totalServ + paraNumero(pecas);

  function alternar(n: string, padrao: number) {
    setServicos((m) => {
      const atual = m[n];
      if (atual?.marcado) return { ...m, [n]: { ...atual, marcado: false } };
      return { ...m, [n]: { marcado: true, valor: atual?.valor || (padrao ? String(padrao).replace('.', ',') : '') } };
    });
  }

  async function escolherFoto(file?: File | null) {
    if (!file) return;
    try {
      const blob = await comprimirFoto(file);
      const novo = await api.enviarFoto(blob);
      if (fotoPath && fotoPath !== orc?.foto_path) void api.removerArquivo('fotos', fotoPath).catch(() => undefined);
      setFotoPath(novo); setFotoPrevia(URL.createObjectURL(blob));
    } catch (e) { avisar(msgErro(e), 'erro'); }
  }

  async function salvar(ev?: FormEvent) {
    ev?.preventDefault();
    if (!nome.trim()) return avisar('Informe o nome do cliente.', 'erro');
    if (normalizaPlaca(placa).length < 5) return avisar('Informe a placa do veículo.', 'erro');
    if (!entrada) return avisar('Informe a data de entrada.', 'erro');
    setSalvando(true);
    try {
      const lista = [
        ...(catS ?? []).filter((s) => servicos[s.nome]?.marcado).map((s) => ({ nome: s.nome, valor: paraNumero(servicos[s.nome].valor) })),
        ...extras.filter((e) => e.nome.trim()).map((e) => ({ nome: e.nome.trim(), valor: paraNumero(e.valor) })),
      ];
      const novoId = await api.salvarOrcamento({
        id, cliente: { id: clienteId, nome: nome.trim(), telefone: tel.trim() },
        veiculo: { marca: marca.trim(), modelo: modelo.trim(), ano: ano.trim(), placa: placa.trim(), cor: cor.trim() },
        entrada, saida: saida || null, status, pecas: paraNumero(pecas), observacoes: obs.trim(),
        servicos: lista, avarias, foto_path: fotoPath,
      });
      if (orc?.foto_path && orc.foto_path !== fotoPath) void api.removerArquivo('fotos', orc.foto_path).catch(() => undefined);
      await qc.invalidateQueries();
      avisar(editando ? 'Orçamento atualizado.' : 'Orçamento salvo.');
      nav(`/orcamentos/${novoId}`);
    } catch (e) { avisar(msgErro(e), 'erro'); }
    finally { setSalvando(false); }
  }

  if (editando && (isLoading || !catS || !catA)) return <Carregando />;
  if (editando && !orc) return <div className="vazio">Orçamento não encontrado (talvez tenha sido excluído em outro aparelho).</div>;
  const preview = fotoPrevia || (fotoPath ? urlFoto : null);

  return (
    <form onSubmit={salvar}>
      <div className="cab">
        <div><h1>{editando ? `Editar orçamento #${orc?.numero}` : 'Novo orçamento'}</h1><div className="sub">Preencha os dados; o total é calculado automaticamente.</div></div>
        <div className="acoes"><button type="button" className="btn grande" onClick={() => nav(-1)}>Cancelar</button></div>
      </div>

      <div className="form-grade">
        <div className="col-esq">
          <section className="cartao">
            <h2><span className="num-secao">1</span> Veículo e cliente</h2>
            <div className="grade g3">
              <div className="campo"><label htmlFor="pl">Placa *</label>
                <input id="pl" type="text" value={placa} onChange={(e) => setPl(e.target.value)} maxLength={8} autoCapitalize="characters" placeholder="ABC1D23" />
                {placaMsg && <span className="dica ok">{placaMsg}</span>}</div>
              <div className="campo"><label htmlFor="ma">Marca</label><input id="ma" type="text" value={marca} onChange={(e) => setMarca(e.target.value)} /></div>
              <div className="campo"><label htmlFor="mo">Modelo</label><input id="mo" type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} /></div>
              <div className="campo"><label htmlFor="an">Ano</label><input id="an" type="text" inputMode="numeric" value={ano} onChange={(e) => setAno(e.target.value)} maxLength={9} /></div>
              <div className="campo"><label htmlFor="co">Cor</label><input id="co" type="text" value={cor} onChange={(e) => setCor(e.target.value)} /></div>
            </div>
            <div className="grade g2" style={{ marginTop: 14 }}>
              <div className="campo"><label htmlFor="cn">Nome do cliente *</label><input id="cn" type="text" value={nome} onChange={(e) => mudarNome(e.target.value)} /></div>
              <div className="campo"><label htmlFor="ct">Telefone</label><input id="ct" type="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="(82) 99999-9999" /></div>
            </div>
          </section>

          <section className="cartao">
            <h2><span className="num-secao">2</span> Datas e situação</h2>
            <div className="grade g2">
              <div className="campo"><label htmlFor="de">Data de entrada (dd/mm/aaaa)</label><input id="de" type="date" value={entrada} max="2099-12-31" onChange={(e) => setEntrada(e.target.value)} /></div>
              <div className="campo"><label htmlFor="ds">Previsão / saída (dd/mm/aaaa)</label><input id="ds" type="date" value={saida} max="2099-12-31" onChange={(e) => setSaida(e.target.value)} /></div>
            </div>
            <div className="campo" style={{ marginTop: 14 }}>
              <span className="rotulo">Situação do serviço</span>
              <div className="segmentos" role="radiogroup">
                {STATUS_LISTA.map((s) => (
                  <label key={s}><input type="radio" name="status" checked={status === s} onChange={() => setStatus(s)} /><span>{s}</span></label>
                ))}
              </div>
            </div>
          </section>

          <section className="cartao">
            <h2><span className="num-secao">3</span> Serviços e valores</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(catS ?? []).filter((s) => s.ativo || servicos[s.nome]?.marcado).map((s) => {
                const l = servicos[s.nome];
                return (
                  <div key={s.id} className={`item-servico ${l?.marcado ? 'marcado' : ''}`}>
                    <label className="chk"><input type="checkbox" checked={Boolean(l?.marcado)} onChange={() => alternar(s.nome, s.valor_padrao)} />{s.nome}</label>
                    <div className="valor-in"><span>R$</span>
                      <input type="text" inputMode="decimal" aria-label={`Valor de ${s.nome}`} value={l?.valor ?? ''} disabled={!l?.marcado} placeholder="0,00"
                        onChange={(e) => setServicos((m) => ({ ...m, [s.nome]: { marcado: true, valor: e.target.value } }))} /></div>
                  </div>
                );
              })}
              {extras.map((e, i) => (
                <div key={i} className="item-servico marcado">
                  <input type="text" style={{ flex: 1 }} placeholder="Outro serviço" aria-label="Nome do serviço" value={e.nome}
                    onChange={(ev) => setExtras((x) => x.map((y, j) => (j === i ? { ...y, nome: ev.target.value } : y)))} />
                  <div className="valor-in"><span>R$</span>
                    <input type="text" inputMode="decimal" aria-label="Valor" placeholder="0,00" value={e.valor}
                      onChange={(ev) => setExtras((x) => x.map((y, j) => (j === i ? { ...y, valor: ev.target.value } : y)))} /></div>
                  <button type="button" className="btn pequeno perigo" aria-label="Remover" onClick={() => setExtras((x) => x.filter((_, j) => j !== i))}><IcLixeira /></button>
                </div>
              ))}
            </div>
            <button type="button" className="btn" style={{ marginTop: 10 }} onClick={() => setExtras((x) => [...x, { nome: '', valor: '' }])}>+ Outro serviço (avulso)</button>
          </section>

          <section className="cartao">
            <h2><span className="num-secao">4</span> Avarias e observações</h2>
            <div className="grade-avarias">
              {(catA ?? []).filter((a) => a.ativo || avarias.includes(a.nome)).map((a) => {
                const on = avarias.includes(a.nome);
                return (
                  <label key={a.id} className={`item-avaria ${on ? 'marcado' : ''}`}>
                    <input type="checkbox" checked={on} onChange={() => setAvarias((v) => (on ? v.filter((x) => x !== a.nome) : [...v, a.nome]))} />{a.nome}
                  </label>
                );
              })}
            </div>
            <div className="campo" style={{ marginTop: 14 }}><label htmlFor="ob">Observações</label>
              <textarea id="ob" value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          </section>
        </div>

        <div className="lateral-form">
          <section className="cartao">
            <h2><span className="num-secao">5</span> Foto do veículo</h2>
            <div className="caixa-foto">
              {preview ? <img src={preview} alt="Foto do veículo" /> : <div className="vazio-foto">Nenhuma foto</div>}
              <div className="botoes">
                <button type="button" className="btn" onClick={() => camRef.current?.click()}><IcCamera /> Tirar foto</button>
                <button type="button" className="btn" onClick={() => arquivoRef.current?.click()}>Escolher arquivo</button>
                {fotoPath && <button type="button" className="btn perigo" onClick={() => { setFotoPath(null); setFotoPrevia(null); }}>Remover</button>}
              </div>
              <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void escolherFoto(e.target.files?.[0]); e.target.value = ''; }} />
              <input ref={arquivoRef} type="file" accept="image/*" hidden onChange={(e) => { void escolherFoto(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
          </section>

          <section className="resumo">
            <h2>Valores</h2>
            <div className="campo"><label htmlFor="pc">Peças (R$)</label>
              <input id="pc" type="text" inputMode="decimal" value={pecas} onChange={(e) => setPecas(e.target.value)} placeholder="0,00" /></div>
            <div className="linha-val"><span>Serviços</span><span>{moeda(totalServ)}</span></div>
            <div className="linha-val"><span>Peças</span><span>{moeda(paraNumero(pecas))}</span></div>
            <div className="linha-val total"><span>Total</span><strong>{moeda(total)}</strong></div>
            <button className="btn primario grande" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar orçamento'}</button>
          </section>
        </div>
      </div>

      <div className="barra-salvar noprint">
        <div className="total-mini"><small>TOTAL</small>{moeda(total)}</div>
        <button className="btn primario grande" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
    </form>
  );
}
