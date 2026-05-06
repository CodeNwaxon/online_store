import Link from 'next/link';
import Image from 'next/image';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';
import FooterInstall from './FooterInstall';

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
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <Image
                src="/logos.png"
                alt="Quick Choice Logo"
                width={40}
                height={40}
                style={{
                  objectFit: 'contain',
                  flexShrink: 0,
                  border: '2px solid var(--primary)',
                  borderRadius: '4px',
                  padding: '2px'
                }}
              />
              <p style={{ color: 'var(--muted-foreground)', fontSize: '0.9rem', margin: 0 }}>
                Premium African-inspired store bringing you the best in electronics, furniture, and more with <span style={{ color: '#646668ff', fontWeight: 'bold' }}>Quick Choice&reg;</span>.
              </p>
            </div>
          </div>
          <div>
            <h4 style={{ marginBottom: '1.5rem', color: '#007bff' }}>Quick Choice</h4>
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
              <FooterInstall />
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
          &copy; {new Date().getFullYear()} Quick Choice. All rights reserved. Designed with passion.
        </div>
      </div>
    </footer>
  );
}
