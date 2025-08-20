import { useCallback, useEffect, useMemo, useState } from "react";
import {Plus,Grid3x3,ShoppingCart,Search,Filter,SortAsc,DollarSign,AlertCircle,TrendingUp,Eye,Loader2,Wallet,ChevronLeft,ChevronRight,Menu,X,Settings,Heart,Star,Clock,Tag,Activity,BarChart3,PieChart,Sparkles,Zap,Globe,Users,Flame,TrendingDown,Calendar,RefreshCw,Download,Share2,Bookmark,Grid,List,MoreVertical,ArrowUpDown,SlidersHorizontal,Layers,Image,Trophy,Target} from 'lucide-react';
import { SiEthereum } from 'react-icons/si';
import { BigNumber } from "ethers";
import { formatEther } from "ethers/lib/utils";
import { useWeb3 } from "../providers/Web3Provider";
import useNFT from "../providers/NFTProvider";
import NFTCard from "../components/NFTcard";
import MintNFTModal from "../components/MintNFTModal";
import { meta } from "@eslint/js";

const DEFAULT_ITEMS_PER_PAGE = 8;
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
        purchased:0,
        marketplace:0
    });

    //default page to one
    // Keep this one and update it
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuerry, activeTab, sortBy, itemsPerPage, filters.priceRange.min, filters.priceRange.max, filters.status]);
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

            // Filter marketplace items to only include user's own listings/auctions
            const userMarketplaceTokenIds = [];
            
            // Check each active listing to see if it belongs to the current user
            for (const tokenId of activeListings) {
                try {
                    const nftInfo = await getNftInfo(tokenId);
                    if (nftInfo.owner && nftInfo.owner.toLowerCase() === account.toLowerCase()) {
                        userMarketplaceTokenIds.push(tokenId);
                    }
                } catch (error) {
                    console.warn(`Error checking ownership for listing ${tokenId}:`, error);
                }
            }
            
            // Check each active auction to see if it belongs to the current user
            for (const tokenId of activeAuctions) {
                try {
                    const nftInfo = await getNftInfo(tokenId);
                    if (nftInfo.owner && nftInfo.owner.toLowerCase() === account.toLowerCase()) {
                        // Avoid duplicates if an NFT is both listed and auctioned
                        if (!userMarketplaceTokenIds.includes(tokenId)) {
                            userMarketplaceTokenIds.push(tokenId);
                        }
                    }
                } catch (error) {
                    console.warn(`Error checking ownership for auction ${tokenId}:`, error);
                }
            }

            //update counts immediately
            setTotalCount({
                created:createdTokenIds.length,
                purchased:purchasedTokenIds.length,
                marketplace:userMarketplaceTokenIds.length
            });

            //load metadata in smaller batches for smoother user experience
            const loadNftBatch = async(tokenIds)=>{
                if(tokenIds.length === 0) return [];

                const nftPromises = tokenIds.map(async(tokenId)=>{
                    try {
                        const[metadata,info] = await Promise.all([
                            getNFTMetadata(tokenId),
                            getNftInfo(tokenId)
                        ]);

                        const processedInfo = {...info};

                        if(processedInfo.price !== undefined && processedInfo.price!== null ){
                            try {
                                processedInfo.price = BigNumber.from(processedInfo.price);
                            } catch (error) {
                                /* console.warn("error converting number to bignumber",processedInfo.price,error); */
                                processedInfo.price = BigNumber.from(0);
                            }
                        }else{
                            processedInfo.price = BigNumber.from(0);
                        }

                        if (processedInfo.highestBid !== undefined && processedInfo.highestBid !== null) {
                            try {
                                processedInfo.highestBid = BigNumber.from(processedInfo.highestBid);
                            } catch (e) {
                                /* console.warn(`Error converting highestBid to BigNumber for NFT ${tokenId}:`, processedInfo.highestBid, e); */
                                processedInfo.highestBid = BigNumber.from(0);
                            }
                        } else {
                            processedInfo.highestBid = BigNumber.from(0); 
                        }
                        return {tokenId,metadata,info:processedInfo};

                    } catch (error) {
                        console.error(`Error loading NFT ${tokenId}:`, error);
                        return null;
                    }
                });

                const results = await Promise.all(nftPromises);
                return results.filter(Boolean); 
            }

            // Load NFTs for each category
            const[createdWithMetadata,purchasedWithMetadata,marketplaceWithMetadata] = await Promise.all([
                loadNftBatch(createdTokenIds),
                loadNftBatch(purchasedTokenIds),
                loadNftBatch(userMarketplaceTokenIds) // Changed from marketPlaceTokenIds to userMarketplaceTokenIds
            ]);

            setAllNfts({
                created: createdWithMetadata,
                purchased: purchasedWithMetadata,
                marketplace: marketplaceWithMetadata
            });
            
        }catch(error){
            console.error("error loading nft data",error);
        } finally{
            setDataLoading(false);
        }
    },[isConnected,account,getUserCreatedNFTs,getUserPurchasedNFTs,getActiveListings,getActiveAuctions,getNFTMetadata,getNftInfo]);

    //load withdrawabale balance
    const loadWithdrawableBalance = useCallback(async() => {
        try {
            const balanceResult = await getWithdrawableBalance();
            

            if (balanceResult && typeof balanceResult === 'object' && balanceResult._isBigNumber) {

                setWithdrawBalance(formatEther(balanceResult));
            } else if (balanceResult && typeof balanceResult === 'string') {

                try {
                    const balanceBigNumber = BigNumber.from(balanceResult);
                    setWithdrawBalance(formatEther(balanceBigNumber));
                } catch (conversionError) {

                    setWithdrawBalance(balanceResult);
                }
            } else if (balanceResult && typeof balanceResult === 'number') {

                const balanceBigNumber = BigNumber.from(balanceResult.toString());
                setWithdrawBalance(formatEther(balanceBigNumber));
            } else {

                setWithdrawBalance('0.0');
            }
        } catch (error) {
            console.error('Error loading withdrawable balance:', error);
            setWithdrawBalance('0.0');
        }
    }, [getWithdrawableBalance]);

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
                if(filters.status === 'auction' && !nft.info?.isAuctioned) return false;
                if(filters.status === 'sold' && !nft.info?.isSold) return false;
            }
            
            return true;
        });
    },[filters]);

    const getNFTDisplayDataForSearch = (nft)=>{
        const metadata = nft.metadata || {};

        let name = metadata.name || metadata.title || metadata.displayName;

        if(!name && typeof metadata === 'object'){
            const keys = Object.keys(metadata).filter(key => /^\d+$/.test(key)).sort((a,b)=> parseInt(a) - parseInt(b));
            if(keys.length > 0){
                name = keys.map(key => metadata[key]).join('');
            }
        }

        if(!name){
            name = `#NFT${nft.tokenId}`
        }

        const description = metadata.description || metadata.desc || metadata.summary || '';

        return {name,description};
    }

    const filteredAndSortedNfts = useMemo(()=>{
        if(!allNfts[activeTab]) return [];
        let nfts = allNfts[activeTab] || [];

        if(searchQuerry.trim()){
            const querry = searchQuerry.toLocaleLowerCase();
            nfts = nfts.filter(nft =>{
                const{name,description} = getNFTDisplayDataForSearch(nft);

                return name.toLocaleLowerCase().includes(querry) || description.toLocaleLowerCase().includes(querry);
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
                    const priceA= a.info?.price ? BigNumber.from(a.info.price) : BigNumber.from(0);
                    const priceB = b.info?.price ? BigNumber.from(b.info.price) : BigNumber.from(0);
                    return priceA.gt(priceB) ? 1 : priceB.lt(priceA) ? -1 : 0;
                });
                break;
                default:
                break;
        }
        return nfts;
    },[allNfts,activeTab, searchQuerry, sortBy, applyFilters, filters.priceRange.min, filters.priceRange.max, filters.status]);


    //memoized pagination
    const paginatedNFTs = useMemo(()=>{
        if(!filteredAndSortedNfts?.length) return [];

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredAndSortedNfts.slice(startIndex,endIndex);
    },[filteredAndSortedNfts,currentPage,itemsPerPage]);

    //calculate pagination info
    const totalPages = (!filteredAndSortedNfts?.length) ? 0 : Math.ceil(filteredAndSortedNfts.length/itemsPerPage);
    const hasNextPage = !dataLoading && totalPages > 0 && currentPage < totalPages;
    const hasPrevPage = !dataLoading && currentPage > 1;


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

    const handleListForSale = useCallback(async(tokenId,price)=>{
        try {
            await listForSale(tokenId,price);
            await loadNFTData();
            console.log("nft has been set up for sale successfully",tokenId);
        } catch (error) {
            console.error("there is an error in the handleListForSale",(txError || error.message || 'Unknown error'));
            throw error;
        }
    },[]);

    const handleCreateAuction = useCallback(async(tokenId,reservePrice,duration)=>{
        try {
            await createAuction(tokenId,reservePrice,duration);
            await loadNFTData();
            console.log("auction has been created for nft",tokenId);
        } catch (error) {
            console.error('there is an error in the handleCreateAuction ',(txError || error.message || 'Unknown error'));
            throw error;
        }
    },[])

    const handleFinalizeAuction = useCallback(async(tokenId) =>{
        try {
            await finalizeAuction(tokenId);
            await loadNFTData();
            console.log(`Auction for NFT ${tokenId} finalized successfully!`)
        } catch (error) {
            console.error("there is an error in the handleFinalizeAuction",(txError || error.message || 'Unknown error'));
            throw error;
        }
    },[])

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
        window.scrollTo({top:0,behaviour:'smooth'});
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
    
    return(
        <div className="min-h-screen bg-[#202225]">
            {/* Mobile Sidebar Overlay */}
            {sideBarOpen && (
                <div 
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setSideBarOpen(false)}
                />
            )}

            {/* sideBar */}
            <div className={`fixed top-16 bottom-0 left-0 z-30 w-80 bg-[#34373B] border-r border-gray-700 transform transition-transform duration-200 ease-in-out ${sideBarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 overflow-y-auto`}>

                <div className="flex items-center justify-between p-6 border-b border-gray-700 lg:hidden">
                    <h2 className="text-xl font-bold text-white">Filters</h2>
                    <button onClick={()=> setSideBarOpen(false)} className="p-2 rounded-lg hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5 text-red-400" />
                    </button>
                </div>

                <div className="p-6 space-y-8 h-full overflow-y-scroll">
                    {/* quickStats */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center capitalize">
                            quick stats
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-blue-500/50 to-blue-600/20 rounded-2xl p-4 border border-blue-500/30 ">
                                <div className="flex items-center mb-2">
                                    <Sparkles className="h-5 w-5 text-blue-500" />
                                </div>
                                <p className="text-2xl font-bold text-white">{totalCount.created}</p>
                                <p className="text-sm text-blue-500">Created</p>
                            </div>

                            <div className="bg-gradient-to-br from-blue-500/50 to-blue-600/20 rounded-2xl p-4 border border-blue-500/30 ">
                                <div className="flex items-center mb-2">
                                    <ShoppingCart className="h-5 w-5 text-blue-500" />
                                </div>
                                <p className="text-2xl font-bold text-white">{totalCount.purchased}</p>
                                <p className="text-sm text-blue-500">Owned</p>
                            </div>
                        </div>
                    </div>

                    {/* search */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center">
                            <Search className="h-5 w-5 mr-2 text-gray-400" />
                            Search
                        </h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                            <input 
                                type="text"
                                placeholder="search by name or description"
                                value={searchQuerry}
                                onChange={(e)=>setSearchQuerry(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-600 bg-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-500 transition-all duration-200"
                             />
                        </div>
                    </div>

                    {/* price-Range */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center capitalize">
                            <SiEthereum className="h-5 w-5 text-blue-500 mr-2" />
                            price Range
                        </h3>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Min</label>
                                <input 
                                    type="number"
                                    placeholder="0"
                                    value={filters.priceRange.min}
                                    onChange={(e)=>setFilters(prev => ({
                                        ...prev,
                                        priceRange : {...prev.priceRange, min:e.target.value}
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Max</label>
                                <input 
                                    type="number"
                                    placeholder="0"
                                    value={filters.priceRange.max}
                                    onChange={(e)=>setFilters(prev => ({
                                        ...prev,
                                        priceRange : {...prev.priceRange, max:e.target.value}
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white text-sm"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* status-filter */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center">
                           <Activity className="w-5 h-5 mr-2 text-blue-500" />  
                           Status
                        </h3>
                        <div className="space-y-2">
                            {[
                                {value:'all',label:'All Items', icon:Grid3x3},
                                {value:'listed',label:'Listed', icon:Tag},
                                {value:'auction',label:'Auction',icon:Clock},
                                {value:'sold',label:'Sold',icon:TrendingUp}
                            ].map((option)=>{
                                return <label key={option.value} className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-700 cursor-pointer transition-colors">
                                    <input 
                                        type="radio" 
                                        name="status"
                                        value={option.value}
                                        checked={filters.status === option.value}
                                        onChange={(e)=>setFilters(prev => ({...prev,status:e.target.value}))}
                                        className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
                                    />
                                    <option.icon className="h-5 w-5 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-300">{option.label}</span>
                                </label>
                            })}
                        </div>
                    </div>

                    {/* sort-options */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-white flex items-center">
                            <ArrowUpDown className="w-5 h-5 mr-2 text-orange-400 capitalize"/>
                            sort by
                        </h3>
                        <select 
                            value={sortBy} 
                            onChange={(e)=>setSortBy(e.target.value)}
                            className="w-full px-5 py-3  border border-gray-600 bg-gray-700 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white transition-all duration-200"
                        >
                            <option value="newest">Recently created</option>
                            <option value="oldest">Oldest First</option>
                            <option value="price_high">Price: High to Low</option>
                            <option value="price_low">Price: Low to High</option>
                        </select>
                    </div>

                    {/* clear-filters */}
                    <button onClick={clearFilters} className="w-full py-3 px-4 bg-gray-700 text-gray-300 rounded-2xl hover:bg-gray-600 transition-colors font-medium">
                            Clear All Filters
                    </button>
                </div>
            </div>  

            {/* main-content */}
            <div className="lg:ml-80 min-h-screen pt-16">
                {/* header */}
                <div className="bg-[#34373B] border-b border-gray-700 top-0">
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <button onClick={()=>setSideBarOpen(true)} className="p-2 rounded-lg hover:bg-gray-700 transition-colors lg:hidden">
                                    <Menu className="w-5 h-5 text-gray-400" />
                                </button>
                                <div>
                                    <h1 className="text-lg lg:text-2xl font-bold text-blue-500 capitalize">My collections</h1>
                                    <p className="text-gray-400 text-sm md:text-base capitalize">Manage your NFTs and track your portfolio</p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                {parseFloat(withdrawBalance) > 0 && (
                                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl px-4 py-2 flex items-center space-x-3 shadow-lg">
                                        <SiEthereum className="w-5 h-5" />
                                        <div>
                                            <p className="text-sm font-medium">Available</p>
                                            <p className="text-lg font-bold">{parseFloat(withdrawBalance).toFixed(4)}</p>
                                        </div>
                                        <button className="ml-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 disabled:opacity-50 transition-colors text-sm font-semibold" onClick={handleWithDrawFunds} disabled={txLoading}>
                                            {txLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Withdraw'}
                                        </button>
                                    </div>
                                )}
                                <button onClick={()=>setShowMintModal(true)} className="flex items-center space-x-2 px-4 py-2 bg-[#202225] border-2 border-blue-500 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl font-semibold">
                                    <Plus className="h-5 w-5" />
                                    <span>Create NFT</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* content-area */}
                <div className="p-6">
                    {txError && (
                        <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                            <div className="flex items-center">
                                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                                <p className="text-red-300 font-medium">{txError}</p>
                            </div>
                        </div>
                    )}

                    {/* tabs */}
                    <div className="bg-[#34373B] rounded-2xl border border-gray-500 overflow-hidden mb-6">
                        <div className="border-b border-gray-700">
                            <nav className="flex space-x-8 px-6">
                                {[
                                    {key:'created',label:'Created', icon:Sparkles, count:totalCount.created},
                                    {key:'purchased',label:'Collected', icon:Heart, count:totalCount.purchased},
                                    {key:'marketplace',label:'Marketplace', icon:Globe , count:totalCount.marketplace}
                                ].map((tab) => (
                                    <button 
                                    key={tab.key}
                                    onClick={()=> getActiveTab(tab.key)}
                                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-semibold text-sm transition-colors duration-200 ${activeTab === tab.key ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
                                    >
                                        <tab.icon className="h-5 w-5"/>
                                        <span>{tab.label}</span>
                                        <span className="bg-gray-700 text-gray-300 rounded-full px-2 py-1 text-xs font-medium">
                                            {tab.count}
                                        </span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* controls */}
                        <div className="p-2 bg-[#34373B]/50 border-b border-gray-700">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="flex items-center bg-gray-700 space-x-2 rounded-xl border border-gray-600 p-1">
                                        <button onClick={()=>setViewMode('grid')} className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-400 bg-gray-600'}`}>
                                            <Grid className="h-5 w-5"/>
                                        </button>   

                                        <button onClick={()=>setViewMode('list')} className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-400 bg-gray-600'}`}>
                                            <List className="h-5 w-5"/>
                                        </button> 
                                    </div>

                                    <select value={itemsPerPage} onChange={(e)=>{setItemsPerPage(parseInt(e.target.value))}} className="bg-gray-700 rounded-lg px-2 py-2 text-white border border-blue-500">
                                        {ITEMS_PER_PAGE_OPTIONS.map(option =>(
                                            <option key={option} value={option}>
                                                {option} NFTs
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center space-x-4">
                                    <button onClick={loadNFTData} disabled={dataLoading} className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                        {dataLoading ? (
                                            <Loader2 className="animate-spin h-5 w-5" />
                                        ):(
                                            <RefreshCw className="h-5 w-5" />
                                        )}
                                        <span className="capitalize">refresh data</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* NFT-DISPLAY-AREA */}
                        <div className="p-6">
                            {dataLoading && allNfts[activeTab]?.length ===0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                                    <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
                                    <p className="text-lg font-medium">loading nfts...</p>
                                    <p className="text-sm text-gray-500 mt-1">this might take a moment</p>
                                </div>
                            ): paginatedNFTs.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Image className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-xl font-semibold mb-2 capitalize">no nfts found</p>
                                    <p className="text-gray-400 capitalize">
                                        {searchQuerry || filters.priceRange.min || filters.priceRange.max || filters.status !== 'all' ? 'try adjusting your filters or searchQuery' : 'you currently have no nfts in this category'}
                                    </p>

                                    {activeTab === 'created' && (
                                        <button onClick={()=>setShowMintModal(true)} className="flex items-center space-x-2 px-4 py-2 bg-[#202225] border-2 border-blue-500 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all duration-200 shadow-lg hover:shadow-xl font-semibold">
                                            <Plus className="h-5 w-5 " />
                                            <span className="capitalize">create your first nft</span>
                                        </button>
                                    )}
                                </div>
                            ):(
                                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ' : 'grid-cols-1'}`}>
                                    {paginatedNFTs.map(nft =>(
                                        <NFTCard 
                                            key={nft.tokenId}
                                            nft={nft}
                                            account={account}
                                            onListForSale={handleListForSale}
                                            onCreateAuction={handleCreateAuction}
                                            onFinalizeAuction={handleFinalizeAuction}
                                            txLoading={txLoading}
                                            txError={txError}
                                            loadNFTData={loadNFTData}
                                            showOwnerActions={nft.info?.owner?.toLowerCase() === account?.toLowerCase()}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* pagination */}
                            {!dataLoading &&totalPages > 1 && (
                                <div className="flex justify-center items-center space-x-8 mt-4">
                                    <button onClick={()=>handlePageChange(currentPage -1)} disabled={!hasPrevPage} className="p-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>


                                    <span className="text-gray-300 font-medium">
                                        Page {currentPage} of {totalPages}
                                    </span>


                                    <button onClick={()=>handlePageChange(currentPage + 1)} disabled={!hasNextPage} className="p-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-white">
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <MintNFTModal 
                isOpen={showMintModal}
                onClose={()=>setShowMintModal(false)}
                onMint={handleMintNFT}
                loading={txLoading}
                error={txError}
            />
        </div> 
        
    )
}
export default UserDashboard;