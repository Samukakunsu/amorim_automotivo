import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useConfig, useTempoReal } from '../lib/dados';
import {
  IcAlerta, IcCarro, IcEngrenagem, IcFerramenta, IcLista, IcMais, IcMenu, IcPainel, IcPessoas, LogoCarro,
} from './Icones';

const itens = [
  { para: '/', rot: 'Painel', ic: <IcPainel />, fim: true },
  { para: '/orcamentos', rot: 'Orçamentos', ic: <IcLista /> },
  { para: '/orcamentos/novo', rot: 'Novo orçamento', ic: <IcMais /> },
];
const cadastros = [
  { para: '/clientes', rot: 'Clientes', ic: <IcPessoas /> },
  { para: '/veiculos', rot: 'Veículos', ic: <IcCarro /> },
  { para: '/servicos', rot: 'Serviços e valores', ic: <IcFerramenta /> },
  { para: '/avarias', rot: 'Avarias', ic: <IcAlerta /> },
];

export function Layout() {
  const [aberto, setAberto] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const { data: cfg } = useConfig();
  useTempoReal();
  useEffect(() => setAberto(false), [loc.pathname]);
  useEffect(() => { if (cfg?.nome) document.title = `${cfg.nome} - Orçamentos`; }, [cfg?.nome]);

  const nome = cfg?.nome || 'Amorim Pintura Automotiva';
  const link = (i: { para: string; rot: string; ic: JSX.Element; fim?: boolean }) => (
    <NavLink key={i.para} to={i.para} end={i.fim || i.para === '/orcamentos'} className={({ isActive }) => (isActive ? 'ativo' : '')}>
      {i.ic}{i.rot}
    </NavLink>
  );

  return (
    <div className={`app ${aberto ? 'menu-aberto' : ''}`}>
      <aside className="lateral noprint" aria-label="Menu principal">
        <div className="marca">
          <div className="logo-redondo">
            {cfg?.logo_path ? <img src={api.urlEmpresa(cfg.logo_path)} alt="" /> : <LogoCarro />}
          </div>
          <div className="nome">{nome}</div>
          <div className="sub">Gerenciador de orçamentos</div>
        </div>
        <nav className="nav">
          {itens.map(link)}
          <div className="grupo">CADASTROS</div>
          {cadastros.map(link)}
          <div className="grupo">SISTEMA</div>
          {link({ para: '/configuracoes', rot: 'Configurações', ic: <IcEngrenagem /> })}
        </nav>
        <div className="rodape-lateral">
          <div className="usuario">Conectado{api.demo ? ' (modo demonstração)' : ''}</div>
          <button className="btn-sair" onClick={() => void api.sair()}>Sair</button>
        </div>
      </aside>
      <div className="fundo-menu noprint" onClick={() => setAberto(false)} />
      <div className="principal">
        <header className="topo-mobile noprint">
          <button className="menu-btn" aria-label="Abrir menu" onClick={() => setAberto(true)}><IcMenu /></button>
          <div className="titulo">{nome}</div>
          <button className="btn primario" onClick={() => nav('/orcamentos/novo')}><IcMais /> Novo</button>
        </header>
        {api.demo && (
          <div className="demo-faixa noprint">Modo demonstração: dados de exemplo salvos só neste navegador. Configure o Supabase para usar de verdade (veja o GUIA).</div>
        )}
        <main className="conteudo"><Outlet /></main>
      </div>
    </div>
  );
}
