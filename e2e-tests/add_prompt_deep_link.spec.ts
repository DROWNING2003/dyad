/**
 * 🔗 深度链接提示词添加测试 (Deep Link Prompt Addition E2E Test)
 * 
 * 📋 测试目标: 验证通过深度链接添加提示词的完整流程
 * 🎯 测试类型: 端到端测试 (End-to-End Test)
 * 
 * 🔧 测试功能:
 * - 🔗 深度链接协议处理 (dyad://add-prompt)
 * - 📊 Base64 数据编码/解码
 * - 🎭 Electron 主进程事件模拟
 * - 📝 表单预填充验证
 * - 💾 提示词保存流程
 * 
 * 🚀 测试流程:
 * 1. 🏗️ 设置测试环境和导航到库页面
 * 2. ✅ 验证初始状态（库为空）
 * 3. 📦 构建和编码提示词数据
 * 4. 🔗 触发深度链接事件
 * 5. 📝 验证对话框和表单预填充
 * 6. 💾 保存提示词并验证结果
 * 
 * 💡 业务场景:
 * - 🌐 从外部应用/网页添加提示词
 * - 📱 移动端或浏览器扩展集成
 * - 🔄 批量导入提示词
 * - 🤝 第三方工具集成
 * 
 * 🛡️ 测试覆盖:
 * - 深度链接协议解析
 * - 数据安全传输（Base64 编码）
 * - UI 响应和状态管理
 * - 数据持久化验证
 */

import { test } from "./helpers/test_helper";
import { expect } from "@playwright/test";

// 🔗 深度链接提示词添加测试
test("add prompt via deep link with base64-encoded data", async ({
  po,        // 📄 页面对象 (Page Object) - 封装页面操作
  electronApp, // ⚡ Electron 应用实例 - 用于主进程交互
}) => {
  // 🏗️ 测试环境初始化
  await po.setUp();              // 🔧 设置页面对象和基础环境
  await po.page.waitForTimeout(1000); // ⏱️ 等待 1 秒，让界面稳定
  
  await po.goToLibraryTab();     // 📚 导航到提示词库页面
  await po.page.waitForTimeout(1000); // ⏱️ 等待 1 秒，让页面加载完成

  // ✅ 验证初始状态 - 确保库为空，避免测试数据污染
  await expect(po.page.getByTestId("prompt-card")).not.toBeVisible();

  // 📦 构建测试用的提示词数据
  const promptData = {
    title: "Deep Link Test Prompt",                        // 📝 提示词标题
    description: "A prompt created via deep link",         // 📄 提示词描述
    content: "You are a helpful assistant. Please help with:\n\n[task here]", // 📋 提示词内容
  };

  // 🔐 数据编码 - 将 JSON 数据转换为 Base64 格式（与 main.ts 中的模式匹配）
  const base64Data = Buffer.from(JSON.stringify(promptData)).toString("base64");
  
  // 🔗 构建深度链接 URL - 使用 dyad:// 协议
  const deepLinkUrl = `dyad://add-prompt?data=${encodeURIComponent(base64Data)}`;

  console.log("Triggering deep link:", deepLinkUrl); // 🐛 调试日志

  // 🎭 模拟深度链接触发 - 在 Electron 主进程中发出 'open-url' 事件
  await electronApp.evaluate(({ app }, url) => {
    // 📡 触发 open-url 事件，模拟操作系统调用深度链接
    app.emit("open-url", { preventDefault: () => {} }, url);
  }, deepLinkUrl);
  
  await po.page.waitForTimeout(2000); // ⏱️ 等待 2 秒，让深度链接处理完成

  // 📝 等待对话框打开并验证预填充数据
  await expect(
    po.page.getByRole("dialog").getByText("Create New Prompt"),
  ).toBeVisible(); // ✅ 验证"创建新提示词"对话框已显示

  // 🔍 验证表单字段已正确预填充深度链接传递的数据
  await expect(po.page.getByRole("textbox", { name: "Title" })).toHaveValue(
    promptData.title, // 📝 验证标题字段预填充
  );
  await expect(
    po.page.getByRole("textbox", { name: "Description (optional)" }),
  ).toHaveValue(promptData.description); // 📄 验证描述字段预填充
  
  await expect(po.page.getByRole("textbox", { name: "Content" })).toHaveValue(
    promptData.content, // 📋 验证内容字段预填充
  );

  // Save the prompt
  await po.page.getByRole("button", { name: "Save" }).click();

  await expect(po.page.getByTestId("prompt-card")).toMatchAriaSnapshot();
});
