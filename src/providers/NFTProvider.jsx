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
        if(!signer) throw new Error("please sign in with a wallet");
        
        const imageNFTcontract = new ethers.Contract(IMAGE_NFT_ADDRESS,IMAGE_NFT_ABI,signer);
        const marketplaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS,NFT_MARKETPLACE_ABI,signer);

        return{ imageNFTcontract,marketplaceContract};
    },[signer]);

    //mint NFT
    const mintNFT = useCallback(async(imageFile,metadata,royaltyBps = 250)=>{
        try {
            setLoading(true);
            setError(null);

            if(!imageFile) throw new Error("please provide an image file");
            if(!metadata.name) throw new Error("please provide a name");
            if(royaltyBps > 500) throw new Error("royalty cannot exceed 5%");

            //upload to pinata
            console.log('uploading to ipfs');
            const uploadResult = await pinataService.uploadNFT(imageFile,metadata);

            //minting nft
            console.log("minting nft");
            const {imageNFTcontract} = getContracts();

            const tx = await imageNFTcontract.mintNft(uploadResult.metadata.tokenURI,royaltyBps);

            const receipt = await tx.wait();

            //extract tokenId from events
            const mintEvent = receipt.events?.find( e => e.event === "NFTminted");
            const tokenId = mintEvent?.args?.tokenId?.toString();

            return {
                success: true,
                tokenId,
                transactionHash: receipt.transactionHash,
                ipfsData: uploadResult,
                tokenURI: uploadResult.metadata.tokenURI,
            }

        }catch(error){
            const errorMessage = error.message || 'minting nft failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        }finally{
            setLoading(false);
        }
    },[getContracts]);


    //list nft for sale
    const listForSale = useCallback(async(tokenId, priceInEth)=>{
        try {
            setLoading(true);
            setError(null);

            const {marketplaceContract} = getContracts();   
            const priceInWei = ethers.utils.parseEther(priceInEth.toString());

            console.log("listing for sale");

            const tx = await marketplaceContract.listForSale(tokenId,priceInWei);

            const receipt = await tx.wait();

            return{
                success:true,
                transactionHash:receipt.transactionHash,
                tokenId,
                price:priceInEth,
            }

        } catch (error) {
            const errorMessage = error.message || 'listing nft for sale failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        }finally{
            setLoading(false);
        }
    },[getContracts]);


    //buying an nft
    const buyNFT = useCallback(async(tokenId)=>{
        try {
            setLoading(true);
            setError(null);

            const {marketplaceContract} = getContracts();

            


        } catch (error) {
            
        }
    })
}