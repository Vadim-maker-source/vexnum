import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getPostById, getCommentsByPostId, getCurrentUser } from '../../lib/api';
import { ID, Models } from 'appwrite';
import { appwriteConfig, databases, storage } from '../../lib/config';

const Comments = () => {
    const { postId } = useParams();
    const [post, setPost] = useState<Models.Document | null>(null);
    const [comments, setComments] = useState<Models.Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<{ $id: string; name?: string } | null>(null);
    const [commentText, setCommentText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                if (!postId) return;
                
                const [postData, commentsData, currentUser] = await Promise.all([
                    getPostById(postId),
                    getCommentsByPostId(postId),
                    getCurrentUser().catch(() => null)
                ]);
                
                setPost(postData);
                setComments(commentsData);

                if (postData?.imageId) {
                    const url = storage.getFilePreview(
                        appwriteConfig.storageId,
                        postData.imageId
                    );
                    setImageUrl(url);
                }

                if (currentUser) {
                    setUser({
                        $id: String(currentUser.$id),
                        name: currentUser.name
                    });
                }
            } catch (err) {
                setError('Failed to fetch data');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [postId]);

    const handleAddComment = async () => {
        if (!commentText.trim() || !user || !postId || isSubmitting) return;
        
        setIsSubmitting(true);
        try {
            const commentData = {
                text: commentText,
                userId: user.$id,
                postId: postId,
                userName: user.name || `User-${user.$id.slice(0, 6)}`
            };
            
            await databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.commentsCollectionId,
                ID.unique(),
                commentData
            );

            const updatedComments = await getCommentsByPostId(postId);
            setComments(updatedComments);
            setCommentText('');
        } catch (error) {
            console.error('Error adding comment:', error);
            setError('Failed to add comment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getUserDisplay = (comment: Models.Document) => {
        try {
            if (comment.userName) return comment.userName;
            
            if (typeof comment.userId === 'string') {
                return `User-${comment.userId.slice(0, 6)}`;
            }
            
            if (comment.userId?.$id) {
                return `User-${comment.userId.$id.slice(0, 6)}`;
            }
            
            return 'Unknown user';
        } catch (e) {
            console.error('Error parsing user info:', e);
            return 'Unknown user';
        }
    };

    if (loading) return <div className="flex-center h-full">Loading...</div>;
    if (error) return <div className="flex-center h-full text-red-500">{error}</div>;
    if (!post) return <div className="flex-center h-full">Post not found</div>;

    return (
        <div className="comments-container p-5 max-w-4xl mx-auto text-light-1">
            <div className="post-header mb-6">
                {imageUrl && (
                    <img 
                        src={imageUrl} 
                        alt="Post" 
                        className="w-full h-auto max-h-96 object-contain rounded-lg mb-4"
                    />
                )}
                <h2 className="text-2xl font-bold">{post.title}</h2>
            </div>
            
            <div className="comments-section">
                <h3 className="text-xl font-semibold mb-4">
                    Comments ({comments.length})
                </h3>
                
                <div className="comments-list flex-col-reverse space-y-4 mb-6">
                    {comments.length > 0 ? (
                        comments.map(comment => (
                            <div key={comment.$id} className="comment bg-dark-2 border-primary-500 p-4 rounded-lg">
                                <p className="text-light-2">{comment.text}</p>
                                <small className="text-light-4">
                                    By: {getUserDisplay(comment)}
                                </small>
                            </div>
                        ))
                    ) : (
                        <p className="text-light-4">No comments yet</p>
                    )}
                </div>

                {user ? (
                    <div className="add-comment">
                        <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Write your comment..."
                            className="w-full p-3 border border-dark-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-dark-3 text-light-1"
                            rows={3}
                            disabled={isSubmitting}
                        />
                        <button
                            onClick={handleAddComment}
                            disabled={!commentText.trim() || isSubmitting}
                            className="mt-2 bg-primary-500 text-light-1 px-4 py-2 rounded-lg hover:bg-primary-600 disabled:bg-dark-4"
                        >
                            {isSubmitting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </div>
                ) : (
                    <div className="bg-dark-4 p-4 rounded-lg text-light-3">
                        <p>Please sign in to leave a comment</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Comments;