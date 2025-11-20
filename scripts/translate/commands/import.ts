/**
 * 导入命令：从 CSV 导入翻译结果并更新 .po 文件
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { importFromCSV } from '../lib/csv-handler';
import { getLangFromFilename, escapePOString } from '../utils';
import type { ImportOptions } from '../types';

export function importTranslations(options: ImportOptions) {
  const { csv, po, localesDir = 'src/locales' } = options;

  // 读取 CSV 文件
  const csvPath = join(process.cwd(), csv);
  if (!existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  // 从文件名提取目标语言
  const targetLang = getLangFromFilename(po);

  const csvContent = readFileSync(csvPath, 'utf-8');
  const translations = importFromCSV(csvContent, targetLang);

  console.log(`Loaded ${translations.size} translations for language: ${targetLang}`);

  // 读取目标 .po 文件
  const poPath = join(process.cwd(), localesDir, po);
  if (!existsSync(poPath)) {
    throw new Error(`PO file not found: ${poPath}`);
  }

  let poContent = readFileSync(poPath, 'utf-8');

  // 使用正则表达式替换 msgstr，保持原文件格式
  let updatedCount = 0;
  
  // 按行处理，找到每个 msgid 对应的 msgstr
  const lines = poContent.split('\n');
  let currentMsgid: string | null = null;
  let msgidLines: number[] = [];
  let msgstrStartLine = -1;
  let msgstrEndLine = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 检测 msgid 开始
    if (line.match(/^msgid\s+/)) {
      // 如果之前有未处理的 msgid，先处理
      if (currentMsgid !== null && msgstrStartLine !== -1) {
        const translation = translations.get(currentMsgid);
        if (translation !== undefined) {
          // 转义翻译文本
          const escapedTranslation = escapePOString(translation);
          
          // 构建新的 msgstr（保持原格式：单行或多行）
          let newMsgstr = '';
          const originalMsgstr = lines.slice(msgstrStartLine, msgstrEndLine + 1).join('\n');
          const isMultiline = originalMsgstr.includes('msgstr ""') || originalMsgstr.split('\n').length > 1;
          
          if (isMultiline) {
            // 保持多行格式
            newMsgstr = 'msgstr ""';
            // 如果翻译包含换行符，需要分割
            if (translation.includes('\n')) {
              const translationLines = translation.split('\n');
              for (const tLine of translationLines) {
                const escapedLine = escapePOString(tLine);
                newMsgstr += '\n"' + escapedLine + '\\n"';
              }
            } else {
              // 单行但保持多行格式
              newMsgstr += '\n"' + escapedTranslation + '"';
            }
          } else {
            // 保持单行格式
            newMsgstr = `msgstr "${escapedTranslation}"`;
          }
          
          // 替换 msgstr 部分
          lines.splice(msgstrStartLine, msgstrEndLine - msgstrStartLine + 1, newMsgstr);
          // 调整后续索引
          const lineDiff = (msgstrEndLine - msgstrStartLine + 1) - newMsgstr.split('\n').length;
          i -= lineDiff;
          
          updatedCount++;
        }
      }
      
      // 开始新的 msgid
      currentMsgid = '';
      msgidLines = [i];
      
      // 提取 msgid 值（可能是多行）
      const msgidMatch = line.match(/^msgid\s+"(.*)"$/);
      if (msgidMatch) {
        // 单行 msgid
        currentMsgid = msgidMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\');
      } else if (line.match(/^msgid\s+""$/)) {
        // 多行 msgid
        let j = i + 1;
        while (j < lines.length && lines[j].match(/^"[^"]*"$/)) {
          const content = lines[j].match(/^"(.*)"$/)?.[1] || '';
          currentMsgid += content
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
          msgidLines.push(j);
          j++;
        }
      }
      
      msgstrStartLine = -1;
      msgstrEndLine = -1;
      continue;
    }
    
    // 检测 msgstr 开始（必须在 msgid 之后）
    if (currentMsgid !== null && line.match(/^msgstr\s+/)) {
      msgstrStartLine = i;
      msgstrEndLine = i;
      
      // 检查是否是多行 msgstr
      if (line.match(/^msgstr\s+""$/)) {
        // 多行 msgstr
        let j = i + 1;
        while (j < lines.length && lines[j].match(/^"[^"]*"$/)) {
          msgstrEndLine = j;
          j++;
        }
      }
      continue;
    }
  }
  
  // 处理最后一个条目
  if (currentMsgid !== null && msgstrStartLine !== -1) {
    const translation = translations.get(currentMsgid);
    if (translation !== undefined) {
      const escapedTranslation = escapePOString(translation);
      const originalMsgstr = lines.slice(msgstrStartLine, msgstrEndLine + 1).join('\n');
      const isMultiline = originalMsgstr.includes('msgstr ""') || originalMsgstr.split('\n').length > 1;
      
      let newMsgstr = '';
      if (isMultiline) {
        // 保持多行格式
        newMsgstr = 'msgstr ""';
        if (translation.includes('\n')) {
          const translationLines = translation.split('\n');
          for (const tLine of translationLines) {
            const escapedLine = escapePOString(tLine);
            newMsgstr += '\n"' + escapedLine + '\\n"';
          }
        } else {
          newMsgstr += '\n"' + escapedTranslation + '"';
        }
      } else {
        // 保持单行格式
        newMsgstr = `msgstr "${escapedTranslation}"`;
      }
      
      lines.splice(msgstrStartLine, msgstrEndLine - msgstrStartLine + 1, newMsgstr);
      updatedCount++;
    }
  }

  // 写回文件
  poContent = lines.join('\n');
  writeFileSync(poPath, poContent, 'utf-8');

  console.log(`Updated ${updatedCount} translations in ${poPath}`);
}

