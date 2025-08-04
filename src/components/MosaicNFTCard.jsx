import React, { useMemo, useState } from "react";
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

    const statusChecks = useMemo(()=>{
        //start from here
    })
}
export default MosaicNFTCard;