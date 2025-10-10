import { useState, useCallback, useRef, useEffect } from "react";
import { BigNumber, ethers } from "ethers";
import { useWeb3 } from "./Web3Provider";
import pinataService from "./PinataConnection";
import { NFT_MARKETPLACE_ABI, NFT_MARKETPLACE_ADDRESS } from "../utils/marketplaceContract";
import { IMAGE_NFT_ABI, IMAGE_NFT_ADDRESS } from "../utils/ImagenftContract";

const useNFT = () => {
    const { account, signer, provider, isConnected } = useWeb3();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const accountRef = useRef();
    const signerRef = useRef();
    const isConnectedRef = useRef();

    useEffect(() => {
        accountRef.current = account;
        signerRef.current = signer;
        isConnectedRef.current = isConnected;
    }, [account, signer, isConnected]);

    // Get contract instances
    const getContracts = useCallback(() => {
        if (!signer) throw new Error("Please sign in with a wallet");

        const ImagenftContract = new ethers.Contract(IMAGE_NFT_ADDRESS, IMAGE_NFT_ABI, signer);
        const marketPLaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS, NFT_MARKETPLACE_ABI, signer);

        return { ImagenftContract, marketPLaceContract };
    }, [signer]);

    const getReadOnlyContracts = useCallback(() => {
        if (!provider) throw new Error("please give a valid provider");

        const ImagenftContract = new ethers.Contract(IMAGE_NFT_ADDRESS, IMAGE_NFT_ABI, provider);
        const marketPLaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS, NFT_MARKETPLACE_ABI, provider);

        return { ImagenftContract, marketPLaceContract };
    }, [provider]);

    // Mint an NFT
    const mintNFT = useCallback(async (imageFile, metadata, royaltyBps = 250) => {
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            if (!imageFile) throw new Error("please provide an image file");
            if (!metadata) throw new Error("please provide a valid metadata");
            if (royaltyBps > 500) throw new Error("Royalty cannot exceed 5%");
            if (royaltyBps < 0) throw new Error("Royalty cannot be negative");

            // Validate image file
            pinataService.validateImageFile(imageFile);

            // Upload to pinata
            console.log('Uploading to IPFS....');
            const uploadResult = await pinataService.uploadNFT(imageFile, metadata);

            // Minting NFT
            console.log("Minting NFT....");
            const { ImagenftContract } = getContracts();

            const tx = await ImagenftContract.mintNft(uploadResult.metadata.tokenURI, royaltyBps);
            const receipt = await tx.wait();

            const mintEvent = receipt.logs?.find(log => {
                try {
                    const parsed = ImagenftContract.interface.parseLog(log);
                    return parsed.name === "NFTminted";
                } catch {
                    return false;
                }
            });
            const tokenId = mintEvent ? ImagenftContract.interface.parseLog(mintEvent).args.tokenId : null;

            return {
                success: true,
                tokenId,
                ipfsData: uploadResult,
                tokenURI: uploadResult.metadata.tokenURI
            };
        } catch (error) {
            const errorMessage = error.message || 'minting NFT failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [getContracts, account]);

    // List for sale
    const listForSale = useCallback(async (tokenId, priceInWei) => {
        const currentAccount = accountRef.current;
        const currentSigner = signerRef.current;
        const currentIsConnected = isConnectedRef.current;
        try {
            setLoading(true);
            setError(null);

            if (!currentAccount || !currentSigner) {
                throw new Error("Please connect your wallet");
            }

            if (priceInWei.isZero() || priceInWei.lt(ethers.constants.Zero)) {
                throw new Error("Price must be positive");
            }

            // Approval
            const ImagenftContract = new ethers.Contract(IMAGE_NFT_ADDRESS, IMAGE_NFT_ABI, currentSigner);
            console.log("Approving marketplace...");
            const approveTx = await ImagenftContract.approve(NFT_MARKETPLACE_ADDRESS, tokenId);
            await approveTx.wait();
            console.log("Marketplace approved, now listing...");

            const marketPLaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS, NFT_MARKETPLACE_ABI, currentSigner);

            // Listing for sale
            console.log("Listing NFT for sale...");
            const tx = await marketPLaceContract.listForSale(tokenId, priceInWei);
            const receipt = await tx.wait();

            const priceInEth = ethers.utils.formatEther(priceInWei);

            return {
                success: true,
                tokenId,
                transactionHash: receipt.transactionHash,
                price: priceInEth,
            };
        } catch (error) {
            const errorMessage = error.message || "failed to list for sale";
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    // Buy NFT
    const buyNFT = useCallback(async (tokenId) => {
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            const { marketPLaceContract } = getContracts();

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

            // Gas estimation
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
            const errorMessage = error.message || 'Failed to buy NFT';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [getContracts, account]);

    // Create auction
    const createAuction = useCallback(async (tokenId, reservedPriceInWei, durationInHours) => {
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

            // Approve the marketplace to transfer the NFT
            const ImagenftContract = new ethers.Contract(IMAGE_NFT_ADDRESS, IMAGE_NFT_ABI, currentSigner);
            console.log(`Approving marketplace for auction`);
            const approveTx = await ImagenftContract.approve(NFT_MARKETPLACE_ADDRESS, tokenId);
            await approveTx.wait();
            console.log("Marketplace approved for auction, now creating auction...");

            const marketPLaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS, NFT_MARKETPLACE_ABI, currentSigner);
            const durationInSeconds = durationInHours * 3600;

            console.log('Creating auction...');
            const tx = await marketPLaceContract.createAuction(tokenId, reservedPriceInWei, durationInSeconds);
            const receipt = await tx.wait();

            const reservedPriceInEth = ethers.utils.formatEther(reservedPriceInWei);

            return {
                success: true,
                transactionHash: receipt.transactionHash,
                tokenId,
                reservedPrice: reservedPriceInEth,
                duration: durationInHours
            };
        } catch (error) {
            const errorMessage = error.message || 'failed to create an auction';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, []);

    // Place bid
    const placeBid = useCallback(async (tokenId, bidAmount) => {
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            let bidAmountInWei;

            if (typeof bidAmount === 'string') {
                bidAmountInWei = ethers.utils.parseEther(bidAmount);
            } else if (BigNumber.isBigNumber(bidAmount)) {
                bidAmountInWei = bidAmount;
            } else {
                throw new Error("Invalid bid amount format");
            }

            if (bidAmountInWei.isZero() || bidAmountInWei.lt(ethers.constants.Zero)) {
                throw new Error("Bid amount must be positive");
            }

            const { marketPLaceContract } = getContracts();

            console.log("Placing bid");
            const tx = await marketPLaceContract.placeBid(tokenId, {
                value: bidAmountInWei
            });

            const receipt = await tx.wait();
            const bidAmountInEth = ethers.utils.formatEther(bidAmountInWei);

            return {
                success: true,
                tokenId,
                transactionHash: receipt.transactionHash,
                bidAmount: bidAmountInEth
            };
        } catch (error) {
            const errorMessage = error.message || 'failed to place a bid';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [getContracts, account]);

    // Finalize auction
    const finalizeAuction = useCallback(async (tokenId) => {
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            const { marketPLaceContract } = getContracts();

            console.log("Finalizing auction..");
            const tx = await marketPLaceContract.finalizeAuction(tokenId);
            const receipt = await tx.wait();

            return {
                success: true,
                tokenId,
                transactionHash: receipt.transactionHash
            };

        } catch (error) {
            const errorMessage = error.message || 'failed to finalize auction';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [getContracts, account]);

    // Cancel Auction
    const cancelAuction = useCallback(async (tokenId) => {
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            const { marketPLaceContract } = getContracts();

            console.log("Cancelling auction..");
            const tx = await marketPLaceContract.cancelAuction(tokenId);
            const receipt = await tx.wait();

            return {
                success: true,
                tokenId,
                transactionHash: receipt.transactionHash,
            };
        } catch (error) {
            const errorMessage = error.message || 'could not cancel the auction';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [getContracts, account]);

    // Cancel listing
    const cancelListing = useCallback(async (tokenId) => {
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            const { marketPLaceContract } = getContracts();

            console.log("Cancelling listing...");
            const tx = await marketPLaceContract.cancelListing(tokenId);
            const receipt = await tx.wait();

            return {
                success: true,
                tokenId,
                transactionHash: receipt.transactionHash,
            };
        } catch (error) {
            const errorMessage = error.message || 'failed to cancel this listing';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [getContracts, account]);

    // Withdraw funds
    const withdrawFunds = useCallback(async () => {
        if (!account) throw new Error("Please connect your wallet");
        try {
            setLoading(true);
            setError(null);

            const { marketPLaceContract } = getContracts();

            console.log('Withdrawing funds....');

            const tx = await marketPLaceContract.withdraw();
            const receipt = await tx.wait();

            console.log('Funds withdrawn successfully');
            return {
                success: true,
                transactionHash: receipt.transactionHash
            };
        } catch (error) {
            const errorMessage = error.message || 'failed to withdraw funds';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setLoading(false);
        }
    }, [getContracts, account]);

    // Get active listings with force blockchain sync
    const getActiveListings = useCallback(async (refresh = false) => {
        try {
            setError(null);

            let activeListings;

            if (refresh) {
                console.log('Forcing blockchain sync...');
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
                            const { marketPLaceContract } = getReadOnlyContracts();
                            activeListings = await marketPLaceContract.getActiveListings();
                            break;
                        }

                        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                    }
                }
            } else {
                const { marketPLaceContract } = getReadOnlyContracts();
                activeListings = await marketPLaceContract.getActiveListings();
            }

            return activeListings.map(tokenId => tokenId.toString());

        } catch (error) {
            const errorMessage = error.message || 'failed to get active listings';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [getReadOnlyContracts]);

    // Get active auctions
    const getActiveAuctions = useCallback(async (refresh = false) => {
        try {
            setError(null);

            let activeAuctions;

            if (refresh) {
                console.log('Forcing blockchain sync...');
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
                            const { marketPLaceContract } = getReadOnlyContracts();
                            activeAuctions = await marketPLaceContract.getActiveAuctions();
                            break;
                        }

                        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                    }
                }
            } else {
                const { marketPLaceContract } = getReadOnlyContracts();
                activeAuctions = await marketPLaceContract.getActiveAuctions();
            }

            return activeAuctions.map(tokenId => tokenId.toString());

        } catch (error) {
            const errorMessage = error.message || 'failed to get active auctions';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [getReadOnlyContracts]);

    // Get NFT info
    const getNftInfo = useCallback(async (tokenId, refresh = false) => {
        try {
            setError(null);

            let nftInfo;

            if (refresh) {
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

    // Get user created NFTs
    const getUserCreatedNFTs = useCallback(async (userAddress = account) => {
        try {
            setError(null);

            const { marketPLaceContract } = getReadOnlyContracts();

            console.log("Getting user created NFTs");
            const createdNFTs = await marketPLaceContract.getUserCreatedNFTs(userAddress);
            return createdNFTs.map(tokenId => tokenId.toString());
        } catch (error) {
            const errorMessage = error.message || 'failed to get user created nft';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [getReadOnlyContracts, account]);

    // Get user purchased NFTs
    const getUserPurchasedNFTs = useCallback(async (userAddress = account) => {
        try {
            setError(null);

            const { marketPLaceContract } = getReadOnlyContracts();

            console.log('Getting user purchased NFTs');
            const purchasedNFTs = await marketPLaceContract.getUserPurchasedNFTs(userAddress);
            return purchasedNFTs.map(tokenId => tokenId.toString());
        } catch (error) {
            const errorMessage = error.message || 'failed to get user purchased nft';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [getReadOnlyContracts, account]);

    // Get withdrawable balance
    const getWithdrawableBalance = useCallback(async (userAddress = account) => {
        try {
            setError(null);

            const { marketPLaceContract } = getReadOnlyContracts();

            console.log("Getting withdrawable balance...");
            const balance = await marketPLaceContract.withdrawableBalance(userAddress);

            return ethers.utils.formatEther(balance);
        } catch (error) {
            const errorMessage = error.message || 'failed to fetch withdraw balance';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
    }, [getReadOnlyContracts, account]);

    // Get NFT metadata using queued fetch (SINGLE)
    const getNFTMetadata = useCallback(async (tokenId) => {
        try {
            const { ImagenftContract } = getReadOnlyContracts();
            const tokenURI = await ImagenftContract.tokenURI(tokenId);

            // Extract IPFS hash
            const ipfsHash = pinataService.extractIPFSHash(tokenURI);

            // Use queued fetch to prevent rate limiting
            console.log(`Fetching metadata for token ${tokenId}...`);
            const metadata = await pinataService.queuedFetch(ipfsHash);

            if (metadata.image) {
                metadata.imageGatewayUrl = pinataService.ipfsToGateway(metadata.image);
            }

            return {
                ...metadata,
                tokenURI,
                tokenURIGateway: pinataService.getGatewayUrl(ipfsHash)
            };
        } catch (error) {
            console.error(`Error fetching NFT metadata for token ${tokenId}:`, error);
            throw new Error("Failed to fetch NFT metadata");
        }
    }, [getReadOnlyContracts]);

    // Batch fetch multiple NFT metadata (OPTIMIZED FOR MARKETPLACE)
    const batchGetNFTMetadata = useCallback(async (tokenIds, batchSize = 3) => {
        try {
            console.log(`Batch fetching metadata for ${tokenIds.length} NFTs...`);
            
            const { ImagenftContract } = getReadOnlyContracts();

            // Step 1: Get all token URIs (fast, on-chain)
            console.log(`Fetching token URIs from blockchain...`);
            const tokenURIPromises = tokenIds.map(async (tokenId) => {
                try {
                    const uri = await ImagenftContract.tokenURI(tokenId);
                    return { tokenId, uri };
                } catch (error) {
                    console.warn(`Failed to get URI for token ${tokenId}:`, error.message);
                    return { tokenId, uri: null };
                }
            });

            const tokenURIResults = await Promise.all(tokenURIPromises);

            // Filter out failed URIs
            const validTokens = tokenURIResults.filter(result => result.uri !== null);
            console.log(`Got ${validTokens.length}/${tokenIds.length} valid token URIs`);

            // Step 2: Extract IPFS hashes
            const ipfsHashes = validTokens.map(result => 
                pinataService.extractIPFSHash(result.uri)
            );

            // Step 3: Batch fetch metadata from IPFS with rate limiting
            console.log(`Fetching metadata from IPFS (batched)...`);
            const metadataResults = await pinataService.batchFetchMetadata(ipfsHashes, batchSize);

            // Step 4: Combine results
            const nftsWithMetadata = validTokens.map((result, index) => {
                const metadata = metadataResults[index];
                
                if (!metadata) {
                    return {
                        tokenId: result.tokenId,
                        error: 'Failed to fetch metadata',
                        tokenURI: result.uri
                    };
                }

                // Add image gateway URL if image exists
                if (metadata.image) {
                    metadata.imageGatewayUrl = pinataService.ipfsToGateway(metadata.image);
                }

                return {
                    tokenId: result.tokenId,
                    ...metadata,
                    tokenURI: result.uri,
                    tokenURIGateway: pinataService.getGatewayUrl(ipfsHashes[index])
                };
            });

            const successCount = nftsWithMetadata.filter(nft => !nft.error).length;
            console.log(`Successfully loaded ${successCount}/${tokenIds.length} NFTs`);

            return nftsWithMetadata;

        } catch (error) {
            console.error("Error in batch fetch:", error);
            throw new Error("Failed to batch fetch NFT metadata");
        }
    }, [getReadOnlyContracts]);

    // Get royalty info
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

    // Subscribe to marketplace events
    const subscribeToMarketPlaceEvents = useCallback((onMarketplaceUpdate) => {
        if (!provider) {
            console.warn("Provider not available for event subscription");
            return null;
        }

        try {
            const marketplaceContract = new ethers.Contract(NFT_MARKETPLACE_ADDRESS, NFT_MARKETPLACE_ABI, provider);

            console.log("Setting up marketplace event listeners...");

            const handleUpdate = (eventName) => (...args) => {
                console.log(`${eventName} event detected:`, args);
                setTimeout(() => onMarketplaceUpdate(), 2000);
            };

            marketplaceContract.on("NFTListed", handleUpdate("NFTListed"));
            marketplaceContract.on("AuctionCreated", handleUpdate("AuctionCreated"));
            marketplaceContract.on("BidPlaced", handleUpdate("BidPlaced"));
            marketplaceContract.on("AuctionFinalized", handleUpdate("AuctionFinalized"));
            marketplaceContract.on("AuctionCancelled", handleUpdate("AuctionCancelled"));
            marketplaceContract.on("NFTpurchased", handleUpdate("NFTpurchased"));
            marketplaceContract.on("Listingcancelled", handleUpdate("Listingcancelled"));

            return () => {
                console.log("Cleaning up marketplace event listeners...");
                marketplaceContract.removeAllListeners("NFTListed");
                marketplaceContract.removeAllListeners("AuctionCreated");
                marketplaceContract.removeAllListeners("BidPlaced");
                marketplaceContract.removeAllListeners("AuctionFinalized");
                marketplaceContract.removeAllListeners("AuctionCancelled");
                marketplaceContract.removeAllListeners("NFTpurchased");
                marketplaceContract.removeAllListeners("Listingcancelled");
            };

        } catch (error) {
            console.error("Error setting up event listeners", error);
            return null;
        }
    }, [provider]);

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
        batchGetNFTMetadata, 
        getRoyaltyInfo,
        subscribeToMarketPlaceEvents,

        // Utility functions
        setError,
        clearError: () => setError(null),
    };
};

export default useNFT;