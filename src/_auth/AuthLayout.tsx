import React, { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { account } from "../lib/config";

const AuthLayout: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await account.get();
        // Если пользователь авторизован и находится на странице аутентификации - редирект на главную
        if(user && (location.pathname === '/sign-in' || location.pathname === '/sign-up')) {
          navigate("/");
        }
      } catch (error) {
        // Если пользователь не авторизован и пытается получить доступ к защищенной странице
        if(location.pathname !== '/sign-in' && location.pathname !== '/sign-up') {
          navigate("/sign-in");
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [navigate, location.pathname]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="sign-container">
      <Outlet />
      <img src="/assets/aboutImg.png" alt="" className="sign-img" />
    </div>
  );
};

export default AuthLayout;