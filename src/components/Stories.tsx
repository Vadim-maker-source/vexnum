import { useState, useEffect, useCallback, useMemo } from 'react';
import AddStory from './AddStory';
import StoriesModal from './StoriesModal';
import { account, appwriteConfig, databases } from '../lib/config';
import { Query } from 'appwrite';

interface Story {
  $id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  duration?: number;
  createdAt: string;
  expiresAt: string;
  viewed?: boolean;
}

interface UserStory {
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  stories: Story[];
  hasUnviewed: boolean;
}

const Stories = () => {
  const [allStories, setAllStories] = useState<UserStory[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserStory | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'subscriptions'>('all');
  const [currentUserIndex, setCurrentUserIndex] = useState(0);

  // Получаем текущего пользователя
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await account.get();
        setCurrentUser(user.$id);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const fetchSubscriptions = async () => {
      try {
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.subscribersCollectionId,
          [Query.equal('userId', currentUser)]
        );

        setSubscriptions(response.documents.map(doc => doc.authorId));
      } catch (error) {
        console.error("Failed to fetch subscriptions:", error);
      }
    };

    fetchSubscriptions();
  }, [currentUser]);

  // Получаем все активные сторис
  const fetchStories = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.storiesCollectionId,
        [
          Query.greaterThan('expiresAt', now),
          Query.orderDesc('createdAt'),
          Query.limit(100)
        ]
      );

      const storiesByAuthor: Record<string, UserStory> = {};

      response.documents.forEach((doc: unknown) => {
        const story = doc as unknown as Story;
        
        if (!storiesByAuthor[story.authorId]) {
          storiesByAuthor[story.authorId] = {
            authorId: story.authorId,
            authorName: story.authorName,
            authorAvatar: story.authorAvatar,
            stories: [],
            hasUnviewed: false
          };
        }
        
        if (!story.viewed && currentUser && story.authorId !== currentUser) {
          storiesByAuthor[story.authorId].hasUnviewed = true;
        }
        
        storiesByAuthor[story.authorId].stories.push(story);
      });

      setAllStories(Object.values(storiesByAuthor));
    } catch (error) {
      console.error("Failed to fetch stories:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Мемоизированная фильтрация сторис
  const filteredStories = useMemo(() => {
    const stories = viewMode === 'subscriptions' 
      ? allStories.filter(story => subscriptions.includes(story.authorId))
      : allStories;

    // Сортируем: сначала подписки, затем по времени создания
    return stories.sort((a, b) => {
      const aIsSubscribed = subscriptions.includes(a.authorId);
      const bIsSubscribed = subscriptions.includes(b.authorId);
      
      if (aIsSubscribed && !bIsSubscribed) return -1;
      if (!aIsSubscribed && bIsSubscribed) return 1;
      
      const aLatest = new Date(a.stories[0]?.createdAt || 0);
      const bLatest = new Date(b.stories[0]?.createdAt || 0);
      return bLatest.getTime() - aLatest.getTime();
    });
  }, [viewMode, allStories, subscriptions]);

  const handleUserClick = (userStory: UserStory) => {
    const userIndex = filteredStories.findIndex(u => u.authorId === userStory.authorId);
    setCurrentUserIndex(userIndex);
    setSelectedUser(userStory);
    setOpenModal(true);
    
    if (currentUser && userStory.hasUnviewed) {
      markStoriesAsViewed(userStory.authorId);
    }
  };

  const markStoriesAsViewed = async (authorId: string) => {
    try {
      const storiesToUpdate = allStories
        .find(s => s.authorId === authorId)
        ?.stories.filter(s => !s.viewed);
      
      if (!storiesToUpdate || storiesToUpdate.length === 0) return;
      
      const updates = storiesToUpdate.map(story => 
        databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.storiesCollectionId,
          story.$id,
          { viewed: true }
        )
      );
      
      await Promise.all(updates);
      fetchStories();
    } catch (error) {
      console.error("Failed to mark stories as viewed:", error);
    }
  };

  const handleStoryAdded = () => {
    fetchStories();
  };

  const handleNextUser = useCallback(() => {
    if (currentUserIndex < filteredStories.length - 1) {
      const nextIndex = currentUserIndex + 1;
      setCurrentUserIndex(nextIndex);
      setSelectedUser(filteredStories[nextIndex]);
      return true;
    }
    return false;
  }, [currentUserIndex, filteredStories]);

  if (isLoading) {
    return (
      <div className="flex space-x-4 overflow-x-auto py-4 px-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse flex-shrink-0 w-16 h-16 rounded-full bg-dark-4"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="stories-container py-4 px-2 rounded-lg">
      <div className="flex mb-4 gap-2">
        <button
          className={`px-4 py-1 rounded-full text-sm ${
            viewMode === 'all' ? 'bg-primary-500 text-light-1' : 'bg-dark-4 text-light-2'
          }`}
          onClick={() => setViewMode('all')}
        >
          Все
        </button>
        <button
          className={`px-4 py-1 rounded-full text-sm ${
            viewMode === 'subscriptions' ? 'bg-primary-500 text-light-1' : 'bg-dark-4 text-light-2'
          }`}
          onClick={() => setViewMode('subscriptions')}
        >
          Подписки
        </button>
      </div>
      
      <div className="flex space-x-4 overflow-x-auto pb-2">
        {currentUser && (
          <AddStory 
            userId={currentUser} 
            onStoryAdded={handleStoryAdded} 
          />
        )}
        
        {filteredStories.map(userStory => (
          <div 
            key={userStory.authorId} 
            className="flex flex-col items-center flex-shrink-0 cursor-pointer"
            onClick={() => handleUserClick(userStory)}
          >
            <div className={`
              w-16 h-16 rounded-full flex items-center justify-center relative
              ${userStory.hasUnviewed ? 'border-2 border-primary-500' : 'border-2 border-dark-4'}
              ${subscriptions.includes(userStory.authorId) ? 'ring-2 ring-primary-500' : ''}
            `}>
              {userStory.authorAvatar ? (
                <img 
                  src={userStory.authorAvatar} 
                  alt={userStory.authorName}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-dark-4 flex items-center justify-center text-light-1">
                  {userStory.authorName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="text-xs text-light-2 mt-1 truncate w-16 text-center">
              {userStory.authorName}
            </span>
          </div>
        ))}
      </div>

      {openModal && (
        <StoriesModal
          key={selectedUser?.authorId || 'modal'}
          stories={selectedUser?.stories || []}
          onClose={() => setOpenModal(false)}
          authorName={selectedUser?.authorName || ''}
          authorAvatar={selectedUser?.authorAvatar}
          onStoryViewed={() => selectedUser && markStoriesAsViewed(selectedUser.authorId)}
          onNextUser={handleNextUser}
        />
      )}
    </div>
  );
};

export default Stories;