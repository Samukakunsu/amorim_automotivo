import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { hojeISO } from '../lib/format';
import { useConfig } from '../lib/dados';
import { prepararImagemEmpresa } from '../lib/imagem';
import { gerarBackupZip, importarProgramaAntigo, lerBackupZip } from '../lib/backup';
import { baixar } from '../lib/download';
import { Carregando, msgErro, useUi } from '../components/ui';
import type { Config } from '../lib/types';

export function Configuracoes() {
  const { data: cfg, isLoading } = useConfig();
  const qc = useQueryClient();
  const { avisar, confirmar } = useUi();
  const [f, setF] = useState<Config | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [atual, setAtual] = useState(''); const [nova, setNova] = useState(''); const [nova2, setNova2] = useState('');
  const [prog, setProg] = useState<{ texto: string; pct: number } | null>(null);
  const restRef = useRef<HTMLInputElement>(null);
  const impRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const fundoRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (cfg && !f) setF(cfg); }, [cfg, f]);
  if (isLoading || !f) return <Carregando />;
  const set = (p: Partial<Config>) => setF({ ...f, ...p });

  async function salvarDados() {
    setSalvando(true);
    try { await api.salvarConfig({ nome: f!.nome.trim(), endereco: f!.endereco.trim(), telefones: f!.telefones.trim() }); void qc.invalidateQueries(); avisar('Dados da empresa salvos.'); }
    catch (e) { avisar(msgErro(e), 'erro'); } finally { setSalvando(false); }
  }

  async function trocarImagem(tipo: 'logo' | 'fundo', file?: File | null) {
    if (!file) return;
    try {
      const blob = await prepararImagemEmpresa(file);
      const path = await api.enviarImagemEmpresa(tipo, blob);
      const campo = tipo === 'logo' ? 'logo_path' : 'fundo_recibo_path';
      const antigo = f![campo];
      await api.salvarConfig({ [campo]: path });
      if (antigo && antigo !== path) void api.removerArquivo('empresa', antigo).catch(() => undefined);
      set({ [campo]: path }); void qc.invalidateQueries(); avisar(tipo === 'logo' ? 'Logo atualizada.' : 'Marca d\'água atualizada.');
    } catch (e) { avisar(msgErro(e), 'erro'); }
  }
  async function removerImagem(tipo: 'logo' | 'fundo') {
    const campo = tipo === 'logo' ? 'logo_path' : 'fundo_recibo_path';
    const antigo = f![campo];
    try {
      await api.salvarConfig({ [campo]: null });
      if (antigo) void api.removerArquivo('empresa', antigo).catch(() => undefined);
      set({ [campo]: null }); void qc.invalidateQueries(); avisar('Imagem removida.');
    } catch (e) { avisar(msgErro(e), 'erro'); }
  }

  async function mudarSenha() {
    if (nova.length < 4) return avisar('A nova senha precisa ter pelo menos 4 caracteres (no Supabase o mínimo costuma ser 6).', 'erro');
    if (nova !== nova2) return avisar('A confirmação da senha não confere.', 'erro');
    try { await api.trocarSenha(atual, nova); setAtual(''); setNova(''); setNova2(''); avisar('Senha alterada.'); }
    catch (e) { avisar(msgErro(e), 'erro'); }
  }

  async function fazerBackup() {
    try {
      const blob = await gerarBackupZip((texto, pct) => setProg({ texto, pct }));
      baixar(blob, `backup_amorim_${hojeISO()}.zip`);
      avisar('Backup gerado. Guarde o arquivo em local seguro.');
    } catch (e) { avisar(msgErro(e), 'erro'); } finally { setProg(null); }
  }

  async function restaurar(file?: File | null) {
    if (!file) return;
    try {
      setProg({ texto: 'Lendo o backup…', pct: 5 });
      const { dados, arquivos } = await lerBackupZip(file);
      setProg(null);
      const ok = await confirmar('Restaurar este backup?',
        `O backup tem ${dados.orcamentos.length} orçamento(s) e ${dados.clientes.length} cliente(s), gerado em ${dados.gerado_em?.slice(0, 10) ?? '?'}. TODOS os dados atuais serão substituídos. Recomendamos baixar um backup novo antes.`, 'Substituir tudo', true);
      if (!ok) return;
      setProg({ texto: 'Restaurando… não feche esta página.', pct: 50 });
      await api.restaurarDados(dados, arquivos);
      void qc.invalidateQueries(); setF(null); avisar('Backup restaurado.');
    } catch (e) { avisar(msgErro(e), 'erro'); } finally { setProg(null); }
  }

  async function importar(file?: File | null) {
    if (!file) return;
    if (!(await confirmar('Importar do programa antigo?', 'Os orçamentos do arquivo serão ADICIONADOS aos atuais (repetidos são ignorados). Nada é apagado. Orçamentos antigos entram como "Entregue".', 'Importar'))) return;
    try {
      const r = await importarProgramaAntigo(file, (texto, pct) => setProg({ texto, pct }));
      void qc.invalidateQueries();
      avisar(`${r.novos} orçamento(s) importado(s), ${r.fotos} foto(s)${r.repetidos ? `, ${r.repetidos} repetido(s) ignorado(s)` : ''}.`);
    } catch (e) { avisar(msgErro(e), 'erro'); } finally { setProg(null); }
  }

  const bloco = (tipo: 'logo' | 'fundo', titulo: string, dica: string, path: string | null, ref: React.RefObject<HTMLInputElement>) => (
    <div className="campo">
      <span className="rotulo">{titulo}</span>
      <div className="imagem-config">
        <div className="previa">{path ? <img src={api.urlEmpresa(path)} alt={titulo} /> : 'Sem imagem'}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button className="btn" onClick={() => ref.current?.click()}>Escolher imagem</button>
          {path && <button className="btn perigo" onClick={() => void removerImagem(tipo)}>Remover</button>}
          <span className="dica">{dica}</span>
        </div>
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { void trocarImagem(tipo, e.target.files?.[0]); e.target.value = ''; }} />
      </div>
    </div>
  );

  return (
    <>
      <div className="cab"><div><h1>Configurações</h1><div className="sub">Dados da empresa, imagens do recibo, senha e backup.</div></div></div>

      <section className="cartao">
        <h2>Dados da empresa</h2>
        <div className="sub">Aparecem no topo do recibo e na tela de entrada.</div>
        <div className="grade">
          <div className="campo"><label htmlFor="cn">Nome da empresa</label><input id="cn" type="text" value={f.nome} onChange={(e) => set({ nome: e.target.value })} /></div>
          <div className="campo"><label htmlFor="ce">Endereço</label><input id="ce" type="text" value={f.endereco} onChange={(e) => set({ endereco: e.target.value })} /></div>
          <div className="campo"><label htmlFor="ct">Telefones</label><input id="ct" type="text" value={f.telefones} onChange={(e) => set({ telefones: e.target.value })} /></div>
        </div>
        <button className="btn primario grande" style={{ marginTop: 14 }} disabled={salvando} onClick={() => void salvarDados()}>Salvar dados</button>
      </section>

      <section className="cartao">
        <h2>Logo e marca d'água do recibo</h2>
        <div className="grade g2">
          {bloco('logo', 'Logo da empresa', 'Aparece no topo do recibo e no menu.', f.logo_path, logoRef)}
          {bloco('fundo', 'Marca d\'água (fundo do recibo)', 'Imagem clara no centro do recibo, com transparência.', f.fundo_recibo_path, fundoRef)}
        </div>
      </section>

      <section className="cartao">
        <h2>Alterar senha</h2>
        <div className="sub">Esta senha é compartilhada por todos que usam o sistema. Depois de trocar, avise a equipe.</div>
        <div className="grade g3">
          <div className="campo"><label htmlFor="sa">Senha atual</label><input id="sa" type="password" autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} /></div>
          <div className="campo"><label htmlFor="sn">Nova senha</label><input id="sn" type="password" autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} /></div>
          <div className="campo"><label htmlFor="sc">Repita a nova senha</label><input id="sc" type="password" autoComplete="new-password" value={nova2} onChange={(e) => setNova2(e.target.value)} /></div>
        </div>
        <button className="btn grande" style={{ marginTop: 14 }} disabled={!atual || !nova} onClick={() => void mudarSenha()}>Alterar senha</button>
      </section>

      <section className="cartao">
        <h2>Backup e recuperação</h2>
        <div className="sub">O backup é um arquivo .zip com todos os orçamentos, clientes, veículos, listas, configurações e fotos. Faça um por semana e guarde fora do computador (pen drive ou nuvem).</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn primario grande" disabled={!!prog} onClick={() => void fazerBackup()}>Baixar backup completo</button>
          <button className="btn grande" disabled={!!prog} onClick={() => restRef.current?.click()}>Restaurar backup</button>
          <button className="btn grande" disabled={!!prog} onClick={() => impRef.current?.click()}>Importar do programa antigo</button>
        </div>
        <input ref={restRef} type="file" accept=".zip" hidden onChange={(e) => { void restaurar(e.target.files?.[0]); e.target.value = ''; }} />
        <input ref={impRef} type="file" accept=".zip,.json" hidden onChange={(e) => { void importar(e.target.files?.[0]); e.target.value = ''; }} />
        {prog && (<><div className="dica" style={{ marginTop: 12 }}>{prog.texto}</div><div className="progresso"><div style={{ width: `${Math.min(100, prog.pct)}%` }} /></div></>)}
        <p className="dica" style={{ marginTop: 12 }}>"Importar do programa antigo" aceita o arquivo gerado por <b>Exportar dados + fotos</b> do programa de computador e soma ao que já existe.</p>
      </section>
    </>
  );
}
