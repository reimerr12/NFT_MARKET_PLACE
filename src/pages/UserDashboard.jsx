import { useCallback, useEffect, useMemo, useState } from "react";
import {Plus,Grid3x3,ShoppingCart,Search,Filter,SortAsc,DollarSign,AlertCircle,TrendingUp,Eye,Loader2,Wallet,ChevronLeft,ChevronRight,Menu,X,Settings,Heart,Star,Clock,Tag,Activity,BarChart3,PieChart,Sparkles,Zap,Globe,Users,Flame,TrendingDown,Calendar,RefreshCw,Download,Share2,Bookmark,Grid,List,MoreVertical,ArrowUpDown,SlidersHorizontal,Layers,Image,Trophy,Target} from 'lucide-react';
import { BigNumber } from "ethers";
import { formatEther } from "ethers/lib/utils";
import { useWeb3 } from "../providers/Web3Provider";
import useNFT from "../providers/NFTProvider";
import NFTCard from "../components/NFTcard";
import MintNFTModal from "../components/MintNFTModal";
import { meta } from "@eslint/js";

const DEFAULT_ITEMS_PER_PAGE = 12;
const ITEMS_PER_PAGE_OPTIONS = [8,14,24,36,40];

const UserDashboard = () =>{
    const{isConnected,account} = useWeb3();
    const{
        loading:txLoading,
        error:txError,
        mintNFT,
        listForSale,
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

        //sort nfts
        switch(sortBy){
            case 'newest':
                nfts = [...nfts].sort((a,b)=> parseInt(b.tokenId) - parseInt(a.tokenId));
                break;
            case 'oldest':
                nfts = [...nfts].sort((a,b)=> parseInt(a.tokenId) - parseInt(b.tokenId));
                break;
            case 'price_high':
                nfts = [...nfts].sort((a,b)=> {
                    const priceA = a.info?.price ? BigNumber.from(a.info.price) : BigNumber.from(0);
                    const priceB = b.info?.price ? BigNumber.from(b.info.price) : BigNumber.from(0);
                    return priceB.gt(priceA) ? 1 : priceA.lt(priceB) ? -1 : 0;
                });
                break;
            case 'price_low':
                nfts=[...nfts].sort((a,b)=>{
                    const priceA= nfts.info?.price ? BigNumber.from(a.info.price) : BigNumber.from(0);
                    const priceB = b.info?.price ? BigNumber.from(b.info.price) : BigNumber.from(0);
                    return priceA.gt(priceB) ? 1 : priceB.lt(priceA) ? -1 : 0;
                });
                break;
                default:
                break;
        }
        return nfts;
    },[allNfts,activeTab,searchQuerry,sortBy,applyFilters]);

    //memoized pagination
    const pagination = useMemo(()=>{
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredAndSortedNfts.slice(startIndex,endIndex);
    },[filteredAndSortedNfts,currentPage,itemsPerPage]);

    //calculate oagination info
    const totalPages = Math.ceil(filteredAndSortedNfts.length / itemsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    //event handlers
    const handleMintNFT = async(imageFile,metadata,royaltyBps)=>{
        try {
            await mintNFT(imageFile,metadata,royaltyBps);
            await loadNFTData();
            setShowMintModal(false);
        } catch (error) {
            console.error("there is an error in the handleMintNft",(txError || error.message || 'Unknown error'));
            throw error;
        }
    }

    const handleListForSale = async(tokenId,price)=>{
        try {
            await listForSale(tokenId,price);
            await loadNFTData();
            console.log("nft has been set up for sale successfully",tokenId);
        } catch (error) {
            console.error("there is an error in the handleListForSale",(txError || error.message || 'Unknown error'));
            throw error;
        }
    }

    const handleCreateAuction = async(tokenId,reservePrice,duration)=>{
        try {
            await createAuction(tokenId,reservePrice,duration);
            await loadNFTData();
            console.log("auction has been created for nft",tokenId);
        } catch (error) {
            console.error('there is an error in the handleCreateAuction ',(txError || error.message || 'Unknown error'));
            throw error;
        }
    }

    const handleFinalizeAuction = async(tokenId) =>{
        try {
            await finalizeAuction(tokenId);
            await loadNFTData();
            console.log(`Auction for NFT ${tokenId} finalized successfully!`)
        } catch (error) {
            console.error("there is an error in the handleFinalizeAuction",(txError || error.message || 'Unknown error'));
            throw error;
        }
    }

    const handleWithDrawFunds = async()=>{
        try {
            await withdrawFunds();
            await loadWithdrawableBalance();
            console.log("funds have been withdrawn successfully");
        } catch (error) {
            console.error("there is an error in the handleWithdrawFunction",(txError || error.message || 'Unknown error'));
            throw error;
        }
    }

    const handlePageChange = (page) =>{
        setCurrentPage(page);
        window.scrollTo({top:0,behavious:'smooth'});
    };

    const clearFilters = ()=>{
        setFilters({
            priceRange: {min:'',max:''},
            category:'all',
            status:'all',
            rarity:'all'
        });
    }

    if(!isConnected){
        return(
            <div className="min-h-screen bg-[#202225] flex items-center justify-center p-4">
                <div className="text-center bg-[#34373B] rounded-3xl shadow-2xl p-12 max-w-md w-full border border-gray-700">
                    <div className="mb-8">
                        <div className="h-20 w-20 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                            <Wallet className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">Connect Your Wallet</h2>
                        <p className="text-gray-300 text-lg leading-relaxed">Please connect your Web3 wallet to access your NFT dashboard and manage your collection.</p>
                    </div>
                </div>
            </div>
        );
    }




}

export default UserDashboard;
