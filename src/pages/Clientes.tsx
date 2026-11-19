import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { dataBR, moeda, semAcento } from '../lib/format';
import { useClientes, useOrcamentos, useVeiculos } from '../lib/dados';
import { Carregando, Modal, Selo, msgErro, useUi } from '../components/ui';
import { IcLapis, IcLixeira, IcMais } from '../components/Icones';
import type { Cliente } from '../lib/types';

export function Clientes() {
  const { data: clientes, isLoading } = useClientes();
  const { data: orcs } = useOrcamentos();
  const { data: veics } = useVeiculos();
  const [busca, setBusca] = useState('');
  const [edit, setEdit] = useState<Partial<Cliente> | null>(null);
  const [hist, setHist] = useState<Cliente | null>(null);
  const qc = useQueryClient();
  const { avisar, confirmar } = useUi();

  const salvar = useMutation({
    mutationFn: (c: Partial<Cliente> & { nome: string }) => api.salvarCliente(c),
    onSuccess: () => { void qc.invalidateQueries(); setEdit(null); avisar('Cliente salvo.'); },
    onError: (e) => avisar(msgErro(e), 'erro'),
  });

  async function excluir(c: Cliente) {
    const temOrc = (orcs ?? []).filter((o) => o.cliente.id === c.id).length;
    const temVei = (veics ?? []).filter((v) => v.cliente_id === c.id).length;
    if (temOrc) return avisar(`${c.nome} tem ${temOrc} orçamento(s) e não pode ser excluído. Exclua os orçamentos antes.`, 'erro');
    if (!(await confirmar('Excluir cliente?', `${c.nome}${temVei ? ` e ${temVei} veículo(s) sem orçamento` : ''} serão apagados. Esta ação não pode ser desfeita.`, 'Excluir', true))) return;
    try {
      for (const v of (veics ?? []).filter((x) => x.cliente_id === c.id)) await api.excluirVeiculo(v.id);
      await api.excluirCliente(c.id); void qc.invalidateQueries(); avisar('Cliente excluído.');
    } catch (e) { avisar(msgErro(e), 'erro'); }
  }

  if (isLoading || !clientes) return <Carregando />;
  const q = semAcento(busca);
  const lista = clientes.filter((c) => !q || semAcento(`${c.nome} ${c.telefone ?? ''}`).includes(q));
  const orcsDe = (id: string) => (orcs ?? []).filter((o) => o.cliente.id === id);

  return (
    <>
      <div className="cab">
        <div><h1>Clientes</h1><div className="sub">{lista.length} cliente(s)</div></div>
        <div className="acoes"><button className="btn primario grande" onClick={() => setEdit({ nome: '', telefone: '' })}><IcMais /> Novo cliente</button></div>
      </div>
      <div className="cartao">
        <div className="campo" style={{ marginBottom: 12 }}><label htmlFor="cb">Buscar por nome ou telefone</label>
          <input id="cb" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
        {lista.length === 0 ? <div className="vazio">Nenhum cliente encontrado.</div> : (
          <ul className="lista-simples">
            {lista.map((c) => {
              const n = orcsDe(c.id).length;
              return (
                <li key={c.id} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <span><b>{c.nome}</b><br /><span className="sub" style={{ fontSize: 13, color: 'var(--fraco)' }}>{c.telefone || 'sem telefone'} · {n} orçamento(s)</span></span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    <button className="btn pequeno" onClick={() => setHist(c)}>Histórico</button>
                    <button className="btn pequeno" onClick={() => setEdit(c)}><IcLapis /> Editar</button>
                    <button className="btn pequeno perigo" aria-label="Excluir" onClick={() => void excluir(c)}><IcLixeira /></button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {edit && (
        <Modal titulo={edit.id ? 'Editar cliente' : 'Novo cliente'} onFechar={() => setEdit(null)}>
          <form onSubmit={(e) => { e.preventDefault(); if (edit.nome?.trim()) salvar.mutate({ ...edit, nome: edit.nome.trim() }); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="campo"><label htmlFor="en">Nome *</label><input id="en" type="text" autoFocus value={edit.nome ?? ''} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} /></div>
            <div className="campo"><label htmlFor="et">Telefone</label><input id="et" type="tel" value={edit.telefone ?? ''} onChange={(e) => setEdit({ ...edit, telefone: e.target.value })} /></div>
            <div className="campo"><label htmlFor="eo">Observações</label><textarea id="eo" value={edit.observacoes ?? ''} onChange={(e) => setEdit({ ...edit, observacoes: e.target.value })} /></div>
            <div className="botoes"><button type="button" className="btn grande" onClick={() => setEdit(null)}>Cancelar</button><button className="btn primario grande" disabled={salvar.isPending}>Salvar</button></div>
          </form>
        </Modal>
      )}
      {hist && (
        <Modal titulo={`Histórico — ${hist.nome}`} onFechar={() => setHist(null)} largo>
          {orcsDe(hist.id).length === 0 ? <p>Nenhum orçamento para este cliente.</p> : (
            <ul className="lista-simples">
              {orcsDe(hist.id).map((o) => (
                <li key={o.id}><Link to={`/orcamentos/${o.id}`}>#{o.numero} · {dataBR(o.entrada)} · <b>{o.veiculo.placa}</b></Link><span><Selo status={o.status} /> <span className="valor">{moeda(o.total)}</span></span></li>
              ))}
            </ul>
          )}
          <div className="botoes"><button className="btn grande" onClick={() => setHist(null)}>Fechar</button></div>
        </Modal>
      )}
    </>
  );
}
