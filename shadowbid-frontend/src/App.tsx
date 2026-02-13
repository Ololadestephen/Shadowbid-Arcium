import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider } from './components/WalletProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SolanaProvider } from './lib/SolanaProvider';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import BrowseAuctions from './pages/BrowseAuctions';
import AuctionDetails from './pages/AuctionDetails';
import CreateAuction from './pages/CreateAuction';
import Dashboard from './pages/Dashboard';
import HowItWorks from './pages/HowItWorks';
import AuctionHistory from './pages/AuctionHistory';

function App() {
    return (
        <ErrorBoundary>
            <WalletProvider>
                <SolanaProvider>
                    <Router>
                        <div className="min-h-screen flex flex-col bg-background-main">
                            <Navbar />

                            <main className="flex-1">
                                <Routes>
                                    <Route path="/" element={<HomePage />} />
                                    <Route path="/browse" element={<BrowseAuctions />} />
                                    <Route path="/auction/:id" element={<AuctionDetails />} />
                                    <Route path="/create" element={<CreateAuction />} />
                                    <Route path="/dashboard" element={<Dashboard />} />
                                    <Route path="/how-it-works" element={<HowItWorks />} />
                                    <Route path="/history" element={<AuctionHistory />} />
                                </Routes>
                            </main>

                            <Footer />
                        </div>
                    </Router>
                </SolanaProvider>
            </WalletProvider>
        </ErrorBoundary>
    );
}

export default App;