import React, { useState, useCallback, useMemo } from "react";
import { formatEther } from "ethers/lib/utils";
import { Tag, Clock, DollarSign, Hammer, Ban, Gavel, HandCoins, ExternalLink, Loader2 ,X,AlertTriangle} from 'lucide-react';
import { SiEthereum } from 'react-icons/si';
import { BigNumber } from "ethers";
import ListForSaleModal from "./ListForSaleModal";
import CreateAuctionModal from "./CreateAuctionModal";
import PlaceBidModal from "./PlaceBidModal";
import BuyConfirmationModal from "./BuyConfirmationModal";

const NFTCard = ({
    nft,
    onCreateAuction,
    onListForSale,
    onBuyNft,
    onPlaceBid,
    onFinalizeAuction,
    showOwnerActions,
    txLoading
}) => {
    const [showListModal, setShowListModal] = useState(false);
    const [showAuctionModal, setShowAuctionModal] = useState(false);
    const [showBidModal, setShowBidModal] = useState(false);
    const [showBuyConfirmationModal,setShowByConfirmationModal] = useState(false);

    const isListedForSale = nft.info?.isListed;
    const isAuction = nft.info?.isAuctioned;
    const isOwnedByUser = showOwnerActions;


    // Memoize computed values
    const auctionHasEnded = useMemo(() => {
        return isAuction && (parseInt(nft.info?.auctionEndTime) <= Math.floor(Date.now() / 1000));
    }, [isAuction, nft.info?.auctionEndTime]);

    // Memoized NFT display data
    const nftDisplayData = useMemo(() => {
        const metadata = nft.metadata || {};
        

        let name = metadata.name || 
                  metadata.title || 
                  metadata.displayName;
        
        // Handle case where name is stored as indexed characters (like an array)
        if (!name && typeof metadata === 'object') {
            const keys = Object.keys(metadata).filter(key => /^\d+$/.test(key)).sort((a, b) => parseInt(a) - parseInt(b));
            if (keys.length > 0) {
                name = keys.map(key => metadata[key]).join('');
            }
        }
        

        if (!name) {
            name = `NFT #${nft.tokenId}`;
        }
        
        const description = metadata.description || 
                          metadata.desc || 
                          metadata.summary || 
                          'No description available';
        
        const image = metadata.imageGatewayUrl || 
                     metadata.image || 
                     metadata.imageUrl || 
                     metadata.image_url || 
                     null;

        return { name, description, image };
    }, [nft.metadata, nft.tokenId]);


    const handleOpenListModal = useCallback(() => setShowListModal(true), []);
    const handleCloseListModal = useCallback(() => setShowListModal(false), []);
    
    const handleOpenAuctionModal = useCallback(() => setShowAuctionModal(true), []);
    const handleCloseAuctionModal = useCallback(() => setShowAuctionModal(false), []);
    
    const handleOpenBidModal = useCallback(() => setShowBidModal(true), []);
    const handleCloseBidModal = useCallback(() => setShowBidModal(false), []);

    const handleOpenBuyConfirmation = useCallback(()=> setShowByConfirmationModal(true),[]);
    const handleCloseBuyConfirmation = useCallback(()=> setShowByConfirmationModal(false),[]);

    // Memoized buy handler
    const handleBuyClick = useCallback(() => {
        if (typeof onBuyNft !== 'function') {
            console.error('onBuyNft is not a function. Make sure it is passed as a prop to NFTCard.');
            alert('Error: Purchase function is not available. Please refresh the page and try again.');
            return;
        }
        handleOpenBuyConfirmation();
    }, [onBuyNft,handleOpenAuctionModal]);

    //handle confirm purchase
    const handleConfirmPurchase = useCallback(()=>{
        if(typeof onBuyNft === 'function'){
            onBuyNft(nft.tokenId);
            setShowByConfirmationModal(false);
        }else{
            console.error("on buy nft function is not available");
            alert("buy function no found");
            setShowByConfirmationModal(false);
        }
    },[nft.tokenId , onBuyNft]);

    // Memoized finalize auction handler
    const handleFinalizeAuction = useCallback(() => {
        if(typeof onFinalizeAuction === 'function'){
            onFinalizeAuction(nft.tokenId);
        }else{
            console.error('onFinalizeAuction is not a function');
            alert('Error: Finalize auction function is not available.');
        }
    }, [nft.tokenId, onFinalizeAuction]);

    // Memoized time remaining calculation
    const timeRemaining = useCallback((endTime) => {
        const now = Math.floor(Date.now() / 1000);
        const remaining = parseInt(endTime) - now;
        if (remaining <= 0) return 'Auction has Ended';

        const days = Math.floor(remaining / (3600 * 24));
        const hours = Math.floor((remaining % (3600 * 24)) / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;

        if (days > 0) return `${days} days ${hours} hours`;
        if (hours > 0) return `${hours} hours ${minutes} mins`;
        if (minutes > 0) return `${minutes} mins ${seconds} secs`;
        if (seconds > 0) return `${seconds} seconds`;
    }, []);

    // Memoized status text
    const statusText = useMemo(() => {
        if (isAuction) {
            if (auctionHasEnded) return 'Auction has ended';
            return `Auction ending in ${timeRemaining(nft.info?.auctionEndTime)}`;
        }

        if (isListedForSale) return 'For Sale';
        return 'not listed';
    }, [isAuction, auctionHasEnded, timeRemaining, nft.info?.auctionEndTime, isListedForSale]);

        // Memoized price display
    const priceDisplay = useMemo(() => {

        
        if (isAuction) {
            const highestBid = nft.info?.highestBid && !BigNumber.from(nft.info.highestBid).isZero() ? 
                formatEther(BigNumber.from(nft.info.highestBid)) : null;

            const reservePrice = nft.info?.price && !BigNumber.from(nft.info.price).isZero() ?
                formatEther(BigNumber.from(nft.info.price)) : null;

            if (highestBid) {
                return `${parseFloat(highestBid)} ETH (Current Bid)`;
            } else if (reservePrice) {
                return `${parseFloat(reservePrice)} ETH (Reserve Price)`;
            }

            return 'no bids yet';
        }
        
        if (isListedForSale) {
            // Try different approaches
            const bigNumberPrice = BigNumber.from(nft.info.price);
            const priceInEth = formatEther(bigNumberPrice);
            const result = `${priceInEth} ETH`;
            return result;
        }

        return 'N/A';
    }, [isAuction, isListedForSale, nft.info?.highestBid, nft.info?.price]);

    // Also debug the buyButtonPrice:
    const buyButtonPrice = useMemo(() => {
        if (isListedForSale && nft.info?.price) {
            const priceInEth = formatEther(BigNumber.from(nft.info.price));
            
            const result = parseFloat(priceInEth).toString();
            
            return result;
        }
        return '0';
    }, [isListedForSale, nft.info?.price]);

    const currentHighestBidForModal = useMemo(() => {
        if (nft.info?.highestBid) {
            try {
                return BigNumber.from(nft.info.highestBid);
            } catch (error) {
                return BigNumber.from(0);
            }
        }

        return BigNumber.from(0);
    }, [nft.info?.highestBid]);

    return (
        <div className="bg-[#202225] rounded-xl shadow-md overflow-hidden transform hover:scale-[1.02] transition-all duration-300 ease-in-out border border-[#34373B] hover:shadow-lg relative">
            <div className="relative w-full h-64 sm:h-56 overflow-hidden capitalize">
                {nftDisplayData.image ? (
                    <img
                        src={nftDisplayData.image}
                        alt={nftDisplayData.name}
                        className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                        }}
                    />
                ) : null}
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400" style={{display: nftDisplayData.image ? 'none' : 'flex'}}>
                    <div className="text-center">
                        <div className="text-4xl mb-2">🖼️</div>
                        <div>No Image</div>
                    </div>
                </div>
                <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                    {isAuction ? <Hammer className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                    <span>{isAuction ? 'Auction' : 'Fixed Price'}</span>
                </div>
            </div>

            <div className="p-4">
                {/* NFT Name */}
                <h3 className="text-lg font-semibold text-white mb-1 capitalize" title={nftDisplayData.name}>
                    {nftDisplayData.name}
                </h3>
                
                {/* Token ID */}
                <p className="text-sm text-gray-400 mb-2">
                    Token ID: {nft.tokenId?.toString() || 'N/A'}
                </p>

                {/* Description */}
                {nftDisplayData.description && nftDisplayData.description !== 'No description available' && (
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2" title={nftDisplayData.description}>
                        {nftDisplayData.description}
                    </p>
                )}

                <div className="flex items-center justify-between text-sm mb-3">
                    <div className="flex items-center text-gray-400">
                        <SiEthereum className="w-4 h-4 mr-1 text-green-500" />
                        <span className="font-medium">{priceDisplay}</span>
                    </div>
                    <div className={`flex items-center ${isAuction ? (auctionHasEnded ? 'text-red-500' : 'text-blue-500') : 'text-gray-500'}`}>
                        <Clock className="w-4 h-4 mr-1" />
                        <span>{statusText}</span>
                    </div>
                </div>

                <div className="border-t border-[#34373B] pt-3">
                    {isOwnedByUser ? (
                        <>
                            {!isListedForSale && !isAuction && (
                                <div className="flex flex-col space-y-2">
                                    <button
                                        onClick={handleOpenListModal}
                                        disabled={txLoading}
                                        className="w-full flex items-center justify-center px-4 py-2 border border-blue-500 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {txLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Tag className="w-4 h-4 mr-2" />}
                                        {txLoading ? 'Listing...' : 'List for Sale'}
                                    </button>
                                    <button
                                        onClick={handleOpenAuctionModal}
                                        disabled={txLoading}
                                        className="w-full flex items-center justify-center px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {txLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gavel className="w-4 h-4 mr-2" />}
                                        {txLoading ? 'Creating...' : 'Create Auction'}
                                    </button>
                                </div>
                            )}

                            {isAuction && auctionHasEnded && (
                                <button
                                    onClick={handleFinalizeAuction}
                                    disabled={txLoading}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    {txLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gavel className="w-4 h-4 mr-2" />}
                                    {txLoading ? 'Finalizing...' : 'Finalize Auction'}
                                </button>
                            )}

                            {(isListedForSale || (isAuction && !auctionHasEnded)) && (
                                <p className="text-sm text-center text-gray-400 py-2">
                                    {isListedForSale ? 'You own this NFT and it is listed for sale.' : 'You own this NFT and it is in auction.'}
                                </p>
                            )}
                        </>
                    ) : (
                        <>
                            {!isOwnedByUser && isListedForSale && typeof onBuyNft === 'function' && (
                                <button
                                    onClick={handleBuyClick}
                                    disabled={txLoading}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {txLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <HandCoins className="w-4 h-4 mr-2" />}
                                    {txLoading ? 'Buying...' : `Buy for ${buyButtonPrice} ETH`}
                                </button>
                            )}
                            {!isOwnedByUser && isAuction && !auctionHasEnded && (
                                <button
                                    onClick={handleOpenBidModal}
                                    disabled={txLoading}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-green-700 text-white rounded-lg text-sm font-medium hover:bg-green-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    {txLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Gavel className="w-4 h-4 mr-2" />}
                                    {txLoading ? 'Bidding...' : 'Place Bid'}
                                </button>
                            )}
                            {isAuction && auctionHasEnded && (
                                <p className="text-sm text-center text-red-500 py-2">Auction has ended.</p>
                            )}
                            {!isListedForSale && !isAuction && (
                                <p className="text-sm text-center text-gray-400 py-2">Not currently listed for sale or auction.</p>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            <ListForSaleModal
                isOpen={showListModal}
                onClose={handleCloseListModal}
                onList={onListForSale}
                tokenId={nft.tokenId}
                txLoading={txLoading}
            />
            <CreateAuctionModal
                isOpen={showAuctionModal}
                onClose={handleCloseAuctionModal}
                onCreate={onCreateAuction}
                tokenId={nft.tokenId}
                txLoading={txLoading}
            />
            <PlaceBidModal
                isOpen={showBidModal}
                onClose={handleCloseBidModal}
                onPlaceBid={onPlaceBid}
                tokenId={nft.tokenId}
                currentHighestBid={currentHighestBidForModal}
                txLoading={txLoading}
            />
            <BuyConfirmationModal
                isOpen={showBuyConfirmationModal}
                onClose={handleCloseBuyConfirmation}
                onConfirm={handleConfirmPurchase}
                nftName={nftDisplayData.name}
                price={buyButtonPrice}
                loading={txLoading}
            />
        </div>
    );
};

export default NFTCard;