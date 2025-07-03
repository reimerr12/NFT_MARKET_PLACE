import { useState,useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Wallet, UserCircle, LayoutGrid, ShoppingBag, Settings, LogOut, Search, ChevronDown, Rocket, BarChart, Sun, Moon} from 'lucide-react';
import { useWeb3 } from "../providers/Web3Provider";

const Navbar = () =>{
    const {isConnected,account,connectWallet,disconnectWallet,formatAddress} = useWeb3();
    
}

export default Navbar;