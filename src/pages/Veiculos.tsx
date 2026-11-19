import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { dataBR, moeda, normalizaPlaca, semAcento } from '../lib/format';
import { useClientes, useOrcamentos, useVeiculos } from '../lib/dados';
import { Carregando, Modal, Selo, msgErro, useUi } from '../components/ui';
import { IcLapis, IcLixeira, IcMais } from '../components/Icones';
import type { Veiculo } from '../lib/types';

export function Veiculos() {
  const { data: veics, isLoading } = useVeiculos();
  const { data: clientes } = useClientes();
  const { data: orcs } = useOrcamentos();
  const [busca, setBusca] = useState('');
  const [edit, setEdit] = useState<Partial<Veiculo> | null>(null);
  const [hist, setHist] = useState<Veiculo | null>(null);
  const qc = useQueryClient();
  const { avisar, confirmar } = useUi();

  const salvar = useMutation({
    mutationFn: (v: Partial<Veiculo> & { placa: string; cliente_id: string }) => api.salvarVeiculo(v),
    onSuccess: () => { void qc.invalidateQueries(); setEdit(null); avisar('Veículo salvo.'); },
    onError: (e) => avisar(msgErro(e), 'erro'),
  });

  if (isLoading || !veics || !clientes) return <Carregando />;
  const nomeCli = (id: string) => clientes.find((c) => c.id === id)?.nome ?? '-';
  const orcsDe = (id: string) => (orcs ?? []).filter((o) => o.veiculo.id === id);
  const q = semAcento(busca);
  const lista = veics.filter((v) => !q || semAcento(`${v.placa} ${v.marca ?? ''} ${v.modelo ?? ''} ${nomeCli(v.cliente_id)}`).includes(q) || normalizaPlaca(v.placa).includes(normalizaPlaca(busca)) && normalizaPlaca(busca) !== '');

  async function excluir(v: Veiculo) {
    const n = orcsDe(v.id).length;
    if (n) return avisar(`${v.placa} tem ${n} orçamento(s) e não pode ser excluído. Exclua os orçamentos antes.`, 'erro');
    if (!(await confirmar('Excluir veículo?', `O veículo ${v.placa} será apagado. Esta ação não pode ser desfeita.`, 'Excluir', true))) return;
    try { await api.excluirVeiculo(v.id); void qc.invalidateQueries(); avisar('Veículo excluído.'); } catch (e) { avisar(msgErro(e), 'erro'); }
  }

  return (
    <>
      <div className="cab">
        <div><h1>Veículos</h1><div className="sub">{lista.length} veículo(s)</div></div>
        <div className="acoes"><button className="btn primario grande" disabled={!clientes.length} onClick={() => setEdit({ placa: '', cliente_id: clientes[0]?.id })}><IcMais /> Novo veículo</button></div>
      </div>
      <div className="cartao">
        <div className="campo" style={{ marginBottom: 12 }}><label htmlFor="vb">Buscar por placa, modelo ou cliente</label>
          <input id="vb" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        {lista.length === 0 ? <div className="vazio">Nenhum veículo encontrado.</div> : (
          <ul className="lista-simples">
            {lista.map((v) => (
              <li key={v.id} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <span><b className="placa">{v.placa}</b> · {[v.marca, v.modelo, v.ano, v.cor].filter(Boolean).join(' ') || 'sem detalhes'}<br />
                  <span style={{ fontSize: 13, color: 'var(--fraco)' }}>{nomeCli(v.cliente_id)} · {orcsDe(v.id).length} orçamento(s)</span></span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button className="btn pequeno" onClick={() => setHist(v)}>Histórico</button>
                  <button className="btn pequeno" onClick={() => setEdit(v)}><IcLapis /> Editar</button>
                  <button className="btn pequeno perigo" aria-label="Excluir" onClick={() => void excluir(v)}><IcLixeira /></button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {edit && (
        <Modal titulo={edit.id ? 'Editar veículo' : 'Novo veículo'} onFechar={() => setEdit(null)}>
          <form onSubmit={(e) => { e.preventDefault(); if (edit.placa?.trim() && edit.cliente_id) salvar.mutate({ ...edit, placa: edit.placa.trim().toUpperCase(), cliente_id: edit.cliente_id }); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="campo"><label htmlFor="vc">Cliente (dono) *</label>
              <select id="vc" value={edit.cliente_id ?? ''} onChange={(e) => setEdit({ ...edit, cliente_id: e.target.value })}>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
            <div className="grade g2">
              <div className="campo"><label htmlFor="vp">Placa *</label><input id="vp" type="text" autoFocus value={edit.placa ?? ''} onChange={(e) => setEdit({ ...edit, placa: e.target.value.toUpperCase() })} maxLength={8} /></div>
              <div className="campo"><label htmlFor="vm">Marca</label><input id="vm" type="text" value={edit.marca ?? ''} onChange={(e) => setEdit({ ...edit, marca: e.target.value })} /></div>
              <div className="campo"><label htmlFor="vo">Modelo</label><input id="vo" type="text" value={edit.modelo ?? ''} onChange={(e) => setEdit({ ...edit, modelo: e.target.value })} /></div>
              <div className="campo"><label htmlFor="va">Ano</label><input id="va" type="text" value={edit.ano ?? ''} onChange={(e) => setEdit({ ...edit, ano: e.target.value })} /></div>
              <div className="campo"><label htmlFor="vr">Cor</label><input id="vr" type="text" value={edit.cor ?? ''} onChange={(e) => setEdit({ ...edit, cor: e.target.value })} /></div>
            </div>
            <div className="botoes"><button type="button" className="btn grande" onClick={() => setEdit(null)}>Cancelar</button><button className="btn primario grande" disabled={salvar.isPending}>Salvar</button></div>
          </form>
        </Modal>
      )}
      {hist && (
        <Modal titulo={`Histórico — ${hist.placa}`} onFechar={() => setHist(null)} largo>
          {orcsDe(hist.id).length === 0 ? <p>Nenhum orçamento para este veículo.</p> : (
            <ul className="lista-simples">
              {orcsDe(hist.id).map((o) => (
                <li key={o.id}><Link to={`/orcamentos/${o.id}`}>#{o.numero} · {dataBR(o.entrada)} · {o.cliente.nome}</Link><span><Selo status={o.status} /> <span className="valor">{moeda(o.total)}</span></span></li>
              ))}
            </ul>
          )}
          <div className="botoes"><button className="btn grande" onClick={() => setHist(null)}>Fechar</button></div>
        </Modal>
      )}
    </>
  );
}
