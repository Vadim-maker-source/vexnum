import { Outlet } from 'react-router-dom';
import Topbar from '../components/Topbar';

const RootLayout = () => {

  return (
    <div className='flex flex-col w-full h-screen'>
      <Topbar />
      <div className='flex-1 overflow-auto'> {/* 16 = 4rem, стандартная высота Topbar */}
        <Outlet />
      </div>

    </div>
  );
};

export default RootLayout;