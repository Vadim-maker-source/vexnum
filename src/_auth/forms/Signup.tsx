import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User } from "../../lib/types";
import { registerUser } from "../../lib/api";
import { ID } from "appwrite";

const Signup: React.FC = () => {
  const form = useRef<HTMLFormElement>(null);
  const [notification, setNotification] = useState<string | null>(null);
  // // const [verificationCode, setVerificationCode] = useState<string>("");
  // const [userCode, setUserCode] = useState<string>("");
  // const [isCodeSent, setIsCodeSent] = useState<boolean>(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [user, setUser] = useState<User>({
    userId: ID.unique(),
    name: "",
    email: "",
    password: "",
    bio: ""
  });

  const navigate = useNavigate();

  // const generateVerificationCode = (): string => {
  //   return Math.floor(100000 + Math.random() * 900000).toString();
  // };

  // const sendEmail = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setIsLoading(true);
  //   setError("");
  //   setNotification(null);

  //   if (!user.email) {
  //     setError("Пожалуйста, введите email");
  //     setIsLoading(false);
  //     return;
  //   }

  //   const code = generateVerificationCode();
  //   setVerificationCode(code);
  //   setIsCodeSent(true);

  //   try {
  //     const templateParams = {
  //       to_email: user.email,
  //       user_name: user.name,
  //       verification_code: code
  //     };

  //     await emailjs.send(
  //       'service_bm1zi3k', // Замените на ваш Service ID
  //       'template_wu3prna', // Замените на ваш Template ID
  //       templateParams,
  //       'btSPvhQQNmoRrd_TS' // Замените на ваш Public Key
  //     );

  //     setNotification('Код подтверждения отправлен на вашу почту!');
  //   } catch (error) {
  //     console.error('Ошибка отправки кода:', error);
    
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setNotification(null);

    // if (!isCodeSent) {
    //   setError("Сначала отправьте код подтверждения");
    //   setIsLoading(false);
    //   return;
    // }

    // if (!userCode) {
    //   setError("Введите код подтверждения");
    //   setIsLoading(false);
    //   return;
    // }

    // if (userCode !== verificationCode) {
    //   setError("Неверный код подтверждения");
    //   setIsLoading(false);
    //   return;
    // }

    try {
      await registerUser(user);
      navigate("/sign-in");
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      setError("Ошибка регистрации. Проверьте данные.");
    } finally {
      setIsLoading(false);
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
        
        {notification && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md text-sm">
            {notification}
          </div>
        )}
        
        <form ref={form} onSubmit={handleSubmit} className="space-y-6 w-full">
          <div className="w-full">
            <label className="block text-sm font-medium text-light-2 mb-2">
              Имя:
            </label>
            <input
              type="text"
              value={user.name}
              onChange={(e) => setUser({ ...user, name: e.target.value })}
              required
              disabled={isLoading}
              className="w-full px-5 py-4 bg-dark-3 text-light-1 border border-dark-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-light-4 disabled:opacity-70 text-base"
              placeholder="Ваше имя"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-light-2 mb-2">
              Почта:
            </label>
            <input
              type="email"
              value={user.email}
              onChange={(e) => setUser({ ...user, email: e.target.value })}
              required
              disabled={isLoading}
              className="w-full px-5 py-4 bg-dark-3 text-light-1 border border-dark-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-light-4 disabled:opacity-70 text-base"
              placeholder="example@mail.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-light-2 mb-2">
              Пароль:
            </label>
            <input
              type="password"
              value={user.password}
              onChange={(e) => setUser({ ...user, password: e.target.value })}
              required
              disabled={isLoading}
              className="w-full px-5 py-4 bg-dark-3 text-light-1 border border-dark-4 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-light-4 disabled:opacity-70 text-base"
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full px-5 py-4 rounded-md shadow-sm text-base font-medium text-light-1 bg-primary-600 hover:bg-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? "Регистрация..." : "Зарегистрироваться"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-light-3">
          Уже есть аккаунт?{' '}
          <Link to="/sign-in" className="font-medium text-primary-500 hover:text-primary-400 transition-colors">
            Войдите
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;