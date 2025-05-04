import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { account, appwriteConfig, databases, storage } from '../../lib/config';
import { ID } from 'appwrite';

interface ImageInfo {
    id: string;
    url: string;
}

const EditPost = () => {
    const { postId } = useParams();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [post, setPost] = useState({
        title: '',
        existingImages: [] as ImageInfo[],
        newImages: [] as File[],
        hashtags: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                await account.get();

                if (!postId) throw new Error('Post ID is missing');
                
                const postDoc = await databases.getDocument(
                    appwriteConfig.databaseId,
                    appwriteConfig.postsCollectionId,
                    postId
                );

                // Получаем URL для каждого изображения
                const existingImages = await Promise.all(
                    (postDoc.images || []).map(async (imageId: string) => {
                        const url = storage.getFileView(
                            appwriteConfig.storageId,
                            imageId
                        );
                        return {
                            id: imageId,
                            url: url.toString() // Преобразуем URL в строку
                        };
                    })
                );

                setPost({
                    title: postDoc.title,
                    existingImages,
                    newImages: [],
                    hashtags: postDoc.hashtags?.join(', ') || '',
                });
            } catch (error) {
                console.error('Initial load error:', error);
                setError('Failed to load post data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [postId]);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files).slice(0, 10 - post.existingImages.length);
            setPost(prev => ({ ...prev, newImages: [...prev.newImages, ...files].slice(0, 10 - prev.existingImages.length) }));
        }
    };

    const removeExistingImage = async (imageId: string) => {
        try {
            setIsLoading(true);
            await storage.deleteFile(appwriteConfig.storageId, imageId);
            
            await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.postsCollectionId,
                postId!,
                {
                    images: post.existingImages.filter(img => img.id !== imageId).map(img => img.id)
                }
            );
    
            setPost(prev => ({
                ...prev,
                existingImages: prev.existingImages.filter(img => img.id !== imageId)
            }));
            setSuccess('Image removed successfully');
        } catch (error) {
            setError('Failed to remove image');
        } finally {
            setIsLoading(false);
        }
    };

    const removeNewImage = (index: number) => {
        const newImages = [...post.newImages];
        newImages.splice(index, 1);
        setPost(prev => ({ ...prev, newImages }));
    };

    const uploadImages = async (files: File[]): Promise<string[]> => {
        const imageIds = [];
        for (const file of files) {
            const response = await storage.createFile(
                appwriteConfig.storageId,
                ID.unique(),
                file
            );
            imageIds.push(response.$id);
        }
        return imageIds;
    };

    const updatePost = async (postData: {
        title: string;
        imageIds: string[];
        hashtags: string[];
    }) => {
        return await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postsCollectionId,
            postId!,
            {
                title: postData.title,
                images: postData.imageIds,
                hashtags: postData.hashtags,
            }
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setSuccess('');
    
        try {
            if (!post.title.trim()) {
                throw new Error('Title is required');
            }
            if (post.existingImages.length + post.newImages.length === 0) {
                throw new Error('At least one image is required');
            }
    
            const hashtags = post.hashtags
                .split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.startsWith('#') ? tag : `#${tag}`)
                .filter(tag => tag.length > 1);
    
            const newImageIds = await uploadImages(post.newImages);
            const allImageIds = [...post.existingImages.map(img => img.id), ...newImageIds];
    
            await updatePost({
                title: post.title,
                imageIds: allImageIds,
                hashtags,
            });
    
            setSuccess('Post updated successfully!');
            setTimeout(() => navigate('/'), 2000);
        } catch (error) {
            console.error('Error updating post:', error);
            setError(error instanceof Error ? error.message : 'Failed to update post');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 text-light-1">
            <h1 className="text-2xl font-bold mb-6">Редактировать публикацию</h1>
            
            {error && (
                <div className="bg-red text-light-1 px-4 py-3 rounded-lg mb-4">
                    {error}
                </div>
            )}
            
            {success && (
                <div className="bg-green-500 text-light-1 px-4 py-3 rounded-lg mb-4">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-light-2">Название</label>
                    <input
                        type="text"
                        value={post.title}
                        onChange={(e) => setPost({ ...post, title: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-dark-3 border border-dark-4 text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-light-2">Картинки (до 10)</label>
                    
                    {post.existingImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {post.existingImages.map((image, index) => (
                        <div key={`existing-${image.id}`} className="relative rounded-lg overflow-hidden bg-dark-4">
                            <img
                                src={image.url}
                                alt={`Post ${index}`}
                                className="w-full h-24 object-cover"
                                loading="lazy"
                            />
                            <button
                                type="button"
                                onClick={() => removeExistingImage(image.id)}
                                className="absolute top-1 right-1 bg-red text-light-1 w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                disabled={isLoading}
                            >
                                ×
                            </button>
                            <span className="absolute bottom-1 left-1 bg-dark-3 text-light-1 text-xs px-2 py-1 rounded">
                                {index + 1}
                            </span>
                        </div>
                    ))}
                </div>
            )}
                    
                    <div className="border border-dark-4 rounded-lg bg-dark-3 p-4">
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-dark-4 rounded-lg p-6 cursor-pointer hover:bg-dark-4 transition-colors">
                            <span className="bg-primary-500 text-light-1 px-4 py-2 rounded-lg mb-2 hover:bg-primary-600 transition-colors">
                                Добавьте больше
                            </span>
                            <span className="text-light-3 text-sm">
                                {post.newImages.length > 0 
                                    ? `${post.newImages.length} new file(s) selected` 
                                    : 'No new files selected'}
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                className="hidden"
                                disabled={post.existingImages.length + post.newImages.length >= 10}
                            />
                        </label>
                        <div className="text-light-3 text-sm mt-2">
                            Ещё {10 - post.existingImages.length - post.newImages.length} можно добавить
                        </div>
                    </div>
                    
                    {post.newImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {post.newImages.map((image, index) => (
                                <div key={`new-${index}`} className="relative rounded-lg overflow-hidden bg-dark-4">
                                    <img
                                        src={URL.createObjectURL(image)}
                                        alt={`New ${index}`}
                                        className="w-full h-24 object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeNewImage(index)}
                                        className="absolute top-1 right-1 bg-red text-light-1 w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                                    >
                                        ×
                                    </button>
                                    <span className="absolute bottom-1 left-1 bg-dark-3 text-light-1 text-xs px-2 py-1 rounded">
                                        {post.existingImages.length + index + 1}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-light-2">Хештеги (comma separated)</label>
                    <input
                        type="text"
                        value={post.hashtags}
                        onChange={(e) => setPost({ ...post, hashtags: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-dark-3 border border-dark-4 text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="#travel, #nature, #photography"
                    />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="px-4 py-2 border border-dark-4 rounded-lg hover:bg-dark-3 transition-colors"
                        disabled={isLoading}
                    >
                        Отменить
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-primary-500 text-light-1 rounded-lg hover:bg-primary-600 transition-colors disabled:bg-dark-4"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Обновляется...
                            </span>
                        ) : (
                            'Обновить публикацию'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditPost;