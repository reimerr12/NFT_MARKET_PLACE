import React, { useState } from "react";
import { formatEther } from "ethers/lib/utils";
import { Tag, Clock, DollarSign, Hammer, Ban, Gavel, HandCoins, ExternalLink, Loader2 } from 'lucide-react';
import { BigNumber } from "ethers";
import ListForSaleModal from "./ListForSaleModal";
import CreateAuctionModal from "./CreateAuctionModal";
import PlaceBidModal from "./PlaceBidModal";

const NFTCard = ({nft,onCreateAuction,onListForSale,onBuyNft,onPlaceBid,onFinalizeAuction,showOwnerActions,txLoading}) =>{
    const[showListModal,setShowListModal] = useState(false);
    const[showAuctionModal,setShowAuctionModal] = useState(false);
    const[showBidModal,setShowBidModal] = useState(false);

    const isListedForSale = nft.info?.isListed;
    const isAuction = nft.info?.isAuctioned;
    const isOwnedByUser = showOwnerActions;

    //handling buying
    const handleBuyClick = ()=>{
        const priceEth = nft.info?.price ? formatEther(BigNumber.from(nft.info.price)) : 'N/A';
        if(confirm(`Are you sure you want to buy ${nft.metadata.name} for ${priceEth} ETH?`)){
            onBuyNft(nft.tokenId);
        }
    }

    //time remaining for auctions
    const timeRemaining = (endTime) =>{
        const now = Math.floor(Date.now()/1000);
        const remaining = parseInt(endTime)-now;
        if(remaining <= 0)return 'Auction has Ended';

        const days = Math.floor(remaining / (3600 * 24));
        const hours = Math.floor((remaining % (3600 * 24))/3600);
        const minutes = Math.floor((remaining % 3600)/60);
        const seconds = remaining % 60;

        if(days > 0) return `${days} days ${hours} hours`;
        if(hours > 0) return `${hours} hours ${minutes} mins`;
        if(minutes > 0) return `${minutes} mins ${seconds} secs`;
        if(seconds > 0) return `${seconds} seconds`;
    };

    const getStatusText = ()=>{
        const auctionEnded = isAuction && (parseInt(nft.info?.auctionEndTime) <= Math.floor(Date.now()/1000));

        if(isAuction){
            if(auctionEnded) return `Auction has ended`;
            return`Auction ending in ${timeRemaining(nft.info?.auctionEndTime)}`;
        }

        if(isListedForSale) return 'For Sale';
        return 'not listed';
    }

    const getPriceDisplay = () =>{
        if(isAuction){
            const highestBid = nft.info?.highestBid && BigNumber.from(nft.info?.highestBid).isZero() ? 
            formatEther(BigNumber.from(nft.info?.highestBid)) : null ;

            const reservedPrice = nft.info?.price && BigNumber.from(nft.info?.highestBid).isZero() ?
            formatEther(BigNumber.from(nft.info?.highestBid)) : null ;

            if(highestBid){
                return `${parseFloat(highestBid).toFixed(4)} ETH (Current Bid)`
            } else if(reservedPrice){
                return `${parseFloat(reservePrice).toFixed(4)} ETH (Reserve Price)`;
            }

            return 'no bids yet';
        }
        if(isListedForSale){
            return `${parseFloat(formatEther(BigNumber.from(nft.info.price))).toFixed(4)} ETH`;
        }

        return 'N/A';
    }

    const auctionHasEnded = isAuction && (parseInt(nft.info?.auctionEndTime) <= Math.floor(Date.now()/1000));

    return (
            <div className="bg-[#202225] rounded-xl shadow-md overflow-hidden transform hover:scale-[1.02] transition-all duration-300 ease-in-out border border-[#34373B] hover:shadow-lg relative">
            <div className="relative w-full h-64 sm:h-56 overflow-hidden">
                {nft.metadata?.image ? (
                <img
                    src={nft.metadata.imageGatewayUrl || nft.metadata.image}
                    alt={nft.metadata?.name || `NFT #${nft.tokenId}`}
                    className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                />
                ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-gray-400">
                    No Image
                </div>
                )}
                <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                {isAuction ? <Hammer className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                <span>{isAuction ? 'Auction' : 'Fixed Price'}</span>
                </div>
            </div>

            <div className="p-4">
                <h3 className="text-lg font-semibold text-white truncate mb-1">
                {nft.metadata?.name || `NFT #${nft.tokenId}`}
                </h3>
                <p className="text-sm text-gray-400 mb-2 truncate">
                Token ID: {nft.tokenId.toString()}
                </p>

                <div className="flex items-center justify-between text-sm mb-3">
                <div className="flex items-center text-gray-400">
                    <DollarSign className="w-4 h-4 mr-1 text-green-500" />
                    <span className="font-medium">{getPriceDisplay()}</span>
                </div>
                <div className={`flex items-center ${isAuction ? (auctionHasEnded ? 'text-red-500' : 'text-blue-500') : 'text-gray-500'} text-gray-400`}>
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{getStatusText()}</span>
                </div>
                </div>

                <div className="border-t border-[#34373B] pt-3">
                {isOwnedByUser ? (
                    <>
                    {!isListedForSale && !isAuction && (
                        <div className="flex flex-col space-y-2">
                        <button
                            onClick={() => setShowListModal(true)}
                            disabled={txLoading}
                            className="w-full flex items-center justify-center px-4 py-2 border border-blue-500 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-900 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {txLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Tag className="w-4 h-4 mr-2" />}
                            {txLoading ? 'Listing...' : 'List for Sale'}
                        </button>
                        <button
                            onClick={() => setShowAuctionModal(true)}
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
                        onClick={() => onFinalizeAuction(nft.tokenId)}
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
                    {isListedForSale && (
                        <button
                        onClick={handleBuyClick}
                        disabled={txLoading}
                        className="w-full flex items-center justify-center px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                        {txLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <HandCoins className="w-4 h-4 mr-2" />}
                        {txLoading ? 'Buying...' : `Buy for ${parseFloat(formatEther(BigNumber.from(nft.info.price))).toFixed(4)} ETH`}
                        </button>
                    )}
                    {isAuction && !auctionHasEnded && (
                        <button
                        onClick={() => setShowBidModal(true)}
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

                <ListForSaleModal
                    isOpen={showListModal}
                    onClose={() => setShowListModal(false)}
                    onList={onListForSale}
                    tokenId={nft.tokenId}
                    txLoading={txLoading}
                />
                <CreateAuctionModal
                    isOpen={showAuctionModal}
                    onClose={() => setShowAuctionModal(false)}
                    onCreate={onCreateAuction}
                    tokenId={nft.tokenId}
                    txLoading={txLoading}
                />
                <PlaceBidModal
                    isOpen={showBidModal}
                    onClose={() => setShowBidModal(false)}
                    onPlaceBid={onPlaceBid}
                    tokenId={nft.tokenId}
                    currentHighestBid={nft.info?.highestBid}
                    txLoading={txLoading}
                />
            </div>
        );
}
