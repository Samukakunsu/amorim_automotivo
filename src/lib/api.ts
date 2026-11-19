import type {
  ArquivoBackup, BackupDados, Bucket, CatalogoAvaria, CatalogoServico, Cliente, Config,
  Orcamento, OrcamentoInput, Status, Veiculo,
} from './types';
import { supabaseApi } from './api.supabase';
import { demoApi } from './api.demo';

/** Tudo o que o sistema faz com os dados passa por aqui. */
export interface Api {
  /** true = sem Supabase configurado: roda com dados de exemplo só neste navegador. */
  demo: boolean;

  // acesso
  entrar(usuario: string, senha: string): Promise<void>;
  sair(): Promise<void>;
  temSessao(): Promise<boolean>;
  aoMudarSessao(cb: (logado: boolean) => void): () => void;
  trocarSenha(atual: string, nova: string): Promise<void>;
  infoPublica(): Promise<{ nome: string; logoUrl: string | null }>;

  // orçamentos
  listarOrcamentos(): Promise<Orcamento[]>;
  obterOrcamento(id: string): Promise<Orcamento | null>;
  salvarOrcamento(dados: OrcamentoInput): Promise<string>;
  excluirOrcamento(id: string): Promise<void>;
  mudarStatus(id: string, status: Status): Promise<void>;

  // clientes e veículos
  listarClientes(): Promise<Cliente[]>;
  salvarCliente(c: { id?: string; nome: string; telefone?: string | null; observacoes?: string | null }): Promise<void>;
  excluirCliente(id: string): Promise<void>;
  listarVeiculos(): Promise<Veiculo[]>;
  salvarVeiculo(v: Partial<Veiculo> & { placa: string; cliente_id: string }): Promise<void>;
  excluirVeiculo(id: string): Promise<void>;
  buscarPorPlaca(placa: string): Promise<{ veiculo: Veiculo; cliente: Cliente } | null>;

  // listas de serviços e avarias
  listarServicosCat(): Promise<CatalogoServico[]>;
  salvarServicoCat(s: Partial<CatalogoServico> & { nome: string }): Promise<void>;
  excluirServicoCat(id: string): Promise<void>;
  listarAvariasCat(): Promise<CatalogoAvaria[]>;
  salvarAvariaCat(a: Partial<CatalogoAvaria> & { nome: string }): Promise<void>;
  excluirAvariaCat(id: string): Promise<void>;

  // dados da oficina
  obterConfig(): Promise<Config>;
  salvarConfig(c: Partial<Config>): Promise<void>;

  // arquivos
  enviarFoto(blob: Blob): Promise<string>;
  enviarImagemEmpresa(tipo: 'logo' | 'fundo', blob: Blob): Promise<string>;
  urlFoto(path: string): Promise<string>;
  urlEmpresa(path: string): string;
  baixarArquivo(bucket: Bucket, path: string): Promise<Blob | null>;
  removerArquivo(bucket: Bucket, path: string): Promise<void>;

  // tempo real: chama cb sempre que outro aparelho alterar algo
  inscrever(cb: () => void): () => void;

  // backup
  exportarDados(): Promise<BackupDados>;
  restaurarDados(dados: BackupDados, arquivos: ArquivoBackup[]): Promise<void>;
}

const temSupabase = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
export const api: Api = temSupabase ? supabaseApi : demoApi;
