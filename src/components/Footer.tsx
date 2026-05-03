import Link from 'next/link';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: 'var(--card)',
      borderTop: '1px solid var(--border)',
      padding: '4rem 0 2rem',
      marginTop: 'auto'
    }}>
      <div className="container">
        <div className="grid grid-4">
          <div>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Online Store</h3>
            <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem' }}>
              Premium African-inspired online store bringing you the best in electronics, furniture, and more.
            </p>
          </div>
          <div>
            <h4 style={{ marginBottom: '1.5rem' }}>Quick Links</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link href="/" style={{ color: 'var(--muted-foreground)' }}>Home</Link></li>
              <li><Link href="/shop" style={{ color: 'var(--muted-foreground)' }}>Shop</Link></li>
              <li><Link href="/about" style={{ color: 'var(--muted-foreground)' }}>About Us</Link></li>
              <li><Link href="/contact" style={{ color: 'var(--muted-foreground)' }}>Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ marginBottom: '1.5rem' }}>Support</h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li><Link href="/about#faq" style={{ color: 'var(--muted-foreground)' }}>FAQ</Link></li>
              <li><Link href="/about#privacy" style={{ color: 'var(--muted-foreground)' }}>Privacy Policy</Link></li>
              <li><Link href="/contact" style={{ color: 'var(--muted-foreground)' }}>Customer Care</Link></li>
            </ul>
          </div>
          <div>
            <h4 style={{ marginBottom: '1.5rem' }}>Connect With Us</h4>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a href="#" style={{ color: 'var(--primary)' }} aria-label="Facebook"><FaFacebookF size={20} /></a>
              <a href="#" style={{ color: 'var(--primary)' }} aria-label="X"><FaXTwitter size={20} /></a>
              <a href="#" style={{ color: 'var(--primary)' }} aria-label="Instagram"><FaInstagram size={20} /></a>
              <a href="#" style={{ color: 'var(--primary)' }} aria-label="LinkedIn"><FaLinkedinIn size={20} /></a>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--border)',
          textAlign: 'center',
          color: 'var(--muted-foreground)',
          fontSize: '0.875rem'
        }}>
          &copy; {new Date().getFullYear()} Online Store. All rights reserved. Designed with passion.
        </div>
      </div>
    </footer>
  );
}
