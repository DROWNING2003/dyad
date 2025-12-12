/**
 * 📦 依赖包安装执行器 (Execute Add Dependency)
 * 
 * 📋 模块功能: 执行 npm/pnpm 包安装操作，并更新消息内容
 * 🎯 核心作用: 将 AI 请求的依赖包安装到项目中
 * 
 * 🔧 支持的包管理器:
 * - 🚀 pnpm (优先使用) - 更快的包管理器
 * - 📦 npm (备用) - 传统包管理器，使用 --legacy-peer-deps 标志
 * 
 * 🚀 工作流程:
 * 1. 📋 接收要安装的包列表
 * 2. 🔄 尝试使用 pnpm 安装
 * 3. 📦 如果 pnpm 失败，回退到 npm
 * 4. 📝 记录安装结果到消息内容
 * 5. 🗃️ 更新数据库中的消息记录
 * 
 * 💡 设计特点:
 * - 🔄 优雅降级 - pnpm → npm 自动切换
 * - 📋 结果记录 - 安装输出保存到消息中
 * - 🛡️ 错误处理 - 捕获并记录安装错误
 * - 🎯 路径安全 - 在指定应用目录执行
 */

import { db } from "../../db";
import { messages } from "../../db/schema";
import { eq } from "drizzle-orm";
import { Message } from "../ipc_types";
import { exec } from "node:child_process";
import { promisify } from "node:util";

// 🔄 将 exec 转换为 Promise 形式，便于 async/await 使用
export const execPromise = promisify(exec);

/**
 * 📦 执行依赖包安装 (Execute Add Dependency)
 * 
 * 🎯 功能: 在指定项目中安装 npm 包，并记录安装结果
 * 📋 策略: 优先使用 pnpm，失败时自动回退到 npm
 * 
 * 🔧 安装命令:
 * - 🚀 pnpm add <packages> (优先)
 * - 📦 npm install --legacy-peer-deps <packages> (备用)
 * 
 * @param packages 要安装的包名数组
 * @param message 关联的消息对象（用于更新内容）
 * @param appPath 项目根目录路径（执行安装的工作目录）
 * 
 * 🚀 执行流程:
 * 1. 📋 合并包名为命令行参数
 * 2. 🔄 执行安装命令（pnpm || npm）
 * 3. 📝 收集安装输出（stdout + stderr）
 * 4. 🔄 更新消息内容，嵌入安装结果
 * 5. 🗃️ 保存更新后的消息到数据库
 * 
 * 💡 设计考虑:
 * - 🛡️ 路径安全: 在指定的 appPath 目录执行
 * - 🔄 优雅降级: pnpm 失败时自动尝试 npm
 * - 📋 结果追踪: 安装输出嵌入到原始消息中
 * - 🗃️ 状态持久化: 更新数据库记录安装状态
 */
export async function executeAddDependency({
  packages,
  message,
  appPath,
}: {
  packages: string[];
  message: Message;
  appPath: string;
}) {
  // 📋 将包名数组合并为空格分隔的字符串
  const packageStr = packages.join(" ");

  // 🚀 执行包安装命令 - 优先 pnpm，失败时回退到 npm
  const { stdout, stderr } = await execPromise(
    `(pnpm add ${packageStr}) || (npm install --legacy-peer-deps ${packageStr})`,
    {
      cwd: appPath, // 🎯 在项目目录中执行命令
    },
  );
  
  // 📝 合并标准输出和错误输出作为安装结果
  const installResults = stdout + (stderr ? `\n${stderr}` : "");

  // 🔄 更新消息内容 - 将安装结果嵌入到 dyad-add-dependency 标签中
  const updatedContent = message.content.replace(
    new RegExp(
      `<dyad-add-dependency packages="${packages.join(
        " ",
      )}">[^<]*</dyad-add-dependency>`,
      "g", // 🔄 全局替换所有匹配的标签
    ),
    `<dyad-add-dependency packages="${packages.join(
      " ",
    )}">${installResults}</dyad-add-dependency>`,
  );

  // 🗃️ 将更新后的消息内容保存到数据库
  await db
    .update(messages)
    .set({ content: updatedContent })
    .where(eq(messages.id, message.id));
}
