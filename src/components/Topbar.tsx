import { useEffect, useState } from "react";
import { account, appwriteConfig, storage } from "../lib/config";
import { Link, useNavigate } from "react-router-dom";
import { User } from "../lib/types";
import { getCurrentUser } from "../lib/api";

const Topbar = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);
            try {
                const user = await getCurrentUser();
                if (user) {
                    setUser(user as unknown as User);
                } else {
                    navigate("/sign-in");
                }
                if(user?.imageId){
                    try {
                        const url = storage.getFileView(
                            appwriteConfig.storageId,
                            user.imageId
                        ).toString();
                        setProfileImageUrl(url)
                    } catch (error) {
                        console.log(error)
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user:", error);
                setUser(null);
                navigate("/sign-in");
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await account.deleteSession('current');
            navigate("/sign-in");
        } catch (error) {
            console.log(error);
        }
    };

    const navigateSaved = async () => {
        if (!user) {
            navigate("/sign-in");
            return;
        }
        navigate(`/saved/${user.$id}`);
    };

    const navigateProfile = async () => {
        navigate(`/profile/${user?.$id}`);
    };

    if (loading) {
        return (
            <header className="bg-dark-2 shadow-lg">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="animate-pulse h-10 w-40 bg-dark-3 rounded-md"></div>
                    <div className="flex space-x-6">
                        <div className="animate-pulse h-8 w-24 bg-dark-3 rounded-md"></div>
                        <div className="animate-pulse h-8 w-24 bg-dark-3 rounded-md"></div>
                        <div className="animate-pulse h-10 w-10 rounded-full bg-dark-3"></div>
                    </div>
                </div>
            </header>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <header className="bg-dark-2 shadow-lg border-b border-dark-4">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                {/* Logo - изменяющаяся в зависимости от размера экрана */}
                <Link to="/" className="flex items-center group">
                    {/* Полная версия логотипа - скрывается на md и меньше */}
                    <img 
                        src="/assets/images/vexnum.png" 
                        width={170} 
                        height={45} 
                        alt="Vexnum Logo"
                        className="hidden md:block transition-transform duration-200 group-hover:scale-105"
                    />
                    {/* Укороченная версия логотипа - показывается только на md и меньше */}
                    <img 
                        src="/assets/images/vexnum-short.png" 
                        width={40} 
                        height={40} 
                        alt="Vexnum"
                        className="block md:hidden transition-transform duration-200 group-hover:scale-105"
                    />
                </Link>

                {/* Navigation Links */}
                <div className="flex items-center space-x-6">
                    <Link 
                        to="/add-post"
                        className="text-light-2 hover:text-primary-500 transition-colors duration-200 font-medium text-sm uppercase tracking-wider flex items-center"
                    >
                        <img src="/assets/icons/add-post.svg" width={25} height={25} alt="Create Post" />
                        <span className="hidden md:inline ml-2">Создать</span>
                    </Link>
                    
                    <button 
                        onClick={navigateSaved}
                        className="text-light-2 hover:text-primary-500 transition-colors duration-200 font-medium text-sm uppercase tracking-wider flex items-center"
                    >
                        <img src="/assets/icons/bookmark2.svg" width={25} height={25} alt="Saved" />
                        <span className="hidden md:inline ml-2">Избранные</span>
                    </button>
                </div>

                {/* User Profile */}
                <div className="flex items-center space-x-6">
                    <button 
                        onClick={navigateProfile} 
                        className="flex items-center space-x-3 group"
                    >
                        <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-primary-500 shadow-md group-hover:border-primary-400 transition-colors duration-200">
                            {profileImageUrl ? (
                                <img 
                                    src={profileImageUrl} 
                                    alt="Profile" 
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full bg-primary-500 flex items-center justify-center text-light-1 font-bold text-lg">
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <span className="hidden md:inline text-light-2 font-medium group-hover:text-light-1 transition-colors duration-200">
                            {user.name}
                        </span>
                    </button>
                    
                    <button 
                        onClick={handleLogout}
                        className="text-light-3 hover:text-red-400 transition-colors duration-200 flex items-center"
                        title="Log out"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="ml-2 hidden md:inline">Выйти</span>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Topbar;