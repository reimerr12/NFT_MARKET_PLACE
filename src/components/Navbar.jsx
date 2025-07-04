import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, UserCircle, LayoutGrid, ShoppingBag, Settings, LogOut, Search, ChevronDown, Rocket, BarChart
} from 'lucide-react';
import {useWeb3} from '../providers/Web3Provider'


const Navbar = () => {
  const { isConnected, account, connectWallet, disconnectWallet,formatAddress } = useWeb3();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {

    document.documentElement.classList.add('dark');
  }, []);

  const navLinks = [
    { name: 'Explore', path: '/marketplace', icon: <LayoutGrid className="w-5 h-5" /> },
    { name: 'Dashboard', path: '/dashboard', icon: <BarChart className="w-5 h-5" /> },
  ];

  return (
    <nav className='bg-[#202225] shadow-sm sticky top-0 transition-colors duration-300'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          <div className='flex-shrink-0'>
            <Link className='flex items-center text-2xl font-bold text-white font-sans'>
               <Rocket className='w-8 h-8 mr-2 text-blue-600' /> NFTrium
            </Link>
          </div>

         {/*  link map */}
          <div className="hidden md:flex space-x-6">
            {navLinks.map((link)=>(
                <Link key={link.name} to={link.path} className='inline-flex items-center px-1 pt-1 text-base font-medium text-gray-200 hover:text-blue-500 transition-colors duration-200'>
                  {link.icon && <span className='mr-2'>{link.icon}</span>}
                  {link.name}
                </Link>
            ))}
          </div>
          
          <div className='flex items-center space-x-4'>
            {isConnected ? (
              <div className="relative hidden md:block">

                <button onClick={()=>setIsProfileOpen(!isProfileOpen)} className='flex items-center px-4 py-2 bg-[#34373B] text-blue-400 rounded-md text-sm font-medium hover:bg=[#474A50] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500'>
                  <UserCircle className='w- h-5 mr-2' /> 
                  {formatAddress(account)}
                  <ChevronDown className={`ml-2 w-4 h-4 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : 'rotate-0'}`} />
                </button>

                {isProfileOpen && (
                  <div className='absolute right-0 mt-2 w-48 bg-[#34373B] rounded-lg shadow-xl py-1 border border-[#474A50] z-50 animate-fade-in'>

                    <Link path='/dashboard' onClick={()=> setIsProfileOpen(false)} className='flex items-center py-2 px-4 text-sm text-gray-200 hover:bg-[#474A50] transition-colors duration-200 capitalize'>
                      <LayoutGrid className='w-4 h-4 mr-2'/>my dashboard
                    </Link>
                    
                    <Link path='/marketplace' onClick={()=> setIsProfileOpen(false)} className='flex items-center py-2 px-4 text-sm text-gray-200 hover:bg-[#474A50] transition-colors duration-200 capitalize'>
                      <ShoppingBag className='w-4 h-4 mr-2'/>marketplace
                    </Link>

                    <div className='border-t border-[#474A50] my-1'></div>

                    <button onClick={()=>{disconnectWallet(),setIsProfileOpen(false);}} className='flex items-center w-full text-left px-4 py-2 text-sm text-red-500 hover:text-red-700 transition-colors duration-150'>
                      <LogOut className='w-4 h-4 mr-2' />Disconnect
                    </button>
                  </div>
                )}
              </div>
            ):(
              <div className='hidden md:block py-2'>
                <button onClick={connectWallet} className='flex items-center px-7 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500'>
                  <Wallet className='w-4 h-4 mr-2'/> Connect Wallet
                </button>
              </div>
            )}

              <div className='md:hidden flex items-center'>
                <button onClick={()=>setIsMobileMenuOpen(!isMobileMenuOpen)} className='inline-flex items-center justify-center p-2 rounded-lg text-blue-500 hover:text-white hover:bg-gray-700 focus:otline-none focus:ring-inset focus:ring-2 focus:ring-blue-500' aria-expanded='false'>
                  <span className='sr-only'>open main menu</span>
                  {isMobileMenuOpen ? (
                      <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                  ):(
                      <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                  )}
                </button>
            </div>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className='md:hidden'>
          <div className='px-2 pt-2 pb-3 space-y-1 sm:px-3'>

            {isConnected && (
              <div className='flex items-center px-3 py-2 text-base rounded-md font-medium text-gray-300 bg-[#34373B] border border-[#474A50]'>
                <UserCircle className='w-5 h-5 mr-2 text-blue-400' />
                <span className='text-blue-400'>{formatAddress(account)}</span>
              </div>
            )}

            {navLinks.map((link)=>(
              <Link key={link.name} to={link.path} onClick={()=>setIsMobileMenuOpen(false)} className='flex items-center px-3 py-2 text-base rounded-md font-medium text-gray-300 hover:bg-blue-700 hover:text-blue-500 transition-colors duration-150'>
                {link.icon && <span className='mr-2'>{link.icon}</span>}
                {link.name}
              </Link>
            ))}

            {!isConnected && (
              <button onClick={()=>{connectWallet(); setIsMobileMenuOpen(false);}} className='flex items-center w-full text-left px-3 py-2 rounded-md font-medium text-base text-blue-500 hover:text-blue-700 hover:bg-gray-700 transition-colors duration-150'>
                <Wallet className='w-4 h-4 mr-2'/> Connect Wallet
              </button>
            )}

            {isConnected && (
              <button onClick={()=>{disconnectWallet(), setIsMobileMenuOpen(false)}} className='flex items-center w-full text-left px-3 py-2 rounded-md font-medium text-base text-red-500 hover:text-red-700'>
                <LogOut className='w-4 h-4 mr-2'/> Disconnect Wallet
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;