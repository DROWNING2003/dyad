/**
 * 🔍 TypeScript 编译检查器 (TypeScript Compiler Checker)
 * 
 * 📋 模块功能: 使用 Worker 线程执行 TypeScript 编译检查
 * 🎯 核心作用: 在 AI 响应执行前预检查 TypeScript 代码问题
 * 
 * 🔧 检查范围:
 * - 📝 新写入的文件 (dyad-write)
 * - 🔄 重命名的文件 (dyad-rename)
 * - 🗑️ 删除的文件 (dyad-delete)
 * - 🎯 虚拟文件系统变更模拟
 * 
 * 🚀 工作流程:
 * 1. 📋 解析 AI 响应中的文件操作标签
 * 2. 🎭 创建虚拟文件系统变更
 * 3. 🔄 启动 Worker 线程执行 TSC 检查
 * 4. 📊 收集编译错误和警告
 * 5. 📋 生成问题报告返回给调用者
 * 
 * 💡 设计特点:
 * - 🔄 异步处理 - 使用 Worker 线程避免阻塞主线程
 * - 🎭 虚拟检查 - 不实际修改文件系统
 * - 📊 详细报告 - 提供完整的编译问题信息
 * - 🚀 性能优化 - 利用 TypeScript 缓存加速检查
 * 
 * 🛡️ 安全特性:
 * - 🔒 沙盒执行 - Worker 线程隔离
 * - ⏱️ 超时控制 - 防止长时间阻塞
 * - 🚨 错误处理 - 优雅处理各种异常情况
 */

import * as path from "node:path";
import { Worker } from "node:worker_threads";

import { ProblemReport } from "../ipc_types";
import log from "electron-log";
import { WorkerInput, WorkerOutput } from "../../../shared/tsc_types";

import {
  getDyadDeleteTags,
  getDyadRenameTags,
  getDyadWriteTags,
} from "../utils/dyad_tag_parser";
import { getTypeScriptCachePath } from "@/paths/paths";

const logger = log.scope("tsc");

/**
 * 📊 生成问题报告 (Generate Problem Report)
 * 
 * 🎯 功能: 基于 AI 响应中的文件操作，生成 TypeScript 编译问题报告
 * 📋 检查方式: 使用虚拟文件系统模拟变更，无需实际修改文件
 * 
 * 🔧 处理步骤:
 * 1. 📋 解析 AI 响应中的 Dyad 标签
 * 2. 🎭 构建虚拟文件系统变更
 * 3. 🔄 启动 Worker 线程执行 TSC
 * 4. 📊 等待编译结果和问题报告
 * 5. 🧹 清理 Worker 资源
 * 
 * @param fullResponse AI 生成的完整响应文本
 * @param appPath 项目根目录路径
 * @returns Promise<ProblemReport> 编译问题报告
 * 
 * 💡 使用场景:
 * - 🚨 预检查 - 在实际执行文件操作前验证
 * - 🔍 问题发现 - 提前发现 TypeScript 编译错误
 * - 📋 用户反馈 - 向用户展示潜在的代码问题
 * 
 * 🛡️ 错误处理:
 * - Worker 启动失败
 * - 编译超时
 * - 意外退出
 */
export async function generateProblemReport({
  fullResponse,
  appPath,
}: {
  fullResponse: string;
  appPath: string;
}): Promise<ProblemReport> {
  return new Promise((resolve, reject) => {
    // 📁 确定 Worker 脚本路径
    const workerPath = path.join(__dirname, "tsc_worker.js");

    logger.info(`Starting TSC worker for app ${appPath}`);

    // 🔄 创建 Worker 线程实例
    const worker = new Worker(workerPath);

    // 📨 处理 Worker 消息 - 接收编译结果
    worker.on("message", (output: WorkerOutput) => {
      worker.terminate(); // 🧹 立即终止 Worker 释放资源

      if (output.success && output.data) {
        // ✅ 编译检查成功，返回问题报告
        logger.info(`TSC worker completed successfully for app ${appPath}`);
        resolve(output.data);
      } else {
        // ❌ 编译检查失败，抛出错误
        logger.error(`TSC worker failed for app ${appPath}: ${output.error}`);
        reject(new Error(output.error || "Unknown worker error"));
      }
    });

    // 🚨 处理 Worker 错误 - 运行时异常
    worker.on("error", (error) => {
      logger.error(`TSC worker error for app ${appPath}:`, error);
      worker.terminate(); // 🧹 确保 Worker 被终止
      reject(error);
    });

    // 🚪 处理 Worker 退出 - 异常退出检测
    worker.on("exit", (code) => {
      if (code !== 0) {
        // ⚠️ 非正常退出，记录错误
        logger.error(`TSC worker exited with code ${code} for app ${appPath}`);
        reject(new Error(`Worker exited with code ${code}`));
      }
    });

    // 🏷️ 解析 AI 响应中的文件操作标签
    const writeTags = getDyadWriteTags(fullResponse);     // 📝 文件写入操作
    const renameTags = getDyadRenameTags(fullResponse);   // 🔄 文件重命名操作
    const deletePaths = getDyadDeleteTags(fullResponse);  // 🗑️ 文件删除操作
    
    // 🎭 构建虚拟文件系统变更对象
    const virtualChanges = {
      deletePaths,  // 🗑️ 要删除的文件路径列表
      renameTags,   // 🔄 文件重命名映射
      writeTags,    // 📝 要写入的文件内容
    };

    // 📦 准备发送给 Worker 的输入数据
    const input: WorkerInput = {
      virtualChanges,                              // 🎭 虚拟文件系统变更
      appPath,                                     // 📁 项目根目录路径
      tsBuildInfoCacheDir: getTypeScriptCachePath(), // 🚀 TypeScript 缓存目录
    };

    logger.info(`Sending input to TSC worker for app ${appPath}`);

    // 📨 向 Worker 发送输入数据，开始编译检查
    worker.postMessage(input);
  });
}
