import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  ArquivoBackup, BackupDados, CatalogoAvaria, CatalogoServico, Cliente, Config,
  Orcamento, OrcamentoInput, Status, Veiculo,
} from './types';
import { normalizaPlaca } from './format';
import type { Api } from './api';

/** Aceita a URL mesmo colada com "/rest/v1/", "/" no fim ou espaços: usa só https://xxxx.supabase.co */
function limparUrl(v?: string): string {
  const t = (v ?? '').trim();
  if (!t) return '';
  try { return new globalThis.URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).origin; } catch { return t; }
}
const URL_SB = limparUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const CHAVE = ((import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '').trim();
const DOMINIO = (import.meta.env.VITE_DOMINIO_LOGIN as string | undefined) || 'amorimpintura.app';

let _sb: SupabaseClient | null = null;
function sb(): SupabaseClient {
  if (!_sb) _sb = createClient(URL_SB, CHAVE, { auth: { persistSession: true, autoRefreshToken: true } });
  return _sb;
}

/** Transforma o erro técnico do Supabase em uma frase para a pessoa. */
function falha(e: { message?: string; code?: string } | null, padrao = 'Não foi possível concluir. Tente novamente.'): never {
  const msg = e?.message ?? '';
  if (e?.code === '23503') throw new Error('Este registro está em uso (tem orçamentos ligados) e não pode ser excluído.');
  if (e?.code === '23505') throw new Error('Já existe um registro com esse nome/placa.');
  if (/Failed to fetch|NetworkError|network/i.test(msg)) throw new Error('Sem conexão com a internet. Confira o Wi-Fi e tente de novo.');
  throw new Error(msg || padrao);
}
const ok = <T>(r: { data: T | null; error: { message?: string; code?: string } | null }): T => {
  if (r.error) falha(r.error);
  return r.data as T;
};

const PAGINA = 1000; // limite do Supabase por requisição
async function lerTudo<T>(consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: { message?: string; code?: string } | null }>): Promise<T[]> {
  const todos: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const lote = ok(await consulta(de, de + PAGINA - 1)) ?? [];
    todos.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return todos;
}

interface LinhaOrc {
  id: string; numero: number; entrada: string; saida: string | null; status: Status;
  pecas: number; total: number; observacoes: string | null; foto_path: string | null; criado_em: string;
  cliente: Cliente; veiculo: Veiculo;
  servicos: { nome: string; valor: number; ordem: number }[];
  avarias: { nome: string }[];
}
const SELECT_ORC =
  '*, cliente:clientes(*), veiculo:veiculos(*), servicos:orcamento_servicos(nome,valor,ordem), avarias:orcamento_avarias(nome)';

function paraOrcamento(l: LinhaOrc): Orcamento {
  return {
    id: l.id, numero: l.numero, entrada: l.entrada, saida: l.saida, status: l.status,
    pecas: Number(l.pecas), total: Number(l.total), observacoes: l.observacoes, foto_path: l.foto_path,
    criado_em: l.criado_em, cliente: l.cliente, veiculo: l.veiculo,
    servicos: [...l.servicos].sort((a, b) => a.ordem - b.ordem).map((s) => ({ nome: s.nome, valor: Number(s.valor) })),
    avarias: l.avarias.map((a) => a.nome),
  };
}

const urlCache = new Map<string, { url: string; ate: number }>();

async function lotes<T>(linhas: T[], tabela: string, opcoes?: { onConflict?: string }) {
  for (let i = 0; i < linhas.length; i += 500) {
    const r = await sb().from(tabela).upsert(linhas.slice(i, i + 500) as never, opcoes);
    if (r.error) falha(r.error);
  }
}

export const supabaseApi: Api = {
  demo: false,

  // ---------- acesso ----------
  async entrar(usuario, senha) {
    const email = usuario.includes('@') ? usuario.trim() : `${usuario.trim().toLowerCase()}@${DOMINIO}`;
    const { error } = await sb().auth.signInWithPassword({ email, password: senha });
    if (error) {
      if (/invalid login/i.test(error.message)) throw new Error('Usuário ou senha incorretos.');
      falha(error);
    }
  },
  async sair() { await sb().auth.signOut(); },
  async temSessao() { const { data } = await sb().auth.getSession(); return Boolean(data.session); },
  aoMudarSessao(cb) {
    const { data } = sb().auth.onAuthStateChange((_ev, sessao) => cb(Boolean(sessao)));
    return () => data.subscription.unsubscribe();
  },
  async trocarSenha(atual, nova) {
    const { data } = await sb().auth.getUser();
    const email = data.user?.email;
    if (!email) throw new Error('Faça login novamente.');
    const re = await sb().auth.signInWithPassword({ email, password: atual });
    if (re.error) throw new Error('A senha atual está incorreta.');
    const { error } = await sb().auth.updateUser({ password: nova });
    if (error) falha(error);
  },
  async infoPublica() {
    const { data } = await sb().rpc('info_publica');
    const info = (data ?? {}) as { nome?: string; logo_path?: string | null };
    return {
      nome: info.nome || 'Amorim Pintura Automotiva',
      logoUrl: info.logo_path ? sb().storage.from('empresa').getPublicUrl(info.logo_path).data.publicUrl : null,
    };
  },

  // ---------- orçamentos ----------
  async listarOrcamentos() {
    const linhas = await lerTudo<LinhaOrc>((de, ate) =>
      sb().from('orcamentos').select(SELECT_ORC).order('entrada', { ascending: false })
        .order('numero', { ascending: false }).range(de, ate) as never);
    return linhas.map(paraOrcamento);
  },
  async obterOrcamento(id) {
    const r = await sb().from('orcamentos').select(SELECT_ORC).eq('id', id).maybeSingle();
    return r.data ? paraOrcamento(r.data as unknown as LinhaOrc) : null;
  },
  async salvarOrcamento(d: OrcamentoInput) {
    const r = await sb().rpc('salvar_orcamento', { p: d });
    return ok(r) as string;
  },
  async excluirOrcamento(id) {
    const r = await sb().from('orcamentos').select('foto_path').eq('id', id).maybeSingle();
    ok(await sb().from('orcamentos').delete().eq('id', id));
    const foto = (r.data as { foto_path: string | null } | null)?.foto_path;
    if (foto) await sb().storage.from('fotos').remove([foto]);
  },
  async mudarStatus(id, status) {
    ok(await sb().from('orcamentos').update({ status }).eq('id', id));
  },

  // ---------- clientes e veículos ----------
  async listarClientes() {
    return lerTudo<Cliente>((de, ate) => sb().from('clientes').select('*').order('nome').range(de, ate) as never);
  },
  async salvarCliente(c) {
    const dados = { nome: c.nome.trim(), telefone: c.telefone?.trim() || null, observacoes: c.observacoes?.trim() || null };
    ok(c.id ? await sb().from('clientes').update(dados).eq('id', c.id) : await sb().from('clientes').insert(dados));
  },
  async excluirCliente(id) { ok(await sb().from('clientes').delete().eq('id', id)); },
  async listarVeiculos() {
    return lerTudo<Veiculo>((de, ate) => sb().from('veiculos').select('*').order('placa').range(de, ate) as never);
  },
  async salvarVeiculo(v) {
    const dados = {
      cliente_id: v.cliente_id, marca: v.marca || null, modelo: v.modelo || null,
      ano: v.ano || null, placa: v.placa.trim(), cor: v.cor || null,
    };
    ok(v.id ? await sb().from('veiculos').update(dados).eq('id', v.id) : await sb().from('veiculos').insert(dados));
  },
  async excluirVeiculo(id) { ok(await sb().from('veiculos').delete().eq('id', id)); },
  async buscarPorPlaca(placa) {
    const norm = normalizaPlaca(placa);
    if (norm.length < 5) return null;
    const r = await sb().from('veiculos').select('*, cliente:clientes(*)').eq('placa_norm', norm).maybeSingle();
    if (!r.data) return null;
    const { cliente, ...veiculo } = r.data as unknown as Veiculo & { cliente: Cliente };
    return { veiculo: veiculo as Veiculo, cliente };
  },

  // ---------- serviços e avarias ----------
  async listarServicosCat() {
    const dados = ok(await sb().from('catalogo_servicos').select('*').order('ordem').order('nome')) ?? [];
    return (dados as CatalogoServico[]).map((s) => ({ ...s, valor_padrao: Number(s.valor_padrao) }));
  },
  async salvarServicoCat(s) {
    const dados = { nome: s.nome.trim(), valor_padrao: s.valor_padrao ?? 0, ativo: s.ativo ?? true, ordem: s.ordem ?? 0 };
    ok(s.id ? await sb().from('catalogo_servicos').update(dados).eq('id', s.id) : await sb().from('catalogo_servicos').insert(dados));
  },
  async excluirServicoCat(id) { ok(await sb().from('catalogo_servicos').delete().eq('id', id)); },
  async listarAvariasCat() {
    return (ok(await sb().from('catalogo_avarias').select('*').order('ordem').order('nome')) ?? []) as CatalogoAvaria[];
  },
  async salvarAvariaCat(a) {
    const dados = { nome: a.nome.trim(), ativo: a.ativo ?? true, ordem: a.ordem ?? 0 };
    ok(a.id ? await sb().from('catalogo_avarias').update(dados).eq('id', a.id) : await sb().from('catalogo_avarias').insert(dados));
  },
  async excluirAvariaCat(id) { ok(await sb().from('catalogo_avarias').delete().eq('id', id)); },

  // ---------- dados da oficina ----------
  async obterConfig() {
    return ok(await sb().from('configuracoes').select('*').eq('id', 1).single()) as Config;
  },
  async salvarConfig(c) {
    ok(await sb().from('configuracoes').update(c).eq('id', 1));
  },

  // ---------- arquivos ----------
  async enviarFoto(blob) {
    const caminho = `${new Date().getFullYear()}/${crypto.randomUUID()}.jpg`;
    const r = await sb().storage.from('fotos').upload(caminho, blob, { contentType: 'image/jpeg' });
    if (r.error) falha(r.error);
    return caminho;
  },
  async enviarImagemEmpresa(tipo, blob) {
    const caminho = `${tipo}-${Date.now()}.png`;
    const r = await sb().storage.from('empresa').upload(caminho, blob, { contentType: 'image/png' });
    if (r.error) falha(r.error);
    return caminho;
  },
  async urlFoto(path) {
    const guardada = urlCache.get(path);
    if (guardada && guardada.ate > Date.now()) return guardada.url;
    const r = await sb().storage.from('fotos').createSignedUrl(path, 3600);
    if (r.error || !r.data) falha(r.error);
    urlCache.set(path, { url: r.data!.signedUrl, ate: Date.now() + 50 * 60 * 1000 });
    return r.data!.signedUrl;
  },
  urlEmpresa(path) { return sb().storage.from('empresa').getPublicUrl(path).data.publicUrl; },
  async baixarArquivo(bucket, path) {
    const r = await sb().storage.from(bucket).download(path);
    return r.error ? null : r.data;
  },
  async removerArquivo(bucket, path) { await sb().storage.from(bucket).remove([path]); },

  // ---------- tempo real ----------
  inscrever(cb) {
    let espera: ReturnType<typeof setTimeout> | undefined;
    const canal = sb().channel('mudancas-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        clearTimeout(espera);
        espera = setTimeout(cb, 250);
      })
      .subscribe();
    return () => { clearTimeout(espera); void sb().removeChannel(canal); };
  },

  // ---------- backup ----------
  async exportarDados() {
    const orcs = await this.listarOrcamentos();
    return {
      versao: 1,
      gerado_em: new Date().toISOString(),
      config: await this.obterConfig(),
      clientes: await this.listarClientes(),
      veiculos: await this.listarVeiculos(),
      catalogo_servicos: await this.listarServicosCat(),
      catalogo_avarias: await this.listarAvariasCat(),
      orcamentos: orcs.map((o) => ({
        id: o.id, numero: o.numero, cliente_id: o.cliente.id, veiculo_id: o.veiculo.id, entrada: o.entrada,
        saida: o.saida, status: o.status, pecas: o.pecas, total: o.total, observacoes: o.observacoes,
        foto_path: o.foto_path, criado_em: o.criado_em, servicos: o.servicos, avarias: o.avarias,
      })),
    };
  },
  async restaurarDados(d: BackupDados, arquivos: ArquivoBackup[]) {
    // 1) arquivos primeiro (se falhar, os dados atuais ainda não foram apagados)
    for (const a of arquivos) {
      const r = await sb().storage.from(a.bucket).upload(a.path, a.blob, { upsert: true, contentType: a.blob.type || undefined });
      if (r.error) falha(r.error);
    }
    // 2) apaga os dados atuais (orçamentos levam serviços/avarias junto)
    const apagar = async (t: string) => ok(await sb().from(t).delete().not('id', 'is', null));
    await apagar('orcamentos'); await apagar('veiculos'); await apagar('clientes');
    await apagar('catalogo_servicos'); await apagar('catalogo_avarias');
    // 3) grava o backup
    ok(await sb().from('configuracoes').upsert({ id: 1, ...d.config }));
    await lotes(d.clientes, 'clientes');
    await lotes(d.veiculos.map(({ id, cliente_id, marca, modelo, ano, placa, cor }) => ({ id, cliente_id, marca, modelo, ano, placa, cor })), 'veiculos');
    await lotes(d.catalogo_servicos, 'catalogo_servicos');
    await lotes(d.catalogo_avarias, 'catalogo_avarias');
    await lotes(d.orcamentos.map(({ servicos: _s, avarias: _a, ...o }) => o), 'orcamentos');
    await lotes(d.orcamentos.flatMap((o) => o.servicos.map((s, i) => ({ orcamento_id: o.id, nome: s.nome, valor: s.valor, ordem: i + 1 }))), 'orcamento_servicos');
    await lotes(d.orcamentos.flatMap((o) => o.avarias.map((nome) => ({ orcamento_id: o.id, nome }))), 'orcamento_avarias', { onConflict: 'orcamento_id,nome' });
    await sb().rpc('reajustar_numeracao');
  },
};
