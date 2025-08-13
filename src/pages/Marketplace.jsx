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
    const{isConnected,account} = useWeb3();
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

    useEffect(()=>{
        loadMarketplaceNftData();
    },[isConnected,account]);

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
            console.error("Error loading marketplace data:", err);
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

        const nfts = allMarketplaceNfts;
        if(searchQuery.trim()){
            const query = searchQuery.toLocaleLowerCase();
            nfts = nfts.filter((nft)=>{
                const {name , description} = getDisplayDataForSearch(nft);
                return(name.toLocaleLowerCase().includes(query) || description.toLocaleLowerCase().includes(query));
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
    const mosaicLayout = (nfts) =>{
        return nfts.map((nft,index)=>{
            
        })
    }
}

export default Marketplace;