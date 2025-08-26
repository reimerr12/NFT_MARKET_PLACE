import { useState , useCallback,useContext ,useRef,useEffect} from "react";
import { BigNumber, ethers } from "ethers";
import { useWeb3 } from "./Web3Provider";
import pinataService, { uploadFile } from "./PinataConnection";
import { NFT_MARKETPLACE_ABI,NFT_MARKETPLACE_ADDRESS} from "../utils/marketplaceContract";
import { IMAGE_NFT_ABI,IMAGE_NFT_ADDRESS } from "../utils/ImagenftContract";


const useNFT = ()=>{
    const {account,signer,provider,isConnected} = useWeb3();
    const[loading,setLoading] = useState(false);
    const[error,setError] = useState(null);
    const accountRef = useRef();
    const signerRef = useRef();
    const isConnectedRef = useRef();

    useEffect(() => {
        accountRef.current = account;
        signerRef.current = signer;
        isConnectedRef.current = isConnected;
    }, [account, signer, isConnected]);

    //get contract instances
    const getContracts = useCallback(()=>{
        if(!signer) throw new Error ("Please sign in with a wallet");

        const ImagenftContract = new ethers.Contract(IMAGE_NFT_ADDRESS,IMAGE_NFT_ABI,signer);
        const marketPLaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS,NFT_MARKETPLACE_ABI,signer);

        return {ImagenftContract , marketPLaceContract};
    },[signer]);


    const getReadOnlyContracts = useCallback(()=>{
        if(!provider) throw new Error("please give a valid provider");

        const ImagenftContract = new ethers.Contract(IMAGE_NFT_ADDRESS,IMAGE_NFT_ABI,provider);
        const marketPLaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS,NFT_MARKETPLACE_ABI,provider);

        return {ImagenftContract , marketPLaceContract};
    },[provider]);

    //mint an nft
    const mintNFT = useCallback(async(imageFile,metadata,royaltyBps = 250)=>{
        
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            if(!imageFile) throw new Error("please provide an image file");
            if(!metadata) throw new Error("please provide a valid metadata");
            if(royaltyBps > 500) throw new Error("Royalty cannot exceed 5%");
            if(royaltyBps < 0) throw new Error("Royalty cannot be negative");

            //validate image file
            pinataService.validateImageFile(imageFile);

            //upload to pinata
            console.log('upload to ipfs....');
            const uploadResult = await pinataService.uploadNFT(imageFile,metadata);

            //minting nft
            console.log("minting nft....");
            const{ImagenftContract} = getContracts();

            const tx = await ImagenftContract.mintNft(uploadResult.metadata.tokenURI,royaltyBps);
            const receipt = await tx.wait();

            //extract nft tokenId from events
           const mintEvent = receipt.logs?.find(log => {
                try {
                    const parsed = ImagenftContract.interface.parseLog(log);
                    return parsed.name === "NFTminted";
                } catch {
                    return false;
                }
            });
            const tokenId = mintEvent ? ImagenftContract.interface.parseLog(mintEvent).args.tokenId : null;

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
    const listForSale = useCallback(async(tokenId,priceInWei)=>{     
        const currentAccount = accountRef.current;
        const currentSigner = signerRef.current;
        const currentIsConnrcted = isConnectedRef.current;
        try {
            setLoading(true);
            setError(null);

            if (!currentAccount || !currentSigner) {
                throw new Error("Please connect your wallet");
            }

            if (priceInWei.isZero() || priceInWei.lt(ethers.constants.Zero)) {
                throw new Error("Price must be positive");
            }
            //approval
            const ImagenftContract = new ethers.Contract(IMAGE_NFT_ADDRESS, IMAGE_NFT_ABI, currentSigner);
            console.log("Approving marketplace...");
            const approveTx = await ImagenftContract.approve(NFT_MARKETPLACE_ADDRESS, tokenId);
            await approveTx.wait();
            console.log("Marketplace approved, now listing...");

            const marketPLaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS,NFT_MARKETPLACE_ABI,currentSigner);

            //listing for sale
            console.log("Listing NFT for sale...");
            const tx = await marketPLaceContract.listForSale(tokenId,priceInWei);
            const receipt = await tx.wait();

            const priceInEth = ethers.utils.formatEther(priceInWei)

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
    },[]);


    //buy nft
    const buyNFT = useCallback(async(tokenId)=>{
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            const {marketPLaceContract} = getContracts();

            let listing;
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    listing = await marketPLaceContract.listings(tokenId, {
                        blockTag: 'latest'
                    });
                    break;
                } catch (err) {
                    retryCount++;
                    if (retryCount >= maxRetries) throw err;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            // Enhanced validation
            if (!listing.isActive) {
                throw new Error("NFT is not listed for sale");
            }
            
            if (listing.isAuctioned) {
                throw new Error("NFT is currently in auction, cannot be purchased directly");
            }
            
            if (listing.price.isZero()) {
                throw new Error("Invalid listing price");
            }
            
            const balance = await marketPLaceContract.provider.getBalance(account);
            if (balance.lt(listing.price)) {
                throw new Error(`Insufficient balance. Need ${ethers.utils.formatEther(listing.price)} ETH`);
            }
            
            if (listing.seller.toLowerCase() === account.toLowerCase()) {
                throw new Error("Cannot buy your own NFT");
            }

            // gas estimation
            let gasEstimate;
            try {
                gasEstimate = await marketPLaceContract.estimateGas.buyNow(tokenId, {
                    value: listing.price
                });
                console.log(`Estimated gas: ${gasEstimate.toString()}`);
            } catch (gasError) {
                console.error("Gas estimation failed:", gasError);
                throw new Error("Transaction would fail. Please check NFT status and your balance.");
            }

            console.log(`Buying NFT ${tokenId} for ${ethers.utils.formatEther(listing.price)} ETH...`);
            const tx = await marketPLaceContract.buyNow(tokenId, {
                value: listing.price,
                gasLimit: gasEstimate.mul(120).div(100)
            });

            console.log(`Transaction submitted: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`Transaction confirmed: ${receipt.transactionHash}`);

            return {
                success: true,
                tokenId,
                transactionHash: receipt.transactionHash,
                price: ethers.utils.formatEther(listing.price),
            };

        } catch (error) {
            console.error("Buy NFT error details:", error);
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    },[getContracts, account]);

    //create auction
    const createAuction = useCallback(async(tokenId,reservedPriceInWei,durationInHours)=>{
        const currentAccount = accountRef.current;
        const currentSigner = signerRef.current;
        const currentIsConnected = isConnectedRef.current;
        
        try {
            setLoading(true);
            setError(null);
            
            if (!currentAccount || !currentSigner || !currentIsConnected) {
                throw new Error("Please connect your wallet");
            }
        
            if (durationInHours <= 0) throw new Error("Duration must be positive");
        
            if (reservedPriceInWei.isZero() || reservedPriceInWei.lt(ethers.constants.Zero)) {
                throw new Error("Reserve price must be positive");
            }

            //Approve the marketplace to transfer the NFT 
            const ImagenftContract = new ethers.Contract(IMAGE_NFT_ADDRESS,IMAGE_NFT_ABI,currentSigner);
            console.log(`approving marketplace for auction`);
            const approveTx = await ImagenftContract.approve(NFT_MARKETPLACE_ADDRESS,tokenId);
            await approveTx.wait();
            console.log("Marketplace approved for auction, now creating auction...");

            const marketPLaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS,NFT_MARKETPLACE_ABI,currentSigner);
            const durationInSeconds = durationInHours * 3600;

            console.log('creating auction...');
            const tx = await marketPLaceContract.createAuction(tokenId,reservedPriceInWei,durationInSeconds);
            const receipt = await tx.wait();

            const reservedPriceInEth = ethers.utils.formatEther(reservedPriceInWei);

            return{
                success:true,
                transactionHash:receipt.transactionHash,
                tokenId,
                reservedPrice:reservedPriceInEth,
                duration:durationInHours
            }
        } catch (error) {
            const errorMessage = error.message || 'failed to create an auction';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    },[]);

    //place bid 
    const placeBid = useCallback(async(tokenId,bidAmount)=>{
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            let bidAmountInWei;

            if(typeof bidAmount === 'string'){
                bidAmountInWei = ethers.utils.parseEther(bidAmount);
            }else if(BigNumber.isBigNumber(bidAmount)){
                bidAmountInWei = bidAmount
            }else{
                throw new Error("Invalid bid amount format");
            }

            if(bidAmountInWei.isZero() || bidAmountInWei.lt(ethers.constants.Zero)){
                throw new Error("Bid amount must be positive");
            }

            const {marketPLaceContract} = getContracts();

            console.log("placing bid");
            const tx = await marketPLaceContract.placeBid(tokenId,{
                value:bidAmountInWei
            });

            const receipt = await tx.wait();

            const bidAmountInEth = ethers.utils.formatEther(bidAmountInWei);

            return{
                success:true,
                tokenId,
                transactionHash:receipt.transactionHash,
                bidAmount:bidAmountInEth
            }
        } catch (error) {
            const errorMessage = error.message || 'failed to place a bid';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    },[getContracts]);

    //finalize auction
    const finalizeAuction = useCallback(async(tokenId)=>{
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            const {marketPLaceContract} = getContracts();

            console.log("finalizing auction..");
            const tx = await marketPLaceContract.finalizeAuction(tokenId);
            const receipt = await tx.wait();

            return{
                success:true,
                tokenId,
                transactionHash:receipt.transactionHash
            }
            
        } catch (error) {
            const errorMessage = error.message || 'failed to finalize auction';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    },[getContracts]);

    //cancel Auction
    const cancelAuction  = useCallback(async(tokenId)=>{
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            const {marketPLaceContract} = getContracts();

            console.log("cancelling auction..");
            const tx = await marketPLaceContract.cancelAuction(tokenId);
            const receipt = await tx.wait();

            return{
                success:true,
                tokenId,
                transactionHash:receipt.transactionHash,
            }
        } catch (error) {
            const errorMessage = error.message || 'could not cancel the auction';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    },[getContracts]);

    //cancel listing
    const cancelListing = useCallback(async(tokenId)=>{
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            const {marketPLaceContract} = getContracts();

            console.log("cancelling listing...");
            const tx = await marketPLaceContract.cancelListing(tokenId);
            const receipt = await tx.wait();

            return{
                success:true,
                tokenId,
                transactionHash:receipt.transactionHash,
            }
        } catch (error) {
            const errorMessage = error.message || 'failed to cancel this listing';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }   
    },[getContracts]);
    
    //withdraw funds
    const withdrawFunds = useCallback(async()=>{
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            const {marketPLaceContract} = getContracts();

            console.log('withdrawing funds....');

            const tx = await marketPLaceContract.withdraw();
            const receipt = await tx.wait();

            console.log('funds withdrawn successfully');
            return{
                success:true,
                transactionHash:receipt.transactionHash
            }
        } catch (error) {
            const errorMessage = error.message || 'failed to withdraw funds';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    },[getContracts]);

    //get active listings
    const getActiveListings = useCallback(async(refresh = false) => {
        try {
            setError(null);
            
            let activeListings;
            
            if (refresh) {

                let attempts = 0;
                const maxAttempts = 3;
                
                while (attempts < maxAttempts) {
                    try {

                        const tempProvider = new ethers.providers.Web3Provider(window.ethereum, "any");
                        await tempProvider.ready;
                        

                        const latestBlock = await tempProvider.getBlockNumber();
                        console.log(`Fetching listings from block: ${latestBlock}`);
                        
                        const freshContract = new ethers.Contract(
                            NFT_MARKETPLACE_ADDRESS,
                            NFT_MARKETPLACE_ABI,
                            tempProvider
                        );
                        

                        activeListings = await freshContract.getActiveListings({
                            blockTag: 'latest'
                        });
                        
 
                        if (activeListings) {
                            console.log(`Fresh active listings:`, activeListings.map(id => id.toString()));
                            break;
                        }
                        
                    } catch (error) {
                        attempts++;
                        console.warn(`Refresh attempt ${attempts} failed:`, error);
                        
                        if (attempts >= maxAttempts) {
                            console.log('All refresh attempts failed, falling back to regular provider');
                            // Fallback to regular provider
                            const {marketPLaceContract} = getReadOnlyContracts();
                            activeListings = await marketPLaceContract.getActiveListings();
                            break;
                        }
                        

                        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                    }
                }
            } else {

                const {marketPLaceContract} = getReadOnlyContracts();
                activeListings = await marketPLaceContract.getActiveListings();
            }
            
            return activeListings.map(tokenId => tokenId.toString());
            
        } catch (error) {
            const errorMessage = error.message || 'failed to get active listings';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [getReadOnlyContracts]);

    //get active auctions
    const getActiveAuctions = useCallback(async(refresh = false) => {
        try {
            setError(null);
            
            let activeAuctions;
            
            if (refresh) {

                let attempts = 0;
                const maxAttempts = 3;
                
                while (attempts < maxAttempts) {
                    try {

                        const tempProvider = new ethers.providers.Web3Provider(window.ethereum, "any");
                        await tempProvider.ready;
                        

                        const latestBlock = await tempProvider.getBlockNumber();
                        console.log(`Fetching auctions from block: ${latestBlock}`);
                        
                        const freshContract = new ethers.Contract(
                            NFT_MARKETPLACE_ADDRESS,
                            NFT_MARKETPLACE_ABI,
                            tempProvider
                        );
                        

                        activeAuctions = await freshContract.getActiveAuctions({
                            blockTag: 'latest'
                        });
                        

                        if (activeAuctions) {
                            console.log(`Fresh active auctions:`, activeAuctions.map(id => id.toString()));
                            break;
                        }
                        
                    } catch (error) {
                        attempts++;
                        console.warn(`Refresh attempt ${attempts} failed:`, error);
                        
                        if (attempts >= maxAttempts) {
                            console.log('All refresh attempts failed, falling back to regular provider');

                            const {marketPLaceContract} = getReadOnlyContracts();
                            activeAuctions = await marketPLaceContract.getActiveAuctions();
                            break;
                        }
                        
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                    }
                }
            } else {

                const {marketPLaceContract} = getReadOnlyContracts();
                activeAuctions = await marketPLaceContract.getActiveAuctions();
            }
            
            return activeAuctions.map(tokenId => tokenId.toString());
            
        } catch (error) {
            const errorMessage = error.message || 'failed to get active auctions';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [getReadOnlyContracts]);

    //get info about the nfts
    const getNftInfo = useCallback(async(tokenId, refresh = false) => {
        try {
            setError(null);

            let nftInfo;
            
            if (refresh) {
                // Use fresh provider for critical data
                const tempProvider = new ethers.providers.Web3Provider(window.ethereum, "any");
                await tempProvider.ready;
                
                const freshContract = new ethers.Contract(
                    NFT_MARKETPLACE_ADDRESS,
                    NFT_MARKETPLACE_ABI,
                    tempProvider
                );
                
                nftInfo = await freshContract.getNFTInfo(tokenId, {
                    blockTag: 'latest'
                });
            } else {
                const { marketPLaceContract } = getReadOnlyContracts();
                nftInfo = await marketPLaceContract.getNFTInfo(tokenId, {
                    blockTag: 'latest'
                });
            }

            return {
                owner: nftInfo.owner,
                isListed: nftInfo.isListed,
                isAuctioned: nftInfo.isAuctioned,
                price: nftInfo.price, 
                highestBid: nftInfo.highestBid, 
                auctionEndTime: nftInfo.auctionEndTime.toString()
            };
        } catch (error) {
            const errorMessage = error.message || 'failed to get info of the nft';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [getReadOnlyContracts]);
    /* const getNftInfo = useCallback(async(tokenId) => {
        try {
            setError(null);

            const { marketPLaceContract } = getReadOnlyContracts();
            
            const nftInfo = await marketPLaceContract.getNFTInfo(tokenId, {
                blockTag: 'latest' // Force latest state
            });

            return {
                owner: nftInfo.owner,
                isListed: nftInfo.isListed,
                isAuctioned: nftInfo.isAuctioned,
                price: nftInfo.price, 
                highestBid: nftInfo.highestBid, 
                auctionEndTime: nftInfo.auctionEndTime.toString()
            };
        } catch (error) {
            const errorMessage = error.message || 'failed to get info of the nft';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [getReadOnlyContracts]); */

    //get user created nfts
    const getUserCreatedNFTs = useCallback(async(userAddress = account)=>{
        try {
            setError(null);

            const {marketPLaceContract} = getReadOnlyContracts();

            console.log("getting user created nfts");
            const createdNFTs = await marketPLaceContract.getUserCreatedNFTs(userAddress);
            return createdNFTs.map(tokenId => tokenId.toString());
        } catch (error) {
            const errorMessage = error.message || 'failed to get user created nft';
            setError(errorMessage);
            throw new Error(errorMessage);
        }    
    },[getReadOnlyContracts,account]);

    //get user purchased nfts
    const getUserPurchasedNFTs = useCallback(async(userAddress = account)=>{
        try {
            setError(null);

            const {marketPLaceContract} = getReadOnlyContracts();

            console.log('getting user purchased nfts');
            const purchasedNFTs = await marketPLaceContract.getUserPurchasedNFTs(userAddress);
            return purchasedNFTs.map(tokenId => tokenId.toString());
        } catch (error) {
            const errorMessage = error.message || 'failed to get user created nft';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    },[getReadOnlyContracts,account]);
    
    //get withdrawabale balance
    const getWithdrawableBalance = useCallback(async(userAddress = account)=>{
        try {
            setError(null);

            const {marketPLaceContract} = getReadOnlyContracts();

            console.log("withdrawing balance ...");
            const balance =await marketPLaceContract.withdrawableBalance(userAddress);

            return ethers.utils.formatEther(balance);
        } catch (error) {
            const errorMessage = error.message || 'failed to fetch withdraw balance';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    },[getReadOnlyContracts,account]);

    //get nft metadata from tokenUri
    const getNFTMetadata = useCallback(async(tokenId)=>{
        try {
            const {ImagenftContract} = getReadOnlyContracts();

            const tokenURI = await ImagenftContract.tokenURI(tokenId);

            //convert ipfs uri to gateway uri if needed
            const gatewayUrl = pinataService.ipfsToGateway(tokenURI);

            const response = await fetch(gatewayUrl);
            const metadata = await response.json();

            if(metadata.image){
                metadata.imageGatewayUrl = pinataService.ipfsToGateway(metadata.image);
            }

            return{
                ...metadata,
                tokenURI,
                tokenURIGateway : gatewayUrl
            }
        } catch (error) {
            console.error("Error fetching NFT metadata:", error);
            throw new Error("Failed to fetch NFT metadata");
        }
    },[getReadOnlyContracts]);

    //get royalty info
    const getRoyaltyInfo = useCallback(async (tokenId) => {
        try {
            const { ImagenftContract } = getReadOnlyContracts();
            const royaltyInfo = await ImagenftContract.getRoyalties(tokenId);
            
            return {
                creator: royaltyInfo.creator,
                bps: royaltyInfo.bps.toString(),
                percentage: (royaltyInfo.bps.toNumber() / 100).toString(),
            };
        } catch (error) {
            console.error("Error fetching royalty info:", error);
            throw new Error("Failed to fetch royalty info");
        }
    }, [getReadOnlyContracts]);

    const subscribeToMarketPlaceEvents = useCallback((onMarketplaceUpdate)=>{
        if(!provider){
            console.warn("Provider not available for event subscription");
            return null;
        }

        try {
            const marketplaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS,NFT_MARKETPLACE_ABI,provider);

            console.log("Setting up marketplace event listeners...");

            const handleUpdate = (eventName) =>(...args) =>{
                console.log(`${eventName} event detected:`,args);

                setTimeout(()=>onMarketplaceUpdate(),2000);
            }

            marketplaceContract.on("NFTListed", handleUpdate("NFTListed"));
            marketplaceContract.on("AuctionCreated", handleUpdate("AuctionCreated"));
            marketplaceContract.on("BidPlaced", handleUpdate("BidPlaced"));
            marketplaceContract.on("AuctionFinalized", handleUpdate("AuctionFinalized"));
            marketplaceContract.on("AuctionCancelled", handleUpdate("AuctionCancelled"));
            marketplaceContract.on("NFTpurchased", handleUpdate("NFTpurchased"));
            marketplaceContract.on("Listingcancelled", handleUpdate("Listingcancelled"));

            return()=>{
                console.log("Cleaning up marketplace event listeners...");
                marketplaceContract.removeAllListeners("NFTListed");
                marketplaceContract.removeAllListeners("AuctionCreated");
                marketplaceContract.removeAllListeners("BidPlaced");
                marketplaceContract.removeAllListeners("AuctionFinalized");
                marketplaceContract.removeAllListeners("AuctionCancelled");
                marketplaceContract.removeAllListeners("NFTpurchased");
                marketplaceContract.removeAllListeners("Listingcancelled");
            }

        } catch (error) {
            console.error("error setting up event listeners",error);
            return null;
        }
    },[provider]);

    return {
        // State
        loading,
        error,
        
        // Mutation functions
        mintNFT,
        listForSale,
        buyNFT,
        createAuction,
        placeBid,
        finalizeAuction,
        cancelAuction,
        cancelListing,
        withdrawFunds,
        
        // Query functions
        getActiveListings,
        getActiveAuctions,
        getNftInfo,
        getUserCreatedNFTs,
        getUserPurchasedNFTs,
        getWithdrawableBalance,
        getNFTMetadata,
        getRoyaltyInfo,
        subscribeToMarketPlaceEvents,
        
        // Utility functions
        setError,
        clearError: () => setError(null),
    };

}

export default useNFT;