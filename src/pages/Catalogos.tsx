import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { moeda, paraNumero } from '../lib/format';
import { useAvariasCat, useServicosCat } from '../lib/dados';
import { Carregando, Modal, msgErro, useUi } from '../components/ui';
import { IcLapis, IcLixeira, IcMais } from '../components/Icones';

export function CatalogoServicos() {
  const { data, isLoading } = useServicosCat();
  const [ed, setEd] = useState<{ id?: string; nome: string; valor: string; ativo: boolean } | null>(null);
  const qc = useQueryClient();
  const { avisar, confirmar } = useUi();
  if (isLoading || !data) return <Carregando />;

  async function salvar() {
    if (!ed?.nome.trim()) return avisar('Informe o nome do serviço.', 'erro');
    try {
      await api.salvarServicoCat({ id: ed.id, nome: ed.nome.trim(), valor_padrao: paraNumero(ed.valor), ativo: ed.ativo, ordem: ed.id ? data!.find((s) => s.id === ed.id)?.ordem : data!.length + 1 });
      void qc.invalidateQueries(); setEd(null); avisar('Serviço salvo.');
    } catch (e) { avisar(msgErro(e), 'erro'); }
  }
  async function excluir(id: string, nome: string) {
    if (!(await confirmar('Excluir serviço da lista?', `"${nome}" deixa de aparecer nos novos orçamentos. Orçamentos já feitos não mudam.`, 'Excluir', true))) return;
    try { await api.excluirServicoCat(id); void qc.invalidateQueries(); avisar('Serviço excluído.'); } catch (e) { avisar(msgErro(e), 'erro'); }
  }

  return (
    <>
      <div className="cab">
        <div><h1>Serviços e valores</h1><div className="sub">Lista usada nos orçamentos e no recibo. O valor padrão pode ser mudado em cada orçamento.</div></div>
        <div className="acoes"><button className="btn primario grande" onClick={() => setEd({ nome: '', valor: '', ativo: true })}><IcMais /> Novo serviço</button></div>
      </div>
      <div className="cartao">
        {data.length === 0 ? <div className="vazio">Nenhum serviço cadastrado.</div> : (
          <ul className="lista-simples">
            {data.map((s) => (
              <li key={s.id} style={{ alignItems: 'center', opacity: s.ativo ? 1 : 0.55 }}>
                <span><b>{s.nome}</b>{!s.ativo && <span className="sub"> (oculto)</span>}<br /><span style={{ fontSize: 13, color: 'var(--fraco)' }}>Valor padrão: {moeda(s.valor_padrao)}</span></span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button className="btn pequeno" onClick={() => setEd({ id: s.id, nome: s.nome, valor: s.valor_padrao ? String(s.valor_padrao).replace('.', ',') : '', ativo: s.ativo })}><IcLapis /> Editar</button>
                  <button className="btn pequeno perigo" aria-label="Excluir" onClick={() => void excluir(s.id, s.nome)}><IcLixeira /></button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {ed && (
        <Modal titulo={ed.id ? 'Editar serviço' : 'Novo serviço'} onFechar={() => setEd(null)}>
          <form onSubmit={(e) => { e.preventDefault(); void salvar(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="campo"><label htmlFor="sn">Nome *</label><input id="sn" type="text" autoFocus value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></div>
            <div className="campo"><label htmlFor="sv">Valor padrão (R$)</label><input id="sv" type="text" inputMode="decimal" value={ed.valor} onChange={(e) => setEd({ ...ed, valor: e.target.value })} placeholder="0,00" /></div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600 }}><input type="checkbox" checked={ed.ativo} onChange={(e) => setEd({ ...ed, ativo: e.target.checked })} /> Mostrar nos novos orçamentos</label>
            <div className="botoes"><button type="button" className="btn grande" onClick={() => setEd(null)}>Cancelar</button><button className="btn primario grande">Salvar</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function CatalogoAvarias() {
  const { data, isLoading } = useAvariasCat();
  const [ed, setEd] = useState<{ id?: string; nome: string; ativo: boolean } | null>(null);
  const qc = useQueryClient();
  const { avisar, confirmar } = useUi();
  if (isLoading || !data) return <Carregando />;

  async function salvar() {
    if (!ed?.nome.trim()) return avisar('Informe o nome da avaria.', 'erro');
    try {
      await api.salvarAvariaCat({ id: ed.id, nome: ed.nome.trim(), ativo: ed.ativo, ordem: ed.id ? data!.find((s) => s.id === ed.id)?.ordem : data!.length + 1 });
      void qc.invalidateQueries(); setEd(null); avisar('Avaria salva.');
    } catch (e) { avisar(msgErro(e), 'erro'); }
  }
  async function excluir(id: string, nome: string) {
    if (!(await confirmar('Excluir avaria da lista?', `"${nome}" deixa de aparecer nos novos orçamentos. Orçamentos já feitos não mudam.`, 'Excluir', true))) return;
    try { await api.excluirAvariaCat(id); void qc.invalidateQueries(); avisar('Avaria excluída.'); } catch (e) { avisar(msgErro(e), 'erro'); }
  }

  return (
    <>
      <div className="cab">
        <div><h1>Avarias</h1><div className="sub">Lista de avarias que podem ser marcadas no orçamento e aparecem no recibo.</div></div>
        <div className="acoes"><button className="btn primario grande" onClick={() => setEd({ nome: '', ativo: true })}><IcMais /> Nova avaria</button></div>
      </div>
      <div className="cartao">
        {data.length === 0 ? <div className="vazio">Nenhuma avaria cadastrada.</div> : (
          <ul className="lista-simples">
            {data.map((a) => (
              <li key={a.id} style={{ alignItems: 'center', opacity: a.ativo ? 1 : 0.55 }}>
                <span><b>{a.nome}</b>{!a.ativo && <span className="sub"> (oculta)</span>}</span>
                <span style={{ display: 'flex', gap: 6 }}>
                  <button className="btn pequeno" onClick={() => setEd({ id: a.id, nome: a.nome, ativo: a.ativo })}><IcLapis /> Editar</button>
                  <button className="btn pequeno perigo" aria-label="Excluir" onClick={() => void excluir(a.id, a.nome)}><IcLixeira /></button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {ed && (
        <Modal titulo={ed.id ? 'Editar avaria' : 'Nova avaria'} onFechar={() => setEd(null)}>
          <form onSubmit={(e) => { e.preventDefault(); void salvar(); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="campo"><label htmlFor="an">Nome *</label><input id="an" type="text" autoFocus value={ed.nome} onChange={(e) => setEd({ ...ed, nome: e.target.value })} /></div>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600 }}><input type="checkbox" checked={ed.ativo} onChange={(e) => setEd({ ...ed, ativo: e.target.checked })} /> Mostrar nos novos orçamentos</label>
            <div className="botoes"><button type="button" className="btn grande" onClick={() => setEd(null)}>Cancelar</button><button className="btn primario grande">Salvar</button></div>
          </form>
        </Modal>
      )}
    </>
  );
}
