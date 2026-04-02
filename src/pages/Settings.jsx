import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, LogOut, User as UserIcon } from 'lucide-react';

const Settings = ({ onLogout, user }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.body.classList.contains('dark-mode');
  });

  const toggleTheme = (mode) => {
    if (mode === 'dark') {
      document.body.classList.add('dark-mode');
      setIsDarkMode(true);
    } else {
      document.body.classList.remove('dark-mode');
      setIsDarkMode(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.4 }}
      className="max-w-3xl"
    >
      <div className="mb-8">
        <h1 className="title-font" style={{ fontSize: '32px', fontWeight: 'bold' }}>Կարգավորումներ</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* User Card - Beautiful compact card */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
           <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
              <UserIcon size={30} style={{ color: 'var(--accent-blue)' }} />
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <p style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Օգտատեր</p>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: '2px 0 0 0', color: 'var(--text-primary)', lineHeight: 1 }}>{user?.name || 'Admin'}</h2>
              <p style={{ fontSize: '13px', color: 'var(--accent-blue)', fontWeight: '700' }}>{user?.role || 'Superadmin'}</p>
           </div>
        </div>

        {/* Theme Settings */}
        <div className="glass-card" style={{ padding: '24px', borderRadius: '24px' }}>
           <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Արտաքին տեսք</h3>
           <div style={{ display: 'flex', gap: '16px' }}>
              <div 
                onClick={() => toggleTheme('light')}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '16px',
                  border: !isDarkMode ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                  background: !isDarkMode ? 'rgba(10, 132, 255, 0.05)' : 'var(--bg-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                  boxShadow: !isDarkMode ? '0 4px 12px rgba(10, 132, 255, 0.1)' : 'none'
                }}
              >
                 <Sun size={20} style={{ color: !isDarkMode ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
                 <span style={{ fontWeight: 'bold', fontSize: '15px', color: !isDarkMode ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>Լուսավոր</span>
              </div>

              <div 
                onClick={() => toggleTheme('dark')}
                style={{
                  flex: 1,
                  padding: '16px',
                  borderRadius: '16px',
                  border: isDarkMode ? '2px solid var(--accent-blue)' : '1px solid var(--border-color)',
                  background: isDarkMode ? 'rgba(10, 132, 255, 0.05)' : 'var(--bg-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  transition: 'all 0.2s',
                  boxShadow: isDarkMode ? '0 4px 12px rgba(10, 132, 255, 0.1)' : 'none'
                }}
              >
                 <Moon size={20} style={{ color: isDarkMode ? 'var(--accent-blue)' : 'var(--text-secondary)' }} />
                 <span style={{ fontWeight: 'bold', fontSize: '15px', color: isDarkMode ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>Մութ</span>
              </div>
           </div>
        </div>

        {/* Logout */}
        <div 
          onClick={onLogout}
          style={{ 
            padding: '24px', 
            borderRadius: '24px', 
            cursor: 'pointer', 
            border: '1px solid rgba(255, 69, 58, 0.3)', 
            background: 'rgba(255, 69, 58, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
           <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--accent-red)' }}>Դուրս գալ համակարգից</span>
           <LogOut size={22} style={{ color: 'var(--accent-red)' }} />
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
           <p style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.5, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Martin Star Analytics v1.0.0 (Beta)</p>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;
