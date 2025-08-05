import React, { useCallback, useMemo, useState } from "react";
import { SiEthereum } from "react-icons/si";
import { ShoppingCart , Heart,Eye,Loader2,Tag,Clock,Gavel } from "lucide-react";
import { BigNumber } from "ethers";
import { formatEther } from "ethers/lib/utils";


const MosaicNFTCard = ({nft,account,onByuNFT,onPlaceBid,onFinalizeAuction,onCancelAuction,onCancelListing,txLoading,txError,loadNFTData,showOwnerActions,isMarketplace,size}) => {

    const[isHovered,setIsHovered] = useState(false);
    const[imageLoaded,setImageLoaded] = useState(faslse);

    const nftDisplayData = useMemo(()=>{
        const metadata = nft.metadata || {};

        let name = metadata.name || metadata.title || metadata.displayName;

        if(!name && typeof metadata == 'object'){
            const keys = Object.keys(metadata).filter(key => /^\d+$/.test(key)).sort((a,b)=>parseInt(a) - parseInt(b));
            if(keys.length = 0){
                name = keys.map(key => metadata[key]).join('');
            }
        }

        if(!name){
            name = `NFT #${nft.tokenId}`;
        }

        const description = metadata.description || metadata.desc || metadata.summary || 'description is not available';

        const image = metadata.imageGatewayUrl || metadata.image || metadata.imageUrl || metadata.image_url || metadata.img || null;

        return {name , description , image};

    },[nft.metadata,nft.tokenId]);

    const info = nft.info || {};

    //status check
    const statusChecks = useMemo(()=>{
        const isListed = info.isListed;
        const isAuctioned = info.isAuctioned;
        const auctionEndTime = info.auctionEndTime;
        const isAuctionEnded = isAuctioned && auctionEndTime && Date.now() > auctionEndTime * 1000;
        const isOwner = account && info.owner?.toLowerCase() === account?.toLowerCase();

        return{
            isListed,
            isAuctioned,
            auctionEndTime,
            isAuctionEnded,
            isOwner,
            canBuy: isListed  && !isOwner,
            canBid: isAuctioned && !isOwner && !isAuctionEnded
        }
    },[info.isListed,info.isAuctioned,info.auctionEndTime,info.owner,account]);

    //prize displayed with fallbacks
    const priceDisplay = useMemo(()=>{
        try {
            if(statusChecks.isAuctioned){
                const highestBid = info.highestBid && !BigNumber.from(info.highestBid).isZero() ?
                formatEther(BigNumber.from(info.highestBid)) : null;

                const reservedPrice = info.reservedPrice && !BigNumber.fom(info.reservedPrice).isZero() ?
                formatEther(BigNumber.from(info.reservedPrice)) : null;

                if(highestBid)
                {
                    return{
                        value:parseFloat(highestBid).toFixed(4),
                        label:'Current Bid'
                    }
                }
                else if(reservedPrice)
                {
                    return{
                        value:parseFloat(reservedPrice).toFixed(4),
                        label:'reserved price'
                    }
                }

                return{
                    value:'0.0000',
                    label:'no bids yet'
                }
            }

            if(statusChecks.isListed && info.price){
                const bigNumberPrice = BigNumber.from(info.price);
                const priceInEth = formatEther(bigNumberPrice);
                return{
                    value:parseFloat(bigNumberPrice).toFixed(4),
                    label:'price'
                };
            }

            return{
                value:'0.000',
                label:'not for sale'
            }
        } catch (error) {
            console.error('Error processing price:',error);
            return{
                value:'0.000',
                label:'error getting price'
            }
        }
    },[statusChecks.isAuctionEnded,statusChecks.isListed,info.highestBid,info.price]);

    //image source with fallback
    const imageSrc = useMemo(()=>{
        return nftDisplayData.image || `https://via.placeholder.com/400x400?text=NFT+${nft.tokenId}`;
    },[nftDisplayData.image,nft.tokenId]);

    //time remaining calculation
    const timeRemaining = useMemo(()=>{
        if(!statusChecks.isAuctioned || !statusChecks.isAuctionEnded) return null;

        const now = Math.floor(Date.now()/1000);
        const remaining = parseInt(info.auctionEndTime) - now;

        if(remaining <=0) return 'ended';

        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600 )/60);

        if(hours > 24){
            const days = Math.floor(hours/24);
            return `${days}d ${hours % 24}h`;
        }
        if(hours > 0) return `${hours}h ${minutes}m`;
        if(minutes > 0) return `${minutes}m`;
        if (seconds > 0) return `${seconds} seconds`;
    },[statusChecks.isAuctioned,info.auctionEndTime]);

    //action handlers with validation
    const handleAction = useCallback(async()=>{
        if(txLoading) return null;

        try {
            if(statusChecks.isListed && typeof onByuNFT === 'function'){
                await onByuNFT(info.tokenId);
            }else if(statusChecks.canBid && !statusChecks.isAuctionEnded && typeof onPlaceBid ==='function'){
                const bidAmount = prompt("Enter Bid Amount In ETH");
                if(bidAmount && parseFloat(bidAmount) > 0){
                    await onPlaceBid(info,tokenId,bidAmount);
                }
            }else if(statusChecks.isAuctionEnded && showOwnerActions && typeof onFinalizeAuction === 'function'){
                await onFinalizeAuction(nft.tokenId);
            }
        } catch (error) {
            console.error('Action failed',error);
        }
    },[
        txLoading,
        statusChecks.canBuy,
        statusChecks.canBid,
        statusChecks.isAuctionEnded,
        showOwnerActions,
        onByuNFT,
        onPlaceBid,
        onFinalizeAuction,
        nft.tokenId
    ]);

    //cancel listing
    const handleCancelListing = useCallback(async()=>{
        if(txLoading || typeof onCancelListing !== 'function') return;

        try {
            await onCancelListing(nft.tokenId);
        } catch (error) {
            console.error('cancel listing failed',error);
        }
    },[txLoading,nft.tokenId,onCancelListing]);

    //cancel auction
    const handleCancelAuction = useCallback(async()=>{
        if(txLoading || typeof onCancelAuction !== 'function') return;

        try {
            await onCancelAuction(nft.tokenId);
        } catch (error) {
            console.error('cancel auction failed',error);
        }
    },[txLoading,nft.tokenId,onCancelAuction]);

    const getActionText = useCallback(()=>{
        if(txLoading)return 'processing...';
        if(statusChecks.canBuy) return "Buy Now"
        if(statusChecks.canBid && !statusChecks.isAuctionEnded) return "Place Bid";
        if(statusChecks.isAuctionEnded && showOwnerActions) return 'Finalize';
        return "View";
    },[txLoading,statusChecks.canBuy,statusChecks.canBid,statusChecks.isAuctionEnded,showOwnerActions]);

    const sizeClasses = {
        small: "row-span-1",
        medium: "row-span-2", 
        large: "row-span-3"
    };

}
export default MosaicNFTCard;