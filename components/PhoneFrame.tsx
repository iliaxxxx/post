import React from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, Battery, Wifi, Signal } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
  username: string;
  avatarUrl?: string;
  isDark?: boolean;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ 
  children, 
  username, 
  avatarUrl = "https://api.dicebear.com/9.x/avataaars/svg?seed=Felix",
  isDark = false
}) => {
  const bgColor = isDark ? 'bg-black text-white' : 'bg-white text-black';
  const borderColor = isDark ? 'border-zinc-800' : 'border-gray-100';
  const iconColor = isDark ? 'text-white' : 'text-black';

  return (
    <div className="relative mx-auto border-gray-800 bg-gray-800 border-[14px] rounded-[2.5rem] h-[800px] w-[400px] shadow-2xl flex flex-col overflow-hidden ring-8 ring-black/10">
      {/* Phone Notch & Status Bar */}
      <div className={`h-[32px] w-full ${bgColor} absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 pt-2 rounded-t-[2rem]`}>
         <div className="text-[10px] font-semibold w-12 text-center">9:41</div>
         <div className="h-6 w-32 bg-black rounded-b-3xl absolute top-0 left-1/2 -translate-x-1/2"></div>
         <div className="flex items-center gap-1.5 w-12 justify-end">
           <Signal size={12} fill="currentColor" />
           <Wifi size={12} />
           <Battery size={14} fill="currentColor" />
         </div>
      </div>

      {/* Screen Content */}
      <div className={`flex-1 ${bgColor} w-full pt-10 pb-4 flex flex-col overflow-hidden relative rounded-[2rem]`}>
        
        {/* Instagram Header */}
        <div className={`px-4 py-2 flex justify-between items-center ${borderColor} border-b z-20`}>
          <div className="flex items-center gap-2">
             <ChevronLeft size={24} className={iconColor} />
             <div className="flex flex-col">
               <span className="text-xs font-bold uppercase text-gray-400 leading-none">Posts</span>
             </div>
          </div>
          <div className="flex flex-col items-center">
             <span className="text-sm font-bold leading-none">{username.replace('@', '').toUpperCase()}</span>
          </div>
          <MoreHorizontal className={iconColor} />
        </div>

        {/* Scrollable Feed Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative">
           
           {/* Post Header */}
           <div className="px-3 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 to-fuchsia-600 p-[2px]">
                   <div className={`w-full h-full rounded-full border-2 ${isDark ? 'border-black' : 'border-white'} overflow-hidden`}>
                     <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                   </div>
                 </div>
                 <div className="flex flex-col">
                    <span className="text-sm font-semibold leading-tight flex items-center gap-1">
                      {username}
                      {/* Verified Badge */}
                      <svg viewBox="0 0 24 24" aria-label="Verified" fill="currentColor" className="w-3 h-3 text-blue-500">
                        <path d="M12.001.504a11.5 11.5 0 1 0 11.5 11.5 11.513 11.513 0 0 0-11.5-11.5Zm5.706 9.21-6.5 6.495a1 1 0 0 1-1.414-.001l-3.5-3.504a1 1 0 1 1 1.414-1.414l2.794 2.797 5.793-5.788a1 1 0 1 1 1.413 1.415Z"></path>
                      </svg>
                    </span>
                    <span className="text-xs opacity-60">Original Audio</span>
                 </div>
              </div>
              <MoreHorizontal size={20} className="opacity-60" />
           </div>

           {/* CAROUSEL CONTENT */}
           <div className="w-full aspect-[4/5] bg-gray-100 relative overflow-hidden">
              {children}
           </div>

           {/* Post Actions */}
           <div className="px-3 pt-3 pb-2">
              <div className="flex justify-between items-center mb-2">
                 <div className="flex items-center gap-4">
                    <Heart size={24} className={iconColor} />
                    <MessageCircle size={24} className={`${iconColor} -rotate-90`} />
                    <Send size={24} className={`${iconColor} rotate-12 mb-1`} />
                 </div>
                 <Bookmark size={24} className={iconColor} />
              </div>
              
              <div className="flex items-center gap-1.5 mb-1.5">
                 <div className="flex -space-x-1.5">
                   <div className="w-4 h-4 rounded-full bg-gray-300 border border-white"></div>
                   <div className="w-4 h-4 rounded-full bg-gray-400 border border-white"></div>
                   <div className="w-4 h-4 rounded-full bg-gray-500 border border-white"></div>
                 </div>
                 <div className="text-sm">
                   Liked by <span className="font-semibold">elonmusk</span> and <span className="font-semibold">42,891 others</span>
                 </div>
              </div>

              <div className="text-sm leading-snug">
                 <span className="font-semibold mr-1.5">{username}</span>
                 <span>🔥 This AI tool changes everything! Swipe to see how to create viral carousels in seconds. 👇</span>
                 <span className="text-gray-500 ml-1">... more</span>
              </div>
              
              <div className="text-xs text-gray-500 mt-2 uppercase">
                 2 hours ago
              </div>
           </div>

        </div>

        {/* Home Indicator */}
        <div className="h-1.5 w-32 bg-gray-300 rounded-full mx-auto mb-2 mt-2 opacity-50"></div>
      </div>
    </div>
  );
};