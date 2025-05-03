import { Models, Query } from 'appwrite';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { appwriteConfig, storage, databases, account } from '../lib/config';
import { format } from 'date-fns';
import PostStats from './PostStats';

interface PostCardProps {
  post: Models.Document;
  userId: string | null;
  authorInfo?: AuthorInfo;
}

interface AuthorInfo {
  name: string;
  avatarUrl: string | null;
}

const PostCard = ({ post, userId }: PostCardProps) => {
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState(true);
  const [imageError, setImageError] = useState('');
  const [authorInfo, setAuthorInfo] = useState<AuthorInfo | null>(null);
  const [loadingAuthor, setLoadingAuthor] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<Models.Document | null>(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const currentAccount = await account.get();
        if (!currentAccount) return;
        
        const userDocs = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal('userId', currentAccount.$id)]
        );

        if (userDocs.documents.length > 0) {
          setUser(userDocs.documents[0]);
        }
      } catch(error) {
        console.log(error);
      }
    };
    
    fetchCurrentUser();
  }, []);

  const getAuthorId = () => {
    if (post.userId) return post.userId;
    
    if (post.$permissions) {
      const permission = post.$permissions.find(p => p.includes('user:'));
      if (permission) {
        const match = permission.match(/user:([a-zA-Z0-9]+)/);
        if (match && match[1]) return match[1];
      }
    }
    
    return null;
  };

  const authorId = getAuthorId();

  useEffect(() => {
    const fetchAuthorInfo = async () => {
      if (!authorId) {
        setLoadingAuthor(false);
        return;
      }

      try {
        setLoadingAuthor(true);
        
        const userDocs = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal('userId', authorId)]
        );

        if (userDocs.documents.length === 0) {
          throw new Error('Author not found');
        }

        const authorDoc = userDocs.documents[0];
        let avatarUrl = null;
        
        if (authorDoc.imageId) {
          try {
            avatarUrl = storage.getFileView(
              appwriteConfig.storageId,
              authorDoc.imageId
            ).toString();
          } catch (error) {
            console.error('Failed to load author avatar:', error);
          }
        }

        setAuthorInfo({
          name: authorDoc.name || 'Unknown',
          avatarUrl
        });
      } catch (error) {
        console.error('Failed to fetch author info:', error);
        setAuthorInfo({
          name: 'Unknown',
          avatarUrl: null
        });
      } finally {
        setLoadingAuthor(false);
      }
    };

    fetchAuthorInfo();
  }, [authorId]);

  useEffect(() => {
    const fetchImageUrls = async () => {
      try {
        setLoadingImages(true);
        setImageError('');
        
        if (!post.images || !Array.isArray(post.images)) {
          throw new Error('No images array found');
        }

        const validImageIds = post.images.filter(id => id && typeof id === 'string');
        
        if (validImageIds.length === 0) {
          throw new Error('No valid image IDs');
        }

        const urls = await Promise.all(
          validImageIds.map((imageId: string) => 
            storage.getFileView(
              appwriteConfig.storageId,
              imageId
            )
          )
        );

        setImageUrls(urls);
      } catch (error) {
        setImageError('Failed to load images');
      } finally {
        setLoadingImages(false);
      }
    };

    fetchImageUrls();
  }, [post.images]);

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev + 1) % imageUrls.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement;
    target.src = '/default-post.jpg';
  }

  const openImageModal = (index: number) => {
    setCurrentImageIndex(index);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleModalPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  const handleModalNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex(prev => (prev + 1) % imageUrls.length);
  };

  const handleDeletePost = async () => {
    try {
      const confirmed = window.confirm('Вы уверены, что хотите удалить этот пост? Это действие нельзя отменить.');
      
      if (!confirmed) return;
  
      if (post.images && Array.isArray(post.images)) {
        await Promise.all(
          post.images.map(imageId => 
            storage.deleteFile(appwriteConfig.storageId, imageId)
              .catch(error => console.error(`Error deleting image ${imageId}:`, error))
          )
        );
      }
  
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.postsCollectionId,
        post.$id
      );
  
      window.location.reload();
  
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Не удалось удалить пост. Пожалуйста, попробуйте снова.');
    }
  };

  return (
    <>
    <article className="bg-dark-4 rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 w-full mb-16">
      
      <div className="relative aspect-[4/3] bg-dark-4 cursor-pointer" onClick={() => openImageModal(currentImageIndex)}>
        {loadingImages ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            Loading images...
          </div>
        ) : imageError ? (
          <div className="absolute inset-0 flex items-center justify-center text-red-500">
            {imageError}
          </div>
        ) : imageUrls.length > 0 ? (
          <>
            <img
              src={imageUrls[currentImageIndex]}
              alt={post.title || 'Post image'}
              className="w-full h-full object-cover"
              onError={handleImageError}
              loading="lazy"
            />
            
            {imageUrls.length > 1 && (
  <>
    <button 
      onClick={handlePrevImage}
      className="absolute left-2 top-1/2 -translate-y-1/2 bg-dark-4/80 text-primary-500 rounded-full w-10 h-10 flex items-center justify-center hover:bg-dark-3/90 transition-colors backdrop-blur-sm"
      aria-label="Previous image"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 18L9 12L15 6" stroke="#877EFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
    <button 
      onClick={handleNextImage}
      className="absolute right-2 top-1/2 -translate-y-1/2 bg-dark-4/80 text-primary-500 rounded-full w-10 h-10 flex items-center justify-center hover:bg-dark-3/90 transition-colors backdrop-blur-sm"
      aria-label="Next image"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 18L15 12L9 6" stroke="#877EFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
      {imageUrls.map((_, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.stopPropagation();
            setCurrentImageIndex(index);
          }}
          className={`w-2.5 h-2.5 rounded-full transition-all ${
            index === currentImageIndex ? 'bg-primary-500' : 'bg-light-1 hover:bg-light-3'
          }`}
          aria-label={`View image ${index + 1}`}
        />
      ))}
    </div>
  </>
)}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-500">
            No images available
          </div>
        )}
      </div>

      <div className="p-3 md:p-4">
        <div className="flex justify-between">
          <div>
        <Link to={`/posts/${post.$id}`} className="hover:underline">
          <h3 className="text-base md:text-lg font-semibold mb-2 line-clamp-2 text-light-1">
            {post.title || 'Untitled Post'}
          </h3>
        </Link>
        {post.hashtags?.length > 0 && (
          <ul className="flex flex-wrap gap-1 mb-2 md:mb-3">
            {post.hashtags.map((tag: string, index: number) => (
              <li key={index} className="text-xs md:text-sm text-primary-500 hover:text-primary-600">
                {tag.startsWith('#') ? tag : `#${tag}`}
              </li>
            ))}
          </ul>
        )}
        </div>
        {user?.userId === post.userId && (
          <div className="flex items-center gap-4">
          <Link to={`/edit-post/${post.$id}`} className="text-sm text-primary-500 hover:text-primary-600">
            <img src="/assets/icons/edit.svg" width={20} height={20} alt="" />
          </Link>
          <button onClick={handleDeletePost} className="text-sm text-primary-500 hover:text-primary-600">
            <img src="/assets/icons/delete.svg" width={20} height={20} alt="" />
          </button>
          </div>
        )}
        </div>

        <footer className="flex items-center justify-between mt-3 md:mt-4">
          <div className="flex items-center gap-2">
            {loadingAuthor ? (
              <div className="text-light-3 text-sm">Loading...</div>
            ) : authorInfo ? (
              <Link to={`/profile/${authorId}`} className="flex items-center gap-2 hover:underline">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-dark-4 flex items-center justify-center overflow-hidden">
                  {authorInfo.avatarUrl ? (
                    <img 
                      src={authorInfo.avatarUrl} 
                      alt={authorInfo.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-base md:text-lg font-medium text-light-3">
                      {authorInfo.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-sm md:text-base font-medium">{authorInfo.name}</span>
              </Link>
            ) : (
              <span className="text-sm text-light-3">Unknown author</span>
            )}
          </div>

          <time className="text-xs md:text-sm text-light-4">
            {post.$createdAt ? format(new Date(post.$createdAt), 'MMM d, yyyy') : '--'}
          </time>
        </footer>
        
        <div className="mt-2 md:mt-3">
          <PostStats post={post} userId={userId} />
        </div>
      </div>
    </article>

{isModalOpen && (
  <div 
    className="fixed inset-0 bg-dark-1/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    onClick={closeModal}
  >
    <div 
      className="relative max-w-full max-h-full"
      onClick={e => e.stopPropagation()}
    >
      <button 
        onClick={closeModal}
        className="absolute top-4 right-4 text-light-1 hover:text-primary-500 z-50"
        aria-label="Close modal"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <img
        src={imageUrls[currentImageIndex]}
        alt={post.title || 'Post image'}
        className="max-w-full max-h-[90vh] object-contain"
        onError={handleImageError}
      />

      {imageUrls.length > 1 && (
        <>
          <button
            onClick={handleModalPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-dark-4/80 text-primary-500 rounded-full w-12 h-12 flex items-center justify-center hover:bg-dark-3/90 transition-colors backdrop-blur-sm"
            aria-label="Previous image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="#877EFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={handleModalNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-dark-4/80 text-primary-500 rounded-full w-12 h-12 flex items-center justify-center hover:bg-dark-3/90 transition-colors backdrop-blur-sm"
            aria-label="Next image"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="#877EFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {imageUrls.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentImageIndex ? 'bg-primary-500' : 'bg-light-1/50 hover:bg-light-1'
                }`}
                aria-label={`View image ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  </div>
)}
</>
);
};

export default PostCard;