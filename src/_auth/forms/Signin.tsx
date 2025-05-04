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
      <div className="h-screen flex items-center justify-center p-5 font-sans ab-center w-120">
        <div className="w-full bg-dark-2 rounded-lg shadow-lg p-12">
          <div className="flex justify-center mb-8">
            <img 
              src="/assets/images/vexnum.png" 
              width={170} 
              height={45} 
              alt="Vexnum Logo"
              className="transition-transform duration-200 hover:scale-105"
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red/20 text-red rounded-md text-sm border border-red/30">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-light-2 mb-2">
                Почта:
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 bg-dark-3 text-light-1 border border-dark-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-light-4 text-base"
                placeholder="example@mail.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-light-2 mb-2">
                Пароль:
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-4 bg-dark-3 text-light-1 border border-dark-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-light-4 text-base"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full px-5 py-4 rounded-md shadow-sm text-base font-medium text-light-1 bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
          
          <p className="mt-6 text-center text-sm text-light-3">
            Нет аккаунта?{' '}
            <Link to="/sign-up" className="font-medium text-primary-500 hover:text-primary-400 transition-colors">
              Зарегистрируйтесь
            </Link>
          </p>
        </div>
      </div>
    );
};

export default Signin;