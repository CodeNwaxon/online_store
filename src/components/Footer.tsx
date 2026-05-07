import Link from 'next/link';
import Image from 'next/image';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';
import FooterInstall from './FooterInstall';

export default function Footer() {
  return (
    <footer className="bg-card border-t border-border pt-16 pb-8 mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <div className="flex gap-4 items-start">
              <Image
                src="/logos.png"
                alt="Quick Choice Logo"
                width={40}
                height={40}
                className="object-contain shrink-0 border-2 border-primary rounded p-0.5"
              />
              <p className="text-muted-foreground text-[0.9rem] m-0">
                Premium African-inspired store bringing you the best in electronics, furniture, and more with <span className="text-[#646668ff] font-bold">Quick Choice&reg;</span>.
              </p>
            </div>
          </div>
          <div>
            <h4 className="mb-6 text-[#007bff] font-bold">Quick Choice</h4>
            <ul className="list-none flex flex-col gap-3">
              <li><Link href="/" className="text-muted-foreground hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/shop" className="text-muted-foreground hover:text-primary transition-colors">Shop</Link></li>
              <li><Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-6 font-bold">Support</h4>
            <ul className="list-none flex flex-col gap-3">
              <li><Link href="/about#faq" className="text-muted-foreground hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link href="/about#privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Customer Care</Link></li>
              <FooterInstall />
            </ul>
          </div>
          <div>
            <h4 className="mb-6 font-bold">Connect With Us</h4>
            <div className="flex gap-4">
              <a href="#" className="text-primary hover:text-primary-hover transition-colors" aria-label="Facebook"><FaFacebookF size={20} /></a>
              <a href="#" className="text-primary hover:text-primary-hover transition-colors" aria-label="X"><FaXTwitter size={20} /></a>
              <a href="#" className="text-primary hover:text-primary-hover transition-colors" aria-label="Instagram"><FaInstagram size={20} /></a>
              <a href="#" className="text-primary hover:text-primary-hover transition-colors" aria-label="LinkedIn"><FaLinkedinIn size={20} /></a>
            </div>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-border text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} Quick Choice. All rights reserved. Designed with passion.
        </div>
      </div>
    </footer>
  );
}
