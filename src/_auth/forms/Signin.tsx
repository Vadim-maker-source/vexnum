import { useState } from "react";
import { account } from "../../lib/config";
import { Link, useNavigate } from "react-router-dom";

const Signin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
  
    const handleLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      
      try {
        await account.createEmailPasswordSession(email, password);
        await new Promise(resolve => setTimeout(resolve, 100));
        navigate("/");
      } catch (error: any) {
        setError(error.message || "Неверный email или пароль");
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <div className="sign-main">
        <img src="/assets/logo.svg" alt="logo" />
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleLogin}>
          <div>
            <label>Почта:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Пароль:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
        <p>
          Нет аккаунта? <Link to="/sign-up">Зарегистрируйтесь</Link>
        </p>
      </div>
    );
};

export default Signin;