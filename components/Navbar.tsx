
import React from 'react';
import { User } from '../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onOpenCart: () => void;
  onMessageClick: () => void;
  onNotifClick: () => void;
  cartCount: number;
  messageCount: number;
  notifCount: number;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onOpenCart, onMessageClick, onNotifClick, cartCount, messageCount, notifCount }) => {
  const isMerchant = user.role === 'MERCHANT';
  
  // Mapping explícito para evitar problemas con JIT de Tailwind
  const colors = isMerchant 
    ? { bg: 'bg-indigo-600', text: 'text-indigo-500', hover: 'hover:bg-indigo-50', iconHover: 'hover:text-indigo-600' }
    : { bg: 'bg-emerald-600', text: 'text-emerald-500', hover: 'hover:bg-emerald-50', iconHover: 'hover:text-emerald-600' };

  return (
    <nav className="bg-white border-b sticky top-0 z-[100] px-6 h-20 flex items-center justify-between shadow-sm backdrop-blur-md bg-white/90">
      <div className="flex items-center space-x-4">
        <div className={`${colors.bg} p-2.5 rounded-2xl shadow-lg rotate-3 transition-transform hover:rotate-0 cursor-pointer`}>
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-black tracking-tighter text-gray-900 leading-none">B2B CONNECT</h1>
          <p className={`text-[10px] font-bold ${colors.text} uppercase tracking-widest mt-1`}>Plataforma Uruguay</p>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <button onClick={onNotifClick} className={`p-3 bg-gray-50 text-gray-400 rounded-2xl ${colors.iconHover} ${colors.hover} transition-all relative`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            {notifCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-white animate-bounce">{notifCount}</span>}
          </button>

          <button onClick={onMessageClick} className={`p-3 bg-gray-50 text-gray-400 rounded-2xl ${colors.iconHover} ${colors.hover} transition-all relative`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            {messageCount > 0 && <span className={`absolute -top-1 -right-1 ${colors.bg} text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-white animate-pulse`}>{messageCount}</span>}
          </button>

          {isMerchant && (
            <button onClick={onOpenCart} className="relative p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-all">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-white">{cartCount}</span>}
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-3 pl-4 border-l">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-gray-900 leading-tight truncate max-w-[120px]">{user.businessName}</p>
            <button onClick={onLogout} className="text-[10px] font-bold text-gray-400 uppercase hover:text-red-500 transition-colors">Salir</button>
          </div>
          <div className={`w-11 h-11 rounded-2xl ${colors.bg} shadow-md flex items-center justify-center text-white font-black text-lg`}>
            {user.name[0].toUpperCase()}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
