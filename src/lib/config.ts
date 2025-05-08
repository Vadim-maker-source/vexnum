import { Account, Client, Databases, Storage } from "appwrite";

export const appwriteConfig = {
    projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID,
    url: import.meta.env.VITE_APPWRITE_URL,
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    userCollectionId: import.meta.env.VITE_APPWRITE_USERS_COLLECTION_ID,
    postsCollectionId: import.meta.env.VITE_APPWRITE_LESSONS_COLLECTION_ID,
    storageId: import.meta.env.VITE_APPWRITE_STORAGE_ID,
    savesCollectionId: import.meta.env.VITE_APPWRITE_SAVES_COLLECTION_ID,
    commentsCollectionId: import.meta.env.VITE_APPWRITE_COMMENTS_COLLECTION_ID,
    subscribersCollectionId: import.meta.env.VITE_APPWRITE_SUBSCRIBERS_COLLECTION_ID,
    chatsCollectionId: import.meta.env.VITE_APPWRITE_CHATS_COLLECTION_ID,
    messagesCollectionId: import.meta.env.VITE_APPWRITE_MESSAGES_COLLECTION_ID,
    storiesCollectionId: import.meta.env.VITE_APPWRITE_STORIES_COLLECTION_ID
}

export const client = new Client();

client.setProject(appwriteConfig.projectId);
client.setEndpoint(appwriteConfig.url);

export const storage = new Storage(client);
export const account = new Account(client);
export const databases = new Databases(client);