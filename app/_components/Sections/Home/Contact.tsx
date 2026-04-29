'use client';

import { Mail, Instagram, Globe, Newspaper } from 'lucide-react';

export function Contact() {
  return (
    <section id="contact" className="min-h-[80svh] px-6 py-24 flex items-center">
      <div className=" mx-auto w-full">
        <div className="mb-16 lg:mb-32">
          <h2 className="text-3xl md:text-5xl tracking-tight">Get in touch</h2>
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-32 lg:gap-48 lg:mb-32 xl:gap-80">
          <div className="space-y-8 lg:col-span-2">
            <p className="text-lg xl:text-xl text-muted-foreground">
              Available for commissioned work, collaborations, and inquiries.
              Each piece is made to order and can be tailored to your requirements — get in touch to discuss.
            </p>
            
            <div className="flex flex-row gap-8 items-center justify-between">
              {/* TODO: Replace href and span text with contact email */}
              <a 
                href="mailto:your@email.com"
                className="flex items-center gap-3 hover:opacity-70 transition-opacity cursor-crosshair group text-lg"
              >
                <Mail size={20} className="text-muted-foreground " />
                <span>your@email.com</span> {/* TODO: Replace with contact email */}
              </a>
              
              <div className="flex items-center gap-3 text-lg text-muted-foreground justify-end">
                <span className="w-5" />
                <span>Isle of Skye, Scotland</span>
              </div>
            </div>
          </div>

          <div className="space-y-8 lg:col-start-3 lg:col-span-2 text-lg">
            <div className=''>
              <p className="text-muted-foreground mb-4">Social</p>
              <div className="space-y-3 lg:flex lg:flex-row lg:gap-8 lg:space-y-0">
                {/* TODO: Replace with Instagram URL */}
                <a 
                  href="https://www.instagram.com/yourhandle/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center cursor-crosshair gap-3 hover:opacity-70 transition-opacity"
                >
                  <Instagram size={20} className="text-muted-foreground" />
                  <span>Instagram</span>
                </a>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-mailing-list'))}
                  className="flex items-center gap-3 cursor-crosshair hover:opacity-70 transition-opacity whitespace-nowrap"
                >
                  <Newspaper size={20} className="text-muted-foreground" />
                  <span>Newsletter</span>
                </button>
                {/* TODO: Replace with your external shop URL (e.g. Stored, Etsy) or remove */}
                <a 
                  href="https://example.com/shop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 cursor-crosshair hover:opacity-70 transition-opacity whitespace-nowrap"
                >
                  <Globe size={20} className="text-muted-foreground" />
                  <span>Stored Shop</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        
      </div>
    </section>
  );
}
