import { useEffect, useState, useMemo } from 'react';
import { appwriteConfig, databases, storage } from '../../lib/config';
import { getCurrentUser } from '../../lib/api';
import { User } from '../../lib/types';
import { useNavigate } from 'react-router-dom';

const People = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            setLoading(true);
            try {
                const user = await getCurrentUser();
                if (user) {
                    setCurrentUser(user as unknown as User);
                    if (user.imageId) {
                        try {
                            const url = storage.getFileView(
                                appwriteConfig.storageId,
                                user.imageId
                            ).toString();
                            setProfileImageUrl(url);
                        } catch (error) {
                            console.log(error);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to fetch user:", error);
                setCurrentUser(null);
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    if(profileImageUrl){
        console.log("Image:", profileImageUrl)
    }

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await databases.listDocuments(
                    appwriteConfig.databaseId,
                    appwriteConfig.userCollectionId
                );
                setUsers(response.documents.filter(doc => doc.userId !== currentUser?.userId) as unknown as User[]);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        if (currentUser) {
            fetchUsers();
        }
    }, [currentUser]);

    // Фильтрация пользователей по поисковому запросу
    const filteredUsers = useMemo(() => {
        return users.filter(user => 
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    // const handleUserClick = async (user: User) => {
    //     if (!currentUser) return;
    
    //     try {
    //         const response = await databases.listDocuments(
    //             appwriteConfig.databaseId,
    //             appwriteConfig.chatsCollectionId,
    //             [
    //                 Query.contains('participants', currentUser.userId),
    //                 Query.contains('participants', user.userId)
    //             ]
    //         );
    
    //         let chatId: Chat;
            
    //         if (response.documents.length > 0) {
    //             chatId = {
    //                 chatId: response.documents[0].$id,
    //                 $id: response.documents[0].$id,
    //                 participants: response.documents[0].participants,
    //                 createdAt: response.documents[0].createdAt,
    //                 updatedAt: response.documents[0].updatedAt
    //             };
    //         } else {
    //             const newChat = await databases.createDocument(
    //                 appwriteConfig.databaseId,
    //                 appwriteConfig.chatsCollectionId,
    //                 ID.unique(),
    //                 {
    //                     participants: [currentUser.userId, user.userId],
    //                     createdAt: new Date().toISOString(),
    //                     updatedAt: new Date().toISOString()
    //                 }
    //             );
    //             chatId = {
    //                 chatId: newChat.$id,
    //                 $id: newChat.$id,
    //                 participants: newChat.participants,
    //                 createdAt: newChat.createdAt,
    //                 updatedAt: newChat.updatedAt
    //             };
    //         }
    //         navigate(`/chat/${chatId.$id}`)
    //         setCurrentChat(chatId);
    //     } catch (error) {
    //         console.error('Error creating/fetching chat:', error);
    //     }
    // };

    if (loading) return <div className="p-4 text-light-1">Loading...</div>;

    return (
        <div className="p-4 bg-dark-2 text-light-1 h-full">
            <h1 className="text-2xl font-bold mb-4">People</h1>
            
            {/* Поле поиска */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-dark-3 border border-dark-4 rounded-full px-4 py-2 text-light-1 focus:outline-none focus:border-primary-500"
                />
            </div>

            {/* Список пользователей */}
            <div className="space-y-3">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map(user => (
                        <div
                            key={user.$id}
                            onClick={() => navigate(`/chat/${user.$id}`)}
                            className="flex items-center p-3 hover:bg-dark-3 rounded-lg cursor-pointer transition"
                        >
                            {user.imageId ? (
                                <img
                                    src={storage.getFileView(appwriteConfig.storageId, user.imageId)}
                                    alt={user.name}
                                    className="w-10 h-10 rounded-full mr-3 object-cover"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/default-avatar.png';
                                    }}
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full mr-3 bg-dark-4 flex items-center justify-center">
                                    <span className="text-lg">
                                        {user.name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            )}
                            <div>
                                <h3 className="font-medium">{user.name}</h3>
                                <p className="text-sm text-light-3">{user.email}</p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-6 text-light-3">
                        {searchTerm ? 'No users found' : 'No users available'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default People;