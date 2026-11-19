export const STATUS_LISTA = ['Aguardando', 'Em andamento', 'Pronto', 'Entregue'] as const;
export type Status = (typeof STATUS_LISTA)[number];

export const FILTRO_STATUS_TODOS = 'Todos os status';
export const FILTRO_STATUS_ABERTOS = 'Na oficina (não entregues)';

export interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  observacoes?: string | null;
}

export interface Veiculo {
  id: string;
  cliente_id: string;
  marca: string | null;
  modelo: string | null;
  ano: string | null;
  placa: string;
  cor: string | null;
}

export interface ServicoItem {
  nome: string;
  valor: number;
}

export interface Orcamento {
  id: string;
  numero: number;
  entrada: string; // AAAA-MM-DD
  saida: string | null;
  status: Status;
  pecas: number;
  total: number;
  observacoes: string | null;
  foto_path: string | null;
  criado_em: string;
  cliente: Cliente;
  veiculo: Veiculo;
  servicos: ServicoItem[];
  avarias: string[];
}

export interface OrcamentoInput {
  id?: string;
  cliente: { id?: string; nome: string; telefone: string };
  veiculo: { marca: string; modelo: string; ano: string; placa: string; cor: string };
  entrada: string;
  saida: string | null;
  status: Status;
  pecas: number;
  observacoes: string;
  servicos: ServicoItem[];
  avarias: string[];
  foto_path: string | null;
}

export interface CatalogoServico {
  id: string;
  nome: string;
  valor_padrao: number;
  ativo: boolean;
  ordem: number;
}

export interface CatalogoAvaria {
  id: string;
  nome: string;
  ativo: boolean;
  ordem: number;
}

export interface Config {
  nome: string;
  endereco: string;
  telefones: string;
  logo_path: string | null;
  fundo_recibo_path: string | null;
}

export type Bucket = 'fotos' | 'empresa';

/** Formato do arquivo de backup (dados.json dentro do .zip). */
export interface BackupDados {
  versao: number;
  gerado_em: string;
  config: Config;
  clientes: Cliente[];
  veiculos: Veiculo[];
  catalogo_servicos: CatalogoServico[];
  catalogo_avarias: CatalogoAvaria[];
  orcamentos: Array<{
    id: string;
    numero: number;
    cliente_id: string;
    veiculo_id: string;
    entrada: string;
    saida: string | null;
    status: Status;
    pecas: number;
    total: number;
    observacoes: string | null;
    foto_path: string | null;
    criado_em: string;
    servicos: ServicoItem[];
    avarias: string[];
  }>;
}

export interface ArquivoBackup {
  bucket: Bucket;
  path: string;
  blob: Blob;
}
