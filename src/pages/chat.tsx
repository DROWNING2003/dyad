// 💬 聊天页面组件 / Chat Page Component
// 📝 这是主要的聊天界面，包含聊天面板和可调整大小的预览面板
// 📝 This is the main chat interface containing chat panel and resizable preview panel

// React 核心钩子 / React core hooks
import { useState, useRef, useEffect } from "react";
// 可调整大小的面板组件 / Resizable panel components
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
  type ImperativePanelHandle,
} from "react-resizable-panels";
// 聊天和预览面板组件 / Chat and preview panel components
import { ChatPanel } from "../components/ChatPanel";
import { PreviewPanel } from "../components/preview_panel/PreviewPanel";
// TanStack Router 路由钩子 / TanStack Router routing hooks
import { useNavigate, useSearch } from "@tanstack/react-router";
// 样式工具函数 / Style utility function
import { cn } from "@/lib/utils";
// Jotai 状态管理钩子 / Jotai state management hooks
import { useAtom, useAtomValue, useSetAtom } from "jotai";
// 视图状态原子 / View state atoms
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";
// 聊天数据钩子 / Chat data hook
import { useChats } from "@/hooks/useChats";
// 应用状态原子 / App state atoms
import { selectedAppIdAtom } from "@/atoms/appAtoms";

// 💬 聊天页面主组件 / Main chat page component
export default function ChatPage() {
  // 🔍 从URL搜索参数获取聊天ID / Get chat ID from URL search params
  let { id: chatId } = useSearch({ from: "/chat" });
  
  // 🧭 路由导航钩子 / Router navigation hook
  const navigate = useNavigate();
  
  // 👁️ 预览面板开关状态 / Preview panel toggle state
  const [isPreviewOpen, setIsPreviewOpen] = useAtom(isPreviewOpenAtom);
  
  // 📏 面板调整大小状态 / Panel resizing state
  const [isResizing, setIsResizing] = useState(false);
  
  // 🎯 当前选中的应用ID / Currently selected app ID
  const selectedAppId = useAtomValue(selectedAppIdAtom);
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);
  
  // 💬 获取聊天列表数据 / Get chat list data
  const { chats, loading } = useChats(selectedAppId);

  // 🔄 自动重定向到第一个聊天 / Auto redirect to first chat
  // 当用户访问 /chat 但没有指定 chatId 时，自动重定向到第一个聊天
  // When user visits /chat without specifying chatId, auto redirect to first chat
  useEffect(() => {
    if (!chatId && chats.length && !loading) {
      // 这不是真正的导航，只是重定向 / Not a real navigation, just a redirect
      // 当用户导航到 /chat 但没有 chatId 时，我们重定向到第一个聊天
      // When the user navigates to /chat without a chatId, we redirect to the first chat
      setSelectedAppId(chats[0].appId);
      navigate({ to: "/chat", search: { id: chats[0].id }, replace: true });
    }
  }, [chatId, chats, loading, navigate]);

  // 📏 预览面板引用 / Preview panel reference
  const ref = useRef<ImperativePanelHandle>(null);

  // 👁️ 预览面板展开/收起控制 / Preview panel expand/collapse control
  // 根据预览开关状态控制面板的展开和收起
  // Control panel expand and collapse based on preview toggle state
  useEffect(() => {
    if (isPreviewOpen) {
      ref.current?.expand();
    } else {
      ref.current?.collapse();
    }
  }, [isPreviewOpen]);

  // 🎨 渲染聊天页面布局 / Render chat page layout
  return (
    // 📐 水平方向的可调整面板组 / Horizontal resizable panel group
    // autoSaveId 用于保存面板大小状态 / autoSaveId for saving panel size state
    <PanelGroup autoSaveId="persistence" direction="horizontal">
      
      {/* 💬 聊天面板 / Chat panel */}
      <Panel id="chat-panel" minSize={30}>
        <div className="h-full w-full">
          <ChatPanel
            chatId={chatId}
            isPreviewOpen={isPreviewOpen}
            onTogglePreview={() => {
              // 🔄 切换预览面板显示状态 / Toggle preview panel display state
              setIsPreviewOpen(!isPreviewOpen);
              if (isPreviewOpen) {
                ref.current?.collapse(); // 收起面板 / Collapse panel
              } else {
                ref.current?.expand(); // 展开面板 / Expand panel
              }
            }}
          />
        </div>
      </Panel>

      {/* 📏 面板分隔器和预览面板 / Panel separator and preview panel */}
      <>
        {/* 🔧 可拖拽的面板调整手柄 / Draggable panel resize handle */}
        <PanelResizeHandle
          onDragging={(e) => setIsResizing(e)}
          className="w-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors cursor-col-resize"
        />
        
        {/* 👁️ 可收起的预览面板 / Collapsible preview panel */}
        <Panel
          collapsible
          ref={ref}
          id="preview-panel"
          minSize={20}
          className={cn(
            // 🎭 只在非调整大小时应用过渡动画 / Apply transition animation only when not resizing
            !isResizing && "transition-all duration-100 ease-in-out",
          )}
        >
          <PreviewPanel />
        </Panel>
      </>
    </PanelGroup>
  );
}
