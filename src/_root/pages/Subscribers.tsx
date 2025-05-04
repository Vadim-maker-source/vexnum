import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getUserById, getUserSubscribers, getUserSubscriptions, Subscription } from '../../lib/api';
import { User } from '../../lib/types';
import { appwriteConfig, storage } from '../../lib/config';

const Subscribers: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { authorId } = useParams<{ authorId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Определяем активную вкладку из URL
  const [activeTab, setActiveTab] = useState<'subscribers' | 'subscriptions'>(() => {
    return new URLSearchParams(location.search).get('tab') === 'subscriptions' 
      ? 'subscriptions' 
      : 'subscribers';
  });

  const [users, setUsers] = useState<Array<{
    user: User;
    subscription?: Subscription;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Обновляем URL при изменении вкладки
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab === 'subscriptions') params.set('tab', 'subscriptions');
    navigate({ search: params.toString() }, { replace: true });
  }, [activeTab, navigate]);

  // Загружаем данные при изменении userId или активной вкладки
  useEffect(() => {
    let isMounted = true;
  
    const fetchData = async () => {
      if (!isMounted || !userId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        if (activeTab === 'subscribers') {
          const subscriptions = await getUserSubscribers(userId);
          const usersData = await Promise.all(
            subscriptions.map(async (sub) => {
              try {
                const user = await getUserById(sub.userId);
                return user ? { user, subscription: sub } : null;
              } catch {
                return null;
              }
            })
          );
          if (isMounted) {
            setUsers(usersData.filter((item): item is { user: User; subscription: Subscription } => item !== null));
          }
        } else {
          const subscriptions = await getUserSubscriptions(String(authorId));
          const usersData = await Promise.all(
            subscriptions.map(async (sub) => {
              try {
                const user = await getUserById(sub.authorId);
                return user ? { user, subscription: sub } : null;
              } catch {
                return null;
              }
            })
          );
          if (isMounted) {
            setUsers(usersData.filter((item): item is { user: User; subscription: Subscription } => item !== null));
          }
        }
      } catch (err) {
        console.error('Error:', err);
        if (isMounted) setError('Failed to load data. Please try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };
  
    fetchData();
  
    return () => { isMounted = false };
  }, [userId, activeTab]);

  const handleTabChange = (tab: 'subscribers' | 'subscriptions') => {
    setActiveTab(tab);
    setUsers([]);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
        <div className="bg-dark-2 rounded-lg shadow-md p-6">
            <div className="flex border-b border-dark-4 mb-6">
                <button
                    className={`px-4 py-2 font-medium ${
                        activeTab === 'subscribers' 
                            ? 'border-b-2 border-primary-500 text-primary-500' 
                            : 'text-light-3 hover:text-light-2'
                    }`}
                    onClick={() => handleTabChange('subscribers')}
                >
                    Подписчики
                </button>
                <button
                    className={`px-4 py-2 font-medium ${
                        activeTab === 'subscriptions' 
                            ? 'border-b-2 border-primary-500 text-primary-500' 
                            : 'text-light-3 hover:text-light-2'
                    }`}
                    onClick={() => handleTabChange('subscriptions')}
                >
                    Подписки
                </button>
            </div>
            
            {users.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-light-3 text-lg">
                        {activeTab === 'subscribers' 
                            ? 'No subscribers yet' 
                            : 'No subscriptions yet'}
                    </p>
                    <p className="text-light-4 mt-2">
                        {activeTab === 'subscribers'
                            ? 'When someone subscribes to you, they will appear here'
                            : 'Users you subscribe to will appear here'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {users.map(({user, subscription}) => (
                        <div 
                            key={user.userId} 
                            className="flex items-center p-4 hover:bg-dark-3 rounded-lg cursor-pointer transition-colors"
                            onClick={() => navigate(`/profile/${user.userId}`)}
                        >
                            <div className="relative w-12 h-12 rounded-full bg-dark-4 flex-shrink-0 overflow-hidden mr-4">
                                {user.imageId ? (
                                    <img 
                                        src={storage.getFilePreview(
                                            appwriteConfig.storageId, 
                                            user.imageId
                                        ).toString()}
                                        alt={user.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null;
                                            target.src = '/default-avatar.jpg';
                                        }}
                                    />
                                ) : (
                                    <span className="flex items-center justify-center w-full h-full text-xl font-bold text-light-3">
                                        {user.name.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-medium text-light-1 truncate">{user.name}</h3>
                                <p className="text-sm text-light-3 truncate">{user.email}</p>
                                {subscription && (
                                    <p className="text-xs text-light-4 mt-1">
                                        {activeTab === 'subscribers' 
                                            ? `Subscribed since: ${new Date(subscription.createdAt).toLocaleDateString()}`
                                            : `Following since: ${new Date(subscription.createdAt).toLocaleDateString()}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);
};

export default Subscribers;