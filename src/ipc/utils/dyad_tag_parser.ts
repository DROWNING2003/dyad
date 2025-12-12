/**
 * 🏷️ Dyad 标签解析器 (Dyad Tag Parser)
 * 
 * 📋 模块功能: 解析 AI 响应中的特殊 XML 标签，提取代码操作指令
 * 🎯 核心作用: 将 AI 生成的结构化响应转换为可执行的文件操作
 * 
 * 🔧 支持的 Dyad 标签类型:
 * - 📝 <dyad-write> - 创建或修改文件
 * - 🔄 <dyad-rename> - 重命名文件
 * - 🗑️ <dyad-delete> - 删除文件
 * - 📦 <dyad-add-dependency> - 添加依赖包
 * - 💬 <dyad-chat-summary> - 聊天摘要
 * - 🗃️ <dyad-execute-sql> - 执行 SQL 查询
 * - ⚡ <dyad-command> - 执行系统命令
 * - 🔍 <dyad-search-replace> - 搜索替换操作
 * 
 * 🚀 工作流程:
 * 1. AI 生成包含 Dyad 标签的响应
 * 2. 解析器提取标签内容和属性
 * 3. 转换为结构化数据供处理器使用
 * 4. 执行相应的文件系统操作
 * 
 * 💡 设计理念:
 * - 🎭 声明式操作 - 通过标签描述意图而非命令
 * - 🛡️ 安全解析 - 严格的正则表达式匹配
 * - 📁 路径标准化 - 统一处理文件路径格式
 * - 🧹 内容清理 - 自动移除 Markdown 代码围栏
 */

import { normalizePath } from "../../../shared/normalizePath";
import log from "electron-log";
import { SqlQuery } from "../../lib/schemas";

const logger = log.scope("dyad_tag_parser");

/**
 * 📝 解析文件写入标签 (Parse Write Tags)
 * 
 * 🎯 功能: 从 AI 响应中提取 <dyad-write> 标签，用于创建或修改文件
 * 📋 标签格式: <dyad-write path="文件路径" description="描述">文件内容</dyad-write>
 * 
 * 🔧 处理逻辑:
 * - 🎯 提取 path 属性（必需）- 目标文件路径
 * - 📄 提取 description 属性（可选）- 操作描述
 * - 🧹 自动清理 Markdown 代码围栏（```）
 * - 📁 标准化文件路径格式
 * 
 * @param fullResponse AI 生成的完整响应文本
 * @returns 解析出的文件写入操作数组
 * 
 * 💡 使用示例:
 * 输入: <dyad-write path="src/App.tsx" description="创建主应用组件">
 *       ```tsx
 *       import React from 'react';
 *       export default function App() { return <div>Hello</div>; }
 *       ```
 *       </dyad-write>
 * 输出: [{ path: "src/App.tsx", description: "创建主应用组件", content: "import React..." }]
 */
export function getDyadWriteTags(fullResponse: string): {
  path: string;
  content: string;
  description?: string;
}[] {
  // 🎯 正则表达式: 匹配完整的 dyad-write 标签
  const dyadWriteRegex = /<dyad-write([^>]*)>([\s\S]*?)<\/dyad-write>/gi;
  const pathRegex = /path="([^"]+)"/;           // 提取 path 属性
  const descriptionRegex = /description="([^"]+)"/; // 提取 description 属性

  let match;
  const tags: { path: string; content: string; description?: string }[] = [];

  // 🔄 遍历所有匹配的标签
  while ((match = dyadWriteRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1];  // 标签属性字符串
    let content = match[2].trim();      // 标签内容

    const pathMatch = pathRegex.exec(attributesString);
    const descriptionMatch = descriptionRegex.exec(attributesString);

    if (pathMatch && pathMatch[1]) {
      const path = pathMatch[1];
      const description = descriptionMatch?.[1];

      // 🧹 清理 Markdown 代码围栏
      const contentLines = content.split("\n");
      if (contentLines[0]?.startsWith("```")) {
        contentLines.shift(); // 移除开始的 ```
      }
      if (contentLines[contentLines.length - 1]?.startsWith("```")) {
        contentLines.pop();   // 移除结束的 ```
      }
      content = contentLines.join("\n");

      // 📁 添加到结果数组，路径标准化处理
      tags.push({ path: normalizePath(path), content, description });
    } else {
      // ⚠️ 警告: 缺少必需的 path 属性
      logger.warn(
        "Found <dyad-write> tag without a valid 'path' attribute:",
        match[0],
      );
    }
  }
  return tags;
}

/**
 * 🔄 解析文件重命名标签 (Parse Rename Tags)
 * 
 * 🎯 功能: 从 AI 响应中提取 <dyad-rename> 标签，用于重命名文件或目录
 * 📋 标签格式: <dyad-rename from="旧路径" to="新路径"></dyad-rename>
 * 
 * 🔧 处理逻辑:
 * - 🎯 提取 from 属性（必需）- 源文件路径
 * - 🎯 提取 to 属性（必需）- 目标文件路径
 * - 📁 标准化两个路径格式
 * 
 * @param fullResponse AI 生成的完整响应文本
 * @returns 解析出的文件重命名操作数组
 * 
 * 💡 使用示例:
 * 输入: <dyad-rename from="src/OldComponent.tsx" to="src/NewComponent.tsx"></dyad-rename>
 * 输出: [{ from: "src/OldComponent.tsx", to: "src/NewComponent.tsx" }]
 */
export function getDyadRenameTags(fullResponse: string): {
  from: string;
  to: string;
}[] {
  // 🎯 正则表达式: 匹配包含 from 和 to 属性的 dyad-rename 标签
  const dyadRenameRegex =
    /<dyad-rename from="([^"]+)" to="([^"]+)"[^>]*>([\s\S]*?)<\/dyad-rename>/g;
  let match;
  const tags: { from: string; to: string }[] = [];
  
  // 🔄 遍历所有匹配的重命名标签
  while ((match = dyadRenameRegex.exec(fullResponse)) !== null) {
    tags.push({
      from: normalizePath(match[1]), // 📁 标准化源路径
      to: normalizePath(match[2]),   // 📁 标准化目标路径
    });
  }
  return tags;
}

/**
 * 🗑️ 解析文件删除标签 (Parse Delete Tags)
 * 
 * 🎯 功能: 从 AI 响应中提取 <dyad-delete> 标签，用于删除文件或目录
 * 📋 标签格式: <dyad-delete path="文件路径"></dyad-delete>
 * 
 * 🔧 处理逻辑:
 * - 🎯 提取 path 属性（必需）- 要删除的文件路径
 * - 📁 标准化文件路径格式
 * - 📋 返回路径字符串数组
 * 
 * @param fullResponse AI 生成的完整响应文本
 * @returns 解析出的待删除文件路径数组
 * 
 * 💡 使用示例:
 * 输入: <dyad-delete path="src/unused/OldComponent.tsx"></dyad-delete>
 * 输出: ["src/unused/OldComponent.tsx"]
 */
export function getDyadDeleteTags(fullResponse: string): string[] {
  // 🎯 正则表达式: 匹配包含 path 属性的 dyad-delete 标签
  const dyadDeleteRegex =
    /<dyad-delete path="([^"]+)"[^>]*>([\s\S]*?)<\/dyad-delete>/g;
  let match;
  const paths: string[] = [];
  
  // 🔄 遍历所有匹配的删除标签
  while ((match = dyadDeleteRegex.exec(fullResponse)) !== null) {
    paths.push(normalizePath(match[1])); // 📁 标准化并添加路径
  }
  return paths;
}

/**
 * 📦 解析依赖包添加标签 (Parse Add Dependency Tags)
 * 
 * 🎯 功能: 从 AI 响应中提取 <dyad-add-dependency> 标签，用于添加 npm 依赖包
 * 📋 标签格式: <dyad-add-dependency packages="包名1 包名2 包名3"></dyad-add-dependency>
 * 
 * 🔧 处理逻辑:
 * - 🎯 提取 packages 属性（必需）- 空格分隔的包名列表
 * - 📋 分割包名字符串为数组
 * - 🔄 支持多个标签，合并所有包名
 * 
 * @param fullResponse AI 生成的完整响应文本
 * @returns 解析出的依赖包名数组
 * 
 * 💡 使用示例:
 * 输入: <dyad-add-dependency packages="react react-dom typescript"></dyad-add-dependency>
 * 输出: ["react", "react-dom", "typescript"]
 */
export function getDyadAddDependencyTags(fullResponse: string): string[] {
  // 🎯 正则表达式: 匹配包含 packages 属性的 dyad-add-dependency 标签
  const dyadAddDependencyRegex =
    /<dyad-add-dependency packages="([^"]+)">[^<]*<\/dyad-add-dependency>/g;
  let match;
  const packages: string[] = [];
  
  // 🔄 遍历所有匹配的依赖添加标签
  while ((match = dyadAddDependencyRegex.exec(fullResponse)) !== null) {
    // 📋 按空格分割包名并添加到数组（使用展开运算符合并）
    packages.push(...match[1].split(" "));
  }
  return packages;
}

/**
 * 💬 解析聊天摘要标签 (Parse Chat Summary Tag)
 * 
 * 🎯 功能: 从 AI 响应中提取 <dyad-chat-summary> 标签，用于生成聊天摘要
 * 📋 标签格式: <dyad-chat-summary>摘要内容</dyad-chat-summary>
 * 
 * 🔧 处理逻辑:
 * - 📄 提取标签内的摘要文本内容
 * - 🧹 自动清理首尾空白字符
 * - 🎯 只处理第一个匹配的标签
 * - ❌ 未找到时返回 null
 * 
 * @param fullResponse AI 生成的完整响应文本
 * @returns 解析出的聊天摘要文本，未找到时返回 null
 * 
 * 💡 使用示例:
 * 输入: <dyad-chat-summary>用户请求创建了一个 React 组件并添加了样式</dyad-chat-summary>
 * 输出: "用户请求创建了一个 React 组件并添加了样式"
 */
export function getDyadChatSummaryTag(fullResponse: string): string | null {
  // 🎯 正则表达式: 匹配 dyad-chat-summary 标签内容
  const dyadChatSummaryRegex =
    /<dyad-chat-summary>([\s\S]*?)<\/dyad-chat-summary>/g;
  const match = dyadChatSummaryRegex.exec(fullResponse);
  
  if (match && match[1]) {
    return match[1].trim(); // 🧹 清理空白字符并返回
  }
  return null; // ❌ 未找到摘要标签
}

/**
 * 🗃️ 解析 SQL 执行标签 (Parse Execute SQL Tags)
 * 
 * 🎯 功能: 从 AI 响应中提取 <dyad-execute-sql> 标签，用于执行数据库查询
 * 📋 标签格式: <dyad-execute-sql description="描述">SQL 查询语句</dyad-execute-sql>
 * 
 * 🔧 处理逻辑:
 * - 📄 提取 description 属性（可选）- 查询描述
 * - 🗃️ 提取 SQL 查询内容
 * - 🧹 自动清理 Markdown 代码围栏（```sql）
 * - 🔄 支持多个 SQL 查询标签
 * 
 * @param fullResponse AI 生成的完整响应文本
 * @returns 解析出的 SQL 查询对象数组
 * 
 * 💡 使用示例:
 * 输入: <dyad-execute-sql description="查询用户数据">
 *       ```sql
 *       SELECT * FROM users WHERE active = 1;
 *       ```
 *       </dyad-execute-sql>
 * 输出: [{ content: "SELECT * FROM users WHERE active = 1;", description: "查询用户数据" }]
 */
export function getDyadExecuteSqlTags(fullResponse: string): SqlQuery[] {
  // 🎯 正则表达式: 匹配 dyad-execute-sql 标签
  const dyadExecuteSqlRegex =
    /<dyad-execute-sql([^>]*)>([\s\S]*?)<\/dyad-execute-sql>/g;
  const descriptionRegex = /description="([^"]+)"/; // 提取描述属性
  let match;
  const queries: { content: string; description?: string }[] = [];

  // 🔄 遍历所有匹配的 SQL 执行标签
  while ((match = dyadExecuteSqlRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1] || "";
    let content = match[2].trim();
    const descriptionMatch = descriptionRegex.exec(attributesString);
    const description = descriptionMatch?.[1];

    // 🧹 清理 Markdown 代码围栏（处理 ```sql 等）
    const contentLines = content.split("\n");
    if (contentLines[0]?.startsWith("```")) {
      contentLines.shift(); // 移除开始的 ```
    }
    if (contentLines[contentLines.length - 1]?.startsWith("```")) {
      contentLines.pop();   // 移除结束的 ```
    }
    content = contentLines.join("\n");

    // 📋 添加到查询数组
    queries.push({ content, description });
  }

  return queries;
}

/**
 * ⚡ 解析系统命令标签 (Parse Command Tags)
 * 
 * 🎯 功能: 从 AI 响应中提取 <dyad-command> 标签，用于执行系统命令
 * 📋 标签格式: <dyad-command type="命令类型"></dyad-command>
 * 
 * 🔧 处理逻辑:
 * - 🎯 提取 type 属性（必需）- 命令类型标识
 * - 📋 返回命令类型字符串数组
 * - 🔄 支持多个命令标签
 * 
 * @param fullResponse AI 生成的完整响应文本
 * @returns 解析出的命令类型数组
 * 
 * 💡 使用示例:
 * 输入: <dyad-command type="npm-install"></dyad-command>
 * 输出: ["npm-install"]
 * 
 * 🛡️ 安全注意: 命令执行需要严格的权限控制和验证
 */
export function getDyadCommandTags(fullResponse: string): string[] {
  // 🎯 正则表达式: 匹配自闭合的 dyad-command 标签
  const dyadCommandRegex =
    /<dyad-command type="([^"]+)"[^>]*><\/dyad-command>/g;
  let match;
  const commands: string[] = [];

  // 🔄 遍历所有匹配的命令标签
  while ((match = dyadCommandRegex.exec(fullResponse)) !== null) {
    commands.push(match[1]); // 📋 添加命令类型到数组
  }

  return commands;
}

/**
 * 🔍 解析搜索替换标签 (Parse Search Replace Tags)
 * 
 * 🎯 功能: 从 AI 响应中提取 <dyad-search-replace> 标签，用于文件内容的搜索替换操作
 * 📋 标签格式: <dyad-search-replace path="文件路径" description="描述">替换规则</dyad-search-replace>
 * 
 * 🔧 处理逻辑:
 * - 🎯 提取 path 属性（必需）- 目标文件路径
 * - 📄 提取 description 属性（可选）- 操作描述
 * - 🔍 提取搜索替换规则内容
 * - 🧹 自动清理 Markdown 代码围栏
 * - 📁 标准化文件路径格式
 * 
 * @param fullResponse AI 生成的完整响应文本
 * @returns 解析出的搜索替换操作数组
 * 
 * 💡 使用示例:
 * 输入: <dyad-search-replace path="src/config.ts" description="更新 API 端点">
 *       ```typescript
 *       // 搜索替换规则内容
 *       ```
 *       </dyad-search-replace>
 * 输出: [{ path: "src/config.ts", description: "更新 API 端点", content: "// 搜索替换规则内容" }]
 */
export function getDyadSearchReplaceTags(fullResponse: string): {
  path: string;
  content: string;
  description?: string;
}[] {
  // 🎯 正则表达式: 匹配 dyad-search-replace 标签
  const dyadSearchReplaceRegex =
    /<dyad-search-replace([^>]*)>([\s\S]*?)<\/dyad-search-replace>/gi;
  const pathRegex = /path="([^"]+)"/;           // 提取 path 属性
  const descriptionRegex = /description="([^"]+)"/; // 提取 description 属性

  let match;
  const tags: { path: string; content: string; description?: string }[] = [];

  // 🔄 遍历所有匹配的搜索替换标签
  while ((match = dyadSearchReplaceRegex.exec(fullResponse)) !== null) {
    const attributesString = match[1] || "";
    let content = match[2].trim();

    const pathMatch = pathRegex.exec(attributesString);
    const descriptionMatch = descriptionRegex.exec(attributesString);

    if (pathMatch && pathMatch[1]) {
      const path = pathMatch[1];
      const description = descriptionMatch?.[1];

      // 🧹 清理 Markdown 代码围栏
      const contentLines = content.split("\n");
      if (contentLines[0]?.startsWith("```")) {
        contentLines.shift(); // 移除开始的 ```
      }
      if (contentLines[contentLines.length - 1]?.startsWith("```")) {
        contentLines.pop();   // 移除结束的 ```
      }
      content = contentLines.join("\n");

      // 📁 添加到结果数组，路径标准化处理
      tags.push({ path: normalizePath(path), content, description });
    } else {
      // ⚠️ 警告: 缺少必需的 path 属性
      logger.warn(
        "Found <dyad-search-replace> tag without a valid 'path' attribute:",
        match[0],
      );
    }
  }
  return tags;
}
