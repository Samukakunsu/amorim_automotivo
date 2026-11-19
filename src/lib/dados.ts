import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from './api';

/** Chaves de cache. Tudo é recarregado quando outro aparelho altera algo (tempo real). */
export const useOrcamentos = () => useQuery({ queryKey: ['orcamentos'], queryFn: () => api.listarOrcamentos() });
export const useOrcamento = (id?: string) =>
  useQuery({ queryKey: ['orcamento', id], queryFn: () => api.obterOrcamento(id!), enabled: Boolean(id) });
export const useConfig = () => useQuery({ queryKey: ['config'], queryFn: () => api.obterConfig() });
export const useClientes = () => useQuery({ queryKey: ['clientes'], queryFn: () => api.listarClientes() });
export const useVeiculos = () => useQuery({ queryKey: ['veiculos'], queryFn: () => api.listarVeiculos() });
export const useServicosCat = () => useQuery({ queryKey: ['servicosCat'], queryFn: () => api.listarServicosCat() });
export const useAvariasCat = () => useQuery({ queryKey: ['avariasCat'], queryFn: () => api.listarAvariasCat() });

export function useTempoReal() {
  const qc = useQueryClient();
  useEffect(() => api.inscrever(() => { void qc.invalidateQueries(); }), [qc]);
}

export function useUrlFoto(path: string | null | undefined) {
  return useQuery({ queryKey: ['urlFoto', path], queryFn: () => api.urlFoto(path!), enabled: Boolean(path), staleTime: 30 * 60 * 1000 });
}
