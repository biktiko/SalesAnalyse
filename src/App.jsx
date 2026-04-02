import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LineChart, Percent, Settings as SettingsIcon, Tag, Menu, X, Users as UsersIcon, Database } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Promotions from './pages/Promotions';
import Users from './pages/Users';
import Login from './pages/Login';
import Settings from './pages/Settings';
import Develop from './pages/Develop';
import './index.css';

const Sidebar = ({ onLogout }) => {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo flex items-center justify-center pt-2">
         <span className="font-bold text-2xl tracking-tight text-primary">Martin Star</span>
      </div>
      <nav className="sidebar-nav mt-8">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <LineChart size={20} />
          <span>Վերլուծություն</span>
        </NavLink>
        <NavLink to="/promotions" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Tag size={20} />
          <span>Ակցիաներ</span>
        </NavLink>
        {/* <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Percent size={20} />
          <span>Պրոդուկտներ</span>
        </NavLink> */}
        {/* <NavLink to="/users" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <UsersIcon size={20} />
          <span>Օգտատերեր</span>
        </NavLink> */}
        
        <NavLink to="/develop" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} text-[#0a84ff]`}>
          <Database size={20} />
          <span>SQL</span>
        </NavLink>

        <NavLink to="/settings" className={({ isActive }) => `nav-item mt-auto ${isActive ? 'active' : ''}`}>
          <SettingsIcon size={20} />
          <span>Կարգավորումներ</span>
        </NavLink>
      </nav>
      <div className="pt-4 mt-2 border-t border-[#8e8e93]/20 text-center">
        <p className="text-[11px] text-secondary font-bold uppercase tracking-widest mb-1">Օգտատեր</p>
        <p className="text-primary font-bold text-lg">Admin</p>
      </div>
    </aside>
  );
};

const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="mobile-nav">
       <div className="flex items-center">
          <span className="font-bold tracking-tight text-xl text-primary">Martin Star</span>
       </div>
       <div className="flex items-center justify-end flex-1 gap-2">
           <div id="mobile-header-actions"></div>
           <button className="btn-icon bg-transparent p-0 m-0" style={{ width: 32, height: 32 }} onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X size={26} /> : <Menu size={26} />}
           </button>
       </div>
       {/* Mobile Menu Overlay */}
       <div className={`mobile-menu-items shadow-2xl ${isOpen ? 'open' : ''}`}>
          <NavLink 
            to="/" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <LineChart size={20} />
            <span>Վերլուծություն</span>
          </NavLink>
          <NavLink 
            to="/promotions" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <Tag size={20} />
            <span>Ակցիաներ</span>
          </NavLink>
          <NavLink 
            to="/users" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <UsersIcon size={20} />
            <span>Օգտատերեր</span>
          </NavLink>
          <NavLink 
            to="/develop" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} text-[#0a84ff]`}
            onClick={() => setIsOpen(false)}
          >
            <Database size={20} />
            <span className="font-bold">SQL</span>
          </NavLink>
          <NavLink 
            to="/settings" 
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <SettingsIcon size={20} />
            <span>Կարգավորումներ</span>
          </NavLink>
       </div>
    </header>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // Keep-alive for Render.com backend
  React.useEffect(() => {
    const api_url = import.meta.env.VITE_API_URL;
    if (!api_url) return;

    const pingServer = async () => {
      try {
        // Simple dummy query to keep SSH and DB connection warm
        await fetch(`${api_url}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ queryText: 'SELECT 1' })
        });
        console.log('Backend pinged successfully to stay awake');
      } catch (e) {
        console.warn('Backend ping failed', e);
      }
    };

    // Ping every 30 seconds as requested ("constantly")
    const interval = setInterval(pingServer, 30000);
    pingServer(); // Immediate first ping

    return () => clearInterval(interval);
  }, []);

  if (!isAuthenticated) {
    return <Login onLogin={(userObj) => { setUser(userObj); setIsAuthenticated(true); }} />;
  }

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar onLogout={() => setIsAuthenticated(false)} user={user} />
        <MobileNav />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/products" element={<div className="title mb-8">Ապրանքներ (Շուտով)</div>} />
            <Route path="/users" element={<Users />} />
            <Route path="/develop" element={<Develop />} />
            <Route path="/settings" element={<Settings onLogout={() => setIsAuthenticated(false)} user={user} />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
