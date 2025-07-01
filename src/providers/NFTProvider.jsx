import { useState , useCallback,useContext } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "./Web3Provider";
import pinataService, { uploadFile } from "./PinataConnection";
import { NFT_MARKETPLACE_ABI,NFT_MARKETPLACE_ADDRESS} from "../utils/marketplaceContract";
import { IMAGE_NFT_ABI,IMAGE_NFT_ADDRESS } from "../utils/ImagenftContract";


export const useNFT = ()=>{
    const {account,signer,provider} = useContext(useWeb3);
    const[loading,setLoading] = useState(false);
    const[error,setError] = useState(null);

    //get contract instances
    const getContracts = useCallback(()=>{
        if(!signer) throw new Error ("Please sign in with a wallet");

        const imageNftContract = new ethers.Contract(IMAGE_NFT_ADDRESS,IMAGE_NFT_ABI,signer);
        const marketPLaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS,NFT_MARKETPLACE_ABI,signer);

        return {imageNftContract , marketPLaceContract};
    },[signer]);


    const getReadOnlyContracts = useCallback(()=>{
        if(!provider) throw new Error("please give a balid provider");

        const imageNftContract = new ethers.Contract(IMAGE_NFT_ADDRESS,IMAGE_NFT_ABI,provider);
        const marketPLaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS,NFT_MARKETPLACE_ABI,provider);

        return {imageNftContract , marketPLaceContract};
    },[provider]);

    //mint an nft
    const mintNFT = useCallback(async(imageFile,metadata,royaltyBps = 250)=>{
        try {
            setLoading(true);
            setError(null);

            if(!imageFile) throw new Error("please provide an image file");
            if(!metadata) throw new Error("please provide a valid metadata");
            if(royaltyBps > 500) throw new Error("Royalty cannot exceed 5%");

            //validate image file
            pinataService.validateImageFile(imageFile);

            //upload to pinata
            console.log('upload to ipfs....');
            const uploadResult = await pinataService.uploadNFT(imageFile,metadata);

            //minting nft
            console.log("minting nft");
            const{imageNftContract} = getContracts();

            const tx = await imageNftContract.mintNFT(uploadResult.metadata.tokenURI,royaltyBps);
            const receipt = await tx.wait();

            //extract nft tokenId from events
            const mintEvent = receipt.events?.find(e => e.event === "NFTminted");
            const tokenId = mintEvent?.args?.tokenId?.toString();

            return{
                success:true,
                tokenId,
                ipfsData:uploadResult,
                tokenURI:uploadResult.metadata.tokenURI
            }
        } catch (error) {
            const errorMessage = error.message || 'minting NFT failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    },[getContracts]);

    //list for sale
    const listForSale = useCallback(async(tokenId,priceInEth)=>{
        try {
            setLoading(true);
            setError(null);

            const {marketPLaceContract} = getContracts();
            const priceInWei = ethers.utils.parseEther(priceInEth.toString());

            //listing for sale
            console.log("listing for sale");
            const tx = await marketPLaceContract.listForSale(tokenId,priceInWei);
            const receipt = await tx.wait();

            return{
                success:true,
                tokenId,
                transactionHash: receipt.transactionHash,
                price:priceInEth,
            }
        } catch (error) {
            const errorMessage = error.message || "failed to list for sale";
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    },[getContracts]);

    //buy nft
    const buyNft = useCallback(async(tokenId)=>{
        try {
            setLoading(true);
            setError(null);

            const {marketPLaceContract} = getContracts();

            
            const listing = await marketPLaceContract.listings(tokenId);
            if(!listing.isActive || listing.isAuctioned){
                throw new Error("NFT is not available for direct purchase");
            }

            //buying the nft
            console.log("buying the nft");
            const tx = await marketPLaceContract.buyNow(tokenId,{
                value:listing.price
            });

            const receipt = await tx.wait();

            return{
                success:true,
                tokenId,
                transactionHash:receipt.transactionHash,
                price:ethers.utils.parseEther(listing.price),
            }

        } catch (error) {
            const errorMessage = error.message || "failed to buy nft";
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    },[getContracts]);
}