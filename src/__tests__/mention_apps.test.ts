/**
 * 🧪 单元测试 (Unit Test) - 应用提及解析器
 * 
 * 测试类型: 纯函数单元测试
 * 测试目标: parseAppMentions 函数 - 解析文本中的应用提及 (@app:AppName)
 * 测试范围: 单个函数的输入输出逻辑
 * 
 * 🎯 测试策略:
 * 1. 正向测试 - 验证正确格式的解析
 * 2. 边界条件 - 测试特殊字符、空输入等
 * 3. 负面测试 - 验证错误格式被正确拒绝
 * 4. 严格性测试 - 验证大小写敏感等规则
 * 
 * 📊 测试覆盖范围:
 * - ✅ 基本功能: 标准 @app:Name 格式
 * - ✅ 命名规则: 下划线、连字符、数字
 * - ✅ 大小写处理: 前缀敏感、名称保持
 * - ✅ 边界情况: 空输入、无匹配、特殊字符
 * - ✅ 错误处理: 错误格式、无前缀
 * 
 * 🚀 单元测试特点:
 * - ⚡ 快速执行 (毫秒级)
 * - 🔒 无外部依赖 (不需要数据库、网络、文件系统)
 * - 🎯 可预测的结果
 * - 🛠️ 易于调试和维护
 * - 📈 高测试覆盖率
 * 
 * 这是一个典型的纯函数单元测试，专注于字符串解析逻辑的正确性
 */

import { parseAppMentions } from "@/shared/parse_mention_apps";
import { describe, it, expect } from "vitest";

// 🎯 测试套件: 应用提及解析功能
describe("parseAppMentions", () => {
  
  // 📝 基础功能测试: 解析简单的应用提及
  it("should parse basic app mentions", () => {
    // 准备 (Arrange): 创建包含两个应用提及的测试输入
    const prompt = "Can you help me with @app:MyApp and @app:AnotherApp?";
    
    // 执行 (Act): 调用被测试的函数
    const result = parseAppMentions(prompt);
    
    // 断言 (Assert): 验证函数返回正确的应用名称数组
    expect(result).toEqual(["MyApp", "AnotherApp"]);
  });

  // 📝 边界条件测试: 处理下划线命名
  it("should parse app mentions with underscores", () => {
    // 测试应用名称包含下划线的情况
    const prompt = "I need help with @app:my_app and @app:another_app_name";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["my_app", "another_app_name"]);
  });

  // 📝 边界条件测试: 处理连字符命名
  it("should parse app mentions with hyphens", () => {
    // 测试应用名称包含连字符的情况
    const prompt = "Check @app:my-app and @app:another-app-name";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["my-app", "another-app-name"]);
  });

  // 📝 边界条件测试: 处理数字命名
  it("should parse app mentions with numbers", () => {
    // 测试应用名称包含数字的情况
    const prompt = "Update @app:app1 and @app:app2023 please";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["app1", "app2023"]);
  });

  // 📝 负面测试 (Negative Test): 验证错误格式不被解析
  it("should not parse mentions without app: prefix", () => {
    // 测试没有 "app:" 前缀的提及应该被忽略
    const prompt = "Can you work on @MyApp and @AnotherApp?";
    const result = parseAppMentions(prompt);
    expect(result).toEqual([]); // 应该返回空数组
  });

  // 📝 严格性测试: 验证大小写敏感性
  it("should require exact 'app:' prefix (case sensitive)", () => {
    // 测试前缀必须是精确的 "app:"，大小写敏感
    const prompt = "Check @App:MyApp and @APP:AnotherApp vs @app:ValidApp";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["ValidApp"]); // 只有正确格式的会被解析
  });

  // 📝 功能测试: 验证应用名称大小写保持
  it("should parse mixed case app mentions", () => {
    // 测试应用名称的大小写应该被保持
    const prompt = "Help with @app:MyApp, @app:myapp, and @app:MYAPP";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["MyApp", "myapp", "MYAPP"]);
  });

  // 📝 复合字符测试: 混合下划线、连字符和数字
  it("should parse app mentions with mixed characters (no spaces)", () => {
    // 测试复杂的应用名称格式
    const prompt = "Check @app:My_App-2023 and @app:Another_App_Name-v2";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["My_App-2023", "Another_App_Name-v2"]);
  });

  // 📝 限制性测试: 空格会终止应用名称解析
  it("should not handle spaces in app names (spaces break app names)", () => {
    // 测试空格作为应用名称的终止符
    const prompt = "Work on @app:My_App_Name with underscores";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["My_App_Name"]); // 空格后的内容不属于应用名
  });

  // 📝 边界条件测试: 空输入处理
  it("should handle empty string", () => {
    // 测试空字符串输入的健壮性
    const result = parseAppMentions("");
    expect(result).toEqual([]); // 应该返回空数组而不是抛出错误
  });

  // 📝 边界条件测试: 无匹配内容处理
  it("should handle string with no mentions", () => {
    // 测试不包含任何提及的普通文本
    const prompt = "This is just a regular message without any mentions";
    const result = parseAppMentions(prompt);
    expect(result).toEqual([]); // 应该返回空数组
  });

  // 📝 边界条件测试: 孤立的 @ 符号
  it("should handle standalone @ symbol", () => {
    // 测试单独的 @ 符号不会被误解析
    const prompt = "This has @ symbol but no valid mention";
    const result = parseAppMentions(prompt);
    expect(result).toEqual([]);
  });

  // 📝 负面测试: @ 后跟特殊字符
  it("should ignore @ followed by special characters", () => {
    // 测试 @ 后跟非字母数字字符的情况
    const prompt = "Check @# and @! and @$ symbols";
    const result = parseAppMentions(prompt);
    expect(result).toEqual([]);
  });

  // 📝 边界条件测试: 字符串末尾的 @
  it("should ignore @ at the end of string", () => {
    // 测试字符串末尾的 @ 符号处理
    const prompt = "This ends with @";
    const result = parseAppMentions(prompt);
    expect(result).toEqual([]);
  });

  // 📝 位置测试: 不同位置的应用提及
  it("should parse mentions at different positions", () => {
    // 测试在句子开头、中间、结尾的应用提及
    const prompt =
      "@app:StartApp in the beginning, @app:MiddleApp in middle, and @app:EndApp at end";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["StartApp", "MiddleApp", "EndApp"]);
  });

  // 📝 标点符号测试: 周围有标点符号的应用提及
  it("should handle mentions with punctuation around them", () => {
    // 测试应用提及周围有括号、感叹号、问号等标点符号
    const prompt = "Check (@app:MyApp), @app:AnotherApp! and @app:ThirdApp?";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["MyApp", "AnotherApp", "ThirdApp"]);
  });

  // 📝 多行文本测试: 不同句子结构中的应用提及
  it("should parse mentions in different sentence structures", () => {
    // 测试多行文本和不同句子结构中的应用提及
    const prompt = `
      Can you help me with @app:WebApp?
      I also need @app:MobileApp updated.
      Don't forget about @app:DesktopApp.
    `;
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["WebApp", "MobileApp", "DesktopApp"]);
  });

  // 📝 重复性测试: 重复的应用提及
  it("should handle duplicate mentions", () => {
    // 测试同一个应用被多次提及的情况
    const prompt = "Update @app:MyApp and also check @app:MyApp again";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["MyApp", "MyApp"]); // 保持重复项
  });

  // 📝 多行文本测试: 跨行的应用提及
  it("should parse mentions in multiline text", () => {
    // 测试多行文本中的应用提及解析
    const prompt = `Line 1 has @app:App1
Line 2 has @app:App2
Line 3 has @app:App3`;
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["App1", "App2", "App3"]);
  });

  // 📝 空白字符测试: 制表符和换行符处理
  it("should handle mentions with tabs and other whitespace", () => {
    // 测试制表符、换行符等空白字符的处理
    const prompt = "Check\t@app:TabApp\nand\r@app:NewlineApp";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["TabApp", "NewlineApp"]);
  });

  it("should parse single character app names", () => {
    const prompt = "Check @app:A and @app:B and @app:1";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["A", "B", "1"]);
  });

  it("should handle very long app names", () => {
    const longAppName = "VeryLongAppNameWithManyCharacters123_test-app";
    const prompt = `Check @app:${longAppName}`;
    const result = parseAppMentions(prompt);
    expect(result).toEqual([longAppName]);
  });

  it("should stop parsing at invalid characters", () => {
    const prompt =
      "Check @app:MyApp@InvalidPart and @app:AnotherApp.InvalidPart";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["MyApp", "AnotherApp"]);
  });

  it("should handle mentions with numbers and underscores mixed", () => {
    const prompt = "Update @app:app_v1_2023 and @app:test_app_123";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["app_v1_2023", "test_app_123"]);
  });

  it("should handle mentions with hyphens and numbers mixed", () => {
    const prompt = "Check @app:app-v1-2023 and @app:test-app-123";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["app-v1-2023", "test-app-123"]);
  });

  it("should parse mentions in URLs and complex text", () => {
    const prompt =
      "Visit https://example.com and check @app:WebApp for updates. Email admin@company.com about @app:MobileApp";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["WebApp", "MobileApp"]);
  });

  it("should not handle spaces in app names (spaces break app names)", () => {
    const prompt = "Check @app:My_App_Name with underscores";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["My_App_Name"]);
  });

  it("should parse mentions in JSON-like strings", () => {
    const prompt = '{"app": "@app:MyApp", "another": "@app:SecondApp"}';
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["MyApp", "SecondApp"]);
  });

  // 📝 综合测试: 复杂真实场景
  it("should handle complex real-world scenarios (no spaces in app names)", () => {
    // 测试接近真实使用场景的复杂文本
    // 包含多种应用名称格式、标点符号、多行文本等
    const prompt = `
      Hi there! I need help with @app:My_Web_App and @app:Mobile_App_v2.
      Could you also check the status of @app:backend-service-2023?
      Don't forget about @app:legacy_app and @app:NEW_PROJECT.
      
      Thanks!
      @app:user_mention should not be confused with @app:ActualApp.
    `;
    const result = parseAppMentions(prompt);
    expect(result).toEqual([
      "My_Web_App",
      "Mobile_App_v2", 
      "backend-service-2023",
      "legacy_app",
      "NEW_PROJECT",
      "user_mention",
      "ActualApp",
    ]);
  });

  // 📝 顺序保持测试: 解析顺序的一致性
  it("should preserve order of mentions", () => {
    // 测试解析结果保持原文中的出现顺序
    const prompt = "@app:Third @app:First @app:Second @app:Third @app:First";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["Third", "First", "Second", "Third", "First"]);
  });

  it("should handle edge case with @ followed by space", () => {
    const prompt = "This has @ space but @app:ValidApp is here";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["ValidApp"]);
  });

  it("should handle unicode characters after @", () => {
    const prompt = "Check @app:AppName and @app:测试 and @app:café-app";
    const result = parseAppMentions(prompt);
    // Based on the regex, unicode characters like 测试 and é should not match
    expect(result).toEqual(["AppName", "caf"]);
  });

  it("should handle nested mentions pattern", () => {
    const prompt = "Check @app:App1 @app:App2 @app:App3 test";
    const result = parseAppMentions(prompt);
    expect(result).toEqual(["App1", "App2", "App3"]);
  });
});
