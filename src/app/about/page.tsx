import Image from 'next/image';
import { FaEnvelope, FaPhone, FaCheckCircle } from 'react-icons/fa';

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
      <section className="py-16 max-md:py-8 bg-primary text-white">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="max-w-[800px]">
            <h1 className="text-5xl max-md:text-4xl font-bold mb-6">Our Story</h1>
            <p className="text-lg max-md:text-base opacity-90 leading-relaxed">
              Founded with a vision to bring premium quality goods to every home, Quick Choice combines modern convenience with the vibrant spirit of African design. We partner with the best manufacturers and artisans to ensure every item in our collection meets the highest standards of excellence.
            </p>
          </div>
        </div>
      </section>

      {/* CEO & Leadership */}
      <section className="py-16 max-md:py-8">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="relative h-[500px] max-md:h-[350px] rounded-[var(--radius)] overflow-hidden">
              <Image 
                src="https://picsum.photos/seed/ceo/800/1000" 
                alt="CEO" 
                fill 
                className="object-cover"
              />
            </div>
            <div className="p-8 max-md:p-0">
              <h2 className="text-3xl font-bold mb-4">Message from our CEO</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                "Our mission is more than just selling products; it's about enhancing the lifestyle of our customers through quality and design. We are committed to sustainability, fair trade, and providing an exceptional shopping experience."
              </p>
              <div className="font-bold text-lg">Kofi Mensah</div>
              <div className="text-primary mb-6">Founder & CEO</div>
              <div className="flex flex-col gap-3">
                <a href="mailto:ceo@onlinestore.com" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  <FaEnvelope size={18} className="text-primary" /> ceo@onlinestore.com
                </a>
                <div className="flex items-center gap-2">
                  <FaPhone size={18} className="text-primary" /> +234 800 123 4567
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Care */}
      <section className="py-16 max-md:py-8 bg-muted">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <h2 className="text-center mb-12 text-3xl font-bold">Customer Care</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-card rounded-[var(--radius)] shadow-sm">
              <h3 className="mb-4 font-bold text-xl">Support Email</h3>
              <p className="text-muted-foreground">support@onlinestore.com</p>
              <p className="text-sm mt-2">Response within 24 hours</p>
            </div>
            <div className="text-center p-8 bg-card rounded-[var(--radius)] shadow-sm">
              <h3 className="mb-4 font-bold text-xl">Hotline</h3>
              <p className="text-muted-foreground">+234 800 999 8888</p>
              <p className="text-sm mt-2">Mon-Sat, 8am - 6pm</p>
            </div>
            <div className="text-center p-8 bg-card rounded-[var(--radius)] shadow-sm flex flex-col items-center">
              <h3 className="mb-4 font-bold text-xl">Office Address</h3>
              <p className="text-muted-foreground mb-4">168, Akarigbo Road, Sabo Sagamu, Ogun State</p>
              <a 
                href="https://www.google.com/maps/search/?api=1&query=168,+Akarigbo+Road,+Sabo+Sagamu,+Ogun+State" 
                target="_blank" 
                rel="noopener noreferrer"
                className="border border-border text-foreground hover:bg-muted text-sm px-4 py-2 rounded-md font-semibold mt-auto inline-block transition-colors"
              >
                Get Navigation
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 max-md:py-8">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <h2 className="text-center mb-12 text-3xl font-bold">Frequently Asked Questions</h2>
          <div className="max-w-[800px] mx-auto flex flex-col gap-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 border border-border rounded-[var(--radius)] bg-card">
                <h4 className="text-lg font-bold mb-3">{faq.q}</h4>
                <p className="text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy Policy */}
      <section id="privacy" className="py-16 max-md:py-8 bg-card border-t border-border">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="max-w-[800px] mx-auto">
            <h2 className="text-3xl font-bold mb-8">Privacy & Policy</h2>
            <div className="flex flex-col gap-6 text-muted-foreground">
              <p>
                At Quick Choice, we take your privacy seriously. This policy outlines how we collect, use, and protect your personal information when you use our website.
              </p>
              <div className="flex gap-4 items-start">
                <FaCheckCircle size={20} className="shrink-0 mt-1 text-primary" />
                <p><strong>Data Collection:</strong> We collect necessary information like your name, address, and contact details to process your orders and provide better service.</p>
              </div>
              <div className="flex gap-4 items-start">
                <FaCheckCircle size={20} className="shrink-0 mt-1 text-primary" />
                <p><strong>Security:</strong> All payments are processed through secure, encrypted gateways. We never store your credit card information on our servers.</p>
              </div>
              <div className="flex gap-4 items-start">
                <FaCheckCircle size={20} className="shrink-0 mt-1 text-primary" />
                <p><strong>Third Parties:</strong> We do not sell or share your personal data with third parties for marketing purposes. Your data is only shared with partners necessary for fulfillment (e.g., shipping companies).</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Our Location */}
      <section className="py-16 max-md:py-8">
        <div className="max-w-[1200px] mx-auto px-4 md:px-6">
          <div className="max-w-[800px] mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Our Location</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              168, Akarigbo Road, Sabo, Sagamu, Ogun State, Nigeria
            </p>
            <a 
              href="https://www.google.com/maps/search/?api=1&query=168,+Akarigbo+Road,+Sabo,+Sagamu,+Ogun+State,+Nigeria" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-primary hover:bg-primary-hover text-white font-semibold px-8 py-3 rounded-md transition-colors inline-block"
            >
              Navigation
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
