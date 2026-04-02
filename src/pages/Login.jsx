import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const adminUser = import.meta.env.VITE_ADMIN_USER || 'martinAdmin';
    const adminPass = import.meta.env.VITE_ADMIN_PASS || 'm1a2r3t4i5n6';

    if (username === adminUser && password === adminPass) {
      onLogin({ name: 'Admin', role: 'Superadmin', login: username });
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="login-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="login-card"
        style={{ padding: '48px 40px' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
           <h2 className="title-font" style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>Մուտք</h2>
           <p className="text-secondary" style={{ fontSize: '14px', fontWeight: '500' }}>Martin Analytics Platform</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', paddingLeft: '4px' }}>Մուտքանուն</label>
             <input 
               type="text" 
               className={`input-base ${error ? 'border-[#ff453a]' : ''}`}
               value={username}
               onChange={e => setUsername(e.target.value)}
             />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
             <label style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', paddingLeft: '4px' }}>Գաղտնաբառ</label>
             <input 
               type="password" 
               className={`input-base ${error ? 'border-[#ff453a]' : ''}`}
               value={password}
               onChange={e => setPassword(e.target.value)}
             />
          </div>
          
          <div style={{ marginTop: '16px' }}>
            <motion.button 
              whileTap={{ scale: 0.98 }}
              type="submit" 
              className="btn btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: '16px' }}
            >
              Մուտք գործել
            </motion.button>
          </div>
        </form>

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              style={{ marginTop: '24px', padding: '12px', borderRadius: '12px', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.2)', color: 'var(--accent-red)', fontSize: '14px', fontWeight: 'bold', textAlign: 'center' }}
            >
              Սխալ մուտքանուն կամ գաղտնաբառ
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default Login;
