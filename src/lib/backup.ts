import JSZip from 'jszip';
import { api } from './api';
import { comprimirFoto } from './imagem';
import { normalizaPlaca, paraNumero } from './format';
import type { ArquivoBackup, BackupDados, Status } from './types';
import { STATUS_LISTA } from './types';

type Progresso = (texto: string, pct: number) => void;

/** Backup completo: dados.json + fotos + logo/fundo, tudo em um único .zip. */
export async function gerarBackupZip(prog: Progresso): Promise<Blob> {
  prog('Lendo os dados…', 5);
  const dados = await api.exportarDados();
  const zip = new JSZip();
  zip.file('dados.json', JSON.stringify(dados, null, 2));
  const fotos = dados.orcamentos.map((o) => o.foto_path).filter((p): p is string => Boolean(p));
  let i = 0;
  for (const p of fotos) {
    const b = await api.baixarArquivo('fotos', p);
    if (b) zip.file(`fotos/${p}`, b);
    i++; prog(`Baixando fotos (${i}/${fotos.length})…`, 10 + (i / Math.max(1, fotos.length)) * 75);
  }
  for (const p of [dados.config.logo_path, dados.config.fundo_recibo_path]) {
    if (!p) continue;
    const b = await api.baixarArquivo('empresa', p);
    if (b) zip.file(`empresa/${p}`, b);
  }
  prog('Compactando…', 90);
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }, (m) => prog('Compactando…', 90 + m.percent / 10));
}

/** Lê um backup gerado por este sistema. */
export async function lerBackupZip(file: File): Promise<{ dados: BackupDados; arquivos: ArquivoBackup[] }> {
  const zip = await JSZip.loadAsync(file);
  const j = zip.file('dados.json');
  if (!j) throw new Error('Este arquivo não é um backup do sistema (falta o dados.json).');
  const dados = JSON.parse(await j.async('string')) as BackupDados;
  if (!dados || !Array.isArray(dados.orcamentos) || !Array.isArray(dados.clientes)) {
    throw new Error('Arquivo de backup inválido. Se ele veio do programa antigo, use "Importar do programa antigo".');
  }
  const arquivos: ArquivoBackup[] = [];
  const tarefas: Promise<void>[] = [];
  zip.forEach((caminho, entrada) => {
    if (entrada.dir) return;
    const m = caminho.match(/^(fotos|empresa)\/(.+)$/);
    if (!m) return;
    tarefas.push(entrada.async('blob').then((blob) => { arquivos.push({ bucket: m[1] as 'fotos' | 'empresa', path: m[2], blob }); }));
  });
  await Promise.all(tarefas);
  return { dados, arquivos };
}

/* ---------- importação do programa de computador antigo ---------- */
interface LinhaAntiga {
  entrada?: string; saida?: string; cliente?: string; telefone?: string; veiculo?: string; modelo?: string;
  ano?: string; placa?: string; cor?: string; servicos?: string | { nome: string; valor: number }[];
  avarias?: string | string[]; obs?: string; pecas?: number | string; total?: number | string; foto?: string; status?: string;
}

function isoData(v?: string | null): string | null {
  if (!v) return null;
  const t = v.trim();
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}
const lista = <T,>(v: unknown): T[] => {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === 'string' && v.trim()) { try { const r = JSON.parse(v); return Array.isArray(r) ? r : []; } catch { return []; } }
  return [];
};

export async function importarProgramaAntigo(file: File, prog: Progresso): Promise<{ novos: number; repetidos: number; fotos: number }> {
  let linhas: LinhaAntiga[];
  const fotosZip = new Map<string, Blob>();
  if (/\.json$/i.test(file.name)) {
    linhas = JSON.parse(await file.text());
  } else {
    const zip = await JSZip.loadAsync(file);
    const j = zip.file('dados.json');
    if (!j) throw new Error('O arquivo não tem dados.json. Use "Exportar dados + fotos" no programa antigo.');
    linhas = JSON.parse(await j.async('string'));
    for (const nome of Object.keys(zip.files)) {
      const m = nome.match(/^fotos\/(.+)$/);
      if (m && !zip.files[nome].dir) fotosZip.set(m[1], await zip.files[nome].async('blob'));
    }
  }
  if (!Array.isArray(linhas)) throw new Error('Formato não reconhecido. Este arquivo parece ser um backup da versão web — use "Restaurar backup".');

  const existentes = await api.listarOrcamentos();
  const chave = (placa: string, entrada: string, total: number) => `${normalizaPlaca(placa)}|${entrada}|${total.toFixed(2)}`;
  const vistos = new Set(existentes.map((o) => chave(o.veiculo.placa, o.entrada, o.total)));
  let novos = 0, repetidos = 0, fotos = 0;

  // do mais antigo para o mais novo, para a numeração seguir a ordem de entrada
  const ordenadas = [...linhas].sort((a, b) => (isoData(a.entrada) ?? '').localeCompare(isoData(b.entrada) ?? ''));
  for (let i = 0; i < ordenadas.length; i++) {
    const l = ordenadas[i];
    prog(`Importando ${i + 1} de ${ordenadas.length}…`, (i / ordenadas.length) * 100);
    const entrada = isoData(l.entrada) ?? new Date().toISOString().slice(0, 10);
    const servicos = lista<{ nome: string; valor: number }>(l.servicos).map((s) => ({ nome: String(s.nome), valor: paraNumero(s.valor) }));
    const avarias = lista<string>(l.avarias).map(String);
    const pecas = paraNumero(l.pecas);
    const total = l.total != null && l.total !== '' ? paraNumero(l.total) : servicos.reduce((s, x) => s + x.valor, 0) + pecas;
    const placa = (l.placa ?? '').trim();
    if (!placa || !(l.cliente ?? '').trim()) continue;
    if (vistos.has(chave(placa, entrada, total))) { repetidos++; continue; }
    vistos.add(chave(placa, entrada, total));

    let foto_path: string | null = null;
    const blob = l.foto ? fotosZip.get(l.foto.split(/[\\/]/).pop() ?? '') : undefined;
    if (blob) {
      try { foto_path = await api.enviarFoto(await comprimirFoto(blob).catch(() => blob)); fotos++; } catch { foto_path = null; }
    }
    const status = (STATUS_LISTA as readonly string[]).includes(l.status ?? '') ? (l.status as Status) : 'Entregue';
    await api.salvarOrcamento({
      cliente: { nome: l.cliente!.trim(), telefone: (l.telefone ?? '').trim() },
      veiculo: { marca: (l.veiculo ?? '').trim(), modelo: (l.modelo ?? '').trim(), ano: (l.ano ?? '').toString().trim(), placa, cor: (l.cor ?? '').trim() },
      entrada, saida: isoData(l.saida), status, pecas, observacoes: (l.obs ?? '').trim(), servicos, avarias, foto_path,
    });
    novos++;
  }
  prog('Concluído', 100);
  return { novos, repetidos, fotos };
}
