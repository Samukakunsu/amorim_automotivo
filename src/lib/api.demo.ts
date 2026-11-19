/**
 * Modo demonstração: usado quando o Supabase ainda NÃO foi configurado (.env vazio).
 * Guarda tudo só neste navegador (localStorage), começando vazio,
 * para você conhecer e testar o sistema. Não é compartilhado entre aparelhos.
 */
import type {
  ArquivoBackup, BackupDados, Bucket, CatalogoAvaria, CatalogoServico, Cliente, Config,
  Orcamento, OrcamentoInput, Veiculo,
} from './types';
import { blobParaDataUrl } from './imagem';
import { normalizaPlaca } from './format';
import type { Api } from './api';

type Flat = BackupDados['orcamentos'][number];
interface Banco {
  senha: string;
  proximoNumero: number;
  config: Config;
  clientes: Cliente[];
  veiculos: Veiculo[];
  servicosCat: CatalogoServico[];
  avariasCat: CatalogoAvaria[];
  orcamentos: Flat[];
  arquivos: Record<string, string>; // "bucket/caminho" -> data URL
}

const CHAVE = 'amorim-demo-v2';
const SESSAO = 'amorim-demo-sessao';
const canal = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('amorim-demo') : null;
const ouvintes = new Set<() => void>();
const avisar = () => { ouvintes.forEach((f) => f()); canal?.postMessage('mudou'); };
canal?.addEventListener('message', () => ouvintes.forEach((f) => f()));

const uid = () => crypto.randomUUID();

const SERVICOS = ['Lanternagem', 'Pintura Parcial', 'Pintura Total', 'Polimento Cristalizado', 'Polimento Simples', 'Alinhamento Frontal', 'Alinhamento Traseira'];
const AVARIAS = ['Parachoque traseiro', 'Parachoque dianteiro', 'Paralama direito', 'Paralama esquerdo', 'Lateral direito', 'Lateral esquerdo', 'Capô', 'Teto', 'Porta dianteira direito', 'Porta traseira direito', 'Porta dianteira esquerdo', 'Porta traseira esquerdo'];

function inicial(): Banco {
  const clientes: Cliente[] = [];
  const veiculos: Veiculo[] = [];
  const orcamentos: Flat[] = [];
  return {
    senha: '9912', proximoNumero: 1,
    config: {
      nome: 'Amorim Pintura Automotiva', endereco: 'Rua Soldado Eduardo dos Santos, nº 93 - Jatiúca - Maceió/AL',
      telefones: '(82) 99996-9591 / (82) 99811-7550', logo_path: null, fundo_recibo_path: null,
    },
    clientes, veiculos, orcamentos, arquivos: {},
    servicosCat: SERVICOS.map((nome, i) => ({ id: uid(), nome, valor_padrao: 0, ativo: true, ordem: i + 1 })),
    avariasCat: AVARIAS.map((nome, i) => ({ id: uid(), nome, ativo: true, ordem: i + 1 })),
  };
}

let cache: Banco | null = null;
function ler(): Banco {
  if (cache) return cache;
  try {
    const t = localStorage.getItem(CHAVE);
    if (t) { cache = JSON.parse(t) as Banco; return cache; }
  } catch { /* usa os dados de exemplo */ }
  cache = inicial();
  return cache;
}
function gravar(b: Banco) {
  cache = b;
  try { localStorage.setItem(CHAVE, JSON.stringify(b)); }
  catch { throw new Error('O navegador ficou sem espaço para guardar mais fotos neste modo de demonstração.'); }
  avisar();
}
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => { if (e.key === CHAVE) { cache = null; ouvintes.forEach((f) => f()); } });

function montar(b: Banco, f: Flat): Orcamento {
  const cliente = b.clientes.find((c) => c.id === f.cliente_id)!;
  const veiculo = b.veiculos.find((x) => x.id === f.veiculo_id)!;
  return { ...f, cliente, veiculo };
}

export const demoApi: Api = {
  demo: true,

  async entrar(usuario, senha) {
    if (usuario.trim().toLowerCase() !== 'amorim' || senha !== ler().senha) throw new Error('Usuário ou senha incorretos. (modo demonstração: amorim / 9912)');
    sessionStorage.setItem(SESSAO, '1');
    ouvintes.forEach((f) => f());
  },
  async sair() { sessionStorage.removeItem(SESSAO); ouvintes.forEach((f) => f()); },
  async temSessao() { return sessionStorage.getItem(SESSAO) === '1'; },
  aoMudarSessao(cb) {
    const f = () => cb(sessionStorage.getItem(SESSAO) === '1');
    ouvintes.add(f);
    return () => { ouvintes.delete(f); };
  },
  async trocarSenha(atual, nova) {
    const b = ler();
    if (atual !== b.senha) throw new Error('A senha atual está incorreta.');
    gravar({ ...b, senha: nova });
  },
  async infoPublica() {
    const c = ler().config;
    return { nome: c.nome, logoUrl: c.logo_path ? ler().arquivos['empresa/' + c.logo_path] ?? null : null };
  },

  async listarOrcamentos() {
    const b = ler();
    return [...b.orcamentos].sort((x, y) => y.entrada.localeCompare(x.entrada) || y.numero - x.numero).map((f) => montar(b, f));
  },
  async obterOrcamento(id) {
    const b = ler(); const f = b.orcamentos.find((x) => x.id === id);
    return f ? montar(b, f) : null;
  },
  async salvarOrcamento(d: OrcamentoInput) {
    const b = structuredClone(ler());
    const nome = d.cliente.nome.trim(); const placa = d.veiculo.placa.trim();
    if (!nome) throw new Error('Informe o nome do cliente.');
    if (!normalizaPlaca(placa)) throw new Error('Informe a placa.');
    if (!d.veiculo.marca.trim()) throw new Error('Informe o veículo.');
    const fone = d.cliente.telefone.trim() || null;

    let cliente = d.cliente.id ? b.clientes.find((c) => c.id === d.cliente.id) : undefined;
    if (cliente) { cliente.nome = nome; cliente.telefone = fone; }
    else {
      cliente = b.clientes.find((c) => c.nome.trim().toLowerCase() === nome.toLowerCase() && (c.telefone ?? '') === (fone ?? ''));
      if (!cliente) { cliente = { id: uid(), nome, telefone: fone }; b.clientes.push(cliente); }
    }
    let veic = b.veiculos.find((v) => normalizaPlaca(v.placa) === normalizaPlaca(placa));
    const campos = { marca: d.veiculo.marca.trim() || null, modelo: d.veiculo.modelo.trim() || null, ano: d.veiculo.ano.trim() || null, placa, cor: d.veiculo.cor.trim() || null };
    if (veic) Object.assign(veic, campos, { cliente_id: cliente.id });
    else { veic = { id: uid(), cliente_id: cliente.id, ...campos }; b.veiculos.push(veic); }

    const total = d.servicos.reduce((s, x) => s + x.valor, 0) + d.pecas;
    const base = {
      cliente_id: cliente.id, veiculo_id: veic.id, entrada: d.entrada, saida: d.saida, status: d.status, pecas: d.pecas, total,
      observacoes: d.observacoes || null, foto_path: d.foto_path, servicos: d.servicos, avarias: d.avarias,
    };
    let id = d.id;
    if (id) {
      const i = b.orcamentos.findIndex((x) => x.id === id);
      if (i < 0) throw new Error('Orçamento não encontrado.');
      b.orcamentos[i] = { ...b.orcamentos[i], ...base };
    } else {
      id = uid();
      b.orcamentos.push({ id, numero: b.proximoNumero++, criado_em: new Date().toISOString(), ...base });
    }
    gravar(b);
    return id;
  },
  async excluirOrcamento(id) {
    const b = structuredClone(ler());
    const f = b.orcamentos.find((x) => x.id === id);
    if (f?.foto_path) delete b.arquivos['fotos/' + f.foto_path];
    b.orcamentos = b.orcamentos.filter((x) => x.id !== id);
    gravar(b);
  },
  async mudarStatus(id, status) {
    const b = structuredClone(ler());
    const f = b.orcamentos.find((x) => x.id === id);
    if (f) f.status = status;
    gravar(b);
  },

  async listarClientes() { return [...ler().clientes].sort((a, b) => a.nome.localeCompare(b.nome)); },
  async salvarCliente(c) {
    const b = structuredClone(ler());
    const dados = { nome: c.nome.trim(), telefone: c.telefone?.trim() || null, observacoes: c.observacoes?.trim() || null };
    if (c.id) { const x = b.clientes.find((k) => k.id === c.id); if (x) Object.assign(x, dados); }
    else b.clientes.push({ id: uid(), ...dados });
    gravar(b);
  },
  async excluirCliente(id) {
    const b = structuredClone(ler());
    if (b.orcamentos.some((o) => o.cliente_id === id) || b.veiculos.some((v) => v.cliente_id === id))
      throw new Error('Este registro está em uso (tem orçamentos ligados) e não pode ser excluído.');
    b.clientes = b.clientes.filter((c) => c.id !== id);
    gravar(b);
  },
  async listarVeiculos() { return [...ler().veiculos].sort((a, b) => a.placa.localeCompare(b.placa)); },
  async salvarVeiculo(v) {
    const b = structuredClone(ler());
    const dup = b.veiculos.find((x) => normalizaPlaca(x.placa) === normalizaPlaca(v.placa) && x.id !== v.id);
    if (dup) throw new Error('Já existe um registro com esse nome/placa.');
    const dados = { cliente_id: v.cliente_id, marca: v.marca || null, modelo: v.modelo || null, ano: v.ano || null, placa: v.placa.trim(), cor: v.cor || null };
    if (v.id) { const x = b.veiculos.find((k) => k.id === v.id); if (x) Object.assign(x, dados); }
    else b.veiculos.push({ id: uid(), ...dados });
    gravar(b);
  },
  async excluirVeiculo(id) {
    const b = structuredClone(ler());
    if (b.orcamentos.some((o) => o.veiculo_id === id)) throw new Error('Este registro está em uso (tem orçamentos ligados) e não pode ser excluído.');
    b.veiculos = b.veiculos.filter((v) => v.id !== id);
    gravar(b);
  },
  async buscarPorPlaca(placa) {
    const n = normalizaPlaca(placa);
    if (n.length < 5) return null;
    const b = ler(); const veiculo = b.veiculos.find((v) => normalizaPlaca(v.placa) === n);
    const cliente = veiculo && b.clientes.find((c) => c.id === veiculo.cliente_id);
    return veiculo && cliente ? { veiculo, cliente } : null;
  },

  async listarServicosCat() { return [...ler().servicosCat].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)); },
  async salvarServicoCat(s) {
    const b = structuredClone(ler());
    const dados = { nome: s.nome.trim(), valor_padrao: s.valor_padrao ?? 0, ativo: s.ativo ?? true, ordem: s.ordem ?? 0 };
    if (b.servicosCat.some((x) => x.nome.toLowerCase() === dados.nome.toLowerCase() && x.id !== s.id)) throw new Error('Já existe um registro com esse nome/placa.');
    if (s.id) { const x = b.servicosCat.find((k) => k.id === s.id); if (x) Object.assign(x, dados); } else b.servicosCat.push({ id: uid(), ...dados });
    gravar(b);
  },
  async excluirServicoCat(id) { const b = structuredClone(ler()); b.servicosCat = b.servicosCat.filter((x) => x.id !== id); gravar(b); },
  async listarAvariasCat() { return [...ler().avariasCat].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)); },
  async salvarAvariaCat(a) {
    const b = structuredClone(ler());
    const dados = { nome: a.nome.trim(), ativo: a.ativo ?? true, ordem: a.ordem ?? 0 };
    if (b.avariasCat.some((x) => x.nome.toLowerCase() === dados.nome.toLowerCase() && x.id !== a.id)) throw new Error('Já existe um registro com esse nome/placa.');
    if (a.id) { const x = b.avariasCat.find((k) => k.id === a.id); if (x) Object.assign(x, dados); } else b.avariasCat.push({ id: uid(), ...dados });
    gravar(b);
  },
  async excluirAvariaCat(id) { const b = structuredClone(ler()); b.avariasCat = b.avariasCat.filter((x) => x.id !== id); gravar(b); },

  async obterConfig() { return { ...ler().config }; },
  async salvarConfig(c) { const b = structuredClone(ler()); b.config = { ...b.config, ...c }; gravar(b); },

  async enviarFoto(blob) {
    const b = structuredClone(ler()); const caminho = `${new Date().getFullYear()}/${uid()}.jpg`;
    b.arquivos['fotos/' + caminho] = await blobParaDataUrl(blob); gravar(b); return caminho;
  },
  async enviarImagemEmpresa(tipo, blob) {
    const b = structuredClone(ler()); const caminho = `${tipo}-${Date.now()}.png`;
    b.arquivos['empresa/' + caminho] = await blobParaDataUrl(blob); gravar(b); return caminho;
  },
  async urlFoto(path) { const u = ler().arquivos['fotos/' + path]; if (!u) throw new Error('Foto não encontrada.'); return u; },
  urlEmpresa(path) { return ler().arquivos['empresa/' + path] ?? ''; },
  async baixarArquivo(bucket: Bucket, path) {
    const u = ler().arquivos[`${bucket}/${path}`]; return u ? (await fetch(u)).blob() : null;
  },
  async removerArquivo(bucket, path) { const b = structuredClone(ler()); delete b.arquivos[`${bucket}/${path}`]; gravar(b); },

  inscrever(cb) { ouvintes.add(cb); return () => { ouvintes.delete(cb); }; },

  async exportarDados() {
    const b = ler();
    return {
      versao: 1, gerado_em: new Date().toISOString(), config: b.config, clientes: b.clientes, veiculos: b.veiculos,
      catalogo_servicos: b.servicosCat, catalogo_avarias: b.avariasCat, orcamentos: b.orcamentos,
    };
  },
  async restaurarDados(d: BackupDados, arquivos: ArquivoBackup[]) {
    const b = structuredClone(ler());
    for (const a of arquivos) b.arquivos[`${a.bucket}/${a.path}`] = await blobParaDataUrl(a.blob);
    b.config = d.config; b.clientes = d.clientes; b.veiculos = d.veiculos; b.servicosCat = d.catalogo_servicos;
    b.avariasCat = d.catalogo_avarias; b.orcamentos = d.orcamentos;
    b.proximoNumero = Math.max(0, ...d.orcamentos.map((o) => o.numero)) + 1;
    gravar(b);
  },
};
