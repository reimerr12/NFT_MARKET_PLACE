import { useState,useEffect,useCallback,useMemo } from "react";
import { Plus, Grid3x3, ShoppingCart, Search, Filter, SortAsc, DollarSign, AlertCircle, TrendingUp, Eye, Loader2, Wallet, ChevronLeft, ChevronRight, Menu, X, Settings, Heart, Star, Clock, Tag, Activity, BarChart3, PieChart, Sparkles, Zap, Globe, Users, Flame, TrendingDown, Calendar, RefreshCw, Download, Share2, Bookmark, Grid, List, MoreVertical, ArrowUpDown, SlidersHorizontal, Layers, Image, Trophy, Target } from "lucide-react";
import { SiEthereum } from "react-icons/si";
import { BigNumber } from "ethers";
import { formatEther } from "ethers/lib/utils";
import useNFT from "../providers/NFTProvider";
import NFTCard from "../components/NFTcard";
import MosaicNFTCard from "../components/MosaicNFTCard";
import { useWeb3 } from "../providers/Web3Provider";

const DEFAULT_ITEMS_PER_PAGE = 25;
const ITEMS_PER_PAGE_OPTIONS = [25,35,45,55];

const Marketplace = () =>{
    const{isConnected,account,provider} = useWeb3();
    const {
        loading: txLoading,
        error: txError,
        buyNFT,
        placeBid,
        getActiveListings,
        getActiveAuctions,
        getNftInfo,
        getNFTMetadata,
        finalizeAuction,
        cancelAuction,
        cancelListing,
        setError,
    } = useNFT();

    const[allMarketplaceNfts,setAllmarketplaceNfts] = useState([]);
    const[searchQuery,setSearchQuery] = useState('');
    const[sortBy,setSortBy] = useState('newest');
    const[viewMode,setViewMode] = useState('grid');
    const[sideBarOpen,setSideBarOpen] = useState(false);
    const[filters,setFilters] =  useState({
        priceRange:{min:'',max:''},
        status:'all'
    });
    const[dataLoading,setDataLoading] = useState(false);

    //pagination
    const[currentPage,setCurrentPage] = useState(1);
    const[itemsPerPage,setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);

    useEffect(()=>{
        setCurrentPage(1);
    },[searchQuery,sortBy,itemsPerPage,filters]);

    //main loading function
    const loadMarketplaceNftData = useCallback(async()=>{
        setDataLoading(true);
        if (setError) setError(null);

        try {
            const[activeListings,activeAuctions] = await Promise.all([
                getActiveListings(),
                getActiveAuctions()
            ]);

            const marketPlaceTokenIds = [...new Set([...activeListings,...activeAuctions])];

            const loadNftBatch = async(tokenIds)=>{
                if(tokenIds.length === 0) return [];

                const nftPromises = tokenIds.map(async(tokenId)=>{
                    try {
                        const[metadata , info] = await Promise.all([
                            getNFTMetadata(tokenId),
                            getNftInfo(tokenId)
                        ]);

                        const processedInfo = {...info};

                        if(processedInfo.price !== undefined && processedInfo.price !== null){
                            try {
                                if(!BigNumber.isBigNumber(processedInfo.price)){
                                    processedInfo.price = BigNumber.from(processedInfo.price.toString());
                                }
                            } catch (error) {
                                console.warn("Error converting price to BigNumber", processedInfo.price, error);
                                processedInfo.price = BigNumber.from(0);
                            }
                        }else{
                            processedInfo.price = BigNumber.from(0);
                        }

                        if(processedInfo.highestBid !== undefined && processedInfo.highestBid !== null){
                            try {
                                if(!BigNumber.isBigNumber(processedInfo.highestBid)){
                                    processedInfo.highestBid = BigNumber.from(processedInfo.highestBid.toString());
                                }
                            } catch (error) {
                                console.warn(`Error converting highestBid to BigNumber for NFT ${tokenId}:`, processedInfo.highestBid, error);
                                processedInfo.highestBid = BigNumber.from(0);
                            }
                        }else{
                            processedInfo.highestBid = BigNumber.from(0);
                        }

                        return{tokenId,metadata,info:processedInfo};

                    } catch (error) {
                        console.error(`Error loading NFT ${tokenId}:`, error);
                        return null;
                    }
                });

                const results = await Promise.all(nftPromises);
                return results.filter(Boolean);

            }
            const loadedMarketplaceNfts = await loadNftBatch(marketPlaceTokenIds);
            setAllmarketplaceNfts(loadedMarketplaceNfts);
        } catch (error) {
            console.error("Error loading marketplace data:", error);
            const errorMessage = error.message || "Failed to load marketplace NFTs.";
            if (setError) setError(errorMessage);
        }finally{
            setDataLoading(false);
        }
    },[getActiveListings,getActiveAuctions,getNFTMetadata,getNftInfo,setError]);

    //apply filters
    const applyFilters = useCallback((nfts)=>{
        return nfts.filter((nft)=>{
            if(filters.priceRange.min || filters.priceRange.max){
                let price = 0;

                if(nft.info?.price && nft.info?.isListed){
                    price = parseFloat(formatEther(nft.info?.price));
                }
                else if(nft.info?.isAuctioned && nft.info?.highestBid){
                    price = parseFloat(formatEther(nft.info?.highestBid));
                }

                if(filters.priceRange.min && price < parseFloat(filters.priceRange.min)){
                    return false;
                }
                if(filters.priceRange.max && price > parseFloat(filters.priceRange.max)){
                    return false;
                }
            }

            //status-filter
            if(filters.status !== 'all'){
                    if(filters.status === 'listed' && !nft.info?.isListed) return false;
                    if(filters.status === 'auction' && !nft.info?.isAuctioned) return false;
                }
            return true;
        });
    },[filters]);

    const getDisplayDataForSearch  = (nft) =>{
        const metadata = nft.metadata || {};

        let name = metadata.name || metadata.title || metadata.displayName;

        if(!name && typeof metadata === 'object'){
            const keys = Object.keys(metadata).filter((key)=>/^\d+$/.test(key)).sort((a,b)=> parseInt(a) - parseInt(b));
            if(keys.length > 0){
                name = keys.map((key)=> metadata[key]).join("");
            }
        }

        if(!name){
            name = `#NFT${nft.tokenId}`;
        }

        let description = metadata.description || metadata.desc || metadata.summary || '';

        return{name,description};
    }

    const filteredAndSortedNfts = useMemo(()=>{

        let nfts = allMarketplaceNfts;
        if(searchQuery.trim()){
            const query = searchQuery.toLowerCase();
            nfts = nfts.filter((nft)=>{
                const {name , description} = getDisplayDataForSearch(nft);
                return(name.toLowerCase().includes(query) || description.toLowerCase().includes(query));
            });
        }

        nfts = applyFilters(nfts);

        switch(sortBy){
            case 'newest':
                nfts = [...nfts].sort((a,b) => parseInt(b.tokenId) - parseInt(a.tokenId));
                break;
            case 'oldest':
                nfts = [...nfts].sort((a,b) => parseInt(a.tokenId) - parseInt(b.tokenId));
                break;
            case 'price_high':
                nfts= [...nfts].sort((a,b)=>{
                    const priceA = a.info?.isListed ? a.info?.price : (a.info?.highestBid || BigNumber.from(0));
                    const priceB = b.info?.isListed ? b.info?.price : (b.info?.highestBid || BigNumber.from(0));
                    return priceB.gt(priceA) ? 1 : priceA.lt(priceB)? -1 : 0;
                });
                break;
            case 'price_low':
                nfts = [...nfts].sort((a,b)=>{
                    const priceA = a.info?.isListed ? a.info?.price : (a.info?.highestBid || BigNumber.from(0));
                    const priceB = b.info?.isListed ? b.info?.price : (b.info?.highestBid || BigNumber.from(0));
                    return priceA.gt(priceB) ? 1 : priceB.lt(priceA) ? -1 : 0;
                });
                break;
                default:
                break;
        }
        return nfts;
    },[allMarketplaceNfts,searchQuery,sortBy,applyFilters]);

    //mosaic-layout
    const getMosaicLayout = (nfts) =>{
        return nfts.map((nft,index)=>{
            const patterns =[
                'small',
                'small',
                'medium',
                'large',
                'small',
                'medium',
                'wide',
                'small',
                'tall',
                'medium',
                'small',
                'featured'
            ]

            const size = patterns[index % patterns.length];

            return {...nft,mosaicSize:size};
        })
    };

    const paginatedNFTS = useMemo(()=>{
        if(!filteredAndSortedNfts?.length) return [];

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const sliced = filteredAndSortedNfts.slice(startIndex,endIndex);

        return viewMode === 'mosaic' ? getMosaicLayout(sliced):sliced;
    },[filteredAndSortedNfts,currentPage,itemsPerPage,viewMode]);

    //caluclate pagination info
    const totalPages = (!filteredAndSortedNfts?.length) ? 0 : Math.ceil(filteredAndSortedNfts.length/itemsPerPage);
    const hasNextPage = !dataLoading && currentPage > 0 && currentPage < totalPages;
    const hasprevPage = !dataLoading && currentPage > 1;

    //event handlers
    const handleBuyNFT = useCallback(async(tokenId)=>{
        try {
            await buyNFT(tokenId);
            await loadMarketplaceNftData();
            console.log('nft bought successfully');
        } catch (error) {
            console.error("Error buying NFT:", txError || error.message || "Unknown error");
            throw error;
        }
    },[buyNFT,loadMarketplaceNftData,txError]);

    const handlePlaceBid = useCallback(async(tokenId,bidAmount)=>{
        try {
            await placeBid(tokenId,bidAmount);
            await loadMarketplaceNftData();
            console.log("bid places successfully for token id",tokenId);
        } catch (error) {
            console.error("Error bidding for NFT:", txError || error.message || "Unknown error");
            throw error;
        }
    },[placeBid,loadMarketplaceNftData,txError]);

    const handleFinalizeAuction = useCallback(async(tokenId)=>{
        try {
            await finalizeAuction(tokenId);
            await loadMarketplaceNftData();
            console.log(`auction has been finalized for ${tokenId}`);
        } catch (error) {
            console.error("Error in finalizing nft NFT:", txError || error.message || "Unknown error");
            throw error;
        }
    },[finalizeAuction,loadMarketplaceNftData,txError]);

    const handleCancelListing = useCallback(async(tokenId)=>{
        try {
            await cancelListing(tokenId);
            await loadMarketplaceNftData();
            console.log(`listing for nft ${tokenId} has been cancelled`)
        } catch (error) {
            console.error("Error cancelling listing for NFT:", txError || error.message || "Unknown error");
            throw error;
        }
    },[cancelListing,loadMarketplaceNftData,txError]);

    const handleCancelAuction = useCallback(async(tokenId)=>{
        try {
            await cancelAuction(tokenId);
            await loadMarketplaceNftData();
            console.log(`Auction for NFT ${tokenId} cancelled successfully!`)
        } catch (error) {
            console.error("Error in handleCancelAuction", txError || error.message || "Unknown error");
            throw error;
        }
    },[cancelAuction,loadMarketplaceNftData,txError]);

    const handlePageChange = (page)=>{
        setCurrentPage(page);
        window.scrollTo({top:0,behavior:'smooth'});
    }
    const clearFilters = () =>{
        setFilters({
            priceRange:{max: '',min:''},
            status:'all'
        });
        setSearchQuery('');
        setSortBy('newest');
    };

    useEffect(()=>{
        if(isConnected && account && provider){
            loadMarketplaceNftData();
        }
    },[isConnected,account,provider,loadMarketplaceNftData]);

    const displayError = txError;
    
    if(!isConnected){
        return(
            <div className="bg-[#202225] min-h-screen flex items-center justify-center p-4">
                <div className="text-center bg-[#34373B] rounded-3xl shadow-2xl p-12 max-w-md w-full border border-gray-700">
                    <div className="mb-8">
                        <div className="h-20 w-20 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                            <Wallet className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
                        <p className="text-gray-300 text-lg leading-relaxed">Please connect your Web3 wallet to browse and interact with the NFT marketplace.</p>
                    </div>
                </div>
            </div>
        )
    }
}

export default Marketplace;