import { useState, useEffect, useRef } from 'react';

interface StoriesModalProps {
  stories: {
    $id: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    duration?: number;
  }[];
  onClose: () => void;
  authorName: string;
  authorAvatar?: string;
  onStoryViewed: () => void;
  onNextUser?: () => boolean;
}

const StoriesModal = ({ 
  stories, 
  onClose, 
  authorName, 
  authorAvatar,
  onStoryViewed,
  onNextUser
}: StoriesModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const [isVideoReady, setIsVideoReady] = useState(false);
  
  const currentStory = stories[currentIndex];

  
  
  // Функция для получения реальной продолжительности (с ограничением в 1 минуту для видео)
  const getActualDuration = () => {
    if (!currentStory) return 5000; // Fallback duration if story is undefined
    if (currentStory.mediaType === 'image') return 5000; // 5 секунд для изображений
    
    const durationInMs = currentStory.duration ? currentStory.duration * 1000 : 10000;
    return Math.min(durationInMs, 60000); // Ограничиваем 1 минутой
  };
  
  const getProgressDuration = () => {
    if (!currentStory) return 5000; // Fallback duration if story is undefined
    if (currentStory.mediaType === 'image') return 5000;
    return currentStory.duration ? currentStory.duration * 1000 : 10000;
  };
  
  // Add this check at the beginning of the component
  if (!stories.length || !currentStory) {
    onClose();
    return null;
  }

  const actualDuration = getActualDuration();
  const progressDuration = getProgressDuration();

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, []);

  // Сброс состояния при изменении stories
  useEffect(() => {
    setCurrentIndex(0);
    setProgress(0);
    setIsPlaying(true);
    setIsVideoReady(false);
  }, [stories]);

  // Прогресс бар - теперь используем progressDuration для расчета скорости
  useEffect(() => {
    if (!isPlaying) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    const startTime = Date.now();
    progressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      // Используем actualDuration для определения, когда переходить к следующему сторису
      if (elapsed >= actualDuration) {
        setProgress(100);
        goToNext();
      } else {
        // Но для прогресс-бара используем полную длительность (progressDuration)
        const newProgress = (elapsed / progressDuration) * 100;
        setProgress(Math.min(newProgress, 100)); // Не даем прогрессу превысить 100%
      }
    }, 50);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [currentIndex, isPlaying, actualDuration, progressDuration]);

  // Управление видео
  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentStory.mediaType !== 'video') {
      setIsVideoReady(true);
      return;
    }

    let isCleanedUp = false;

    const handleCanPlay = () => {
      if (isCleanedUp || !isMountedRef.current) return;
      setIsVideoReady(true);
      if (isPlaying) {
        video.play().catch(() => {
          console.log('Play attempt failed, trying muted autoplay...');
          video.muted = true;
          video.play().catch(e => console.error('Muted play failed:', e));
        });
      }
    };

    const handleTimeUpdate = () => {
      if (!isCleanedUp && isMountedRef.current && video.duration) {
        // Если видео достигло ограничения по времени (1 минута), переходим к следующему сторису
        if (video.currentTime >= 60) {
          goToNext();
        }
      }
    };

    const handleEnded = () => {
      if (!isCleanedUp && isMountedRef.current) {
        goToNext();
      }
    };

    const handlePlay = () => {
      if (!isCleanedUp && isMountedRef.current) {
        setIsPlaying(true);
      }
    };

    const handlePause = () => {
      if (!isCleanedUp && isMountedRef.current) {
        setIsPlaying(false);
      }
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Настройка видео
    setIsVideoReady(false);
    video.muted = true;
    video.preload = "auto";
    video.load();

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS && isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.error('Autoplay prevented:', err);
        });
      }
    }

    return () => {
      isCleanedUp = true;
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.pause();
      video.currentTime = 0;
    };
  }, [currentIndex, currentStory.mediaType, currentStory.mediaUrl]);

  // Управление воспроизведением/паузой
  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentStory.mediaType !== 'video' || !isVideoReady) return;

    if (isPlaying) {
      video.play().catch(err => {
        console.error('Play failed:', err);
        setIsPlaying(false);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, isVideoReady, currentStory.mediaType]);

  const goToNext = () => {
    if (!stories.length || !currentStory) {
      onClose();
      return;
    }
  
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
      setIsPlaying(true);
      setIsVideoReady(false);
    } else {
      onStoryViewed();
      if (onNextUser) {
        const hasNextUser = onNextUser();
        if (!hasNextUser) {
          onClose();
        }
      } else {
        onClose();
      }
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
      setIsPlaying(true);
      setIsVideoReady(false);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;

    if (clickX < width / 3) {
      goToPrev();
    } else if (clickX > (width / 3) * 2) {
      goToNext();
    } else {
      setIsPlaying(prev => !prev);
    }
  };

  useEffect(() => {
    if (!stories.length || !currentStory) {
      onClose();
    }
  }, [stories, currentStory, onClose]);

  if (stories.length === 0) {
    onClose();
    return null;
  }

  useEffect(() => {
    if (!stories.length) {
      // Use setTimeout to defer the onClose call
      const timer = setTimeout(() => onClose(), 0);
      return () => clearTimeout(timer);
    }
  }, [stories, onClose]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Progress bars */}
      <div className="flex gap-1 p-2">
        {stories.map((_, index) => (
          <div key={index} className="h-1 flex-1 bg-dark-4 rounded-full">
            <div 
              className={`h-full rounded-full ${index < currentIndex ? 'bg-light-1' : index === currentIndex ? 'bg-light-1' : 'bg-dark-4'}`}
              style={{ width: index === currentIndex ? `${progress}%` : '0%' }}
            />
          </div>
        ))}
      </div>
      
      {/* Header */}
      <div className="flex items-center p-4">
        {authorAvatar ? (
          <img 
            src={authorAvatar} 
            alt={authorName}
            className="w-8 h-8 rounded-full mr-2"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-dark-4 flex items-center justify-center text-light-1 mr-2">
            {authorName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-light-1 font-medium">{authorName}</span>
        <button 
          onClick={onClose}
          className="ml-auto text-light-1"
        >
          ×
        </button>
      </div>
      
      {/* Content */}
      <div 
        className="flex-1 flex items-center justify-center relative"
        onClick={handleClick}
      >
        {currentStory.mediaType === 'image' ? (
          <img 
            src={currentStory.mediaUrl} 
            alt="Story" 
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="max-w-full max-h-full"
              playsInline
              muted
              loop={false}
            />
            {!isVideoReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
              </div>
            )}
            {isVideoReady && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div 
                  className="bg-black bg-opacity-50 rounded-full p-4 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPlaying(true);
                  }}
                >
                  <svg className="w-12 h-12 text-light-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StoriesModal;