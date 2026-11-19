import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useUi, msgErro } from '../components/ui';
import type { Status } from './types';

export function useMudarStatus() {
  const qc = useQueryClient();
  const { avisar } = useUi();
  return useMutation({
    mutationFn: (v: { id: string; status: Status }) => api.mudarStatus(v.id, v.status),
    onSuccess: () => { void qc.invalidateQueries(); avisar('Situação atualizada.'); },
    onError: (e) => avisar(msgErro(e), 'erro'),
  });
}

export function useExcluirOrcamento() {
  const qc = useQueryClient();
  const { avisar, confirmar } = useUi();
  return async (id: string, rotulo: string): Promise<boolean> => {
    const ok = await confirmar('Excluir orçamento?', `${rotulo} será apagado definitivamente, junto com a foto. Esta ação não pode ser desfeita.`, 'Excluir', true);
    if (!ok) return false;
    try { await api.excluirOrcamento(id); void qc.invalidateQueries(); avisar('Orçamento excluído.'); return true; }
    catch (e) { avisar(msgErro(e), 'erro'); return false; }
  };
}
