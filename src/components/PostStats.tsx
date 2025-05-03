import { ID, Models, Query } from "appwrite";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { appwriteConfig, databases } from "../lib/config";

type PostStatsProps = {
    post: Models.Document;
    userId: string | null;
}

const PostStats = ({ post, userId }: PostStatsProps) => {
    // Инициализация likes с обработкой разных форматов
    const [likes, setLikes] = useState<string[]>(() => {
        try {
            if (Array.isArray(post?.likes)) {
                return post.likes.filter(id => typeof id === 'string');
            }
            if (typeof post?.likes === 'string') {
                const parsed = JSON.parse(post.likes);
                return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
            }
            return [];
        } catch {
            return [];
        }
    });

    const [isSaved, setIsSaved] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasLiked = userId ? likes.includes(userId) : false;

    useEffect(() => {
        const checkSavedStatus = async () => {
            if (!userId || !post?.$id) return;

            try {
                const response = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.savesCollectionId,
                    [
                        Query.equal('user', userId),
                        Query.equal('post', post.$id),
                        Query.limit(1)
                    ]
                );
                setIsSaved(response.total > 0);
            } catch (error) {
                console.error("Error checking save status:", error);
            }
        };

        checkSavedStatus();
    }, [userId, post?.$id]);

    const handleLikePost = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!userId) {
            setError("Please log in to like posts");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);
            
            // Создаем новый массив лайков
            const newLikes = hasLiked
                ? likes.filter(id => id !== userId)
                : [...likes, userId];

            // Преобразуем массив в JSON строку перед отправкой
            const likesString = JSON.stringify(newLikes);

            // Обновляем документ
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.postsCollectionId,
                post.$id,
                { 
                    likes: likesString // Отправляем как JSON строку
                }
            );

            setLikes(newLikes);
        } catch (error: any) {
            console.error("Like error:", {
                message: error.message,
                code: error.code,
                response: error.response
            });
            setError("Failed to update like");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSavePost = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        if (!userId) {
            setError("Please log in to save posts");
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            if (isSaved) {
                // Удаляем сохранение
                const saves = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.savesCollectionId,
                    [
                        Query.equal('user', userId),
                        Query.equal('post', post.$id),
                        Query.limit(1)
                    ]
                );

                if (saves.documents.length > 0) {
                    await databases.deleteDocument(
                        appwriteConfig.databaseId,
                        appwriteConfig.savesCollectionId,
                        saves.documents[0].$id
                    );
                }
            } else {
                // Добавляем сохранение
                await databases.createDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.savesCollectionId,
                    ID.unique(),
                    {
                        user: userId,
                        post: post.$id
                    }
                );
            }

            setIsSaved(!isSaved);
        } catch (error: any) {
            console.error("Save error:", error);
            setError("Failed to update save");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex justify-between items-center z-20">
            <div className="flex gap-2 mr-5">
                <button 
                    onClick={handleLikePost}
                    disabled={isLoading || !userId}
                    className={`focus:outline-none ${!userId ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
                    title={!userId ? "Login to like" : ""}
                >
                    <img
                        src={hasLiked 
                            ? "/assets/icons/liked.svg"
                            : "/assets/icons/like.svg"}
                        alt="Like"
                        width={20}
                        height={20}
                        className="cursor-pointer"
                    />
                </button>
                <p className="small-medium lg:base-medium">{likes.length}</p>
                
                <Link 
                    to={`/comments/${post.$id}`} 
                    className="ml-16 hover:opacity-80 transition-opacity"
                >
                    <img 
                        src="/assets/icons/comm.png" 
                        width={25} 
                        height={25} 
                        alt="Comments" 
                    />
                </Link>
            </div>

            <div className="flex gap-2">
                <button 
                    onClick={handleSavePost}
                    disabled={isLoading || !userId}
                    className={`focus:outline-none ${!userId ? "opacity-50 cursor-not-allowed" : "hover:opacity-80"}`}
                    title={!userId ? "Login to save" : ""}
                >
                    <img
                        src={isSaved 
                            ? "/assets/icons/saved.svg"
                            : "/assets/icons/save.svg"}
                        alt="Save"
                        width={20}
                        height={20}
                        className="cursor-pointer"
                    />
                </button>
            </div>

            {error && (
                <div className="absolute bottom-0 right-0 bg-red-100 text-red-600 px-3 py-1 rounded text-sm">
                    {error}
                </div>
            )}
        </div>
    );
};

export default PostStats;