"use client";

import * as React from "react";
import {
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Send,
  Heart,
  Bookmark,
  Share2,
  MoreHorizontal,
  Play,
  Volume2,
  Maximize2,
  CheckCircle2,
  CheckCheck,
  Phone,
  Video as VideoIcon,
  Globe,
  Bell,
  Eye,
} from "lucide-react";
import { SocialPlatform } from "@/types";
import { PlatformIcon } from "@/components/platform-icon";

interface SocialMediaLivePreviewProps {
  platform: SocialPlatform | "whatsapp";
  caption: string;
  hashtags?: string;
  title?: string;
  mediaUrl?: string | null;
  isVideo?: boolean;
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string | null;
}

function renderFormattedText(text: string) {
  const parts = text.split(/(@[a-zA-Z0-9_.-]+|#[a-zA-Z0-9_]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("@")) {
      return (
        <span
          key={index}
          className="text-blue-600 dark:text-sky-400 font-semibold hover:underline cursor-pointer"
          title={`Mentioned: ${part}`}
        >
          {part}
        </span>
      );
    }
    if (part.startsWith("#")) {
      return (
        <span
          key={index}
          className="text-blue-500 dark:text-blue-400 font-medium hover:underline cursor-pointer"
        >
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export function SocialMediaLivePreview({
  platform,
  caption,
  hashtags = "",
  title = "",
  mediaUrl,
  isVideo = false,
  authorName = "SocialSync Creator",
  authorHandle = "socialsync_ai",
  authorAvatar,
}: SocialMediaLivePreviewProps) {
  const allHashtags = hashtags
    ? hashtags
        .split(/\s+/)
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
        .join(" ")
    : "";

  const displayText = caption.trim() || "Your AI-generated caption will appear here in real-time...";

  return (
    <div className="w-full rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
      {/* Platform Header Indicator */}
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={platform} className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider text-foreground">
            {platform} Live Mockup
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
          <Eye className="h-3 w-3" /> Real-Time Preview
        </span>
      </div>

      {/* 1. LinkedIn Card Mockup */}
      {platform === "linkedin" && (
        <div className="rounded-lg border border-border bg-background p-3.5 space-y-3 text-xs shadow-sm">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-600 text-xs overflow-hidden shrink-0">
                {authorAvatar ? (
                  <img src={authorAvatar} alt={authorName} className="h-full w-full object-cover" />
                ) : (
                  authorName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-foreground flex items-center gap-1">
                  <span>{authorName}</span>
                  <span className="text-[10px] text-muted-foreground font-normal">• 1st</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                  Content Strategist & AI Publisher
                </p>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span>Just now</span>
                  <span>•</span>
                  <Globe className="h-2.5 w-2.5" />
                </div>
              </div>
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Body Text */}
          <div className="space-y-1.5 whitespace-pre-wrap text-foreground text-xs leading-relaxed">
            <p>{renderFormattedText(displayText)}</p>
            {allHashtags && (
              <p className="text-blue-600 dark:text-blue-400 font-medium">
                {allHashtags}
              </p>
            )}
          </div>

          {/* Attached Media */}
          {mediaUrl && (
            <div className="rounded-md border border-border overflow-hidden bg-muted/30">
              {isVideo ? (
                <div className="relative aspect-video flex items-center justify-center bg-black/80">
                  <video src={mediaUrl} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                      <Play className="h-5 w-5 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <img src={mediaUrl} alt="LinkedIn post media" className="w-full max-h-72 object-contain" />
              )}
            </div>
          )}

          {/* Social Stats */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px] text-muted-foreground font-mono">
            <span>👍 💡 48 reactions</span>
            <span>12 comments • 4 reposts</span>
          </div>

          {/* Action Row */}
          <div className="grid grid-cols-4 gap-1 pt-1 border-t border-border/50 text-muted-foreground text-[11px] font-medium">
            <button className="flex items-center justify-center gap-1.5 py-1 rounded hover:bg-muted/50 transition-colors">
              <ThumbsUp className="h-3.5 w-3.5" /> Like
            </button>
            <button className="flex items-center justify-center gap-1.5 py-1 rounded hover:bg-muted/50 transition-colors">
              <MessageSquare className="h-3.5 w-3.5" /> Comment
            </button>
            <button className="flex items-center justify-center gap-1.5 py-1 rounded hover:bg-muted/50 transition-colors">
              <Repeat2 className="h-3.5 w-3.5" /> Repost
            </button>
            <button className="flex items-center justify-center gap-1.5 py-1 rounded hover:bg-muted/50 transition-colors">
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>
        </div>
      )}

      {/* 2. Instagram Card Mockup */}
      {platform === "instagram" && (
        <div className="rounded-lg border border-border bg-background p-3.5 space-y-3 text-xs shadow-sm max-w-sm mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600">
                <div className="h-full w-full rounded-full bg-background p-[1px]">
                  {authorAvatar ? (
                    <img src={authorAvatar} alt={authorName} className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <div className="h-full w-full rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                      {authorHandle.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground text-xs">{authorHandle}</span>
                <CheckCircle2 className="h-3 w-3 text-blue-500 fill-blue-500/20" />
              </div>
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Media Viewport */}
          <div className="rounded-md border border-border overflow-hidden bg-black aspect-square flex items-center justify-center">
            {mediaUrl ? (
              isVideo ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video src={mediaUrl} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-10 w-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
                      <Play className="h-5 w-5 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <img src={mediaUrl} alt="Instagram preview" className="w-full h-full object-cover" />
              )
            ) : (
              <div className="text-muted-foreground text-[11px] font-mono flex flex-col items-center gap-1">
                <span>Upload a photo or Reel</span>
                <span className="text-[10px] opacity-70">Aspect Ratio: 1:1 or 4:5</span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3 text-foreground">
              <Heart className="h-4 w-4 hover:text-rose-500 cursor-pointer transition-colors" />
              <MessageSquare className="h-4 w-4 hover:text-blue-500 cursor-pointer transition-colors" />
              <Send className="h-4 w-4 hover:text-indigo-500 cursor-pointer transition-colors" />
            </div>
            <Bookmark className="h-4 w-4 text-foreground cursor-pointer" />
          </div>

          {/* Likes & Caption */}
          <div className="space-y-1 text-xs">
            <p className="font-semibold text-foreground text-[11px]">184 likes</p>
            <p className="text-foreground leading-normal">
              <span className="font-semibold mr-1.5">{authorHandle}</span>
              <span>{renderFormattedText(displayText)}</span>
            </p>
            {allHashtags && (
              <p className="text-blue-600 dark:text-blue-400 font-medium text-[11px]">
                {allHashtags}
              </p>
            )}
            <p className="text-[10px] text-muted-foreground uppercase pt-1 font-mono">
              Just now
            </p>
          </div>
        </div>
      )}

      {/* 3. Facebook Page Mockup */}
      {platform === "facebook" && (
        <div className="rounded-lg border border-border bg-background p-3.5 space-y-3 text-xs shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden">
                {authorAvatar ? (
                  <img src={authorAvatar} alt={authorName} className="h-full w-full object-cover" />
                ) : (
                  authorName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-foreground flex items-center gap-1">
                  <span>{authorName}</span>
                  <CheckCircle2 className="h-3 w-3 text-blue-600 fill-blue-600/20" />
                </div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span>Just now</span>
                  <span>•</span>
                  <Globe className="h-2.5 w-2.5" />
                </div>
              </div>
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Post Text */}
          <div className="space-y-1.5 text-foreground leading-relaxed">
            <p>{renderFormattedText(displayText)}</p>
            {allHashtags && (
              <p className="text-blue-600 dark:text-blue-400 font-medium">
                {allHashtags}
              </p>
            )}
          </div>

          {/* Media Attachment */}
          {mediaUrl && (
            <div className="rounded-md border border-border overflow-hidden bg-muted/20">
              {isVideo ? (
                <div className="relative aspect-video flex items-center justify-center bg-black">
                  <video src={mediaUrl} className="w-full h-full object-contain" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                      <Play className="h-5 w-5 fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              ) : (
                <img src={mediaUrl} alt="Facebook attachment" className="w-full max-h-72 object-contain" />
              )}
            </div>
          )}

          {/* Reaction Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[10px] text-muted-foreground font-mono">
            <span>👍 ❤️ 56 reactions</span>
            <span>18 comments • 6 shares</span>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-3 gap-1 pt-1 border-t border-border/50 text-muted-foreground text-[11px] font-medium">
            <button className="flex items-center justify-center gap-1.5 py-1 rounded hover:bg-muted/50 transition-colors">
              <ThumbsUp className="h-3.5 w-3.5" /> Like
            </button>
            <button className="flex items-center justify-center gap-1.5 py-1 rounded hover:bg-muted/50 transition-colors">
              <MessageSquare className="h-3.5 w-3.5" /> Comment
            </button>
            <button className="flex items-center justify-center gap-1.5 py-1 rounded hover:bg-muted/50 transition-colors">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>
        </div>
      )}

      {/* 4. YouTube Video Card Mockup */}
      {platform === "youtube" && (
        <div className="rounded-lg border border-border bg-background p-3.5 space-y-3 text-xs shadow-sm">
          {/* Video Player Frame */}
          <div className="relative rounded-md border border-border overflow-hidden bg-black aspect-video flex items-center justify-center">
            {mediaUrl ? (
              isVideo ? (
                <video src={mediaUrl} controls className="w-full h-full object-contain" />
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img src={mediaUrl} alt="YouTube poster" className="w-full h-full object-contain opacity-80" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="h-12 w-12 rounded-full bg-red-600/90 flex items-center justify-center text-white shadow-lg">
                      <Play className="h-6 w-6 fill-white ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1 text-[10px] font-mono text-white">
                    0:05
                  </span>
                </div>
              )
            ) : (
              <div className="text-center space-y-1 text-muted-foreground font-mono">
                <Play className="h-8 w-8 mx-auto opacity-50" />
                <p className="text-[11px]">Upload video clip (MP4, MOV, WebM)</p>
              </div>
            )}
          </div>

          {/* Video Title */}
          <div>
            <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
              {title || caption.split("\n")[0] || "SocialSync Video Title"}
            </h3>
            <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
              0 views • Just now
            </p>
          </div>

          {/* Channel Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                {authorAvatar ? (
                  <img src={authorAvatar} alt={authorName} className="h-full w-full rounded-full object-cover" />
                ) : (
                  authorName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="leading-tight">
                <p className="font-semibold text-foreground text-xs">{authorName}</p>
                <p className="text-[10px] text-muted-foreground font-mono">1.2K subscribers</p>
              </div>
            </div>
            <button className="rounded-full bg-foreground text-background px-3 py-1 text-[11px] font-semibold hover:opacity-90 transition-opacity">
              Subscribe
            </button>
          </div>

          {/* Description Box */}
          <div className="rounded bg-muted/40 p-2.5 text-[11px] text-foreground space-y-1">
            <p className="whitespace-pre-wrap line-clamp-3 text-muted-foreground">
              {renderFormattedText(displayText)}
            </p>
            {allHashtags && (
              <p className="text-blue-600 dark:text-blue-400 font-medium font-mono text-[10px]">
                {allHashtags}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 5. WHATSAPP LIVE PREVIEW */}
      {platform === "whatsapp" && (
        <div className="rounded-xl overflow-hidden border border-border shadow-xs bg-[#efeae2] dark:bg-[#0b141a]">
          {/* WhatsApp Header */}
          <div className="bg-[#075E54] dark:bg-[#202c33] text-white px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center font-bold text-xs text-white">
                {authorAvatar ? (
                  <img src={authorAvatar} alt={authorName} className="h-full w-full object-cover" />
                ) : (
                  <PlatformIcon platform="whatsapp" className="size-5" />
                )}
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs">{authorName || "SocialSync Broadcast"}</span>
                  <CheckCircle2 className="size-3 text-emerald-300 fill-emerald-300/20" />
                </div>
                <p className="text-[10px] text-emerald-100/80 font-mono">Channel • OpenWA Gateway</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <Phone className="size-3.5" />
              <VideoIcon className="size-4" />
              <MoreHorizontal className="size-4" />
            </div>
          </div>

          {/* Chat Canvas */}
          <div className="p-3 min-h-[220px] flex flex-col justify-end">
            <div className="flex justify-end">
              <div className="bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-lg p-2.5 shadow-xs max-w-[92%] space-y-2 border border-emerald-200/50 dark:border-emerald-800/40">
                {/* Media preview */}
                {mediaUrl && (
                  <div className="rounded-md overflow-hidden bg-black/10 aspect-video relative flex items-center justify-center">
                    {isVideo ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <video src={mediaUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="h-10 w-10 rounded-full bg-black/60 flex items-center justify-center text-white">
                            <Play className="h-5 w-5 fill-white ml-0.5" />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <img src={mediaUrl} alt="WhatsApp attachment" className="w-full h-full object-cover" />
                    )}
                  </div>
                )}

                {/* Text Body */}
                <div className="text-xs whitespace-pre-wrap leading-relaxed break-words font-sans">
                  {renderFormattedText(displayText)}
                  {allHashtags && (
                    <p className="text-[#027eb5] dark:text-[#53bdeb] font-mono text-[11px] mt-1.5 font-medium">
                      {allHashtags}
                    </p>
                  )}
                </div>

                {/* Read Receipt Footer */}
                <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground dark:text-white/60 font-mono pt-0.5">
                  <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <CheckCheck className="size-3.5 text-[#53bdeb]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
