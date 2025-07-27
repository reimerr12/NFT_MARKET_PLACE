import { useState, useCallback, useEffect, useRef } from "react";
import { X, Tag, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Portal from "./Portal";
import { parseEther } from "ethers/lib/utils";
import { useWeb3 } from "../providers/Web3Provider";

const ListForSaleModal = ({ isOpen, onClose, onList, tokenId, txLoading }) => {
    const [price, setPrice] = useState('');
    const [status, setStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { account, isConnected, connectWallet, isConnecting } = useWeb3();

    const resetForm = useCallback(() => {
        setPrice('');
        setStatus(null);
        setIsSubmitting(false);
    }, []);

    const handleClose = useCallback(() => {
        resetForm();
        onClose();
    }, [resetForm, onClose]);

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen, resetForm]);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();

        const priceValue = parseFloat(price);
        if (!price || priceValue <= 0 || isNaN(priceValue)) {
            setStatus('error-invalid-price');
            return;
        }

        if (isSubmitting || txLoading) return;

        setIsSubmitting(true);

        try {// Ensure wallet is connected
            if (!account || !isConnected) {
                setStatus('pending-connect');
                await connectWallet();
                
                let attempts = 0;
                while ((!account || !isConnected) && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                    attempts++;
                }
                
                if (!account || !isConnected) {
                    throw new Error("Failed to connect wallet");
                }
            }

            setStatus('pending');
            const priceInWei = parseEther(price);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            await onList(tokenId, priceInWei);
            
            setStatus('success');
            setTimeout(() => {
                handleClose();
            }, 1500);
            
        } catch (error) {
            console.error("Error in handleSubmit:", error);
            setStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    }, [price, tokenId, onList, handleClose, isSubmitting, txLoading, account, isConnected, connectWallet]);

    const handlePriceChange = useCallback((e) => {
        setPrice(e.target.value);
        if (status && status.includes('error')) {
            setStatus(null);
        }
    }, [status]);

    if (!isOpen) return null;

    const isLoading = txLoading || isSubmitting || isConnecting || status === 'pending' || status === 'pending-connect';

    return (
        <Portal>
             <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                <div 
                    className="bg-[#202225] rounded-xl shadow-xl w-full max-w-sm p-6 relative border border-[#34373B]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        onClick={handleClose} 
                        type="button"
                        className="absolute top-4 right-4 text-blue-500 hover:text-gray-200 transition-colors duration-150 rounded-full p-1 hover:bg-[#34373B]"
                        disabled={isLoading}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <h2 className="text-2xl font-bold mb-6 text-center text-white">
                        List NFT for Sale
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <p className="text-white text-center">
                        You are listing NFT #{tokenId?.toString()}
                        </p>

                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">
                                Price (ETH) <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="number" 
                                id="price"
                                value={price}
                                onChange={handlePriceChange}
                                min="0.0001"
                                step="0.0001"
                                placeholder="0.0001"
                                disabled={isLoading}
                                className="mt-1 block w-full px-4 py-2 border border-[#474A50] rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-[#34373B] text-white placeholder-gray-400 transition-colors duration-200 disabled:opacity-50"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !price}
                            className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin h-5 w-5 mr-3" />
                                    {status === 'pending-connect' ? 'Connecting Wallet...' : 'Listing NFT...'}
                                </>
                            ) : (
                                <>
                                    <Tag className="h-5 w-5 mr-3" />
                                    Confirm Listing
                                </>
                            )}
                        </button>

                        {status === 'success' && (
                            <div className="mt-4 flex items-center justify-center text-green-400">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <span>NFT Listed Successfully!</span>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="mt-4 flex items-center justify-center text-red-500">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                <span>Listing Failed. Please try again.</span>
                            </div>
                        )}

                        {status === 'error-invalid-price' && (
                            <div className="mt-4 flex items-center justify-center text-red-500">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                <span>Please enter a valid positive price.</span>
                            </div>
                        )}

                        {(!account || !isConnected) && !isLoading && (
                            <div className="mt-4 flex items-center justify-center text-yellow-400">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                <span>Wallet not connected. Please connect to list NFT.</span>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </Portal>
    );
};

export default ListForSaleModal;