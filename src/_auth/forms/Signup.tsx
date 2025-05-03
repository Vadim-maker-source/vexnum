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
    <div className="sign-main">
      <img src="/assets/logo.svg" alt="logo" />
      
      {error && <div className="error-message">{error}</div>}
      {notification && <div className="success-message">{notification}</div>}
      
      <form ref={form} onSubmit={handleSubmit}>
        <div>
          <label>Имя:</label>
          <input
            type="text"
            value={user.name}
            onChange={(e) => setUser({ ...user, name: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label>Почта:</label>
          <input
            type="email"
            value={user.email}
            onChange={(e) => setUser({ ...user, email: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label>Пароль:</label>
          <input
            type="password"
            value={user.password}
            onChange={(e) => setUser({ ...user, password: e.target.value })}
            required
            disabled={isLoading}
          />
        </div>
        
        {/* <div className="code-cont">
          <label>Код подтверждения:</label>
          <input
            type="text"
            maxLength={6}
            value={userCode}
            onChange={(e) => setUserCode(e.target.value)}
            placeholder="Введите 6-значный код"
            required
            disabled={isLoading || !isCodeSent}
          />
          <button 
            type="button" 
            onClick={sendEmail}
            disabled={isLoading || !user.email}
          >
            {isLoading ? "Отправка..." : "Отправить код"}
          </button>
        </div> */}
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Регистрация..." : "Зарегистрироваться"}
        </button>
      </form>

      <p style={{ color: '#000' }}>
        Уже есть аккаунт?&nbsp;&nbsp;<Link to="/sign-in">Войдите</Link>
      </p>
    </div>
  );
};

export default Signup;