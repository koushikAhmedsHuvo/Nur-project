// frontend/src/components/Layout.jsx
import React, { useState } from 'react';
import Sidebar from './SIdeBar';
import Navbar from './Navbar';
import { FaBars, FaTimes } from 'react-icons/fa';

const Layout = ({ children, showSidebar = false }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className='min-h-screen flex flex-col'>
      {/* Mobile Header - Only show when sidebar is enabled */}
      {showSidebar && (
        <div className="lg:hidden flex items-center justify-between p-3 bg-base-200 border-b sticky top-0 z-40">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="btn btn-ghost btn-sm btn-circle"
          >
            {isMobileMenuOpen ? <FaTimes className="size-5" /> : <FaBars className="size-5" />}
          </button>
          <h1 className="font-bold text-lg">KYAU-CHAT</h1>
          <div className="w-8"></div>
        </div>
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && showSidebar && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className='flex flex-1'>
        {/* Sidebar - Desktop always visible, Mobile as slide-in */}
        {showSidebar && (
          <div className={`
            fixed lg:relative z-50
            w-72 h-full
            transform transition-transform duration-300 ease-in-out
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
          </div>
        )}

        <div className='flex-1 flex flex-col min-h-screen overflow-hidden'>
          <Navbar />
          <main className='flex-1 overflow-y-auto'>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;