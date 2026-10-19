import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  FileText, ShieldAlert, BarChart3, Clock, 
  Upload, User, LogOut, Settings, Menu, X 
} from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header style={{
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div className="max-w-7xl" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '64px'
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            backgroundColor: 'var(--primary-800)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF'
          }}>
            <FileText size={18} strokeWidth={2.2} />
          </div>
          <div>
            <span style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              fontWeight: '700',
              color: 'var(--primary-800)',
              letterSpacing: '-0.02em'
            }}>
              LoanLens
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {user ? (
            <>
              <Link 
                to="/dashboard" 
                style={{
                  fontSize: '0.875rem',
                  fontWeight: isActive('/dashboard') ? 600 : 500,
                  color: isActive('/dashboard') ? 'var(--primary-800)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
              >
                <BarChart3 size={16} />
                Dashboard
              </Link>
              <Link 
                to="/analyze" 
                style={{
                  fontSize: '0.875rem',
                  fontWeight: isActive('/analyze') ? 600 : 500,
                  color: isActive('/analyze') ? 'var(--primary-800)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
              >
                <Upload size={16} />
                Analyze Agreement
              </Link>
              <Link 
                to="/history" 
                style={{
                  fontSize: '0.875rem',
                  fontWeight: isActive('/history') ? 600 : 500,
                  color: isActive('/history') ? 'var(--primary-800)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
              >
                <Clock size={16} />
                History
              </Link>
              <Link 
                to="/research" 
                style={{
                  fontSize: '0.875rem',
                  fontWeight: isActive('/research') ? 600 : 500,
                  color: isActive('/research') ? 'var(--primary-800)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
              >
                <ShieldAlert size={16} />
                ML Transparency
              </Link>
            </>
          ) : (
            <>
              <a 
                href="#features" 
                style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500 }}
              >
                How It Works
              </a>
              <Link 
                to="/research" 
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem'
                }}
              >
                <ShieldAlert size={16} />
                Research & Benchmarks
              </Link>
            </>
          )}
        </nav>

        {/* User / CTA Area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/settings" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                padding: '0.375rem 0.625rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-subtle)'
              }}>
                <User size={15} />
                <span>{user.name.split(' ')[0]}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="btn btn-secondary"
                style={{ padding: '0.375rem 0.625rem', fontSize: '0.8125rem' }}
                title="Log out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/login" className="btn btn-secondary">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
