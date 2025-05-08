import { AppwriteException, ID, Models, Query } from "appwrite";
import { account, appwriteConfig, databases, storage } from "./config";
import { Post, User } from "./types";

export const registerUser = async (user: User) => {
    try {
        const newAccount = await account.create(
            ID.unique(),
            user.email,
            user.password,
            user.name
        );
      
        if (!newAccount) throw Error;

        const newUser = {
            userId: newAccount.$id,
            name: newAccount.name,
            email: newAccount.email,
            password: user.password
        };
    
        await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            newUser
        );
        
        return await account.createEmailPasswordSession(user.email, user.password);
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export const signIn = async (email: string, password: string) => {
    try {
        return await account.createEmailPasswordSession(email, password);
    } catch (error) {
        console.log(error);
        throw error;
    }
}

export async function getCurrentUser(): Promise<User | null> {
    try {
        const currentAccount = await account.get();
        if (!currentAccount) return null;
    
        // Ищем пользователя по userId (как в вашей базе)
        const userDocs = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal('userId', currentAccount.$id)]
        );

        if (userDocs.documents.length === 0) return null;
        
        const userDoc = userDocs.documents[0];
        
        return {
            $id: userDoc.$id,
            userId: userDoc.$id,
            name: userDoc.name,
            email: userDoc.email,
            bio: userDoc.bio || '',
            password: userDoc.password,
            imageId: userDoc.imageId
        };
    } catch (error) {
        console.log(error);
        return null;
    }
}

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
      console.log('Fetching user with ID:', userId);
      
      if (!userId) throw new Error('User ID is required');
      
      const userDocs = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal('userId', userId)]
      );

      if (userDocs.documents.length > 0) {
          const userData = userDocs.documents[0];
          return {
              $id: userData.$id,
              userId: userData.userId,
              name: userData.name,
              email: userData.email,
              bio: userData.bio || '',
              password: userData.password,
              imageId: userData.imageId
          };
      }

      // If not found by userId, try by document ID (backward compatibility)
      try {
          const userData = await databases.getDocument(
              appwriteConfig.databaseId,
              appwriteConfig.userCollectionId,
              userId
          );
          
          return {
              $id: userData.$id,
              userId: userData.userId || userData.$id,
              name: userData.name,
              email: userData.email,
              bio: userData.bio || '',
              password: userData.password,
              imageId: userData.imageId
          };
      } catch (e) {
          return null;
      }
  } catch (error) {
      console.error('Failed to get user:', error);
      return null;
  }
};

export const getPostById = async (postId: string): Promise<Models.Document> => {
    try {
        const post = await databases.getDocument(
            appwriteConfig.databaseId, // ID вашей базы данных
            appwriteConfig.postsCollectionId, // ID коллекции с постами
            postId
        );
        return post;
    } catch (error) {
        console.error('Error fetching post:', error);
        throw error;
    }
};

export const getCommentsByPostId = async (postId: string): Promise<Models.Document[]> => {
    try {
        const comments = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.commentsCollectionId,
            [Query.equal('postId', postId)]
        );
        return comments.documents;
    } catch (error) {
        console.error('Error fetching comments:', error);
        throw error;
    }
};

  export async function getUserPosts(userId: string): Promise<Post[]> {
    try {
      const response = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.postsCollectionId,
        [
          Query.equal('userId', userId),
          Query.orderDesc('$createdAt') // Optional: sort by creation date
        ]
      );
  
      return response.documents.map(doc => ({
        $id: doc.$id,
        userId: doc.userId,
        title: doc.title,
        images: doc.images,
        hashtags: doc.hashtags,
        createdAt: doc.$createdAt
      }));
    } catch (error) {
      console.error('Failed to get user posts:', error);
      throw error;
    }
  }

export const checkUserExists = async (userId: string): Promise<boolean> => {
    try {
      await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        userId
      );
      return true;
    } catch (error) {
      if (error instanceof AppwriteException && error.code === 404) {
        return false;
      }
      throw error;
    }
  };



  export const updateUser = async (userData: {
    userId: string;
    name: string;
    email: string;
    bio?: string;
    imageId?: string | null;
  }): Promise<Models.Document> => {
    try {
      // Сначала проверяем существование документа
      try {
        await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          userData.userId
        );
      } catch (error) {
        console.error('User document not found, cannot update');
        throw new Error('User document does not exist');
      }
  
      // Если документ существует, обновляем его
      return await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        userData.userId,
        {
          name: userData.name,
          email: userData.email,
          bio: userData.bio,
          imageId: userData.imageId,
        }
      );
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  };



export interface AuthorInfo {
  name: string;
  avatarUrl: string | null;
}

export interface PostWithAuthor extends Models.Document {
  author: AuthorInfo;
}

const authorsCache: Record<string, AuthorInfo> = {};

export const getAuthorInfo = async (userId: string): Promise<AuthorInfo> => {
  if (authorsCache[userId]) {
    return authorsCache[userId];
  }

  const defaultAuthor: AuthorInfo = {
    name: 'Unknown',
    avatarUrl: null
  };

  try {
    const userDocs = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal('userId', userId)]
    );

    if (userDocs.documents.length === 0) {
      return defaultAuthor;
    }

    const author = userDocs.documents[0];
    const authorInfo: AuthorInfo = {
      name: author.name || 'Unknown',
      avatarUrl: author.imageId 
        ? storage.getFileView(appwriteConfig.storageId, author.imageId).toString()
        : null
    };

    authorsCache[userId] = authorInfo;
    return authorInfo;
  } catch (error) {
    console.error('Failed to fetch author:', error);
    return defaultAuthor;
  }
};

export const getRecentPosts = async (): Promise<PostWithAuthor[]> => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postsCollectionId,
      [
        Query.orderDesc('$createdAt'),
        Query.limit(20)
      ]
    );

    const postsWithAuthors = await Promise.all(
      response.documents.map(async (post) => {
        const author = await getAuthorInfo(post.userId);
        return {
          ...post,
          author
        };
      })
    );

    return postsWithAuthors;
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};




export interface Subscription {
  $id: string;
  userId: string;
  authorId: string;
  createdAt: string;
}

export const subscribeToUser = async (authorId: string, userId: string): Promise<Subscription> => {
  try {
    const existing = await checkSubscriptionStatus(authorId, userId);
    if (existing) return existing;

    const subscription = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.subscribersCollectionId,
      ID.unique(),
      {
        userId,
        authorId,
        createdAt: new Date().toISOString()
      }
    );
    return subscription as unknown as Subscription;
  } catch (error) {
    console.error('Error subscribing:', error);
    throw error;
  }
};

export const unsubscribeFromUser = async (subscriptionId: string): Promise<void> => {
  try {
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.subscribersCollectionId,
      subscriptionId
    );
  } catch (error) {
    console.error('Error unsubscribing:', error);
    throw error;
  }
};

export const checkSubscriptionStatus = async (authorId: string, userId: string): Promise<Subscription | null> => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.subscribersCollectionId,
      [
        Query.equal('userId', userId),
        Query.equal('authorId', authorId)
      ]
    );
    return response.documents[0] as unknown as Subscription || null;
  } catch (error) {
    console.error('Error checking subscription:', error);
    throw error;
  }
};

export const getUserSubscribers = async (authorId: string): Promise<Subscription[]> => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.subscribersCollectionId,
      [
        Query.equal('authorId', authorId)
      ]
    );
    return response.documents as unknown as Subscription[];
  } catch (error) {
    console.error('Error getting subscribers:', error);
    throw error;
  }
};

export const getSubscriberCount = async (authorId: string): Promise<number> => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.subscribersCollectionId,
      [
        Query.equal('authorId', authorId),
        Query.limit(1)
      ]
    );
    return response.total;
  } catch (error) {
    console.error('Error getting subscriber count:', error);
    return 0;
  }
}

export const getSubscribedUsers = async (userId: string): Promise<User[]> => {
  try {
    const subscriptions = await getUserSubscriptions(userId);
    const users = await Promise.all(
      subscriptions.map(sub => getUserById(sub.authorId).catch(() => null)
    ))
    return users.filter((user): user is User => user !== null);
  } catch (error) {
    console.error('Error getting subscribed users:', error);
    throw error;
  }
};


export const getUserSubscriptions = async (userId: string): Promise<Subscription[]> => {
  try {
    const response = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.subscribersCollectionId,
      [
        Query.equal('userId', userId)
      ]
    );
    return response.documents as unknown as Subscription[];
  } catch (error) {
    console.error('Error getting subscribers:', error);
    throw error;
  }
};

interface Story {
  $id: string;
  authorId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  duration?: number;
  createdAt: string;
  viewed?: boolean;
}

export const getUserStories = async (userId: string): Promise<Story[]> => {
  const response = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.storiesCollectionId,
    [
      Query.equal('authorId', userId),
      Query.greaterThan('expiresAt', new Date().toISOString())
    ]
  );
  return response.documents as unknown as Story[];
};