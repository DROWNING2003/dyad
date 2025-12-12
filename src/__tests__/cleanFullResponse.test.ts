/**
 * 🧹 响应清理函数测试 (Clean Full Response Tests)
 * 
 * 📋 测试目标: cleanFullResponse 工具函数
 * 🎯 功能描述: 清理 AI 响应中 Dyad 标签属性内的 HTML 标签冲突
 * 
 * 🔧 核心功能:
 * - 🏷️ 将 Dyad 标签属性中的 < > 转换为全角字符 ＜ ＞
 * - 🛡️ 避免 HTML 标签解析冲突
 * - 📋 保持标签内容和外部 HTML 不受影响
 * 
 * 🧪 测试类型: 单元测试 (Unit Test)
 * 📊 测试覆盖:
 * - ✅ 基础转换功能
 * - ✅ 多属性处理
 * - ✅ 嵌套标签处理
 * - ✅ 不同 Dyad 标签类型
 * - ✅ 边界条件和异常情况
 * 
 * 💡 业务场景:
 * AI 在描述中经常使用 HTML 标签作为示例，如 "使用 <a> 标签"
 * 这会导致 XML 解析器将其误认为是 HTML 标签，破坏 Dyad 标签结构
 * 通过转换为全角字符，保持语义的同时避免解析冲突
 */

import { cleanFullResponse } from "@/ipc/utils/cleanFullResponse";
import { describe, it, expect } from "vitest";

// 🧹 响应清理函数测试套件
describe("cleanFullResponse", () => {
  // 📝 基础功能测试: 转换 dyad-write 属性中的 HTML 标签
  it("should replace < characters in dyad-write attributes", () => {
    // 🎯 测试场景: description 属性中包含 <a> 标签示例
    const input = `<dyad-write path="src/file.tsx" description="Testing <a> tags.">content</dyad-write>`;
    const expected = `<dyad-write path="src/file.tsx" description="Testing ＜a＞ tags.">content</dyad-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  // 📝 多属性测试: 处理多个属性中的 HTML 标签
  it("should replace < characters in multiple attributes", () => {
    // 🎯 测试场景: path 和 description 属性都包含 HTML 标签
    const input = `<dyad-write path="src/<component>.tsx" description="Testing <div> tags.">content</dyad-write>`;
    const expected = `<dyad-write path="src/＜component＞.tsx" description="Testing ＜div＞ tags.">content</dyad-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  // 📝 复杂嵌套测试: 单个属性中的多个 HTML 标签
  it("should handle multiple nested HTML tags in a single attribute", () => {
    // 🎯 测试场景: 一个属性中包含多个不同的 HTML 标签
    const input = `<dyad-write path="src/file.tsx" description="Testing <div> and <span> and <a> tags.">content</dyad-write>`;
    const expected = `<dyad-write path="src/file.tsx" description="Testing ＜div＞ and ＜span＞ and ＜a＞ tags.">content</dyad-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  // 📝 复杂场景测试: 包含多行内容和上下文的真实示例
  it("should handle complex example with mixed content", () => {
    // 🎯 测试场景: 模拟真实 AI 响应，包含前后文本和多行内容
    const input = `
      BEFORE TAG
  <dyad-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use <a> tags.">
import React from 'react';
</dyad-write>
AFTER TAG
    `;

    const expected = `
      BEFORE TAG
  <dyad-write path="src/pages/locations/neighborhoods/louisville/Highlands.tsx" description="Updating Highlands neighborhood page to use ＜a＞ tags.">
import React from 'react';
</dyad-write>
AFTER TAG
    `;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  // 📝 标签类型测试: 处理 dyad-rename 标签
  it("should handle other dyad tag types", () => {
    // 🎯 测试场景: dyad-rename 标签的 from 和 to 属性中的 HTML 标签
    const input = `<dyad-rename from="src/<old>.tsx" to="src/<new>.tsx"></dyad-rename>`;
    const expected = `<dyad-rename from="src/＜old＞.tsx" to="src/＜new＞.tsx"></dyad-rename>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  // 📝 标签类型测试: 处理 dyad-delete 标签
  it("should handle dyad-delete tags", () => {
    // 🎯 测试场景: dyad-delete 标签的 path 属性中的 HTML 标签
    const input = `<dyad-delete path="src/<component>.tsx"></dyad-delete>`;
    const expected = `<dyad-delete path="src/＜component＞.tsx"></dyad-delete>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  // 📝 范围限制测试: 确保只影响 Dyad 标签属性，不影响其他内容
  it("should not affect content outside dyad tags", () => {
    // 🎯 测试场景: 验证函数只处理 Dyad 标签属性，保持其他 HTML 标签不变
    const input = `Some text with <regular> HTML tags. <dyad-write path="test.tsx" description="With <nested> tags.">content</dyad-write> More <html> here.`;
    const expected = `Some text with <regular> HTML tags. <dyad-write path="test.tsx" description="With ＜nested＞ tags.">content</dyad-write> More <html> here.`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  // 📝 边界条件测试: 处理没有可选属性的情况
  it("should handle empty attributes", () => {
    // 🎯 测试场景: 只有必需属性，没有 description 等可选属性
    const input = `<dyad-write path="src/file.tsx">content</dyad-write>`;
    const expected = `<dyad-write path="src/file.tsx">content</dyad-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });

  // 📝 负面测试: 处理不包含 HTML 标签的正常属性
  it("should handle attributes without < characters", () => {
    // 🎯 测试场景: 属性值中没有 HTML 标签，应该保持不变
    const input = `<dyad-write path="src/file.tsx" description="Normal description">content</dyad-write>`;
    const expected = `<dyad-write path="src/file.tsx" description="Normal description">content</dyad-write>`;

    const result = cleanFullResponse(input);
    expect(result).toBe(expected);
  });
});
