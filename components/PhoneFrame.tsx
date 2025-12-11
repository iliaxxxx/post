import React from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, Battery, Wifi, Signal } from 'lucide-react';

interface PhoneFrameProps {
  children: React.ReactNode;
  username: string;
  avatarUrl?: string;
  isDark?: boolean;
  viewMode?: 'desktop' | 'mobile';
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({ 
  children, 
  username, 
  avatarUrl = "https://api.dicebear.com/9.x/avataaars/svg?seed=Felix",
  isDark = false,
  viewMode = 'desktop'
}) => {
  const uiTheme = isDark ? 'text-white' : 'text-black';
  const bgTheme = isDark ? 'bg-black' : 'bg-white';
  
  // --- COMPONENTS ---
  
  const InstagramHeader = () => (
     <div className={`px-3 py-3 flex items-center justify-between z-20 relative ${viewMode === 'mobile' ? 'bg-white/5 backdrop-blur-sm' : ''}`}>
        <div className="flex items-center gap-2.5">
           <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[1.5px] shrink-0">
             <div className={`w-full h-full rounded-full ${viewMode === 'desktop' ? bgTheme : 'bg-white'} border-[2px] border-transparent overflow-hidden`}>
               <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
             </div>
           </div>
           <div className="flex flex-col">
              <span className={`text-xs font-semibold leading-tight flex items-center gap-1 ${uiTheme}`}>
                {username}
              </span>
              <span className={`text-[10px] opacity-60 ${uiTheme}`}>Moscow, Russia</span>
           </div>
        </div>
        <MoreHorizontal size={20} className={`opacity-60 ${uiTheme}`} />
     </div>
  );

  const InstagramFooter = () => (
     <div className="px-3 pt-3 pb-2 z-20 relative">
        <div className="flex justify-between items-center mb-2">
           <div className="flex items-center gap-4">
              <Heart size={26} className={uiTheme} strokeWidth={1.5} />
              <MessageCircle size={26} className={`${uiTheme} -rotate-90`} strokeWidth={1.5} />
              <Send size={26} className={`${uiTheme} rotate-12 mb-1`} strokeWidth={1.5} />
           </div>
           <Bookmark size={26} className={uiTheme} strokeWidth={1.5} />
        </div>
        
        <div className="flex items-center gap-1.5 mb-1.5">
           <div className="flex -space-x-1.5">
             <div className="w-4 h-4 rounded-full bg-gray-300 ring-2 ring-white"></div>
             <div className="w-4 h-4 rounded-full bg-gray-400 ring-2 ring-white"></div>
             <div className="w-4 h-4 rounded-full bg-gray-500 ring-2 ring-white"></div>
           </div>
           <div className={`text-xs ${uiTheme}`}>
             Liked by <span className="font-semibold">elonmusk</span> and <span className="font-semibold">others</span>
           </div>
        </div>

        <div className={`text-xs leading-snug ${uiTheme}`}>
           <span className="font-semibold mr-1.5">{username}</span>
           <span>🚀 Create viral carousels in seconds with AI. Swipe to see how! 👇</span>
           <span className="opacity-50 ml-1">more</span>
        </div>
        
        <div className="text-[10px] opacity-40 mt-2 uppercase font-medium">
           2 hours ago
        </div>
     </div>
  );

  // --- MOBILE VIEW (FEED STYLE) ---
  if (viewMode === 'mobile') {
      return (
         <div className={`w-full flex flex-col ${isDark ? 'bg-zinc-900' : 'bg-white'} shadow-sm overflow-hidden`}>
            <InstagramHeader />
            <div className={`w-full aspect-[4/5] relative ${isDark ? 'bg-zinc-800' : 'bg-gray-100'} shadow-inner`}>
               {children}
            </div>
            <InstagramFooter />
         </div>
      );
  }

  // --- DESKTOP VIEW (DEVICE MOCKUP) ---
  return (
    <div className="relative mx-auto pointer-events-none select-none">
       {/* External Frame Shadow & Body */}
      <div 
        className="relative bg-[#121212] border-[12px] border-[#1f1f1f] rounded-[3rem] h-[720px] w-[360px] flex flex-col overflow-hidden ring-8 ring-black/20 z-10"
        style={{
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1), 0 50px 100px -20px rgba(0,0,0,0.5)'
        }}
      >
        {/* Dynamic Island / Notch Area */}
        <div className={`h-[36px] w-full ${bgTheme} transition-colors duration-300 absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 pt-3 rounded-t-[2.5rem]`}>
           <div className={`text-[12px] font-semibold w-12 text-center tracking-wide ${uiTheme}`}>9:41</div>
           <div className="h-[24px] w-[100px] bg-black rounded-full absolute top-2 left-1/2 -translate-x-1/2 z-40"></div>
           <div className={`flex items-center gap-1.5 w-12 justify-end ${uiTheme}`}>
             <Signal size={12} strokeWidth={2.5} />
             <Wifi size={12} strokeWidth={2.5} />
             <Battery size={16} strokeWidth={2.5} />
           </div>
        </div>

        {/* Screen Content */}
        <div className={`flex-1 ${bgTheme} w-full pt-12 pb-6 flex flex-col overflow-hidden relative rounded-[2.5rem] pointer-events-auto`}>
          
          {/* Post Header (Custom Header for Device View which includes 'Posts' nav) */}
           <div className={`px-4 py-2 flex justify-between items-center z-20`}>
            <div className="flex items-center gap-1 -ml-2">
               <ChevronLeft size={28} className={uiTheme} strokeWidth={1.5} />
               <span className={`text-sm font-semibold ${uiTheme}`}>Posts</span>
            </div>
            <div className="flex flex-col items-center">
               <span className={`text-[10px] font-bold opacity-60 uppercase tracking-wide ${uiTheme}`}>USERNAME</span>
               <span className={`text-sm font-bold leading-none ${uiTheme}`}>{username.replace('@', '')}</span>
            </div>
            <MoreHorizontal className={uiTheme} />
          </div>

          {/* Scrollable Feed Area */}
          <div className="flex-1 overflow-y-auto no-scrollbar relative">
             
             <InstagramHeader />

             {/* CAROUSEL CONTENT CONTAINER */}
             {/* Updated background to adapt to isDark so it doesn't flash white or show white borders */}
             <div className={`w-full aspect-[4/5] ${isDark ? 'bg-zinc-800' : 'bg-gray-100'} relative overflow-hidden shadow-sm`}>
                {children}
             </div>

             <InstagramFooter />

          </div>

          {/* Home Indicator */}
          <div className="h-1 w-32 bg-gray-300 rounded-full mx-auto mb-2 mt-2 opacity-50"></div>
        </div>
      </div>
    </div>
  );
};