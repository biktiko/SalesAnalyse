import React from 'react';
import { motion } from 'framer-motion';
import { Users as UsersIcon, Shield, User as UserIcon } from 'lucide-react';

const mockUsers = [
  { id: 1, login: 'martinAdmin', name: 'Admin', role: 'Superadmin' },
];

const Users = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="max-w-4xl"
    >
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="title-font" style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Օգտատերեր</h1>
          <p className="text-secondary text-sm">Համակարգի օգտատերերի ցանկ</p>
        </div>
        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'rgba(10, 132, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-blue)' }}>
           <UsersIcon size={24} />
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderRadius: '24px' }}>
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '20px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px' }}>Մուտքանուն</th>
                <th style={{ padding: '20px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px' }}>Անուն</th>
                <th style={{ padding: '20px 24px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '1px' }}>Դեր</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((user, idx) => (
                <tr key={user.id} style={{ borderBottom: idx !== mockUsers.length - 1 ? '1px solid var(--border-color)' : 'none', transition: 'background 0.2s', cursor: 'pointer' }} className="hover:bg-[var(--bg-primary)]">
                  <td style={{ padding: '20px 24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                       <UserIcon size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    {user.login}
                  </td>
                  <td style={{ padding: '20px 24px', color: 'var(--text-secondary)', fontWeight: '500' }}>{user.name}</td>
                  <td style={{ padding: '20px 24px' }}>
                    <span className={`badge ${user.role === 'Superadmin' ? 'badge-blue' : 'badge-gray'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}>
                      {user.role === 'Superadmin' && <Shield size={12} />}
                      {user.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

export default Users;
