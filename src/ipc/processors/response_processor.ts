/**
 * 🚀 AI 响应处理器 (Response Processor)
 * 
 * 📋 模块功能: 处理 AI 生成的响应，执行其中包含的 Dyad 标签操作
 * 🎯 核心作用: 将 AI 的文本响应转换为实际的文件系统操作和代码变更
 * 
 * 🔧 支持的操作类型:
 * - 📝 文件写入/创建 (dyad-write)
 * - 🔄 文件重命名 (dyad-rename) 
 * - 🗑️ 文件删除 (dyad-delete)
 * - 📦 依赖包管理 (dyad-add-dependency)
 * - 🗃️ SQL 查询执行 (dyad-execute-sql)
 * - 🔍 搜索替换 (dyad-search-replace)
 * 
 * 🚀 处理流程:
 * 1. 📋 解析 AI 响应中的 Dyad 标签
 * 2. 🔍 验证操作权限和文件路径安全性
 * 3. 🗃️ 执行数据库操作（SQL 查询）
 * 4. 📦 处理依赖包安装
 * 5. 📁 按顺序执行文件操作（删除 → 重命名 → 写入）
 * 6. ☁️ 同步 Supabase 函数部署
 * 7. 📝 提交 Git 变更并记录
 * 8. ✅ 更新消息状态为已批准
 * 
 * 🛡️ 安全特性:
 * - 🔒 路径安全验证 (safeJoin)
 * - 🎯 应用范围限制 (appPath)
 * - 📋 操作日志记录
 * - ⚠️ 错误处理和回滚
 * 
 * 💡 设计理念:
 * - 🎭 原子性操作 - 要么全部成功，要么全部回滚
 * - 📊 详细日志 - 记录每个操作的执行状态
 * - 🔄 幂等性 - 重复执行相同操作应该安全
 * - 🚨 错误恢复 - 优雅处理各种异常情况
 */

import { db } from "../../db";
import { chats, messages } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import fs from "node:fs";
import { getDyadAppPath } from "../../paths/paths";
import path from "node:path";
import { safeJoin } from "../utils/path_utils";

import log from "electron-log";
import { executeAddDependency } from "./executeAddDependency";
import {
  deleteSupabaseFunction,
  deploySupabaseFunctions,
  executeSupabaseSql,
} from "../../supabase_admin/supabase_management_client";
import { isServerFunction } from "../../supabase_admin/supabase_utils";
import { UserSettings } from "../../lib/schemas";
import {
  gitCommit,
  gitAdd,
  gitRemove,
  gitAddAll,
  getGitUncommittedFiles,
} from "../utils/git_utils";
import { readSettings } from "@/main/settings";
import { writeMigrationFile } from "../utils/file_utils";
import {
  getDyadWriteTags,
  getDyadRenameTags,
  getDyadDeleteTags,
  getDyadAddDependencyTags,
  getDyadExecuteSqlTags,
  getDyadSearchReplaceTags,
} from "../utils/dyad_tag_parser";
import { applySearchReplace } from "../../pro/main/ipc/processors/search_replace_processor";
import { storeDbTimestampAtCurrentVersion } from "../utils/neon_timestamp_utils";

import { FileUploadsState } from "../utils/file_uploads_state";

const readFile = fs.promises.readFile;
const logger = log.scope("response_processor");

/**
 * 📋 输出消息接口 - 用于收集处理过程中的警告和错误
 */
interface Output {
  message: string;  // 📄 用户友好的错误/警告消息
  error: unknown;   // 🐛 原始错误对象，用于调试
}

/**
 * 🏷️ 从文件路径提取 Supabase 函数名
 * 
 * @param input 文件路径（可能是目录或文件）
 * @returns Supabase 函数名称
 * 
 * 💡 逻辑: 
 * - 如果是文件路径，返回其父目录名
 * - 如果是目录路径，返回目录名本身
 */
function getFunctionNameFromPath(input: string): string {
  return path.basename(path.extname(input) ? path.dirname(input) : input);
}

/**
 * 📖 从函数路径读取文件内容
 * 
 * @param input 函数路径（目录或文件）
 * @returns 文件内容字符串
 * 
 * 💡 逻辑:
 * - 如果输入是目录，读取其中的 index.ts 文件
 * - 如果输入是文件，直接读取该文件
 */
async function readFileFromFunctionPath(input: string): Promise<string> {
  // 🔍 判断路径类型：目录还是文件
  if (path.extname(input) === "") {
    // 📁 目录路径 - 读取 index.ts
    return readFile(path.join(input, "index.ts"), "utf8");
  }
  // 📄 文件路径 - 直接读取
  return readFile(input, "utf8");
}

/**
 * 🔍 搜索替换操作预检查 (Dry Run Search Replace)
 * 
 * 🎯 功能: 在实际执行前验证搜索替换操作的可行性
 * 📋 用途: 提前发现潜在问题，避免部分成功的操作状态
 * 
 * 🔧 检查项目:
 * - 📁 目标文件是否存在
 * - 🔍 搜索替换规则是否有效
 * - 📄 文件内容是否可以正确解析
 * 
 * @param fullResponse AI 生成的完整响应文本
 * @param appPath 应用根目录路径
 * @returns 发现的问题列表，空数组表示无问题
 * 
 * 💡 使用场景:
 * - 🚨 操作前验证 - 在实际修改文件前检查
 * - 🔍 问题诊断 - 帮助用户理解为什么操作可能失败
 * - 🛡️ 安全保障 - 避免部分执行导致的不一致状态
 */
export async function dryRunSearchReplace({
  fullResponse,
  appPath,
}: {
  fullResponse: string;
  appPath: string;
}) {
  const issues: { filePath: string; error: string }[] = [];
  const dyadSearchReplaceTags = getDyadSearchReplaceTags(fullResponse);
  
  // 🔄 遍历所有搜索替换标签进行预检查
  for (const tag of dyadSearchReplaceTags) {
    const filePath = tag.path;
    const fullFilePath = safeJoin(appPath, filePath);
    
    try {
      // 📁 检查目标文件是否存在
      if (!fs.existsSync(fullFilePath)) {
        issues.push({
          filePath,
          error: `Search-replace target file does not exist: ${filePath}`,
        });
        continue;
      }

      // 📖 读取原始文件内容
      const original = await readFile(fullFilePath, "utf8");
      
      // 🔍 尝试应用搜索替换规则
      const result = applySearchReplace(original, tag.content);
      if (!result.success || typeof result.content !== "string") {
        issues.push({
          filePath,
          error:
            "Unable to apply search-replace to file because: " + result.error,
        });
        continue;
      }
    } catch (error) {
      // 🐛 捕获任何其他错误
      issues.push({
        filePath,
        error: error?.toString() ?? "Unknown error",
      });
    }
  }
  return issues;
}

/**
 * 🚀 处理完整响应操作 (Process Full Response Actions)
 * 
 * 🎯 核心功能: 解析并执行 AI 响应中的所有 Dyad 标签操作
 * 📋 处理范围: 文件操作、数据库查询、依赖管理、版本控制
 * 
 * 🔧 执行顺序:
 * 1. 🗃️ 数据库版本控制准备 (Neon 分支)
 * 2. 🗃️ SQL 查询执行
 * 3. 📦 依赖包安装
 * 4. 🗑️ 文件删除操作
 * 5. 🔄 文件重命名操作  
 * 6. 🔍 搜索替换操作
 * 7. 📝 文件写入操作
 * 8. ☁️ Supabase 函数同步
 * 9. 📝 Git 提交和状态更新
 * 
 * @param fullResponse AI 生成的完整响应文本
 * @param chatId 聊天会话 ID
 * @param chatSummary 聊天摘要（用于 Git 提交消息）
 * @param messageId 消息 ID（用于状态更新）
 * @returns 处理结果，包含文件更新状态和错误信息
 * 
 * 🛡️ 安全保障:
 * - 🔒 路径安全验证
 * - 📋 详细操作日志
 * - 🔄 原子性操作
 * - ⚠️ 错误恢复机制
 */
export async function processFullResponseActions(
  fullResponse: string,
  chatId: number,
  {
    chatSummary,
    messageId,
  }: {
    chatSummary: string | undefined;
    messageId: number;
  },
): Promise<{
  updatedFiles?: boolean;
  error?: string;
  extraFiles?: string[];
  extraFilesError?: string;
}> {
  // 📁 获取文件上传状态管理器
  const fileUploadsState = FileUploadsState.getInstance();
  const fileUploadsMap = fileUploadsState.getFileUploadsForChat(chatId);
  fileUploadsState.clear(chatId); // 🧹 清理当前聊天的上传状态
  
  logger.log("processFullResponseActions for chatId", chatId);
  
  // 🗃️ 获取与聊天关联的应用信息
  const chatWithApp = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: {
      app: true, // 📱 包含应用详细信息
    },
  });
  
  if (!chatWithApp || !chatWithApp.app) {
    logger.error(`No app found for chat ID: ${chatId}`);
    return {}; // ❌ 无法找到关联应用，直接返回
  }

  // 🗃️ 数据库版本控制准备 (Neon 分支管理)
  if (
    chatWithApp.app.neonProjectId &&
    chatWithApp.app.neonDevelopmentBranchId
  ) {
    try {
      // 📊 在当前版本创建数据库时间戳快照
      await storeDbTimestampAtCurrentVersion({
        appId: chatWithApp.app.id,
      });
    } catch (error) {
      logger.error("Error creating Neon branch at current version:", error);
      throw new Error(
        "Could not create Neon branch; database versioning functionality is not working: " +
          error,
      );
    }
  }

  // 🔧 初始化处理环境
  const settings: UserSettings = readSettings();           // 📋 用户设置
  const appPath = getDyadAppPath(chatWithApp.app.path);   // 📁 应用根路径
  const writtenFiles: string[] = [];                      // 📝 已写入文件列表
  const renamedFiles: string[] = [];                      // 🔄 已重命名文件列表
  const deletedFiles: string[] = [];                      // 🗑️ 已删除文件列表
  let hasChanges = false;                                 // 🔄 是否有文件变更

  const warnings: Output[] = [];                          // ⚠️ 警告消息收集
  const errors: Output[] = [];                            // 🚨 错误消息收集

  try {
    // 🏷️ 解析所有 Dyad 标签 - 从 AI 响应中提取操作指令
    const dyadWriteTags = getDyadWriteTags(fullResponse);              // 📝 文件写入标签
    const dyadRenameTags = getDyadRenameTags(fullResponse);            // 🔄 文件重命名标签
    const dyadDeletePaths = getDyadDeleteTags(fullResponse);           // 🗑️ 文件删除标签
    const dyadAddDependencyPackages = getDyadAddDependencyTags(fullResponse); // 📦 依赖包标签
    const dyadExecuteSqlQueries = chatWithApp.app.supabaseProjectId    // 🗃️ SQL 查询标签
      ? getDyadExecuteSqlTags(fullResponse)
      : []; // 只有配置了 Supabase 项目才处理 SQL

    // 🗃️ 获取当前处理的消息记录
    const message = await db.query.messages.findFirst({
      where: and(
        eq(messages.id, messageId),
        eq(messages.role, "assistant"),    // 🤖 确保是 AI 助手的消息
        eq(messages.chatId, chatId),
      ),
    });

    if (!message) {
      logger.error(`No message found for ID: ${messageId}`);
      return {}; // ❌ 找不到消息记录，无法继续处理
    }

    // 🗃️ 处理 SQL 执行标签 - 执行数据库查询操作
    if (dyadExecuteSqlQueries.length > 0) {
      for (const query of dyadExecuteSqlQueries) {
        try {
          // 🚀 执行 Supabase SQL 查询
          await executeSupabaseSql({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            query: query.content,
          });

          // 📝 如果启用了迁移文件写入，创建迁移文件
          if (settings.enableSupabaseWriteSqlMigration) {
            try {
              const migrationFilePath = await writeMigrationFile(
                appPath,
                query.content,
                query.description,
              );
              writtenFiles.push(migrationFilePath); // 📋 记录创建的迁移文件
            } catch (error) {
              errors.push({
                message: `Failed to write SQL migration file for: ${query.description}`,
                error: error,
              });
            }
          }
        } catch (error) {
          // 🚨 SQL 执行失败，记录错误但继续处理其他操作
          errors.push({
            message: `Failed to execute SQL query: ${query.content}`,
            error: error,
          });
        }
      }
      logger.log(`Executed ${dyadExecuteSqlQueries.length} SQL queries`);
    }

    // 📦 处理依赖包添加标签 - 安装 npm 包
    if (dyadAddDependencyPackages.length > 0) {
      try {
        // 🚀 执行依赖包安装
        await executeAddDependency({
          packages: dyadAddDependencyPackages,
          message: message,
          appPath,
        });
      } catch (error) {
        // 🚨 依赖安装失败，记录错误
        errors.push({
          message: `Failed to add dependencies: ${dyadAddDependencyPackages.join(
            ", ",
          )}`,
          error: error,
        });
      }
      
      // 📋 记录可能被修改的包管理文件
      writtenFiles.push("package.json");                    // 📦 包配置文件
      
      const pnpmFilename = "pnpm-lock.yaml";               // 🔒 pnpm 锁文件
      if (fs.existsSync(safeJoin(appPath, pnpmFilename))) {
        writtenFiles.push(pnpmFilename);
      }
      
      const packageLockFilename = "package-lock.json";     // 🔒 npm 锁文件
      if (fs.existsSync(safeJoin(appPath, packageLockFilename))) {
        writtenFiles.push(packageLockFilename);
      }
    }

    //////////////////////
    // 📁 文件操作处理 (File Operations Processing)
    // 
    // 🔄 执行顺序 (严格按此顺序执行):
    // 1. 🗑️ 删除操作 (Deletes)
    // 2. 🔄 重命名操作 (Renames) 
    // 3. 🔍 搜索替换操作 (Search-Replace)
    // 4. 📝 写入操作 (Writes)
    //
    // 🎯 顺序原因:
    // - 🗑️ 先删除避免路径冲突
    // - 🔄 重命名释放原路径供后续使用
    // - 🔍 搜索替换修改现有文件内容
    // - 📝 最后写入新文件，避免覆盖重命名的文件
    // - 🤖 AI 经常会重命名后再编辑同一文件
    //////////////////////

    // Process all file deletions
    for (const filePath of dyadDeletePaths) {
      const fullFilePath = safeJoin(appPath, filePath);

      // Delete the file if it exists
      if (fs.existsSync(fullFilePath)) {
        if (fs.lstatSync(fullFilePath).isDirectory()) {
          fs.rmdirSync(fullFilePath, { recursive: true });
        } else {
          fs.unlinkSync(fullFilePath);
        }
        logger.log(`Successfully deleted file: ${fullFilePath}`);
        deletedFiles.push(filePath);

        // Remove the file from git
        try {
          await gitRemove({ path: appPath, filepath: filePath });
        } catch (error) {
          logger.warn(`Failed to git remove deleted file ${filePath}:`, error);
          // Continue even if remove fails as the file was still deleted
        }
      } else {
        logger.warn(`File to delete does not exist: ${fullFilePath}`);
      }
      if (isServerFunction(filePath)) {
        try {
          await deleteSupabaseFunction({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            functionName: getFunctionNameFromPath(filePath),
          });
        } catch (error) {
          errors.push({
            message: `Failed to delete Supabase function: ${filePath}`,
            error: error,
          });
        }
      }
    }

    // Process all file renames
    for (const tag of dyadRenameTags) {
      const fromPath = safeJoin(appPath, tag.from);
      const toPath = safeJoin(appPath, tag.to);

      // Ensure target directory exists
      const dirPath = path.dirname(toPath);
      fs.mkdirSync(dirPath, { recursive: true });

      // Rename the file
      if (fs.existsSync(fromPath)) {
        fs.renameSync(fromPath, toPath);
        logger.log(`Successfully renamed file: ${fromPath} -> ${toPath}`);
        renamedFiles.push(tag.to);

        // Add the new file and remove the old one from git
        await gitAdd({ path: appPath, filepath: tag.to });
        try {
          await gitRemove({ path: appPath, filepath: tag.from });
        } catch (error) {
          logger.warn(`Failed to git remove old file ${tag.from}:`, error);
          // Continue even if remove fails as the file was still renamed
        }
      } else {
        logger.warn(`Source file for rename does not exist: ${fromPath}`);
      }
      if (isServerFunction(tag.from)) {
        try {
          await deleteSupabaseFunction({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            functionName: getFunctionNameFromPath(tag.from),
          });
        } catch (error) {
          warnings.push({
            message: `Failed to delete Supabase function: ${tag.from} as part of renaming ${tag.from} to ${tag.to}`,
            error: error,
          });
        }
      }
      if (isServerFunction(tag.to)) {
        try {
          await deploySupabaseFunctions({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            functionName: getFunctionNameFromPath(tag.to),
            content: await readFileFromFunctionPath(toPath),
          });
        } catch (error) {
          errors.push({
            message: `Failed to deploy Supabase function: ${tag.to} as part of renaming ${tag.from} to ${tag.to}`,
            error: error,
          });
        }
      }
    }

    // Process all search-replace edits
    const dyadSearchReplaceTags = getDyadSearchReplaceTags(fullResponse);
    for (const tag of dyadSearchReplaceTags) {
      const filePath = tag.path;
      const fullFilePath = safeJoin(appPath, filePath);
      try {
        if (!fs.existsSync(fullFilePath)) {
          // Do not show warning to user because we already attempt to do a <dyad-write> tag to fix it.
          logger.warn(`Search-replace target file does not exist: ${filePath}`);
          continue;
        }
        const original = await readFile(fullFilePath, "utf8");
        const result = applySearchReplace(original, tag.content);
        if (!result.success || typeof result.content !== "string") {
          // Do not show warning to user because we already attempt to do a <dyad-write> and/or a subsequent <dyad-search-replace> tag to fix it.
          logger.warn(
            `Failed to apply search-replace to ${filePath}: ${result.error ?? "unknown"}`,
          );
          continue;
        }
        // Write modified content
        fs.writeFileSync(fullFilePath, result.content);
        writtenFiles.push(filePath);

        // If server function, redeploy
        if (isServerFunction(filePath)) {
          try {
            await deploySupabaseFunctions({
              supabaseProjectId: chatWithApp.app.supabaseProjectId!,
              functionName: path.basename(path.dirname(filePath)),
              content: result.content,
            });
          } catch (error) {
            errors.push({
              message: `Failed to deploy Supabase function after search-replace: ${filePath}`,
              error: error,
            });
          }
        }
      } catch (error) {
        errors.push({
          message: `Error applying search-replace to ${filePath}`,
          error: error,
        });
      }
    }

    // Process all file writes
    for (const tag of dyadWriteTags) {
      const filePath = tag.path;
      let content: string | Buffer = tag.content;
      const fullFilePath = safeJoin(appPath, filePath);

      // Check if content (stripped of whitespace) exactly matches a file ID and replace with actual file content
      if (fileUploadsMap) {
        const trimmedContent = tag.content.trim();
        const fileInfo = fileUploadsMap.get(trimmedContent);
        if (fileInfo) {
          try {
            const fileContent = await readFile(fileInfo.filePath);
            content = fileContent;
            logger.log(
              `Replaced file ID ${trimmedContent} with content from ${fileInfo.originalName}`,
            );
          } catch (error) {
            logger.error(
              `Failed to read uploaded file ${fileInfo.originalName}:`,
              error,
            );
            errors.push({
              message: `Failed to read uploaded file: ${fileInfo.originalName}`,
              error: error,
            });
          }
        }
      }

      // Ensure directory exists
      const dirPath = path.dirname(fullFilePath);
      fs.mkdirSync(dirPath, { recursive: true });

      // Write file content
      fs.writeFileSync(fullFilePath, content);
      logger.log(`Successfully wrote file: ${fullFilePath}`);
      writtenFiles.push(filePath);
      if (isServerFunction(filePath) && typeof content === "string") {
        try {
          await deploySupabaseFunctions({
            supabaseProjectId: chatWithApp.app.supabaseProjectId!,
            functionName: path.basename(path.dirname(filePath)),
            content: content,
          });
        } catch (error) {
          errors.push({
            message: `Failed to deploy Supabase function: ${filePath}`,
            error: error,
          });
        }
      }
    }

    // If we have any file changes, commit them all at once
    hasChanges =
      writtenFiles.length > 0 ||
      renamedFiles.length > 0 ||
      deletedFiles.length > 0 ||
      dyadAddDependencyPackages.length > 0;

    let uncommittedFiles: string[] = [];
    let extraFilesError: string | undefined;

    if (hasChanges) {
      // Stage all written files
      for (const file of writtenFiles) {
        await gitAdd({ path: appPath, filepath: file });
      }

      // Create commit with details of all changes
      const changes = [];
      if (writtenFiles.length > 0)
        changes.push(`wrote ${writtenFiles.length} file(s)`);
      if (renamedFiles.length > 0)
        changes.push(`renamed ${renamedFiles.length} file(s)`);
      if (deletedFiles.length > 0)
        changes.push(`deleted ${deletedFiles.length} file(s)`);
      if (dyadAddDependencyPackages.length > 0)
        changes.push(
          `added ${dyadAddDependencyPackages.join(", ")} package(s)`,
        );
      if (dyadExecuteSqlQueries.length > 0)
        changes.push(`executed ${dyadExecuteSqlQueries.length} SQL queries`);

      let message = chatSummary
        ? `[dyad] ${chatSummary} - ${changes.join(", ")}`
        : `[dyad] ${changes.join(", ")}`;
      // Use chat summary, if provided, or default for commit message
      let commitHash = await gitCommit({
        path: appPath,
        message,
      });
      logger.log(`Successfully committed changes: ${changes.join(", ")}`);

      // Check for any uncommitted changes after the commit
      uncommittedFiles = await getGitUncommittedFiles({ path: appPath });

      if (uncommittedFiles.length > 0) {
        // Stage all changes
        await gitAddAll({ path: appPath });
        try {
          commitHash = await gitCommit({
            path: appPath,
            message: message + " + extra files edited outside of Dyad",
            amend: true,
          });
          logger.log(
            `Amend commit with changes outside of dyad: ${uncommittedFiles.join(", ")}`,
          );
        } catch (error) {
          // Just log, but don't throw an error because the user can still
          // commit these changes outside of Dyad if needed.
          logger.error(
            `Failed to commit changes outside of dyad: ${uncommittedFiles.join(
              ", ",
            )}`,
          );
          extraFilesError = (error as any).toString();
        }
      }

      // Save the commit hash to the message
      await db
        .update(messages)
        .set({
          commitHash: commitHash,
        })
        .where(eq(messages.id, messageId));
    }
    logger.log("mark as approved: hasChanges", hasChanges);
    // Update the message to approved
    await db
      .update(messages)
      .set({
        approvalState: "approved",
      })
      .where(eq(messages.id, messageId));

    return {
      updatedFiles: hasChanges,
      extraFiles: uncommittedFiles.length > 0 ? uncommittedFiles : undefined,
      extraFilesError,
    };
  } catch (error: unknown) {
    logger.error("Error processing files:", error);
    return { error: (error as any).toString() };
  } finally {
    const appendedContent = `
    ${warnings
      .map(
        (warning) =>
          `<dyad-output type="warning" message="${warning.message}">${warning.error}</dyad-output>`,
      )
      .join("\n")}
    ${errors
      .map(
        (error) =>
          `<dyad-output type="error" message="${error.message}">${error.error}</dyad-output>`,
      )
      .join("\n")}
    `;
    if (appendedContent.length > 0) {
      await db
        .update(messages)
        .set({
          content: fullResponse + "\n\n" + appendedContent,
        })
        .where(eq(messages.id, messageId));
    }
  }
}
