import { useState, useEffect } from 'react';
import { account } from '../../lib/config';
import { Link, useNavigate } from 'react-router-dom';
import { getRecentPosts, PostWithAuthor } from '../../lib/api';
import PostCard from '../../components/PostCard';

interface User {
  $id: string;
  name: string;
  email: string;
}

const Home = () => {
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<PostWithAuthor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'title' | 'author' | 'hashtags'>('title');

  // Получение текущего пользователя
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser as User);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        navigate("/sign-in");
      }
    };

    fetchUser();
  }, [navigate]);

  // Загрузка постов с использованием вынесенной в api.ts функции
  useEffect(() => {
    const loadPosts = async () => {
      try {
        const postsData = await getRecentPosts();
        setPosts(postsData);
        setFilteredPosts(postsData);
      } catch (err) {
        console.error('Failed to load posts:', err);
        setError('Failed to load posts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, []);

  // Фильтрация постов
  useEffect(() => {
    if (!searchQuery) {
      setFilteredPosts(posts);
      return;
    }

    const filtered = posts.filter(post => {
      const query = searchQuery.toLowerCase();
      
      switch (searchType) {
        case 'title':
          return post.title?.toLowerCase().includes(query);
        case 'author':
          return post.author.name.toLowerCase().includes(query);
        case 'hashtags':
          return post.hashtags?.some((tag: string) => 
            tag.toLowerCase().includes(query)
          );
        default:
          return true;
      }
    });

    setFilteredPosts(filtered);
  }, [searchQuery, searchType, posts]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <div className="text-red text-lg mb-4">{error}</div>
        <button 
          onClick={() => window.location.reload()}
          className="bg-primary-500 text-light-1 px-4 py-2 rounded hover:bg-primary-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-3">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-bold text-light-1">Recent Posts</h1>
          <div className="flex gap-4">
            <Link 
              to="/add-post" 
              className="bg-primary-500 text-light-1 px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Create Post
            </Link>
          </div>
        </div>

        {/* Поисковая система */}
        <div className="mb-8 bg-dark-3 p-4 rounded-lg shadow-sm">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder={`Search by ${searchType}...`}
              className="w-full p-3 border border-dark-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-dark-3 text-light-1"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {['title', 'author', 'hashtags'].map((type) => (
              <button
                key={type}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  searchType === type 
                    ? 'bg-primary-500 text-light-1' 
                    : 'bg-dark-4 hover:bg-dark-3 text-light-2'
                }`}
                onClick={() => setSearchType(type as 'title' | 'author' | 'hashtags')}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Список постов */}
        {filteredPosts.length === 0 ? (
          <div className="bg-dark-3 rounded-lg shadow-sm p-8 text-center">
            <p className="text-light-3 text-lg mb-4">
              {searchQuery ? 'No posts match your search' : 'No posts available yet'}
            </p>
            {!searchQuery && (
              <Link 
                to="/add-post" 
                className="text-primary-500 hover:text-primary-600 font-medium"
              >
                Be the first to create a post!
              </Link>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-7">
            {filteredPosts.map((post) => (
              <PostCard 
                key={post.$id} 
                post={post} 
                userId={user?.$id || null} 
                authorInfo={post.author}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;