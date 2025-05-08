import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { client, databases, storage } from '../../lib/config';
import { appwriteConfig } from '../../lib/config';
import { Query, ID, Models } from 'appwrite';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useUserContext } from '../../context/AuthContext';

interface AppwriteDocument extends Models.Document {
  [key: string]: any;
}

interface Message extends AppwriteDocument {
  senderId: string;
  receiverId: string;
  content?: string;
  imageId?: string[];
  chatId?: string;
}

interface User extends AppwriteDocument {
  name: string;
  email: string;
  imageId?: string;
  userId?: string;
}

interface ImagePreview {
  id: string;
  file: File;
  previewUrl: string;
}

const MAX_IMAGES = 4;

const Chat = () => {
  const { userId: receiverId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [recipient, setRecipient] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const { user } = useUserContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Получаем данные получателя
  useEffect(() => {
    const fetchRecipient = async () => {
      if (!receiverId) return;

      try {
        const response = await databases.getDocument<User>(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          receiverId
        );
        setRecipient(response);
      } catch (error) {
        console.error('Error fetching recipient:', error);
        navigate('/people');
      }
    };

    fetchRecipient();
  }, [receiverId, navigate]);

  // Получаем сообщения
  useEffect(() => {
    const fetchMessages = async () => {
      if (!user?.userId || !receiverId) return;

      try {
        // Находим chatId для диалога
        const chatResponse = await databases.listDocuments<AppwriteDocument>(
          appwriteConfig.databaseId,
          appwriteConfig.chatsCollectionId,
          [
            Query.contains('participants', user.userId),
            Query.contains('participants', receiverId)
          ]
        );

        if (chatResponse.documents.length === 0) {
          setMessages([]);
          return;
        }

        const chatId = chatResponse.documents[0].$id;

        // Получаем сообщения для этого чата
        const messagesResponse = await databases.listDocuments<Message>(
          appwriteConfig.databaseId,
          appwriteConfig.messagesCollectionId,
          [
            Query.equal('chatId', chatId),
            Query.orderAsc('createdAt')
          ]
        );
        
        setMessages(messagesResponse.documents);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Подписка на новые сообщения
    const unsubscribe = client.subscribe(
      `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesCollectionId}.documents`,
      (response: { events: string[], payload: Message }) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          setMessages(prev => [...prev, response.payload]);
        }
      }
    );

    return () => unsubscribe();
  }, [user, receiverId]);

  // Прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Очищаем объекты URL при размонтировании
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => URL.revokeObjectURL(preview.previewUrl));
    };
  }, [imagePreviews]);

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && imagePreviews.length === 0) || !user?.userId || !receiverId) return;

    try {
      // Находим или создаем чат
      const chatResponse = await databases.listDocuments<AppwriteDocument>(
        appwriteConfig.databaseId,
        appwriteConfig.chatsCollectionId,
        [
          Query.contains('participants', user.userId),
          Query.contains('participants', receiverId)
        ]
      );

      let chatId: string;
      if (chatResponse.documents.length > 0) {
        chatId = chatResponse.documents[0].$id;
      } else {
        const newChat = await databases.createDocument<AppwriteDocument>(
          appwriteConfig.databaseId,
          appwriteConfig.chatsCollectionId,
          ID.unique(),
          {
            participants: [user.userId, receiverId],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        );
        chatId = newChat.$id;
      }

      // Загружаем изображения
      const uploadedImageIds: string[] = [];
      for (const preview of imagePreviews) {
        const fileUpload = await storage.createFile(
          appwriteConfig.storageId,
          ID.unique(),
          preview.file
        );
        uploadedImageIds.push(fileUpload.$id);
      }

      // Отправляем сообщение
      await databases.createDocument<Message>(
        appwriteConfig.databaseId,
        appwriteConfig.messagesCollectionId,
        ID.unique(),
        {
          senderId: user.userId,
          receiverId,
          chatId,
          content: newMessage,
          imageId: uploadedImageIds.length > 0 ? uploadedImageIds : undefined,
          createdAt: new Date().toISOString()
        }
      );

      setNewMessage('');
      setImagePreviews([]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).slice(0, MAX_IMAGES - imagePreviews.length);
      
      const newPreviews = files.map(file => ({
        id: ID.unique(),
        file,
        previewUrl: URL.createObjectURL(file)
      }));

      setImagePreviews(prev => [...prev, ...newPreviews]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImagePreview = (id: string) => {
    setImagePreviews(prev => prev.filter(img => img.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-dark-2 text-light-1">
      {/* Шапка чата */}
      <div className="flex items-center p-4 border-b border-dark-4 bg-dark-3">
        <button 
          onClick={() => navigate('/people')}
          className="mr-4 text-light-3 hover:text-light-1"
        >
          ←
        </button>
        <Link to={`/profile/${recipient?.$id}`}>
        {recipient?.imageId && (
          <img
            src={storage.getFileView(appwriteConfig.storageId, recipient.imageId)}
            alt={recipient.name}
            className="w-10 h-10 rounded-full mr-3 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/default-avatar.png';
            }}
          />
        )}
        <div>
          <h2 className="font-semibold">{recipient?.name}</h2>
          <p className="text-xs text-light-3">Online</p>
        </div>
        </Link>
      </div>

      {/* Сообщения */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 [scrollbar-width:none]">
        {messages.map((message) => (
          <div
            key={message.$id}
            className={`flex ${message.senderId === user?.userId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`break-words max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.senderId === user?.userId ? 'bg-primary-600' : 'bg-dark-4'}`}
            >
              {message.imageId && message.imageId.length > 0 && (
                <div className={`mb-2 ${getImageContainerClass(message.imageId.length)}`}>
                  {message.imageId.map((imgId, index) => (
                    <img
                      key={index}
                      src={storage.getFileView(appwriteConfig.storageId, imgId)}
                      alt={`Message content ${index + 1}`}
                      className={`${getImageClass(String(message.imageId).length)} object-cover rounded`}
                    />
                  ))}
                </div>
              )}
              {message.content && <p>{message.content}</p>}
              <p className={`text-xs mt-1 ${message.senderId === user?.userId ? 'text-light-2' : 'text-light-3'}`}>
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Превью изображений */}
      {imagePreviews.length > 0 && (
        <div className="flex gap-2 p-2 bg-dark-3 border-t border-dark-4 overflow-x-auto">
          {imagePreviews.map((preview) => (
            <div key={preview.id} className="relative shrink-0">
              <img
                src={preview.previewUrl}
                alt="Preview"
                className="h-20 w-20 object-cover rounded-lg"
              />
              <button
                onClick={() => removeImagePreview(preview.id)}
                className="absolute -top-2 -right-2 bg-red-500 rounded-full w-5 h-5 flex items-center justify-center text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Ввод сообщения */}
      <div className="border-t border-dark-4 bg-dark-3">
        {showEmojiPicker && (
          <div className="px-4 pt-2">
            <EmojiPicker 
              onEmojiClick={handleEmojiClick} 
              width="100%"
              height={350}
            />
          </div>
        )}
        <div className="flex items-center p-3">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-light-3 hover:text-light-1"
          >
            <img src="/assets/icons/emoji.svg" width={27} height={27} alt="Emoji" />
          </button>
          <input
            type="file"
            id="image-upload"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            ref={fileInputRef}
            multiple
          />
          <label
            htmlFor="image-upload"
            className={`p-2 text-light-3 hover:text-light-1 cursor-pointer ${imagePreviews.length >= MAX_IMAGES ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={imagePreviews.length >= MAX_IMAGES ? `Максимум ${MAX_IMAGES} изображения` : ''}
          >
            <img src="/assets/icons/add-post.svg" width={24} height={24} alt="Attach" />
          </label>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-dark-2 border border-dark-4 rounded-full px-4 py-2 text-light-1 focus:outline-none focus:border-primary-500 mx-2"
            onKeyPress={handleKeyPress}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() && imagePreviews.length === 0}
            className="bg-primary-600 hover:bg-primary-500 text-light-1 px-4 py-2 rounded-full disabled:opacity-50 min-w-[80px]"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );

  function getImageContainerClass(imageCount: number): string {
    switch(imageCount) {
      case 1: return '';
      case 2: return 'grid grid-cols-2 gap-1';
      case 3: return 'grid grid-cols-2 gap-1';
      case 4: return 'grid grid-cols-2 gap-1';
      default: return 'grid grid-cols-2 gap-1';
    }
  }

  // Функция для определения класса изображения
  function getImageClass(imageCount: number): string {
    switch(imageCount) {
      case 1: return 'w-full h-64';
      case 2: return 'w-full h-32';
      case 3: 
        return 'w-full h-32';
      case 4: 
        return 'w-full h-32';
      default: 
        return 'w-full h-32';
    }
  }
};

export default Chat;