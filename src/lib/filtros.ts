import { FILTRO_STATUS_ABERTOS, FILTRO_STATUS_TODOS, type Orcamento } from './types';
import { semAcento } from './format';

export interface Filtro { busca: string; ano: string; mes: string; status: string }
export const filtroVazio: Filtro = { busca: '', ano: 'Todos', mes: 'Todos', status: FILTRO_STATUS_TODOS };

/** A busca procura em TODOS os períodos (como no programa de computador); mês/ano só filtram quando escolhidos. */
export function filtrar(lista: Orcamento[], f: Filtro): Orcamento[] {
  const q = semAcento(f.busca.trim());
  return lista.filter((o) => {
    if (f.status === FILTRO_STATUS_ABERTOS && o.status === 'Entregue') return false;
    if (f.status !== FILTRO_STATUS_TODOS && f.status !== FILTRO_STATUS_ABERTOS && o.status !== f.status) return false;
    if (q) {
      const alvo = semAcento([
        o.numero, o.cliente.nome, o.cliente.telefone, o.veiculo.placa, o.veiculo.marca, o.veiculo.modelo, o.veiculo.cor,
      ].filter(Boolean).join(' '));
      return q.split(/\s+/).every((p) => alvo.includes(p)) || alvo.replace(/[^a-z0-9]/g, '').includes(q.replace(/[^a-z0-9]/g, ''));
    }
    if (f.ano !== 'Todos' && o.entrada.slice(0, 4) !== f.ano) return false;
    if (f.mes !== 'Todos' && o.entrada.slice(5, 7) !== f.mes.padStart(2, '0')) return false;
    return true;
  });
}

export function anosDisponiveis(lista: Orcamento[]): string[] {
  const fim = Math.max(2030, new Date().getFullYear() + 1);
  const ini = Math.min(new Date().getFullYear(), ...lista.map((o) => Number(o.entrada.slice(0, 4)) || 9999));
  const r: string[] = [];
  for (let a = fim; a >= ini; a--) r.push(String(a));
  return r;
}
