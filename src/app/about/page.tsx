import Image from 'next/image';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaCheckCircle } from 'react-icons/fa';

export default function About() {
  const faqs = [
    { q: 'How long does delivery take?', a: 'Typically 3-5 business days for major cities and 5-7 business days for other locations.' },
    { q: 'Do you offer international shipping?', a: 'Currently we ship within the continent, but we are expanding to international locations soon.' },
    { q: 'What is your return policy?', a: 'We offer a 14-day return policy for unused items in their original packaging.' },
    { q: 'How do the installment plans work?', a: 'You can select the installment option at checkout, which allows you to pay over 3, 6, or 12 months with minimal interest.' }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="section" style={{ backgroundColor: 'var(--primary)', color: 'white' }}>
        <div className="container">
          <div style={{ maxWidth: '800px' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Our Story</h1>
            <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
              Founded with a vision to bring premium quality goods to every home, Quick Choice combines modern convenience with the vibrant spirit of African design. We partner with the best manufacturers and artisans to ensure every item in our collection meets the highest standards of excellence.
            </p>
          </div>
        </div>
      </section>

      {/* CEO & Leadership */}
      <section className="section">
        <div className="container">
          <div className="grid grid-2" style={{ alignItems: 'center' }}>
            <div style={{ position: 'relative', height: '500px', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <Image 
                src="https://picsum.photos/seed/ceo/800/1000" 
                alt="CEO" 
                fill 
                style={{ objectFit: 'cover' }}
              />
            </div>
            <div style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Message from our CEO</h2>
              <p style={{ color: 'var(--muted-foreground)', marginBottom: '1.5rem' }}>
                "Our mission is more than just selling products; it's about enhancing the lifestyle of our customers through quality and design. We are committed to sustainability, fair trade, and providing an exceptional shopping experience."
              </p>
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>Kofi Mensah</div>
              <div style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Founder & CEO</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <a href="mailto:ceo@onlinestore.com" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaEnvelope size={18} color="var(--primary)" /> ceo@onlinestore.com
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaPhone size={18} color="var(--primary)" /> +234 800 123 4567
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Care */}
      <section className="section" style={{ backgroundColor: 'var(--muted)' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2rem', fontWeight: 'bold' }}>Customer Care</h2>
          <div className="grid grid-3">
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Support Email</h3>
              <p style={{ color: 'var(--muted-foreground)' }}>support@onlinestore.com</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Response within 24 hours</p>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Hotline</h3>
              <p style={{ color: 'var(--muted-foreground)' }}>+234 800 999 8888</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Mon-Sat, 8am - 6pm</p>
            </div>
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Office Address</h3>
              <p style={{ color: 'var(--muted-foreground)', marginBottom: '1rem' }}>168, Akarigbo Road, Sabo Sagamu, Ogun State</p>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=168,+Akarigbo+Road,+Sabo+Sagamu,+Ogun+State" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
              >
                Get Navigation
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section">
        <div className="container">
          <h2 style={{ textAlign: 'center', marginBottom: '3rem', fontSize: '2rem', fontWeight: 'bold' }}>Frequently Asked Questions</h2>
          <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {faqs.map((faq, index) => (
              <div key={index} style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', fontWeight: 'bold' }}>{faq.q}</h4>
                <p style={{ color: 'var(--muted-foreground)' }}>{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Policy */}
      <section id="privacy" className="section" style={{ backgroundColor: 'var(--card)' }}>
        <div className="container">
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>Privacy & Policy</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'var(--muted-foreground)' }}>
              <p>
                At Quick Choice, we take your privacy seriously. This policy outlines how we collect, use, and protect your personal information when you use our website.
              </p>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <FaCheckCircle size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p><strong>Data Collection:</strong> We collect necessary information like your name, address, and contact details to process your orders and provide better service.</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <FaCheckCircle size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p><strong>Security:</strong> All payments are processed through secure, encrypted gateways. We never store your credit card information on our servers.</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <FaCheckCircle size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p><strong>Third Parties:</strong> We do not sell or share your personal data with third parties for marketing purposes. Your data is only shared with partners necessary for fulfillment (e.g., shipping companies).</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
