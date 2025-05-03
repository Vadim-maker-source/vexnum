import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ID, Models, Query } from 'appwrite';
import { account, appwriteConfig, databases, storage } from '../../lib/config';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const EditProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [user, setUser] = useState<Models.Document | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    newPassword: '',
    bio: '',
    imageId: ''
  });

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const currentAccount = await account.get();
        const userDocs = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal('userId', currentAccount.$id)]
        );

        console.log(userDocs)

        if (userDocs.documents.length > 0) {
          const userData = userDocs.documents[0];
          setFormData({
            name: userData.name,
            email: currentAccount.email,
            password: String(userData.password),
            newPassword: '',
            bio: userData.bio || '',
            imageId: userData.imageId || ''
          });

          setUser(userData)

          if (userData.imageId) {
            const imageUrl = storage.getFilePreview(
              appwriteConfig.storageId,
              userData.imageId
            );
            setPreviewImage(imageUrl.toString());
          }
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  console.log(user?.password)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
  
    try {
      const passwordChanged = formData.newPassword.trim() !== '';
      const userDocId = user?.$id;
  
      // 1. Проверка текущего пароля (если меняем пароль)
      if (passwordChanged) {
        if (!formData.password) {
          throw new Error('Требуется текущий пароль для изменения');
        }
  
        try {
          // Создаем временную сессию для проверки пароля
          await account.createEmailPasswordSession(
            user?.email,
            formData.password
          );
          
          // Удаляем временную сессию после проверки
          const sessions = await account.listSessions();
          sessions.sessions.forEach(async (session) => {
            await account.deleteSession(session.$id);
          });
        } catch (err) {
          throw new Error('Неверный текущий пароль');
        }
        
        if(user?.password == formData.password){
        await account.updatePassword(
          formData.newPassword,
          formData.password
        );
        }
      }
  
      // 3. Обновляем имя в аккаунте
      if (formData.name !== user?.name) {
        await account.updateName(formData.name);
      }
  
      // 4. Обновляем изображение (если изменилось)
      let imageId = formData.imageId;
      if (imageFile) {
        // Удаляем старое изображение если оно было
        if (imageId) {
          try {
            await storage.deleteFile(appwriteConfig.storageId, imageId);
          } catch (err) {
            console.warn('Не удалось удалить старое изображение:', err);
          }
        }
        
        // Загружаем новое изображение
        const fileId = ID.unique();
        await storage.createFile(appwriteConfig.storageId, fileId, imageFile);
        imageId = fileId;
      }
  
      if(user?.password == formData.password){
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        user?.$id,
        {
          name: formData.name,
          bio: formData.bio,
          imageId: imageId,
          password: formData.newPassword
        }
      );
    }
  
      setSuccess('Профиль успешно обновлен!');
      setTimeout(() => navigate(`/profile/${userDocId}`), 2000);
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при обновлении профиля');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4 text-light-1">
      <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>
      
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
        <div className="flex flex-col items-center mb-6">
          <div className="relative w-32 h-32 rounded-full overflow-hidden mb-4 border-4 border-dark-3">
            {previewImage ? (
              <img 
                src={previewImage} 
                alt="Profile preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-dark-4 flex items-center justify-center">
                <span className="text-light-3">No image</span>
              </div>
            )}
          </div>
          <label className="cursor-pointer bg-primary-500 text-light-1 px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors">
            Change Photo
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-light-2">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-3 py-2 rounded-lg bg-dark-3 border border-dark-4 text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-light-3">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              readOnly
              className="w-full px-3 py-2 rounded-lg bg-dark-3 border border-dark-4 text-light-3 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-light-3">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg bg-dark-3 border border-dark-4 text-light-3 pr-10 cursor-not-allowed"
                disabled
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-light-3"
                onClick={() => setShowPassword(!showPassword)}
                disabled
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-light-3">New Password</label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                value={formData.newPassword}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded-lg bg-dark-3 border border-dark-4 text-light-3 pr-10 cursor-not-allowed"
                disabled
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-light-3"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-light-2">Bio</label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-dark-3 border border-dark-4 text-light-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-4 py-2 border border-dark-4 rounded-lg hover:bg-dark-3 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-primary-500 text-light-1 rounded-lg hover:bg-primary-600 transition-colors disabled:bg-dark-4"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditProfile;