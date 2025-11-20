/**
 * .po 文件解析和生成工具
 */

export interface POEntry {
  msgid: string;
  msgstr: string;
  comments: string[];
  context?: string;
}

export interface POFile {
  headers: Record<string, string>;
  entries: POEntry[];
}

/**
 * 解析 .po 文件
 */
export function parsePOFile(content: string): POFile {
  const lines = content.split('\n');
  const result: POFile = {
    headers: {},
    entries: [],
  };

  let currentEntry: Partial<POEntry> | null = null;
  let inHeaders = true;
  let headerBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 处理文件头
    if (inHeaders && trimmed.startsWith('msgid ""') && lines[i + 1]?.trim().startsWith('msgstr ""')) {
      i++; // 跳过 msgid ""
      i++; // 跳过 msgstr ""
      let headerLine = lines[i];
      while (headerLine && (headerLine.trim().startsWith('"') || headerLine.trim() === '')) {
        if (headerLine.trim().startsWith('"')) {
          headerBuffer.push(headerLine.trim());
        }
        i++;
        headerLine = lines[i];
      }
      i--; // 回退一行

      // 解析 headers
      const headerText = headerBuffer
        .join('')
        .replace(/^"/, '')
        .replace(/"$/g, '')
        .replace(/\\n/g, '\n');
      const headerLines = headerText.split('\n');
      for (const hLine of headerLines) {
        const match = hLine.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          result.headers[match[1].trim()] = match[2].trim();
        }
      }
      inHeaders = false;
      continue;
    }

    // 跳过空行和注释（但保留注释信息）
    if (trimmed === '' || trimmed.startsWith('#')) {
      // 如果是空行，且当前条目已经有 msgid，说明这个条目已经完成，跳过
      if (trimmed === '' && currentEntry && currentEntry.msgid !== undefined && currentEntry.msgid !== '') {
        continue;
      }
      
      // 如果当前条目已经有 msgid，说明这是下一个条目的注释，需要重置
      if (currentEntry && currentEntry.msgid !== undefined && currentEntry.msgid !== '') {
        // 保存当前条目
        result.entries.push({
          msgid: currentEntry.msgid,
          msgstr: currentEntry.msgstr || '',
          comments: currentEntry.comments || [],
          context: currentEntry.context,
        });
        // 重置 currentEntry，准备收集新条目的注释
        currentEntry = { comments: [], msgid: '', msgstr: '' };
      }
      
      // 确保 currentEntry 存在
      if (!currentEntry) {
        currentEntry = { comments: [], msgid: '', msgstr: '' };
      }
      if (!currentEntry.comments) {
        currentEntry.comments = [];
      }
      
      // 添加注释
      if (trimmed.startsWith('#:')) {
        currentEntry.comments.push(trimmed);
      } else if (trimmed.startsWith('#.')) {
        currentEntry.comments.push(trimmed);
      } else if (trimmed.startsWith('#,')) {
        currentEntry.comments.push(trimmed);
      } else if (trimmed.startsWith('#')) {
        currentEntry.comments.push(trimmed);
      }
      continue;
    }

    // 处理 msgid
    if (trimmed.startsWith('msgid ')) {
      if (currentEntry && currentEntry.msgid !== undefined) {
        // 保存上一个条目
        if (currentEntry.msgid && currentEntry.msgid !== '') {
          result.entries.push({
            msgid: currentEntry.msgid,
            msgstr: currentEntry.msgstr || '',
            comments: currentEntry.comments || [],
            context: currentEntry.context,
          });
        }
      }
      // 创建新条目，使用当前收集的注释（在遇到 msgid 之前收集的注释）
      // 注释应该已经在 currentEntry.comments 中（在遇到 msgid 之前收集的）
      // 重要：复制注释数组，避免引用问题，并重置 currentEntry
      const savedComments: string[] = currentEntry?.comments ? [...currentEntry.comments] : [];
      currentEntry = {
        comments: savedComments, // 使用当前收集的注释（复制数组，避免引用问题）
        msgid: '',
        msgstr: '',
      };

      // 提取 msgid 值
      let msgidValue = trimmed.replace(/^msgid\s+/, '');
      if (msgidValue.startsWith('"') && msgidValue.endsWith('"')) {
        currentEntry.msgid = unescapeString(msgidValue.slice(1, -1));
      } else if (msgidValue.startsWith('"')) {
        // 多行 msgid
        currentEntry.msgid = unescapeString(msgidValue.slice(1));
        i++;
        while (i < lines.length && lines[i].trim().startsWith('"')) {
          currentEntry.msgid += unescapeString(lines[i].trim().slice(1, -1));
          i++;
        }
        i--; // 回退
      }
      continue;
    }

    // 处理 msgstr
    if (trimmed.startsWith('msgstr ')) {
      if (!currentEntry) {
        currentEntry = { msgid: '', msgstr: '', comments: [] };
      }

      let msgstrValue = trimmed.replace(/^msgstr\s+/, '');
      if (msgstrValue.startsWith('"') && msgstrValue.endsWith('"')) {
        currentEntry.msgstr = unescapeString(msgstrValue.slice(1, -1));
      } else if (msgstrValue.startsWith('"')) {
        // 多行 msgstr
        currentEntry.msgstr = unescapeString(msgstrValue.slice(1));
        i++;
        while (i < lines.length && lines[i].trim().startsWith('"')) {
          const lineContent = lines[i].trim();
          currentEntry.msgstr += unescapeString(lineContent.slice(1, -1));
          i++;
        }
        i--; // 回退
      }
      continue;
    }
  }

  // 保存最后一个条目
  if (currentEntry && currentEntry.msgid && currentEntry.msgid !== '') {
    result.entries.push({
      msgid: currentEntry.msgid,
      msgstr: currentEntry.msgstr || '',
      comments: currentEntry.comments || [],
      context: currentEntry.context,
    });
  }

  return result;
}

/**
 * 生成 .po 文件内容
 */
export function generatePOFile(poFile: POFile): string {
  const lines: string[] = [];

  // 写入文件头
  lines.push('msgid ""');
  lines.push('msgstr ""');
  const headerLines: string[] = [];
  for (const [key, value] of Object.entries(poFile.headers)) {
    headerLines.push(`${key}: ${value}\\n`);
  }
  if (headerLines.length > 0) {
    lines.push(`"${headerLines.join('')}"`);
  }
  lines.push('');

  // 写入条目
  for (const entry of poFile.entries) {
    // 写入注释
    for (const comment of entry.comments) {
      lines.push(comment);
    }

    // 写入 msgid
    const msgidEscaped = escapeString(entry.msgid);
    if (msgidEscaped.includes('\n') || msgidEscaped.length > 80) {
      lines.push('msgid ""');
      const msgidLines = msgidEscaped.split('\n');
      for (const line of msgidLines) {
        lines.push(`"${line}\\n"`);
      }
    } else {
      lines.push(`msgid "${msgidEscaped}"`);
    }

    // 写入 msgstr
    const msgstrEscaped = escapeString(entry.msgstr);
    if (msgstrEscaped.includes('\n') || msgstrEscaped.length > 80) {
      lines.push('msgstr ""');
      const msgstrLines = msgstrEscaped.split('\n');
      for (const line of msgstrLines) {
        lines.push(`"${line}\\n"`);
      }
    } else {
      lines.push(`msgstr "${msgstrEscaped}"`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 转义字符串（用于 .po 文件）
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
}

/**
 * 反转义字符串（从 .po 文件读取）
 */
function unescapeString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

