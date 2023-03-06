import React from 'react';
import { Outlet } from "react-router-dom";

export const Layout: React.FC = () => {
  return (
    <div className='w-full h-full flex flex-col'>
      <Outlet />
    </div>
  );
};
