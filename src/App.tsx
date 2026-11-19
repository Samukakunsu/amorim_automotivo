import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './lib/api';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Painel } from './pages/Painel';
import { Orcamentos } from './pages/Orcamentos';
import { OrcamentoForm } from './pages/OrcamentoForm';
import { OrcamentoDetalhe } from './pages/OrcamentoDetalhe';
import { Recibo } from './pages/Recibo';
import { Clientes } from './pages/Clientes';
import { Veiculos } from './pages/Veiculos';
import { CatalogoServicos, CatalogoAvarias } from './pages/Catalogos';
import { Configuracoes } from './pages/Configuracoes';

export default function App() {
  const [logado, setLogado] = useState<boolean | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    let vivo = true;
    void api.temSessao().then((v) => vivo && setLogado(v)).catch(() => vivo && setLogado(false));
    const off = api.aoMudarSessao((v) => { setLogado(v); if (!v) qc.clear(); });
    return () => { vivo = false; off(); };
  }, [qc]);

  if (logado === null) return <div className="login-pagina"><div className="aviso">Carregando…</div></div>;
  if (!logado) return <Login />;

  return (
    <Routes>
      <Route path="/orcamentos/:id/recibo" element={<Recibo />} />
      <Route element={<Layout />}>
        <Route index element={<Painel />} />
        <Route path="orcamentos" element={<Orcamentos />} />
        <Route path="orcamentos/novo" element={<OrcamentoForm />} />
        <Route path="orcamentos/:id" element={<OrcamentoDetalhe />} />
        <Route path="orcamentos/:id/editar" element={<OrcamentoForm />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="veiculos" element={<Veiculos />} />
        <Route path="servicos" element={<CatalogoServicos />} />
        <Route path="avarias" element={<CatalogoAvarias />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
