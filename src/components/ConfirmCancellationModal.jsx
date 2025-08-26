import { useState, useCallback, useEffect } from "react";
import { X, AlertTriangle, Loader2, XCircle } from 'lucide-react';
import Portal from "./Portal";

const ConfirmCancellationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    tokenId, 
    cancellationType,
    nftName,
    txLoading 
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resetForm = useCallback(() => {
        setIsSubmitting(false);
    }, []);

    const handleClose = useCallback(() => {
        if (isSubmitting || txLoading) return;
        resetForm();
        onClose();
    }, [resetForm, onClose, isSubmitting, txLoading]);

    useEffect(() => {
        if (isOpen) {
            resetForm();
        }
    }, [isOpen, resetForm]);

    const handleConfirm = useCallback(async () => {
        if (isSubmitting || txLoading) return;

        setIsSubmitting(true);
        
        try {
            await onConfirm();
        } catch (error) {
            console.error("Cancellation failed:", error);
            setIsSubmitting(false);
        }
    }, [onConfirm, isSubmitting, txLoading]);

    if (!isOpen) return null;

    const isLoading = txLoading || isSubmitting;
    const isListing = cancellationType === 'listing';
    const title = isListing ? 'Cancel Listing' : 'Cancel Auction';
    const actionText = isListing ? 'listing' : 'auction';

    return (
        <Portal>
            <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[99999] p-4">
                <div 
                    className="bg-[#202225] rounded-xl shadow-2xl w-full max-w-md p-6 relative border border-[#34373B]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <button 
                        onClick={handleClose} 
                        type="button"
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-200 transition-colors duration-200 rounded-full p-1 hover:bg-[#34373B]"
                        disabled={isLoading}
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Warning Icon */}
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-red-500" />
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-4 text-center">
                        {title}
                    </h2>

                    <div className="space-y-4 mb-6">
                        <p className="text-gray-300 text-center">
                            Are you sure you want to cancel the {actionText} for:
                        </p>

                        <div className="bg-[#34373B] p-4 rounded-lg border border-[#474A50]">
                            <h3 className="text-white font-semibold text-lg mb-1">
                                {nftName}
                            </h3>
                            <p className="text-gray-400 text-sm">
                                Token ID: #{tokenId?.toString()}
                            </p>
                        </div>

                        <div className="bg-yellow-900/30 border border-red-500/50 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-red-200">
                                    <p className="font-medium mb-1">Important:</p>
                                    <ul className="space-y-1 text-red-300">
                                        {isListing ? (
                                            <>
                                                <li>• Your NFT will be removed from the marketplace</li>
                                                <li>• It will no longer be available for purchase</li>
                                                <li>• You can list it again at any time</li>
                                            </>
                                        ) : (
                                            <>
                                                <li>• The auction will end immediately</li>
                                                <li>• All bids will be invalidated</li>
                                                <li>• Bidders will be able to withdraw their funds</li>
                                                <li>• This action cannot be undone</li>
                                            </>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={handleClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-3 border border-gray-600 rounded-lg text-gray-300 hover:bg-[#34373B] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            Keep {isListing ? 'Listing' : 'Auction'}
                        </button>

                        <button
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className="flex-1 flex items-center justify-center px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                                    Cancelling...
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-5 w-5 mr-2" />
                                    Cancel {isListing ? 'Listing' : 'Auction'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};

export default ConfirmCancellationModal;