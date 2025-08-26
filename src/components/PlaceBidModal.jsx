import { useState, useEffect, useCallback, useMemo } from "react";
import { X, HandCoins, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { formatEther, parseEther } from "ethers/lib/utils";
import Portal from "./Portal";
import { BigNumber } from "ethers";

const PlaceBidModal = ({ isOpen, onClose, tokenId, onPlaceBid, currentHighestBid, txLoading }) => {
    const [bidAmount, setBidAmount] = useState('');
    const [status, setStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);


    const currentHighestBidBigNumber = useMemo(() => {
        return currentHighestBid ? BigNumber.from(currentHighestBid) : BigNumber.from(0);
    }, [currentHighestBid]);

    const currentHighestBidEth = useMemo(() => {
        return currentHighestBidBigNumber.gt(0) ? formatEther(currentHighestBidBigNumber) : '0';
    }, [currentHighestBidBigNumber]);

    const minBidAmount = useMemo(() => {
        const currentBidEth = parseFloat(currentHighestBidEth);
        return currentBidEth > 0 ? currentBidEth + 0.005 : 0.005;
    }, [currentHighestBidEth]);


    const resetForm = useCallback(() => {
        setBidAmount('');
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

    // Stable input change handler
    const handleBidAmountChange = useCallback((e) => {
        setBidAmount(e.target.value);
        if (status === 'error') setStatus(null); 
    }, [status]);

    // Stable submit handler
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (isSubmitting || txLoading) return;

        setIsSubmitting(true);
        setStatus('pending');
        
        try {
            const bidValue = parseFloat(bidAmount);
            
            if (!bidAmount || bidValue <= 0 || isNaN(bidValue)) {
                throw new Error("Please enter a valid bid amount.");
            }

            const bidAmountInWei = parseEther(bidAmount);

            if (bidAmountInWei.lte(currentHighestBidBigNumber)) {
                throw new Error(`Your bid must be higher than the current highest bid (${currentHighestBidEth} ETH).`);
            }

            await onPlaceBid(tokenId, bidAmountInWei);
            
            setStatus('success');
            setIsSubmitting(false);
            
            // Close modal after success
            setTimeout(() => {
                handleClose();
            }, 1500);
            
        } catch (error) {
            console.error("Error placing bid:", error);
            setStatus('error');
            setIsSubmitting(false);
        }
    }, [
        bidAmount,
        tokenId,
        onPlaceBid,
        currentHighestBidBigNumber,
        currentHighestBidEth,
        handleClose,
        isSubmitting,
        txLoading
    ]);

    if (!isOpen) return null;

    const isLoading = txLoading || isSubmitting || status === 'pending';

    return (
        <Portal>
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[99999] p-4">
                <div 
                    className="bg-[#202225] rounded-xl shadow-2xl w-full max-w-sm p-6 relative border border-[#34373B]"
                    onClick={(e) => e.stopPropagation()} // Prevent event bubbling
                >
                    <button 
                        onClick={handleClose} 
                        type="button"
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors duration-200 rounded-full p-1 hover:bg-[#34373B]"
                        disabled={isLoading}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        Place Bid on NFT
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <p className="text-gray-300 text-center">
                            You are placing a bid on NFT #{tokenId?.toString()}.
                        </p>

                        {currentHighestBidBigNumber.gt(0) && (
                            <div className="bg-[#34373B] p-3 rounded-lg">
                                <p className="text-sm text-gray-300">
                                    Current highest bid: 
                                    <span className="font-semibold text-blue-400 ml-2">
                                        {parseFloat(currentHighestBidEth).toFixed(4)} ETH
                                    </span>
                                </p>
                            </div>
                        )}

                        <div>
                            <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-300 mb-2">
                                Your Bid Amount (ETH) <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="number" 
                                id="bidAmount"
                                value={bidAmount}
                                onChange={handleBidAmountChange}
                                min={minBidAmount}
                                step="0.005"
                                placeholder={`Minimum ${minBidAmount.toFixed(4)} ETH`}
                                disabled={isLoading}
                                className="mt-1 block w-full px-4 py-2 border border-[#474A50] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-white bg-[#34373B] placeholder-gray-500 transition-colors duration-200 disabled:opacity-50"
                                required
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                Minimum bid: {minBidAmount.toFixed(4)} ETH
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !bidAmount}
                            className="w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin h-5 w-5 mr-3" />
                                    Placing Bid...
                                </>
                            ) : (
                                <>
                                    <HandCoins className="h-5 w-5 mr-3" />
                                    Place Bid
                                </>
                            )}
                        </button>

                        {status === 'success' && (
                            <div className="mt-4 flex items-center justify-center text-green-400">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <span>Bid Placed Successfully!</span>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="mt-4 flex items-center justify-center text-red-500">
                                <AlertCircle className="h-5 w-5 mr-2" />
                                <span>Bid Failed. Please try again.</span>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </Portal>
    );
};

export default PlaceBidModal;