// 🌐 Jotai 状态管理原子定义 / Jotai State Management Atoms Definition
// 📝 这个文件定义了应用程序的全局状态原子，使用 Jotai 进行状态管理
// 📝 This file defines global state atoms for the application using Jotai for state management

import { atom } from "jotai";
import type { App, AppOutput, Version } from "@/ipc/ipc_types";
import type { UserSettings } from "@/lib/schemas";

// 🎯 当前选中的应用程序 / Currently selected application
// 存储用户当前正在查看或编辑的应用程序对象
// Stores the application object that the user is currently viewing or editing
export const currentAppAtom = atom<App | null>(null);

// 🆔 选中的应用程序ID / Selected application ID  
// 存储当前选中应用程序的唯一标识符
// Stores the unique identifier of the currently selected application
export const selectedAppIdAtom = atom<number | null>(null);

// 📋 应用程序列表 / Applications list
// 存储所有可用应用程序的数组，用于应用程序选择器
// Stores an array of all available applications for the application selector
export const appsListAtom = atom<App[]>([]);

// 📁 应用程序基础路径 / Application base path
// 存储应用程序文件的根目录路径
// Stores the root directory path for application files
export const appBasePathAtom = atom<string>("");

// 🏷️ 版本列表 / Versions list
// 存储应用程序的所有版本信息，用于版本管理
// Stores all version information for the application, used for version management
export const versionsListAtom = atom<Version[]>([]);

// 👁️ 预览模式 / Preview mode
// 控制右侧面板显示的内容类型（预览、代码、问题等）
// Controls the type of content displayed in the right panel (preview, code, problems, etc.)
export const previewModeAtom = atom<
  "preview" | "code" | "problems" | "configure" | "publish" | "security"
>("preview");

// 🏷️ 选中的版本ID / Selected version ID
// 存储当前选中版本的唯一标识符
// Stores the unique identifier of the currently selected version
export const selectedVersionIdAtom = atom<string | null>(null);

// 📤 应用程序输出 / Application output
// 存储应用程序运行时的输出信息和日志
// Stores output information and logs from application runtime
export const appOutputAtom = atom<AppOutput[]>([]);

// 🌐 应用程序URL / Application URL
// 存储应用程序的访问URL信息，包括应用ID和原始URL
// Stores application access URL information, including app ID and original URL
export const appUrlAtom = atom<
  | { appUrl: string; appId: number; originalUrl: string }
  | { appUrl: null; appId: null; originalUrl: null }
>({ appUrl: null, appId: null, originalUrl: null });

// ⚙️ 用户设置 / User settings
// 存储用户的个人配置和偏好设置
// Stores user's personal configuration and preference settings
export const userSettingsAtom = atom<UserSettings | null>(null);

// 🔐 环境变量原子 / Environment variables atom
// 存储允许列表中的环境变量，用于应用程序配置
// Stores allow-listed environment variables for application configuration
export const envVarsAtom = atom<Record<string, string | undefined>>({});

// 🔑 预览面板键 / Preview panel key
// 用于强制重新渲染预览面板的计数器
// Counter used to force re-rendering of the preview panel
export const previewPanelKeyAtom = atom<number>(0);

// ❌ 预览错误消息 / Preview error message
// 存储预览过程中发生的错误信息和错误来源
// Stores error information and error source that occurred during preview
export const previewErrorMessageAtom = atom<
  { message: string; source: "preview-app" | "dyad-app" } | undefined
>(undefined);
