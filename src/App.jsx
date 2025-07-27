import { useState } from 'react';
import Web3Provider from './providers/Web3Provider';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import UserDashboard from './pages/UserDashboard';
import Marketplace from './pages/Marketplace';
import './App.css'

function App() {

  return (
    <Web3Provider>
      <Router>
        <Navbar />
        <Routes>
          <Route path='/dashboard' element={< UserDashboard />} />
          <Route path='/marketplace' element={< Marketplace />} />
        </Routes>
      </Router>
    </Web3Provider>
  )
}

export default App
