import React, { useEffect } from 'react';
import { Loader2, X, AlertTriangle, HandCoins } from 'lucide-react';
import Portal from "./Portal";
import { SiEthereum } from 'react-icons/si';

const BuyConfirmationModal = ({isOpen,onClose,onConfirm,nftName,price,loading})=>{
    if(!isOpen) return null;

    useEffect(()=>{
        const handleEscape = (event) =>{
            if(event.key === 'Escape' && !loading){
                onClose();
            }
        };

        if(isOpen){
            document.addEventListener('keydown',handleEscape);
            document.body.style.overflow = '';
        }

        return()=>{
            document.removeEventListener('keydown',handleEscape);
            document.body.style.overflow = '';
        }
    },[isOpen,loading,onClose]);

    const handleBackdropClick = (e)=>{
        if(e.target === e.currentTarget && !loading){
            onClose();
        }
    }

    return (
        <Portal>
            <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
            onClick={handleBackdropClick}
            >
                <div className="bg-[#202225] rounded-xl max-w-md w-full mx-4 border border-[#34373B]">
                    <div className="flex items-center justify-between p-6 border-b border-[#34373B]">
                        <h3 className="text-lg font-semibold text-white flex items-center">
                            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
                            Confirm Purchase
                        </h3>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                            aria-label="Close modal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="p-6">
                        <div className="text-center mb-6">
                            <p className="text-gray-300 mb-4">Are you sure you want to purchase this NFT?</p>
                            <div className="bg-[#2F3136] rounded-lg p-4 border border-[#34373B]">
                                <p className="text-white font-semibold mb-2 truncate capitalize" title={nftName}>
                                    {nftName}
                                </p>
                                <div className="flex items-center justify-center text-green-400">
                                    <SiEthereum className="w-5 h-5 mr-2" />
                                    <span className="text-xl font-bold">{price} ETH</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex space-x-3">
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                disabled={loading}
                                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Purchasing...
                                    </>
                                ) : (
                                    <>
                                        <HandCoins className="w-4 h-4 mr-2" />
                                        Confirm Purchase
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Portal>
    );
}

export default BuyConfirmationModal;