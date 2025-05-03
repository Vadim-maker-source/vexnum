import { Models } from 'appwrite';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Query } from 'appwrite';
import { account, appwriteConfig, databases } from '../../lib/config';
import PostCard from '../../components/PostCard';

const Saved = () => {
  const [savedPosts, setSavedPosts] = useState<Models.Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const removeInvalidSaves = async (saves: Models.Document[]) => {
    const invalidSaves: string[] = [];
    
    // Проверяем каждый save на валидность post.$id
    for (const save of saves) {
      try {
        // Пытаемся получить postId разными способами
        const postId = typeof save.post === 'object' 
          ? save.post?.$id 
          : save.post;
        
        // Если postId не существует или невалиден, добавляем в массив для удаления
        if (!postId || typeof postId !== 'string') {
          invalidSaves.push(save.$id);
          continue;
        }

        // Дополнительная проверка существования поста
        try {
          await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postsCollectionId,
            postId
          );
        } catch (err) {
          invalidSaves.push(save.$id);
        }
      } catch (err) {
        invalidSaves.push(save.$id);
      }
    }

    // Удаляем все невалидные сохранения
    if (invalidSaves.length > 0) {
      await Promise.all(
        invalidSaves.map(saveId => 
          databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionId,
            saveId
          ).catch(console.error) // Логируем ошибки удаления, но не прерываем процесс
        )
      );
    }

    return saves.filter(save => !invalidSaves.includes(save.$id));
  };

  useEffect(() => {
    const fetchSavedPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const accountData = await account.get();
        setCurrentUserId(accountData.$id);
    
        // Получаем все сохранения для текущего пользователя
        const saves = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.savesCollectionId,
          [
            Query.equal('user', accountData.$id),
            Query.orderDesc('$createdAt')
          ]
        );

        // Удаляем невалидные сохранения
        const validSaves = await removeInvalidSaves(saves.documents);
    
        if (validSaves.length === 0) {
          setSavedPosts([]);
          return;
        }
    
        // Создаем массив с ID постов и временем сохранения
        const postSaves = validSaves.map(save => ({
          postId: typeof save.post === 'object' ? save.post.$id : save.post,
          saveId: save.$id,
          savedAt: save.$createdAt
        }));
        
        // Получаем все нужные посты одним запросом
        const postsResponse = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.postsCollectionId,
          [Query.equal('$id', postSaves.map(ps => ps.postId))]
        );

        // Сортируем посты по времени сохранения (от новых к старым)
        const sortedPosts = postsResponse.documents
          .map(post => {
            const saveInfo = postSaves.find(ps => ps.postId === post.$id);
            return {
              ...post,
              savedAt: saveInfo?.savedAt || ''
            };
          })
          .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    
        setSavedPosts(sortedPosts);
      } catch (err) {
        console.error('Error fetching saved posts:', err);
        setError('Failed to load saved posts');
      } finally {
        setLoading(false);
      }
    };

    fetchSavedPosts();
  }, []);

  // const handlePostDelete = async (postId: string) => {
  //   try {
  //     // Удаляем сохранение для этого поста
  //     const saves = await databases.listDocuments(
  //       appwriteConfig.databaseId,
  //       appwriteConfig.savesCollectionId,
  //       [
  //         Query.equal('user', String(currentUserId)),
  //         Query.equal('post', postId)
  //       ]
  //     );

  //     if (saves.documents.length > 0) {
  //       await Promise.all(
  //         saves.documents.map(save => 
  //           databases.deleteDocument(
  //             appwriteConfig.databaseId,
  //             appwriteConfig.savesCollectionId,
  //             save.$id
  //           )
  //         )
  //       );
  //     }

  //     // Обновляем список сохраненных постов
  //     setSavedPosts(prev => prev.filter(post => post.$id !== postId));
  //   } catch (err) {
  //     console.error('Error removing saved post:', err);
  //   }
  // };

  if (loading) {
    return (
      <div className="flex-center h-full">
        <div className="loader" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-center h-full">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!currentUserId) {
    return (
      <div className="flex-center flex-col gap-4 h-full">
        <h2 className="h2-bold">Saved Posts</h2>
        <p>Please log in to view your saved posts</p>
        <Link to="/sign-in" className="text-primary-500">
          Sign In
        </Link>
      </div>
    );
  }

  if (savedPosts.length === 0) {
    return (
      <div className="flex-center flex-col gap-4 h-full">
        <h2 className="h2-bold">Saved Posts</h2>
        <p>You haven't saved any posts yet</p>
      </div>
    );
  }

  return (
    <div className="saved-container">
      <div className="flex gap-2 w-full max-w-5xl">
        <h2 className="h2-bold md:h3-bold text-left w-full">Saved Posts</h2>
      </div>

      <ul className="w-full flex flex-col gap-9 max-w-5xl">
        {savedPosts.map((post: Models.Document) => (
          <li key={post.$id} className="flex justify-center w-full">
            <PostCard 
              post={post} 
              userId={currentUserId}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Saved;