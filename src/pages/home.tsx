/**
 * 🏠 首页组件 (Home Page Component)
 * 
 * 📋 功能描述 (Functionality):
 * - 🎯 Dyad 应用的主入口页面，提供 AI 驱动的应用创建体验
 * - 🎯 Main entry point for Dyad app, providing AI-driven app creation experience
 * 
 * 🔧 核心功能 (Core Features):
 * - 💬 智能聊天输入 - AI chat input for app creation
 * - 🎲 灵感提示词 - Inspiration prompts for quick start
 * - 📱 应用创建流程 - Complete app creation workflow
 * - 📄 版本更新通知 - Release notes notification system
 * - 🔧 设置和配置管理 - Settings and configuration management
 * 
 * 🚀 技术架构 (Technical Architecture):
 * - ⚛️ React 函数组件 + TanStack Router 路由
 * - 🗃️ Jotai 状态管理 + TanStack Query 数据获取
 * - 🔗 IPC 通信与 Electron 主进程交互
 * - 📊 PostHog 用户行为分析集成
 * 
 * 💡 用户体验 (User Experience):
 * - 🎨 响应式设计，支持明暗主题切换
 * - ⚡ 流畅的加载状态和过渡动画
 * - 🎯 直观的提示词建议和快速操作
 * - 📱 文件附件支持和拖拽上传
 */

// 🔗 路由和导航 (Routing & Navigation)
import { useNavigate, useSearch } from "@tanstack/react-router";

// 🗃️ 状态管理 (State Management)
import { useAtom, useSetAtom } from "jotai";
import { homeChatInputValueAtom } from "../atoms/chatAtoms";
import { selectedAppIdAtom } from "@/atoms/appAtoms";
import { isPreviewOpenAtom } from "@/atoms/viewAtoms";

// 🔗 IPC 通信 (IPC Communication)
import { IpcClient } from "@/ipc/ipc_client";

// 🛠️ 工具函数 (Utility Functions)
import { generateCuteAppName } from "@/lib/utils";
import { showError } from "@/lib/toast";

// 🪝 自定义 Hooks (Custom Hooks)
import { useLoadApps } from "@/hooks/useLoadApps";
import { useSettings } from "@/hooks/useSettings";
import { useStreamChat } from "@/hooks/useStreamChat";
import { useAppVersion } from "@/hooks/useAppVersion";
import { invalidateAppQuery } from "@/hooks/useLoadApp";

// 🎨 UI 组件 (UI Components)
import { SetupBanner } from "@/components/SetupBanner";
import { HomeChatInput } from "@/components/chat/HomeChatInput";
import { PrivacyBanner } from "@/components/TelemetryBanner";
import { ImportAppButton } from "@/components/ImportAppButton";
import { ProBanner } from "@/components/ProBanner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ⚛️ React 核心 (React Core)
import { useState, useEffect, useCallback } from "react";

// 📊 分析和主题 (Analytics & Theme)
import { usePostHog } from "posthog-js/react";
import { useTheme } from "@/contexts/ThemeContext";

// 🎯 数据获取 (Data Fetching)
import { useQueryClient } from "@tanstack/react-query";

// 🎨 图标 (Icons)
import { ExternalLink } from "lucide-react";

// 📄 常量和类型 (Constants & Types)
import { INSPIRATION_PROMPTS } from "@/prompts/inspiration_prompts";
import { NEON_TEMPLATE_IDS } from "@/shared/templates";
import { neonTemplateHook } from "@/client_logic/template_hook";
import type { FileAttachment } from "@/ipc/ipc_types";

/**
 * 📎 首页提交选项接口 (Home Submit Options Interface)
 * 
 * 🎯 用途 (Purpose): 定义首页聊天提交时的可选参数
 * 📋 功能 (Features): 支持文件附件上传到 AI 聊天
 */
export interface HomeSubmitOptions {
  attachments?: FileAttachment[];  // 📎 可选的文件附件数组 (Optional file attachments array)
}

/**
 * 🏠 首页主组件 (Home Page Main Component)
 * 
 * 🎯 核心职责 (Core Responsibilities):
 * - 🚀 应用创建入口 - Entry point for app creation
 * - 💬 AI 聊天交互 - AI chat interaction interface  
 * - 🎲 灵感提示展示 - Display inspiration prompts
 * - 📄 版本更新通知 - Handle release notes notifications
 * - 🔧 用户设置管理 - Manage user settings and preferences
 */
export default function HomePage() {
  // 🗃️ 状态管理 (State Management)
  const [inputValue, setInputValue] = useAtom(homeChatInputValueAtom);  // 💬 聊天输入值 (Chat input value)
  const setSelectedAppId = useSetAtom(selectedAppIdAtom);               // 📱 选中的应用ID (Selected app ID)
  const setIsPreviewOpen = useSetAtom(isPreviewOpenAtom);               // 👁️ 预览面板状态 (Preview panel state)
  
  // 🔗 路由和导航 (Routing & Navigation)
  const navigate = useNavigate();                                       // 🧭 页面导航函数 (Page navigation)
  const search = useSearch({ from: "/" });                             // 🔍 URL 搜索参数 (URL search params)
  
  // 🪝 自定义 Hooks (Custom Hooks)
  const { refreshApps } = useLoadApps();                               // 🔄 刷新应用列表 (Refresh apps list)
  const { settings, updateSettings } = useSettings();                 // ⚙️ 用户设置管理 (User settings)
  const { streamMessage } = useStreamChat({ hasChatId: false });       // 💬 流式聊天消息 (Stream chat messages)
  const appVersion = useAppVersion();                                  // 📱 应用版本信息 (App version info)
  
  // 📊 分析和主题 (Analytics & Theme)
  const posthog = usePostHog();                                        // 📈 用户行为分析 (User analytics)
  const { theme } = useTheme();                                        // 🎨 主题管理 (Theme management)
  
  // 🎯 数据获取 (Data Fetching)
  const queryClient = useQueryClient();                               // 🔄 查询客户端 (Query client)
  
  // 🏠 本地状态 (Local State)
  const [isLoading, setIsLoading] = useState(false);                  // ⏳ 加载状态 (Loading state)
  const [releaseNotesOpen, setReleaseNotesOpen] = useState(false);    // 📄 版本说明对话框 (Release notes dialog)
  const [releaseUrl, setReleaseUrl] = useState("");                   // 🔗 版本说明URL (Release notes URL)
  // 📄 版本更新检查效果 (Version Update Check Effect)
  useEffect(() => {
    /**
     * 🔄 更新最后启动版本 (Update Last Launched Version)
     * 
     * 🎯 功能 (Functionality):
     * - 检查是否有新版本发布说明需要显示
     * - 避免首次使用时显示版本说明（防止打扰）
     * - 自动获取并显示版本说明内容
     */
    const updateLastVersionLaunched = async () => {
      if (
        appVersion &&
        settings &&
        settings.lastShownReleaseNotesVersion !== appVersion
      ) {
        // 🔍 判断是否应该显示版本说明 (Determine if should show release notes)
        const shouldShowReleaseNotes = !!settings.lastShownReleaseNotesVersion;
        
        // 💾 更新设置中的版本记录 (Update version record in settings)
        await updateSettings({
          lastShownReleaseNotesVersion: appVersion,
        });
        
        // 🚫 首次使用时不显示版本说明，避免打扰用户
        // Don't show release notes on first use to avoid being spammy
        if (!shouldShowReleaseNotes) {
          return;
        }

        try {
          // 🔍 检查版本说明是否存在 (Check if release notes exist)
          const result = await IpcClient.getInstance().doesReleaseNoteExist({
            version: appVersion,
          });

          if (result.exists && result.url) {
            // 🎨 构建带主题参数的URL (Build URL with theme parameters)
            setReleaseUrl(result.url + "?hideHeader=true&theme=" + theme);
            setReleaseNotesOpen(true);  // 📄 显示版本说明对话框 (Show release notes dialog)
          }
        } catch (err) {
          console.warn(
            "Unable to check if release note exists for: " + appVersion,
            err,
          );
        }
      }
    };
    updateLastVersionLaunched();
  }, [appVersion, settings, updateSettings, theme]);

  // 🔍 从搜索参数获取应用ID (Get appId from search params)
  const appId = search.appId ? Number(search.appId) : null;

  // 🎲 随机提示词状态 (Random prompts state)
  const [randomPrompts, setRandomPrompts] = useState<
    typeof INSPIRATION_PROMPTS
  >([]);

  /**
   * 🎲 获取随机提示词函数 (Get Random Prompts Function)
   * 
   * 🎯 功能 (Functionality):
   * - 从灵感提示词库中随机选择3个
   * - 使用 Fisher-Yates 洗牌算法确保随机性
   * - 提供快速开始的应用创建灵感
   */
  const getRandomPrompts = useCallback(() => {
    const shuffled = [...INSPIRATION_PROMPTS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);  // 📊 返回前3个随机提示词 (Return first 3 random prompts)
  }, []);

  // 🎲 初始化随机提示词 (Initialize random prompts)
  useEffect(() => {
    setRandomPrompts(getRandomPrompts());
  }, [getRandomPrompts]);

  // 🔗 应用详情页面重定向 (App Details Page Redirect)
  useEffect(() => {
    if (appId) {
      // 📱 如果URL中包含应用ID，自动跳转到应用详情页面
      // If appId is present in URL, automatically navigate to app details page
      navigate({ to: "/app-details", search: { appId } });
    }
  }, [appId, navigate]);

  /**
   * 🚀 处理聊天提交 (Handle Chat Submit)
   * 
   * 🎯 核心功能 (Core Functionality):
   * - 创建新应用和聊天会话 (Create new app and chat session)
   * - 处理文件附件上传 (Handle file attachment uploads)
   * - 启动 AI 流式响应 (Initiate AI streaming response)
   * - 导航到聊天页面 (Navigate to chat page)
   * 
   * 🔧 处理流程 (Processing Flow):
   * 1. 验证输入内容 (Validate input content)
   * 2. 创建应用实例 (Create app instance)
   * 3. 应用模板钩子 (Apply template hooks)
   * 4. 启动流式聊天 (Start streaming chat)
   * 5. 更新状态和导航 (Update state and navigate)
   */
  const handleSubmit = async (options?: HomeSubmitOptions) => {
    // 📎 获取文件附件，默认为空数组 (Get file attachments, default to empty array)
    const attachments = options?.attachments || [];

    // ✅ 验证输入：需要有文本内容或文件附件 (Validate input: need text or attachments)
    if (!inputValue.trim() && attachments.length === 0) return;

    try {
      setIsLoading(true);  // ⏳ 开始加载状态 (Start loading state)
      
      // 🏗️ 创建新应用和聊天会话 (Create new app and chat session)
      const result = await IpcClient.getInstance().createApp({
        name: generateCuteAppName(),  // 🎯 生成可爱的应用名称 (Generate cute app name)
      });
      
      // 🎨 应用 Neon 模板钩子（如果选择了相关模板）
      // Apply Neon template hook if relevant template is selected
      if (
        settings?.selectedTemplateId &&
        NEON_TEMPLATE_IDS.has(settings.selectedTemplateId)
      ) {
        await neonTemplateHook({
          appId: result.app.id,
          appName: result.app.name,
        });
      }

      // 💬 启动流式消息处理，包含附件 (Start streaming message with attachments)
      streamMessage({
        prompt: inputValue,
        chatId: result.chatId,
        attachments,
      });
      
      // ⏱️ 等待延迟（测试模式下跳过）(Wait with delay, skip in test mode)
      await new Promise((resolve) =>
        setTimeout(resolve, settings?.isTestMode ? 0 : 2000),
      );

      // 🧹 清理和状态更新 (Cleanup and state updates)
      setInputValue("");                    // 清空输入框 (Clear input)
      setSelectedAppId(result.app.id);      // 设置选中应用 (Set selected app)
      setIsPreviewOpen(false);              // 关闭预览面板 (Close preview panel)
      
      // 🔄 刷新数据和缓存 (Refresh data and cache)
      await refreshApps();                  // 刷新应用列表 (Refresh apps list)
      await invalidateAppQuery(queryClient, { appId: result.app.id });  // 失效查询缓存 (Invalidate query cache)
      
      // 📊 记录用户行为分析 (Record user analytics)
      posthog.capture("home:chat-submit");
      
      // 🧭 导航到聊天页面 (Navigate to chat page)
      navigate({ to: "/chat", search: { id: result.chatId } });
    } catch (error) {
      // 🚨 错误处理 (Error handling)
      console.error("Failed to create chat:", error);
      showError("Failed to create app. " + (error as any).toString());
      setIsLoading(false);  // 🔄 重置加载状态 (Reset loading state on error)
    }
    // 💡 成功时不需要 finally 块，因为会发生页面导航
    // No finally block needed for setIsLoading(false) here if navigation happens on success
  };

  // ⏳ 应用创建加载覆盖层 (Loading overlay for app creation)
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center max-w-3xl m-auto p-8">
        <div className="w-full flex flex-col items-center">
          {/* 🔄 加载旋转器 (Loading Spinner) */}
          <div className="relative w-24 h-24 mb-8">
            {/* 🎨 背景圆环 (Background ring) */}
            <div className="absolute top-0 left-0 w-full h-full border-8 border-gray-200 dark:border-gray-700 rounded-full"></div>
            {/* ⚡ 旋转的主色调圆环 (Spinning primary colored ring) */}
            <div className="absolute top-0 left-0 w-full h-full border-8 border-t-primary rounded-full animate-spin"></div>
          </div>
          {/* 📝 加载标题 (Loading title) */}
          <h2 className="text-2xl font-bold mb-2 text-gray-800 dark:text-gray-200">
            Building your app
          </h2>
          {/* 📄 加载描述文本 (Loading description text) */}
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
            We're setting up your app with AI magic. <br />
            This might take a moment...
          </p>
        </div>
      </div>
    );
  }

  // 🏠 主要首页内容 (Main Home Page Content)
  return (
    <div className="flex flex-col items-center justify-center max-w-3xl w-full m-auto p-8">
      {/* 🔧 设置横幅 - 显示配置提醒 (Setup Banner - Show configuration reminders) */}
      <SetupBanner />

      <div className="w-full">
        {/* 📥 导入应用按钮 (Import App Button) */}
        <ImportAppButton />
        
        {/* 💬 首页聊天输入组件 (Home Chat Input Component) */}
        <HomeChatInput onSubmit={handleSubmit} />

        {/* 🎲 灵感提示词区域 (Inspiration Prompts Area) */}
        <div className="flex flex-col gap-4 mt-2">
          {/* 🎯 随机提示词按钮组 (Random Prompt Buttons Group) */}
          <div className="flex flex-wrap gap-4 justify-center">
            {randomPrompts.map((item, index) => (
              <button
                type="button"
                key={index}
                onClick={() => setInputValue(`Build me a ${item.label}`)}  // 🎯 点击填充输入框 (Click to fill input)
                className="flex items-center gap-3 px-4 py-2 rounded-xl border border-gray-200
                           bg-white/50 backdrop-blur-sm
                           transition-all duration-200
                           hover:bg-white hover:shadow-md hover:border-gray-300
                           active:scale-[0.98]
                           dark:bg-gray-800/50 dark:border-gray-700
                           dark:hover:bg-gray-800 dark:hover:border-gray-600"
              >
                {/* 🎨 提示词图标 (Prompt icon) */}
                <span className="text-gray-700 dark:text-gray-300">
                  {item.icon}
                </span>
                {/* 📝 提示词标签 (Prompt label) */}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {/* 🔄 更多想法按钮 - 刷新随机提示词 (More Ideas Button - Refresh random prompts) */}
          <button
            type="button"
            onClick={() => setRandomPrompts(getRandomPrompts())}  // 🎲 获取新的随机提示词 (Get new random prompts)
            className="self-center flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200
                       bg-white/50 backdrop-blur-sm
                       transition-all duration-200
                       hover:bg-white hover:shadow-md hover:border-gray-300
                       active:scale-[0.98]
                       dark:bg-gray-800/50 dark:border-gray-700
                       dark:hover:bg-gray-800 dark:hover:border-gray-600"
          >
            {/* 🔄 刷新图标 SVG (Refresh icon SVG) */}
            <svg
              className="w-5 h-5 text-gray-700 dark:text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {/* 📝 按钮文本 (Button text) */}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              More ideas
            </span>
          </button>
        </div>
        
        {/* 🚀 Pro 功能横幅 (Pro Features Banner) */}
        <ProBanner />
      </div>
      
      {/* 🔒 隐私横幅 - 遥测数据收集通知 (Privacy Banner - Telemetry data collection notice) */}
      <PrivacyBanner />

      {/* 📄 版本说明对话框 (Release Notes Dialog) */}
      <Dialog open={releaseNotesOpen} onOpenChange={setReleaseNotesOpen}>
        <DialogContent className="max-w-4xl bg-(--docs-bg) pr-0 pt-4 pl-4 gap-1">
          <DialogHeader>
            {/* 📝 对话框标题 (Dialog title) */}
            <DialogTitle>What's new in v{appVersion}?</DialogTitle>
            
            {/* 🔗 外部链接按钮 - 在新窗口打开完整版本说明 (External link button - Open full release notes in new window) */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-10 top-2 focus-visible:ring-0 focus-visible:ring-offset-0"
              onClick={() =>
                window.open(
                  releaseUrl.replace("?hideHeader=true&theme=" + theme, ""),  // 🔗 移除主题参数打开完整页面 (Remove theme params for full page)
                  "_blank",
                )
              }
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </DialogHeader>
          
          {/* 📄 版本说明内容区域 (Release notes content area) */}
          <div className="overflow-auto h-[70vh] flex flex-col ">
            {releaseUrl && (
              <div className="flex-1">
                {/* 🖼️ 嵌入式版本说明页面 (Embedded release notes page) */}
                <iframe
                  src={releaseUrl}
                  className="w-full h-full border-0 rounded-lg"
                  title={`Release notes for v${appVersion}`}  // 📝 无障碍标题 (Accessibility title)
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
