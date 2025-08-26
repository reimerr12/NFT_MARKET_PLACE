import React, { useCallback, useMemo, useState } from "react";
import { SiEthereum } from "react-icons/si";
import { ShoppingCart, Heart, Eye, Loader2, Tag, Clock, Gavel } from "lucide-react";
import { BigNumber } from "ethers";
import { formatEther } from "ethers/lib/utils";
import BuyConfirmationModal from "./BuyConfirmationModal";
import PlaceBidModal from "./PlaceBidModal";
import ConfirmCancellationModal from "./ConfirmCancellationModal";

const MosaicNFTCard = ({
    nft,
    account,
    onBuyNFT,
    onPlaceBid,
    onFinalizeAuction,
    onCancelAuction,
    onCancelListing,
    txLoading,
    txError,
    loadNFTData,
    showOwnerActions,
    isMarketplace,
    size
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showBuyConfirmationModal, setShowBuyConfirmationModal] = useState(false);
    const [showPlaceBidModal, setShowPlaceBidModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelType, setCancelType] = useState(null); // 'listing' or 'auction'

    const nftDisplayData = useMemo(() => {
        const metadata = nft.metadata || {};

        let name = metadata.name || metadata.title || metadata.displayName;

        if (!name && typeof metadata === 'object') {
            const keys = Object.keys(metadata).filter(key => /^\d+$/.test(key)).sort((a, b) => parseInt(a) - parseInt(b));
            if (keys.length > 0) { 
                name = keys.map(key => metadata[key]).join('');
            }
        }

        if (!name) {
            name = `NFT #${nft.tokenId}`;
        }

        const description = metadata.description || metadata.desc || metadata.summary || 'description is not available';
        const image = metadata.imageGatewayUrl || metadata.image || metadata.imageUrl || metadata.image_url || metadata.img || null;

        return { name, description, image };
    }, [nft.metadata, nft.tokenId]);

    const info = nft.info || {};

    // Status check
    const statusChecks = useMemo(() => {
        const isListed = info.isListed;
        const isAuctioned = info.isAuctioned;
        const auctionEndTime = info.auctionEndTime;
        const isAuctionEnded = isAuctioned && auctionEndTime && Date.now() > auctionEndTime * 1000;
        const isOwner = account && info.owner?.toLowerCase() === account?.toLowerCase();

        return {
            isListed,
            isAuctioned,
            auctionEndTime,
            isAuctionEnded,
            isOwner,
            canBuy: isListed && !isOwner,
            canBid: isAuctioned && !isOwner && !isAuctionEnded
        };
    }, [info.isListed, info.isAuctioned, info.auctionEndTime, info.owner, account]);

    // Price displayed with fallbacks
    const priceDisplay = useMemo(() => {
        try {
            if (statusChecks.isAuctioned) {
                const highestBid = info.highestBid && !BigNumber.from(info.highestBid).isZero() ?
                    formatEther(BigNumber.from(info.highestBid)) : null;

                const reservedPrice = info.reservedPrice && !BigNumber.from(info.reservedPrice).isZero() ?
                    formatEther(BigNumber.from(info.reservedPrice)) : null;

                if (highestBid) {
                    return {
                        value: parseFloat(highestBid).toFixed(4),
                        label: 'Current Bid'
                    };
                } else if (reservedPrice) {
                    return {
                        value: parseFloat(reservedPrice).toFixed(4),
                        label: 'Reserved Price'
                    };
                }

                return {
                    value: '0.0000',
                    label: 'No Bids Yet'
                };
            }

            if (statusChecks.isListed && info.price) {
                const bigNumberPrice = BigNumber.from(info.price);
                const priceInEth = formatEther(bigNumberPrice);
                return {
                    value: parseFloat(priceInEth).toFixed(4), 
                    label: 'Price'
                };
            }

            return {
                value: '0.0000',
                label: 'Not For Sale' 
            };
        } catch (error) {
            console.error('Error processing price:', error);
            return {
                value: '0.0000',
                label: 'Error Getting Price'
            };
        }
    }, [statusChecks.isAuctioned, statusChecks.isListed, info.highestBid, info.reservedPrice, info.price]);

    // Buy button price for modal display
    const buyButtonPrice = useMemo(() => {
        if (statusChecks.isListed && info.price) {
            try {
                const priceInEth = formatEther(BigNumber.from(info.price));
                return parseFloat(priceInEth).toString();
            } catch (error) {
                console.error('Error calculating buy button price:', error);
                return '0';
            }
        }
        return '0';
    }, [statusChecks.isListed, info.price]);

    // Current highest bid for PlaceBidModal
    const currentHighestBid = useMemo(() => {
        if (statusChecks.isAuctioned && info.highestBid) {
            return info.highestBid;
        }
        return null;
    }, [statusChecks.isAuctioned, info.highestBid]);

    // Image source with fallback
    const imageSrc = useMemo(() => {
        return nftDisplayData.image || `https://via.placeholder.com/400x400?text=NFT+${nft.tokenId}`;
    }, [nftDisplayData.image, nft.tokenId]);

    // Time remaining calculation - only for active auctions
    const timeRemaining = useMemo(() => {
        if (!statusChecks.isAuctioned || statusChecks.isAuctionEnded) return null; 

        const now = Math.floor(Date.now() / 1000);
        const remaining = parseInt(info.auctionEndTime) - now;

        if (remaining <= 0) return 'ended';

        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        }
        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m`;
        if (seconds > 0) return `${seconds}s`;
        
        return null;
    }, [statusChecks.isAuctioned, statusChecks.isAuctionEnded, info.auctionEndTime]);

    // Modal handlers
    const handleOpenBuyConfirmation = useCallback(() => setShowBuyConfirmationModal(true), []);
    const handleCloseBuyConfirmation = useCallback(() => setShowBuyConfirmationModal(false), []);
    const handleOpenPlaceBid = useCallback(() => setShowPlaceBidModal(true), []);
    const handleClosePlaceBid = useCallback(() => setShowPlaceBidModal(false), []);
    
    const handleOpenCancelModal = useCallback((type) => {
        setCancelType(type);
        setShowCancelModal(true);
    }, []);
    
    const handleCloseCancelModal = useCallback(() => {
        setShowCancelModal(false);
        setCancelType(null);
    }, []);

    // Handle confirm purchase
    const handleConfirmPurchase = useCallback(() => {
        if (typeof onBuyNFT === 'function') {
            onBuyNFT(nft.tokenId);
            setShowBuyConfirmationModal(false);
        } else {
            console.error("onBuyNFT function is not available");
            alert("Buy function not found");
            setShowBuyConfirmationModal(false);
        }
    }, [nft.tokenId, onBuyNFT]);

    // Handle place bid with modal
    const handlePlaceBidWithModal = useCallback(async (tokenId, bidAmountInWei) => {
        try {
            if (typeof onPlaceBid === 'function') {
                await onPlaceBid(tokenId, bidAmountInWei);
                // Optionally reload NFT data after successful bid
                if (typeof loadNFTData === 'function') {
                    await loadNFTData();
                }
            } else {
                throw new Error("Place bid function is not available");
            }
        } catch (error) {
            console.error('Place bid error:', error);
            throw error; // Re-throw to let the modal handle the error display
        }
    }, [onPlaceBid, loadNFTData]);

    // Action handlers
    const handleAction = useCallback(async () => {
        if (txLoading) {
            console.log("Transaction is already loading, ignoring action.");
            return;
        }

        try {
            if (statusChecks.canBuy && typeof onBuyNFT === 'function') {
                console.log("Opening buy confirmation modal for NFT:", nft.tokenId);
                handleOpenBuyConfirmation();
            } else if (statusChecks.canBid && !statusChecks.isAuctionEnded && typeof onPlaceBid === 'function') {
                console.log("Opening place bid modal for NFT:", nft.tokenId);
                handleOpenPlaceBid();
            } else if (statusChecks.isAuctionEnded && showOwnerActions && typeof onFinalizeAuction === 'function') {
                console.log("Attempting to finalize auction for NFT:", nft.tokenId);
                if (window.confirm("Are you sure you want to finalize this auction?")) {
                    await onFinalizeAuction(nft.tokenId);
                }
            } else {
                console.log("No specific action found for this NFT state. Defaulting to 'View'.");
                // No action available, maybe navigate to a view page or do nothing.
            }
        } catch (error) {
            console.error('Action failed:', error);
            alert(`Action failed: ${error.message || 'Unknown error occurred'}`);
        }
    }, [
        txLoading,
        statusChecks.canBuy,
        statusChecks.canBid,
        statusChecks.isAuctionEnded,
        showOwnerActions,
        onBuyNFT,
        onPlaceBid,
        onFinalizeAuction,
        nft.tokenId,
        handleOpenBuyConfirmation,
        handleOpenPlaceBid
    ]);

    // Cancel listing
    const handleCancelListing = useCallback(async () => {
        if (txLoading || typeof onCancelListing !== 'function') return;

        handleOpenCancelModal('listing');
    }, [txLoading, handleOpenCancelModal]);

    // Cancel auction
    const handleCancelAuction = useCallback(async () => {
        if (txLoading || typeof onCancelAuction !== 'function') return;

        handleOpenCancelModal('auction');
    }, [txLoading, handleOpenCancelModal]);

    // Handle confirmed cancellation
    const handleConfirmCancellation = useCallback(async () => {
        try {
            if (cancelType === 'listing' && typeof onCancelListing === 'function') {
                await onCancelListing(nft.tokenId);
            } else if (cancelType === 'auction' && typeof onCancelAuction === 'function') {
                await onCancelAuction(nft.tokenId);
            }
            
            // Close modal on success
            handleCloseCancelModal();
            
            // Optionally reload NFT data
            if (typeof loadNFTData === 'function') {
                await loadNFTData();
            }
        } catch (error) {
            console.error(`Cancel ${cancelType} failed:`, error);
            // Don't close modal on error, let user try again or close manually
            throw error; // Re-throw to let the modal handle the error display
        }
    }, [cancelType, nft.tokenId, onCancelListing, onCancelAuction, handleCloseCancelModal, loadNFTData]);

    const getActionText = useCallback(() => {
        if (txLoading) return 'Processing...';
        if (statusChecks.canBuy) return "Buy Now";
        if (statusChecks.canBid && !statusChecks.isAuctionEnded) return "Place Bid";
        if (statusChecks.isAuctionEnded && showOwnerActions) return 'Finalize';
        return "View";
    }, [txLoading, statusChecks.canBuy, statusChecks.canBid, statusChecks.isAuctionEnded, showOwnerActions]);

    const getActionIcon = useCallback(() => {
        if (txLoading) return <Loader2 className="w-4 h-4 animate-spin" />;
        if (statusChecks.canBuy) return <ShoppingCart className="w-4 h-4" />;
        if (statusChecks.canBid) return <Gavel className="w-4 h-4" />;
        return <Eye className="w-4 h-4" />;
    }, [txLoading, statusChecks.canBuy, statusChecks.canBid]);

    const getSizeClasses = () => {
        switch (size) {
            case 'small':
                return 'h-56'; 
            case 'medium':
                return 'h-65';
            case 'large':
                return 'h-80';
            case 'wide':
                return 'h-50'; 
            case 'tall':
                return 'h-89';
            case 'featured':
                return 'h-96';
            default:
                return 'h-64';
        }
    };

    const isSmall = size === 'small';
    const isWide = size === 'wide';

    return (
        <>
            <div
                className={`relative bg-[#1a1d21] rounded-xl overflow-hidden border border-gray-800 hover:border-blue-500/70 transition-all duration-300 cursor-pointer group w-full ${getSizeClasses()}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Image Container */}
                <div className="relative w-full h-full">
                    <img
                        src={imageSrc}
                        alt={nftDisplayData.name}
                        className={`w-full h-full object-cover transition-all duration-500 ${isHovered ? 'scale-110' : 'scale-100'}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={(e) => {
                            if (!e.target.src.includes('placeholder')) {
                                e.target.src = `https://via.placeholder.com/400x400?text=NFT+${nft.tokenId}`;
                            } else {
                                e.target.style.display = 'none';
                                const parent = e.target.parentNode;
                                if (parent && !parent.querySelector('.fallback-display')) {
                                    const fallback = document.createElement('div');
                                    fallback.className = 'fallback-display w-full h-full bg-gray-700 flex items-center justify-center text-gray-400';
                                    fallback.innerHTML = '<div class="text-center"><div class="text-4xl mb-2">🖼️</div><div>No Image</div></div>';
                                    parent.appendChild(fallback);
                                }
                            }
                        }}
                    />

                    {!imageLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                        </div>
                    )}

                    {/* Status badges - Hidden on hover */}
                    <div className={`absolute top-3 left-3 transition-all duration-300 ${isHovered ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
                        {statusChecks.isListed && (
                            <div className={`bg-green-500/90 backdrop-blur-sm text-white ${isSmall ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'} rounded-full font-medium flex items-center shadow-lg`}>
                                <Tag className={`${isSmall ? 'w-2 h-2 mr-1' : 'w-3 h-3 mr-1.5'}`} />
                                Listed
                            </div>
                        )}
                        {statusChecks.isAuctioned && (
                            <div className={`${statusChecks.isAuctionEnded ? 'bg-red-500/90' : 'bg-orange-500/90'} backdrop-blur-sm text-white ${isSmall ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'} font-medium rounded-full flex items-center shadow-lg ${statusChecks.isListed ? 'mt-2' : ''}`}>
                                <Clock className={`${isSmall ? 'w-2 h-2 mr-1' : 'w-3 h-3 mr-1.5'}`} />
                                {statusChecks.isAuctionEnded ? 'Ended' : 'Auction'}
                            </div>
                        )}
                    </div>

                    {/* Gradient overlay on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>

                    {/* Heart button - top right */}
                    <div className={`absolute top-3 right-3 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                        <button className={`${isSmall ? 'p-1.5' : 'p-2.5'} bg-black/30 backdrop-blur-md rounded-full hover:bg-black/50 transition-all duration-200 border border-white/10`}>
                            <Heart className={`${isSmall ? 'w-3 h-3' : 'w-4 h-4'} text-white hover:text-red-400 transition-colors`} />
                        </button>
                    </div>

                    {/* Hover content */}
                    <div className={`absolute inset-0 flex flex-col justify-between ${isSmall ? 'p-2' : 'p-4'} transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        
                        {/* Title section */}
                        <div className="flex-1 flex flex-col justify-end">
                            <div className="text-left">
                                <h3 className={`text-white font-bold ${isSmall ? 'text-sm' : isWide ? 'text-lg' : 'text-xl'} leading-tight ${isSmall ? 'mb-1' : 'mb-2'} drop-shadow-lg capitalize`}
                                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
                                    {nftDisplayData.name}
                                </h3>
                                {nft.tokenId && (
                                    <p className={`text-gray-300 ${isSmall ? 'text-xs' : 'text-sm'} opacity-90 drop-shadow-md`}>
                                        #{nft.tokenId.toString()}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Bottom content */}
                        <div className={`${isSmall ? 'space-y-1' : 'space-y-3'}`}>
                            {/* Price display */}
                            <div className={`backdrop-blur-lg bg-black/60 ${isSmall ? 'rounded-lg p-2' : 'rounded-2xl p-4'} border border-white/10`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`text-gray-300 ${isSmall ? 'text-xs mb-0' : 'text-xs mb-1'} uppercase tracking-wide`}>
                                            {priceDisplay.label}
                                        </p>
                                        <div className="flex items-center text-white">
                                            <SiEthereum className={`${isSmall ? 'h-3 w-3 mr-1' : 'h-5 w-5 mr-2'} text-blue-400`} />
                                            <span className={`font-bold ${isSmall ? 'text-sm' : 'text-lg'}`}>
                                                {priceDisplay.value}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Time remaining - only for active auctions */}
                                    {statusChecks.isAuctioned && timeRemaining && !statusChecks.isAuctionEnded && !isSmall && (
                                        <div className="text-right">
                                            <p className="text-gray-300 text-xs uppercase tracking-wide">
                                                Ends in
                                            </p>
                                            <p className="text-orange-400 text-sm font-bold">
                                                {timeRemaining}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action buttons - Size responsive */}
                            <div className={`flex ${isSmall ? 'space-x-1' : 'space-x-2'}`}>
                                {(statusChecks.canBuy || statusChecks.canBid || (statusChecks.isAuctionEnded && showOwnerActions)) && (
                                    <button
                                        onClick={handleAction}
                                        disabled={txLoading}
                                        className={`${isSmall ? 'py-1.5 px-2 text-xs' : 'py-2.5 px-3 text-sm'} rounded-lg font-semibold transition-all duration-200 shadow-lg ${
                                            statusChecks.canBuy
                                                ? 'bg-green-500 hover:bg-green-600 text-white'
                                                : statusChecks.canBid
                                                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                                        } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center backdrop-blur-sm`}
                                    >
                                        {!isSmall && getActionIcon()}
                                        <span className={`${!isSmall && 'ml-2'}`}>{getActionText()}</span>
                                    </button>
                                )}

                                {/* Owner actions - Size responsive */}
                                {showOwnerActions && statusChecks.isOwner && (statusChecks.isListed || statusChecks.isAuctioned) && (
                                    <>
                                        {statusChecks.isListed && (
                                            <button
                                                onClick={handleCancelListing}
                                                disabled={txLoading}
                                                className={`${isSmall ? 'px-2 py-1.5 text-xs' : 'px-3 py-2.5 text-sm'} bg-red-500/80 hover:bg-red-500 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm shadow-lg`}
                                            >
                                                {txLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel"}
                                            </button>
                                        )}
                                        {statusChecks.isAuctioned && !statusChecks.isAuctionEnded && (
                                            <button
                                                onClick={handleCancelAuction}
                                                disabled={txLoading}
                                                className={`${isSmall ? 'px-2 py-1.5 text-xs' : 'px-3 py-2.5 text-sm'} bg-red-500/80 hover:bg-red-500 text-white rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm shadow-lg`}
                                            >
                                                {txLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel"}
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Status messages - Size responsive */}
                            {showOwnerActions && statusChecks.isOwner && (statusChecks.isListed || statusChecks.isAuctioned) && (
                                <p className={`${isSmall ? 'text-xs' : 'text-xs'} text-center text-gray-400 bg-black/40 rounded-lg ${isSmall ? 'py-0.5 px-1' : 'py-1 px-2'} backdrop-blur-sm`}>
                                    You own this NFT
                                </p>
                            )}

                            {!statusChecks.isOwner && !statusChecks.isListed && !statusChecks.isAuctioned && (
                                <p className={`${isSmall ? 'text-xs' : 'text-xs'} text-center text-gray-400 bg-black/40 rounded-lg ${isSmall ? 'py-0.5 px-1' : 'py-1 px-2'} backdrop-blur-sm`}>
                                    Not for sale
                                </p>
                            )}

                            {/* Error display */}
                            {txError && (
                                <p className={`${isSmall ? 'text-xs' : 'text-xs'} text-center text-red-400 bg-red-900/40 rounded-lg ${isSmall ? 'py-0.5 px-1' : 'py-1 px-2'} backdrop-blur-sm`}>
                                    {txError}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Buy Confirmation Modal */}
            <BuyConfirmationModal
                isOpen={showBuyConfirmationModal}
                onClose={handleCloseBuyConfirmation}
                onConfirm={handleConfirmPurchase}
                nftName={nftDisplayData.name}
                price={buyButtonPrice}
                loading={txLoading}
            />

            {/* Place Bid Modal */}
            <PlaceBidModal
                isOpen={showPlaceBidModal}
                onClose={handleClosePlaceBid}
                tokenId={nft.tokenId}
                onPlaceBid={handlePlaceBidWithModal}
                currentHighestBid={currentHighestBid}
                txLoading={txLoading}
            />

            {/* Confirm Cancellation Modal */}
            <ConfirmCancellationModal
                isOpen={showCancelModal}
                onClose={handleCloseCancelModal}
                onConfirm={handleConfirmCancellation}
                tokenId={nft.tokenId}
                cancellationType={cancelType}
                nftName={nftDisplayData.name}
                txLoading={txLoading}
            />
        </>
    );
};

export default MosaicNFTCard;