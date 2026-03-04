import React from 'react';
import {
  ExternalLink,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Globe as GlobeIcon,
} from 'lucide-react';
import type { SocialLink } from '../types';

interface SocialLinksCardProps {
  socialLinks: SocialLink[];
}

export const SocialLinksCard: React.FC<SocialLinksCardProps> = ({
  socialLinks,
}) => {
  if (socialLinks.length === 0) return null;

  return (
    <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm">
      <h4 className="font-black text-xs text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">
        Identidad Digital
      </h4>
      <div className="space-y-3">
        {socialLinks.map((link) => (
          <a
            key={link.url}
            href={
              link.url.startsWith('http') ? link.url : `https://${link.url}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl hover:scale-[1.02] transition-all group shadow-sm"
          >
            <div className="flex items-center gap-4">
              {link.type === 'facebook' && (
                <div className="p-3 bg-[#1877F2]/10 text-[#1877F2] rounded-xl group-hover:bg-[#1877F2] group-hover:text-white transition-colors">
                  <Facebook size={20} fill="currentColor" />
                </div>
              )}
              {link.type === 'twitter' && (
                <div className="p-3 bg-black/10 text-black rounded-xl group-hover:bg-black group-hover:text-white transition-colors">
                  <Twitter size={20} fill="currentColor" />
                </div>
              )}
              {link.type === 'instagram' && (
                <div className="p-3 bg-pink-600/10 text-pink-600 rounded-xl group-hover:bg-pink-600 group-hover:text-white transition-colors">
                  <Instagram size={20} />
                </div>
              )}
              {link.type === 'linkedin' && (
                <div className="p-3 bg-[#0a66c2]/10 text-[#0a66c2] rounded-xl group-hover:bg-[#0a66c2] group-hover:text-white transition-colors">
                  <Linkedin size={20} fill="currentColor" />
                </div>
              )}
              {link.type === 'web' && (
                <div className="p-3 bg-gray-600/10 text-gray-600 rounded-xl group-hover:bg-gray-600 group-hover:text-white transition-colors">
                  <GlobeIcon size={20} />
                </div>
              )}

              <span className="text-sm font-black text-slate-700 capitalize">
                {link.type === 'web' ? 'Sitio Web' : link.type}
              </span>
            </div>
            <ExternalLink
              size={16}
              className="text-slate-300 group-hover:opacity-100"
            />
          </a>
        ))}
      </div>
    </div>
  );
};
