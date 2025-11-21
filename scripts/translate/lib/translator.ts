/**
 * 翻译 API 集成模块
 * 支持多种翻译服务：Google Translate, DeepL, 百度翻译等
 */

export interface TranslatorConfig {
  provider: "google" | "deepl" | "baidu" | "openai";
  apiKey: string;
  sourceLang?: string;
  targetLang: string;
  endpoint?: string; // 自定义端点（可选）
}

export interface TranslationResult {
  text: string;
  sourceLang?: string;
  targetLang: string;
}

/**
 * 翻译器接口
 */
export abstract class Translator {
  protected config: TranslatorConfig;

  constructor(config: TranslatorConfig) {
    this.config = config;
  }

  abstract translate(text: string): Promise<string>;
  abstract translateBatch(texts: string[]): Promise<string[]>;
}

/**
 * Google Translate API 实现
 */
export class GoogleTranslator extends Translator {
  async translate(text: string): Promise<string> {
    const results = await this.translateBatch([text]);
    return results[0];
  }

  async translateBatch(texts: string[]): Promise<string[]> {
    // 注意：Google Translate API 需要配置 API 密钥
    // 这里提供一个基础实现，实际使用时需要根据 Google Cloud Translation API 文档配置
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${this.config.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: texts,
          source: this.config.sourceLang || "en",
          target: this.config.targetLang,
          format: "text",
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Google Translate API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.data.translations.map(
      (t: { translatedText: string }) => t.translatedText,
    );
  }
}

/**
 * DeepL API 实现
 */
export class DeepLTranslator extends Translator {
  async translate(text: string): Promise<string> {
    const results = await this.translateBatch([text]);
    return results[0];
  }

  async translateBatch(texts: string[]): Promise<string[]> {
    const endpoint =
      this.config.endpoint || "https://api-free.deepl.com/v2/translate";
    // DeepL API 需要将多个文本作为多个 text 参数发送
    const params = new URLSearchParams();
    for (const text of texts) {
      params.append("text", text);
    }
    params.append("source_lang", this.config.sourceLang?.toUpperCase() || "EN");
    params.append("target_lang", this.config.targetLang.toUpperCase());

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${this.config.apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!response.ok) {
      throw new Error(`DeepL API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.translations.map((t: { text: string }) => t.text);
  }
}

/**
 * 百度翻译 API 实现
 */
export class BaiduTranslator extends Translator {
  private appId: string;
  private salt: string;

  constructor(config: TranslatorConfig & { appId: string }) {
    super(config);
    this.appId = config.appId;
    this.salt = Date.now().toString();
  }

  private generateSign(text: string): string {
    // 百度翻译 API 签名生成逻辑
    // 需要安装 crypto 模块
    const crypto = require("crypto");
    const str = `${this.appId}${text}${this.salt}${this.config.apiKey}`;
    return crypto.createHash("md5").update(str).digest("hex");
  }

  async translate(text: string): Promise<string> {
    const results = await this.translateBatch([text]);
    return results[0];
  }

  async translateBatch(texts: string[]): Promise<string[]> {
    const results: string[] = [];
    // 百度翻译 API 需要逐个翻译或批量（有数量限制）
    for (const text of texts) {
      const sign = this.generateSign(text);
      const params = new URLSearchParams({
        q: text,
        from: this.config.sourceLang || "en",
        to: this.config.targetLang,
        appid: this.appId,
        salt: this.salt,
        sign: sign,
      });

      const response = await fetch(
        `https://fanyi-api.baidu.com/api/trans/vip/translate?${params}`,
      );

      if (!response.ok) {
        throw new Error(`Baidu Translate API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error_code) {
        throw new Error(`Baidu Translate API error: ${data.error_msg}`);
      }

      results.push(data.trans_result[0].dst);
    }

    return results;
  }
}

/**
 * OpenAI GPT 翻译实现
 */
export class OpenAITranslator extends Translator {
  async translate(text: string): Promise<string> {
    const results = await this.translateBatch([text]);
    return results[0];
  }

  async translateBatch(texts: string[]): Promise<string[]> {
    const results: string[] = [];
    // OpenAI API 可以批量处理，但需要注意 token 限制
    for (const text of texts) {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: `You are a professional translator. Translate the following text from ${this.config.sourceLang || "English"} to ${this.config.targetLang}. Only return the translation, no explanations.`,
              },
              {
                role: "user",
                content: text,
              },
            ],
            temperature: 0.3,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      results.push(data.choices[0].message.content.trim());
    }

    return results;
  }
}

/**
 * 创建翻译器实例
 */
export function createTranslator(
  config: TranslatorConfig & { appId?: string },
): Translator {
  switch (config.provider) {
    case "google":
      return new GoogleTranslator(config);
    case "deepl":
      return new DeepLTranslator(config);
    case "baidu":
      if (!config.appId) {
        throw new Error("Baidu translator requires appId");
      }
      return new BaiduTranslator(
        config as TranslatorConfig & { appId: string },
      );
    case "openai":
      return new OpenAITranslator(config);
    default:
      throw new Error(`Unsupported translator provider: ${config.provider}`);
  }
}
