import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { LogoCarro } from '../components/Icones';
import { msgErro } from '../components/ui';

export function Login() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const { data: info } = useQuery({ queryKey: ['infoPublica'], queryFn: () => api.infoPublica(), retry: false });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(''); setEnviando(true);
    try { await api.entrar(usuario.trim(), senha); }
    catch (x) { setErro(msgErro(x)); }
    finally { setEnviando(false); }
  }

  return (
    <div className="login-pagina">
      <div className="login-cartao">
        <div className="logo-redondo">{info?.logoUrl ? <img src={info.logoUrl} alt="" /> : <LogoCarro />}</div>
        <h1>{info?.nome || 'Amorim Pintura Automotiva'}</h1>
        <div className="sub">Gerenciador de orçamentos — entre para continuar</div>
        <form onSubmit={enviar}>
          <div className="campo">
            <label htmlFor="u">Usuário</label>
            <input id="u" type="text" autoComplete="username" autoCapitalize="none" value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus />
          </div>
          <div className="campo">
            <label htmlFor="s">Senha</label>
            <input id="s" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          {erro && <div className="campo"><div className="erro" role="alert">{erro}</div></div>}
          <button className="btn primario grande" disabled={enviando || !usuario || !senha}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        </form>
        {api.demo && <p className="sub" style={{ marginTop: 16 }}>Modo demonstração — usuário <b>amorim</b>, senha <b>9912</b>.</p>}
      </div>
    </div>
  );
}
