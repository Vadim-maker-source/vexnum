import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Post, User } from '../../lib/types';
import { checkSubscriptionStatus, getCurrentUser, getSubscriberCount, getUserById, getUserPosts, subscribeToUser, unsubscribeFromUser } from '../../lib/api';
import { account, appwriteConfig, storage } from '../../lib/config';
import { useSubscription } from '../../hooks/useSubscription';

interface EnhancedPost extends Post {
  imageUrls: string[];
  currentImageIndex: number;
}

const Profile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [enhancedPosts, setEnhancedPosts] = useState<EnhancedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const checkSubscription = async () => {
      try {
        // Проверяем подписку только если у нас есть текущий пользователь и просматриваемый пользователь
        if (currentUser && user && currentUser.userId !== user.userId) {
          const subscription = await checkSubscriptionStatus(user.userId, currentUser.userId);
          setIsSubscribed(!!subscription);
          if (subscription) {
            setSubscriptionId(String(subscription.$id));
          } else {
            setSubscriptionId(null);
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
        setSubscriptionId(null);
      }
    };
    
    checkSubscription();
  }, [user, currentUser]);

  // Функция для получения URL изображения с отладкой
  const getImageUrl = async (imageId: string): Promise<string> => {
    try {
      console.log('Trying to get image URL for:', imageId);
      const url = storage.getFileView(
        appwriteConfig.storageId,
        imageId
      ).toString();
      
      console.log('Generated URL:', url);
      
      // Проверяем, доступно ли изображение по URL
      const test = await fetch(url);
      if (!test.ok) throw new Error('Image not accessible');
      
      return url;
    } catch (error) {
      console.error('Error getting image URL:', error);
      throw error;
    }
  };

  const loadPostImages = async (post: Post): Promise<EnhancedPost> => {
    // Явно проверяем тип и наличие images
    const imagesArray = Array.isArray(post.images) ? post.images : [];
    
    if (imagesArray.length === 0) {
      return { ...post, imageUrls: [], currentImageIndex: 0 };
    }

    try {
      const urls = await Promise.all(imagesArray.map((id: string) => getImageUrl(id)));
      return { ...post, imageUrls: urls, currentImageIndex: 0 };
    } catch (error) {
      console.error('Error loading images for post:', post.$id, error);
      return { ...post, imageUrls: [], currentImageIndex: 0 };
    }
  };

  const handleNextImage = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEnhancedPosts(prev => 
      prev.map(post => 
        post.$id === postId
          ? {
              ...post,
              currentImageIndex: (post.currentImageIndex + 1) % post.imageUrls.length
            }
          : post
      )
    );
  };

  const handlePrevImage = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEnhancedPosts(prev => 
      prev.map(post => 
        post.$id === postId
          ? {
              ...post,
              currentImageIndex: 
                (post.currentImageIndex - 1 + post.imageUrls.length) % 
                post.imageUrls.length
            }
          : post
      )
    );
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    console.error('Image load error:', target.src);
    target.src = '/default-post.jpg';
    target.onerror = null;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Загрузка данных пользователя
        const userData = await getUserById(userId || '');
        if (!userData) throw new Error('User not found');
        setUser(userData);

        // Загрузка аватара
        if (userData.imageId) {
          try {
            const url = await getImageUrl(userData.imageId);
            setProfileImageUrl(url);
          } catch (error) {
            console.warn('Failed to load profile image:', error);
          }
        }

        // Загрузка постов
        const userPosts = await getUserPosts(userData.userId);
        console.log('Raw posts data:', userPosts);
        
        const postsWithImages = await Promise.all(
          userPosts.map(loadPostImages)
        );
        console.log('Posts with images:', postsWithImages);
        
        setEnhancedPosts(postsWithImages);

      } catch (err) {
        console.error('Profile data error:', err);
        setError(err instanceof Error ? err.message : 'Error loading profile');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const accountData = await account.get();
        if (accountData) {
          const userDoc = await getCurrentUser();
          if (userDoc) {
            setCurrentUser({
              ...userDoc,
              $id: accountData.$id,
              email: accountData.email, // Убедитесь, что email берется из accountData
              name: accountData.name   // Имя тоже лучше брать из accountData
            });
          }
        }
      } catch (error) {
        console.error("Current user error:", error);
      }
    };
    fetchCurrentUser();
  }, []);

  const renderHashtags = (hashtags: unknown) => {
    if (Array.isArray(hashtags) && hashtags.every(item => typeof item === 'string')) {
      return hashtags.map((tag: string, index: number) => (
        <span
          key={index}
          className="text-sm text-primary-500 px-2 py-1 rounded"
        >
          #{tag}
        </span>
      ));
    }
    if (typeof hashtags === 'string') {
      return (
        <span className="text-sm text-primary-500 px-2 py-1 rounded">
          #{hashtags}
        </span>
      );
    }
    return null;
  };

  const { 
    isSubscribed, 
    subscriptionId, 
    loading: subscriptionLoading,
    setIsSubscribed,
    setSubscriptionId
  } = useSubscription(user?.userId || null, currentUser?.userId || null);

  const handleSubscribe = async () => {
    if (!currentUser || !user) return;
    
    try {
      if (isSubscribed && subscriptionId) {
        await unsubscribeFromUser(subscriptionId);
      } else {
        await subscribeToUser(user.userId, currentUser.userId);
      }
      // Refresh the count after subscription change
      const newCount = await getSubscriberCount(user.userId);
      setSubscriberCount(newCount);
    } catch (error) {
      console.error('Subscription error:', error);
    }
  };


  const [subscriberCount, setSubscriberCount] = useState<number>(0);

  useEffect(() => {
    const fetchCount = async () => {
      if (user?.userId) {
        try {
          const count = await getSubscriberCount(user.userId);
          setSubscriberCount(count);
        } catch (error) {
          console.error('Failed to fetch subscriber count:', error);
        }
      }
    };
    fetchCount();
  }, [user?.userId]);


  

  if (loading || subscriptionLoading) return <div className="flex-center h-screen">Loading...</div>;
  if (error) return <div className="flex-center h-screen text-red-500">{error}</div>;
  if (!user) return <div className="flex-center h-screen">User not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
        <div className="bg-dark-3 rounded-lg shadow-md p-6">
            <div className="flex flex-col items-center mb-8">
                <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-dark-3 shadow-lg">
                    {profileImageUrl ? (
                        <img
                            src={profileImageUrl}
                            alt="Profile"
                            className="w-full h-full object-cover"
                            onError={() => setProfileImageUrl(null)}
                        />
                    ) : (
                        <div className="w-full h-full bg-dark-4 flex items-center justify-center">
                            <span className="text-4xl font-bold text-light-3">
                                {user.name.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    )}
                </div>
                
                <h2 className="text-2xl font-bold text-light-1">{user.name}</h2>
                <p className="text-light-3 mb-4">{user.email}</p>
                <p className="text-light-4 mb-4">{subscriberCount} подписчиков</p>
                
                {currentUser?.$id === user.userId ? (
                    <div className="flex gap-2">
                        <button
                            onClick={() => navigate(`/edit/${user.userId}`)}
                            className="px-4 py-2 bg-primary-500 text-light-1 rounded-md hover:bg-primary-600 transition-colors"
                        >
                            Edit Profile
                        </button>
                        <button
                            onClick={() => navigate(`/subscribers/${user.userId}`)}
                            className="px-4 py-2 bg-dark-3 text-light-2 rounded-md hover:bg-dark-4 transition-colors"
                        >
                            Subscriptions
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <button
                            onClick={handleSubscribe}
                            className={`px-4 py-2 ${isSubscribed ? 'bg-red hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600'} text-light-1 rounded-md transition-colors`}
                        >
                            {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                        </button>
                        <button
                            onClick={() => navigate(`/subscribers/${user.userId}`)}
                            className="px-4 py-2 bg-dark-3 text-light-2 rounded-md hover:bg-dark-4 transition-colors"
                        >
                            Subscriptions
                        </button>
                    </div>
                )}
            </div>

            <div className="border-t border-dark-4 pt-6">
                <h3 className="text-xl font-semibold mb-4 text-light-1">Posts</h3>
                
                {enhancedPosts.length === 0 ? (
                    <p className="text-light-4 text-center py-4">No posts yet</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {enhancedPosts.map(post => (
                            <div key={post.$id} className="bg-dark-3 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                                <div className="relative aspect-[4/3] bg-dark-4">
                    {post.imageUrls.length > 0 ? (
                      <>
                        <img
                          src={post.imageUrls[post.currentImageIndex]}
                          alt={post.title}
                          className="w-full h-full object-cover"
                          onError={handleImageError}
                          loading="lazy"
                        />
                        
                        {post.imageUrls.length > 1 && (
                          <>
                            <button
                              onClick={(e) => handlePrevImage(post.$id, e)}
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
                            >
                              &lt;
                            </button>
                            <button
                              onClick={(e) => handleNextImage(post.$id, e)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70 transition-colors"
                            >
                              &gt;
                            </button>
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1">
                              {post.imageUrls.map((_, index) => (
                                <button
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEnhancedPosts(prev =>
                                      prev.map(p =>
                                        p.$id === post.$id
                                          ? { ...p, currentImageIndex: index }
                                          : p
                                      )
                                    );
                                  }}
                                  className={`w-2 h-2 rounded-full transition-colors ${
                                    index === post.currentImageIndex
                                      ? 'bg-white'
                                      : 'bg-white/50'
                                  }`}
                                />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                                        <h4 className="font-bold text-lg mb-2 text-light-1">
                                            {post.title}
                                        </h4>
                                        {post.hashtags && (
                                            <div className="flex flex-wrap mb-3">
                                                {renderHashtags(post.hashtags)}
                                            </div>
                                        )}
                                        <p className="text-sm text-light-4">
                                            Posted: {new Date(post.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;