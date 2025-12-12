// 🔍 应用提及解析工具 / App Mention Parsing Utilities
// 📝 用于解析用户输入中的应用程序提及模式 (@app:AppName)
// 📝 Used to parse application mention patterns (@app:AppName) in user input

// 🎯 应用提及正则表达式 / App mention regex pattern
// 匹配 @app:AppName 格式，支持字母、数字、下划线和连字符，但不支持空格
// Matches @app:AppName format, supports letters, digits, underscores and hyphens, but NOT spaces
export const MENTION_REGEX = /@app:([a-zA-Z0-9_-]+)/g;

// 🔧 解析应用提及的辅助函数 / Helper function to parse app mentions from prompt
// 从用户输入的提示文本中提取所有应用程序提及
// Extracts all application mentions from user input prompt text
export function parseAppMentions(prompt: string): string[] {
  // 🔍 在提示中匹配 @app:AppName 模式 / Match @app:AppName patterns in the prompt
  // 支持字母、数字、下划线和连字符，但不支持空格
  // Supports letters, digits, underscores, and hyphens, but NOT spaces

  const mentions: string[] = [];
  let match;

  // 🔄 循环查找所有匹配项 / Loop to find all matches
  while ((match = MENTION_REGEX.exec(prompt)) !== null) {
    mentions.push(match[1]); // 添加捕获的应用名称 / Add captured app name
  }

  return mentions;
}
