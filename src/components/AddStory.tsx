import { useState, useRef, useEffect } from 'react';
import { ID } from 'appwrite';
import { appwriteConfig, databases, storage } from '../lib/config';
import { User } from '../lib/types';
import { getCurrentUser } from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface AddStoryProps {
  userId: string;
  userName?: string;
  userAvatar?: string;
  onStoryAdded: () => void
}

const AddStory = ({ userId, userName, userAvatar }: AddStoryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [media, setMedia] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

    if(isOpen || loading){
      console.log("")
    }

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setMedia(file);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target?.result as string);
      };
      
      if (file.type.startsWith('video')) {
        reader.readAsDataURL(file);
        
        // Получаем длительность видео
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          setMediaType('video');
        };
        video.src = URL.createObjectURL(file);
      } else {
        reader.readAsDataURL(file);
      }
    }
  };

  const handleUpload = async () => {
    if (!media || !userId) return;
    
    setIsUploading(true);
    
    try {
      // Загружаем медиа в хранилище
      const fileId = ID.unique();
      const response = await storage.createFile(
        appwriteConfig.storageId,
        fileId,
        media
      );
      
      // Получаем URL для просмотра
      const mediaUrl = storage.getFileView(appwriteConfig.storageId, response.$id);
      
      // Создаем запись в базе данных
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 часа
      
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.storiesCollectionId,
        ID.unique(),
        {
          authorId: user?.userId,
          authorName: user?.name || 'User',
          authorAvatar: profileImageUrl,
          mediaUrl: mediaUrl.toString(),
          mediaType,
          duration: mediaType === 'video' ? 10 : undefined, // Примерное время для видео
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString()
        }
      );
      
      // Закрываем модальное окно и сбрасываем состояние
      setIsOpen(false);
      setMedia(null);
      setPreview(null);
    } catch (error) {
      console.error('Failed to upload story:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-primary-500 cursor-pointer relative"
        onClick={() => fileInputRef.current?.click()}
      >
        {userAvatar ? (
          <img 
            src={userAvatar} 
            alt={userName}
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-dark-4 flex items-center justify-center text-light-1">
            {userName?.charAt(0).toUpperCase() || '+'}
          </div>
        )}
        <div className="absolute bottom-0 right-0 bg-primary-500 rounded-full w-5 h-5 flex items-center justify-center">
          <span className="text-light-1 text-sm">+</span>
        </div>
      </div>
      <span className="text-xs text-light-2 mt-1">Your Story</span>
      
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*,video/*"
        className="hidden"
      />
      
      {preview && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-4">
          <div className="relative w-full max-w-md h-[70vh] bg-dark-3 rounded-lg overflow-hidden">
            {mediaType === 'image' ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-full object-contain"
              />
            ) : (
              <video 
                src={preview} 
                controls
                className="w-full h-full object-contain"
              />
            )}
          </div>
          
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => {
                setPreview(null);
                setMedia(null);
              }}
              className="bg-dark-4 text-light-1 px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="bg-primary-500 text-light-1 px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {isUploading ? 'Uploading...' : 'Share Story'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddStory;