// 💬 聊天面板组件 / Chat Panel Component
// 📝 这是主要的聊天界面组件，包含消息列表、输入框和版本面板
// 📝 This is the main chat interface component containing message list, input box and version panel

// React 核心钩子 / React core hooks
import { useState, useRef, useEffect, useCallback } from "react";
// Jotai 状态管理 / Jotai state management
import { useAtomValue, useSetAtom } from "jotai";
// 聊天相关状态原子 / Chat-related state atoms
import {
  chatMessagesByIdAtom,
  chatStreamCountByIdAtom,
  isStreamingByIdAtom,
} from "../atoms/chatAtoms";
// IPC 客户端通信 / IPC client communication
import { IpcClient } from "@/ipc/ipc_client";

// 聊天相关子组件 / Chat-related sub-components
import { ChatHeader } from "./chat/ChatHeader";
import { MessagesList } from "./chat/MessagesList";
import { ChatInput } from "./chat/ChatInput";
import { VersionPane } from "./chat/VersionPane";
import { ChatError } from "./chat/ChatError";
// UI 组件 / UI components
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";

// 💬 聊天面板属性接口 / Chat panel props interface
interface ChatPanelProps {
  chatId?: number; // 聊天ID / Chat ID
  isPreviewOpen: boolean; // 预览面板是否打开 / Whether preview panel is open
  onTogglePreview: () => void; // 切换预览面板回调 / Toggle preview panel callback
}

// 💬 聊天面板主组件 / Main chat panel component
export function ChatPanel({
  chatId,
  isPreviewOpen,
  onTogglePreview,
}: ChatPanelProps) {
  // 📨 聊天消息状态管理 / Chat messages state management
  const messagesById = useAtomValue(chatMessagesByIdAtom); // 按ID存储的消息 / Messages stored by ID
  const setMessagesById = useSetAtom(chatMessagesByIdAtom); // 设置消息状态 / Set messages state
  
  // 🏷️ 版本面板状态 / Version panel state
  const [isVersionPaneOpen, setIsVersionPaneOpen] = useState(false);
  
  // ❌ 错误状态管理 / Error state management
  const [error, setError] = useState<string | null>(null);
  
  // 🌊 流式响应状态 / Streaming response state
  const streamCountById = useAtomValue(chatStreamCountByIdAtom); // 流式计数 / Stream count
  const isStreamingById = useAtomValue(isStreamingByIdAtom); // 是否正在流式传输 / Whether streaming
  
  // 📍 DOM 引用 / DOM references
  // 用于存储已处理的提示，避免重复提交 / Reference to store processed prompt to avoid duplicate submission
  const messagesEndRef = useRef<HTMLDivElement | null>(null); // 消息列表底部引用 / Messages list bottom reference
  const messagesContainerRef = useRef<HTMLDivElement | null>(null); // 消息容器引用 / Messages container reference

  // 📜 滚动相关属性 / Scroll-related properties
  const [isUserScrolling, setIsUserScrolling] = useState(false); // 用户是否正在滚动 / Whether user is scrolling
  const [showScrollButton, setShowScrollButton] = useState(false); // 是否显示滚动按钮 / Whether to show scroll button
  const userScrollTimeoutRef = useRef<number | null>(null); // 用户滚动超时引用 / User scroll timeout reference
  const lastScrollTopRef = useRef<number>(0); // 上次滚动位置 / Last scroll position
  // 📜 滚动到底部函数 / Scroll to bottom function
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // 🔘 滚动按钮点击处理 / Scroll button click handler
  const handleScrollButtonClick = () => {
    if (!messagesContainerRef.current) return;
    scrollToBottom("smooth");
  };

  // 📏 获取距离底部的距离 / Get distance from bottom
  const getDistanceFromBottom = () => {
    if (!messagesContainerRef.current) return 0;
    const container = messagesContainerRef.current;
    return (
      container.scrollHeight - (container.scrollTop + container.clientHeight)
    );
  };

  // 🎯 判断是否接近底部 / Check if near bottom
  const isNearBottom = (threshold: number = 100) => {
    return getDistanceFromBottom() <= threshold;
  };

  // 📏 滚动偏离阈值 / Scroll away threshold
  const scrollAwayThreshold = 150; // 距离底部多少像素认为"滚动偏离" / pixels from bottom to consider "scrolled away"

  // 📜 滚动事件处理器 / Scroll event handler
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const distanceFromBottom =
      container.scrollHeight - (container.scrollTop + container.clientHeight);

    // 🔄 用户已从底部滚动偏离 / User has scrolled away from bottom
    if (distanceFromBottom > scrollAwayThreshold) {
      setIsUserScrolling(true); // 标记用户正在滚动 / Mark user is scrolling
      setShowScrollButton(true); // 显示滚动按钮 / Show scroll button

      // 🕐 清除之前的超时 / Clear previous timeout
      if (userScrollTimeoutRef.current) {
        window.clearTimeout(userScrollTimeoutRef.current);
      }

      // ⏰ 设置新的超时，2秒后重置滚动状态 / Set new timeout, reset scroll state after 2 seconds
      userScrollTimeoutRef.current = window.setTimeout(() => {
        setIsUserScrolling(false);
      }, 2000); // 增加超时到2秒 / Increased timeout to 2 seconds
    } else {
      // 🎯 用户接近底部 / User is near bottom
      setIsUserScrolling(false); // 重置滚动状态 / Reset scroll state
      setShowScrollButton(false); // 隐藏滚动按钮 / Hide scroll button
    }
    lastScrollTopRef.current = container.scrollTop; // 记录滚动位置 / Record scroll position
  }, []);

  // 🌊 流式响应时自动滚动效果 / Auto-scroll effect during streaming
  useEffect(() => {
    const streamCount = chatId ? (streamCountById.get(chatId) ?? 0) : 0;
    console.log("streamCount - scrolling to bottom", streamCount);
    scrollToBottom(); // 滚动到底部 / Scroll to bottom
  }, [
    chatId,
    chatId ? (streamCountById.get(chatId) ?? 0) : 0, // 流式计数变化 / Stream count changes
    chatId ? (isStreamingById.get(chatId) ?? false) : false, // 流式状态变化 / Streaming state changes
  ]);

  // 📜 滚动事件监听器设置 / Scroll event listener setup
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      // 🎧 添加滚动事件监听器（被动模式提升性能）/ Add scroll event listener (passive mode for performance)
      container.addEventListener("scroll", handleScroll, { passive: true });
    }

    // 🧹 清理函数 / Cleanup function
    return () => {
      if (container) {
        container.removeEventListener("scroll", handleScroll); // 移除滚动监听器 / Remove scroll listener
      }
      if (userScrollTimeoutRef.current) {
        window.clearTimeout(userScrollTimeoutRef.current); // 清除超时 / Clear timeout
      }
    };
  }, [handleScroll]);

  // 📨 获取聊天消息的回调函数 / Callback function to fetch chat messages
  const fetchChatMessages = useCallback(async () => {
    if (!chatId) {
      // 没有聊天ID时不执行操作 / No-op when no chat ID
      return;
    }
    // 🔗 通过IPC获取聊天数据 / Get chat data via IPC
    const chat = await IpcClient.getInstance().getChat(chatId);
    // 📝 更新消息状态 / Update messages state
    setMessagesById((prev) => {
      const next = new Map(prev);
      next.set(chatId, chat.messages);
      return next;
    });
  }, [chatId, setMessagesById]);

  // 🔄 聊天消息获取效果 / Chat messages fetch effect
  useEffect(() => {
    fetchChatMessages();
  }, [fetchChatMessages]);

  // 📨 当前聊天的消息和流式状态 / Current chat messages and streaming state
  const messages = chatId ? (messagesById.get(chatId) ?? []) : [];
  const isStreaming = chatId ? (isStreamingById.get(chatId) ?? false) : false;

  // 🌊 流式传输时消息变化的自动滚动效果 / Auto-scroll effect when messages change during streaming
  useEffect(() => {
    if (
      !isUserScrolling && // 用户未主动滚动 / User is not actively scrolling
      isStreaming && // 正在流式传输 / Currently streaming
      messagesContainerRef.current && // 容器存在 / Container exists
      messages.length > 0 // 有消息 / Has messages
    ) {
      // 🎯 只有当用户接近底部时才自动滚动 / Only auto-scroll if user is close to bottom
      if (isNearBottom(280)) {
        requestAnimationFrame(() => {
          scrollToBottom("instant"); // 立即滚动到底部 / Instantly scroll to bottom
        });
      }
    }
  }, [messages, isUserScrolling, isStreaming]);

  // 🎨 渲染聊天面板布局 / Render chat panel layout
  return (
    <div className="flex flex-col h-full">
      {/* 📋 聊天头部 / Chat header */}
      <ChatHeader
        isVersionPaneOpen={isVersionPaneOpen}
        isPreviewOpen={isPreviewOpen}
        onTogglePreview={onTogglePreview}
        onVersionClick={() => setIsVersionPaneOpen(!isVersionPaneOpen)}
      />
      
      {/* 📱 主要内容区域 / Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* 💬 聊天区域（当版本面板关闭时显示）/ Chat area (shown when version panel is closed) */}
        {!isVersionPaneOpen && (
          <div className="flex-1 flex flex-col min-w-0">
            {/* 📨 消息列表区域 / Messages list area */}
            <div className="flex-1 relative overflow-hidden">
              <MessagesList
                messages={messages}
                messagesEndRef={messagesEndRef}
                ref={messagesContainerRef}
              />

              {/* 🔘 滚动到底部按钮 / Scroll to bottom button */}
              {showScrollButton && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10">
                  <Button
                    onClick={handleScrollButtonClick}
                    size="icon"
                    className="rounded-full shadow-lg hover:shadow-xl transition-all border border-border/50 backdrop-blur-sm bg-background/95 hover:bg-accent"
                    variant="outline"
                    title={"Scroll to bottom"}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* ❌ 错误显示组件 / Error display component */}
            <ChatError error={error} onDismiss={() => setError(null)} />
            
            {/* ⌨️ 聊天输入组件 / Chat input component */}
            <ChatInput chatId={chatId} />
          </div>
        )}
        
        {/* 🏷️ 版本面板 / Version panel */}
        <VersionPane
          isVisible={isVersionPaneOpen}
          onClose={() => setIsVersionPaneOpen(false)}
        />
      </div>
    </div>
  );
}
