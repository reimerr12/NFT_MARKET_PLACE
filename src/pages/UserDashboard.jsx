import { useCallback, useEffect, useMemo, useState } from "react";
import {Plus,Grid3x3,ShoppingCart,Search,Filter,SortAsc,DollarSign,AlertCircle,TrendingUp,Eye,Loader2,Wallet,ChevronLeft,ChevronRight,Menu,X,Settings,Heart,Star,Clock,Tag,Activity,BarChart3,PieChart,Sparkles,Zap,Globe,Users,Flame,TrendingDown,Calendar,RefreshCw,Download,Share2,Bookmark,Grid,List,MoreVertical,ArrowUpDown,SlidersHorizontal,Layers,Image,Trophy,Target} from 'lucide-react';
import { BigNumber } from "ethers";
import { formatEther } from "ethers/lib/utils";
import { useWeb3 } from "../providers/Web3Provider";
import useNFT from "../providers/NFTProvider";
import NFTCard from "../components/NFTcard";
import MintNFTModal from "../components/MintNFTModal";

const DEFAULT_ITEMS_PER_PAGE = 12;
const ITEMS_PER_PAGE_OPTIONS = [8,14,24,36,40];

const UserDashboard = () =>{
    const{isConnected,account} = useWeb3();
    const{
        loading:txLoading,
        error:txError,
        mintNFT,
        listForSale,
        buyNFT,
        placeBid,
        createAuction,
        getUserCreatedNFTs,
        getUserPurchasedNFTs,
        getWithdrawableBalance,
        getActiveListings,
        getActiveAuctions,
        getNftInfo,
        getNFTMetadata,
        finalizeAuction,
        withdrawFunds
    } = useNFT();

    const[activeTab,getActiveTab] = useState('created');
    const[allNfts,setAllNfts] = useState({
        created:[],
        purchased:[],
        marketplace:[]
    });
    const[showMintModal,setShowMintModal] = useState(false);
    const[searchQuerry,setSearchQuerry] = useState('');
    const[sortBy,setSortBy] = useState('newest');
    const[dataLoading,setDataLoading] = useState(false);
    const[withdrawBalance,setWithdrawBalance] = useState('0.0');
    const[viewMode,setViewMode] = useState('grid');
    const[sideBarOpen,setSideBarOpen] = useState(false);
    const[filters,setFilters] = useState({
        priceRange:{min:"" , max:""},
        category:"all",
        status:"all",
        rarity:"all"
    });

    //pagination page
    const[currentPage,setCurrentPage] = useState(1);
    const[itemsPerPage,setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
    const[totalCount,setTotalCount] = useState({
        created:0,
        purchsed:0,
        marketplace:0
    });

    //default page to one
    useEffect(()=>{
        setCurrentPage(1);
    },[searchQuerry,activeTab,sortBy,itemsPerPage]);

    //load data while wallet conencts
    useEffect(()=>{
        if(isConnected && account){
            loadNFTData();
            loadWithdrawableBalance();
        }else{
            resetState();
        }
    },[isConnected,account]);

    const resetState = useCallback(()=>{
        setAllNfts({created:[],purchased:[],marketplace:[]}),
        setTotalCount({created:0,purchased:0,marketplace:0}),
        setWithdrawBalance('0.0');
        setCurrentPage(1);
        setDataLoading(false);
    },[]);

    const loadNFTData = useCallback(async()=>{
        if(!isConnected || !account) return 'please connect your metamask wallet';
        setDataLoading(true);

        try{
            const[createdTokenIds,purchasedTokenIds,activeListings,activeAuctions] = await Promise.all([
                getUserCreatedNFTs(),
                getUserPurchasedNFTs(),
                getActiveListings(),
                getActiveAuctions()
            ]);

            //update counts immedieatly
            const marketPlaceTokenIds = [...new Set([...activeListings,...activeAuctions])];
            setTotalCount({
                created:createdTokenIds.length,
                purchased:purchasedTokenIds.length,
                marketplace:marketPlaceTokenIds.length
            });

            //load metadata in smaller batches for smoother user experience
            const batchSize = 20;
            const loadNftBatch = async(tokenIds,startIndex = 0)=>{
                const batch = tokenIds.slice(startIndex,startIndex + batchSize);
                if(batch.length === 0 ) return [];

                const nftPromises = batch.map(async(tokenId)=>{
                    try {
                        const[metadata,info] = Promise.all([
                            getNFTMetadata(tokenId),
                            getNftInfo(tokenId)
                        ]);
                        return {tokenId,metadata,info};
                    } catch (error) {
                        console.error(`Error loading NFT ${tokenId}:`, error);
                        return null;
                    }
                });

                const results = await Promise.all(nftPromises);
                return results.filter(boolean);
            }

            //load all nfts in batches
            const loadAllNFTs = async(tokenIds)=>{
                const allResults = [];
                for(let i=0 ; i < tokenIds.length ; i += batchSize){
                    const batch = await loadNftBatch(tokenIds , i);
                    allResults.push(...batch);
                }
                return allResults;
            }

            const[createdWithMetadata,purchasedWithMetadata,marketplaceWithMetadata] = await Promise.all([
                loadAllNFTs(createdTokenIds),
                loadAllNFTs(purchasedTokenIds),
                loadAllNFTs(marketPlaceTokenIds)
            ]);

            setAllNfts({
                created: createdWithMetadata,
                purchased:purchasedWithMetadata,
                marketplace:marketplaceWithMetadata
            });
        }catch(error){
            console.error("error loading nft data",error);
        } finally{
            setDataLoading(false);
        }
    },[isConnected,account,getUserCreatedNFTs,getUserPurchasedNFTs,getActiveListings,getActiveAuctions,getNFTMetadata,getNftInfo]);

    //load withdrawabale balance
    const loadWithdrawableBalance = useCallback(async()=>{
        try {
            const balanceBigNumber =await getWithdrawableBalance();
            setWithdrawBalance(formatEther(balanceBigNumber || BigNumber.from(0)));
        } catch (error) {
            console.error('Error loading withdrawable balance:', error);
            setWithdrawBalance('0.0');
        }
    },[getWithdrawableBalance]);

    //apply filters to nfts
    const applyFilters = useCallback((nfts)=>{
        return nfts.filter(nft =>{
            //price filter
            if(filters.priceRange.min || filters.priceRange.max){
                const price = nft.info?.price ? parseFloat(formatEther(nft.info.price)) : 0;
                if(filters.priceRange.min && price < parseFloat(filters.priceRange.min)) return false;
                if(filters.priceRange.max && price > parseFloat(filters.priceRange.max)) return false;
            }

            //status filter
            if(filters.status !== 'all'){
                if(filters.status === 'listed' && !nft.info?.isListed) return false;
                if(filters.status === 'auction' && !nft.info?.isAuction) return false;
                if(filters.status === 'sold' && !nft.info?.isSold) return false;
            }
            
            return true;
        },[filters]);
    });

    const filteredAndSortedNfts = useMemo(()=>{
        let nfts = allNfts[activeTab] || [];

        if(searchQuerry.trim()){
            const querry = searchQuerry.toLocaleLowerCase();
            nfts = nfts.filter(nft =>{
                nft.metadata?.name?.toLocaleLowerCase().includes(querry) || nft.metadata?.description?.toLocaleLowerCase().includes(querry);
            });
        }

        //apply advanced filters
        nfts = applyFilters(nfts);

        
    });



}

export default UserDashboard;
