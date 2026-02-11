import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

export const SuggestionsList = (props: {
  onSuggestionClick: (suggestion: string) => void;
}) => {
  const { onSuggestionClick } = props;
  return (
    <Suggestions>
      <Suggestion
        suggestion="hello"
        onClick={() => {
          onSuggestionClick("hello");
        }}
      >
        hello
      </Suggestion>
      <Suggestion
        suggestion="帮我写一封产品发布邮件"
        onClick={() => {
          onSuggestionClick("帮我写一封产品发布邮件");
        }}
      >
        帮我写一封产品发布邮件
      </Suggestion>
      <Suggestion
        suggestion="查询 AAPL 股价"
        onClick={() => {
          onSuggestionClick("查询 AAPL 股价");
        }}
      >
        查询 AAPL 股价
      </Suggestion>
      <Suggestion
        suggestion="发送邮件给 alice@example.com，主题是项目进展，内容是本周已完成主要功能开发"
        onClick={() => {
          onSuggestionClick(
            "发送邮件给 alice@example.com，主题是项目进展，内容是本周已完成主要功能开发",
          );
        }}
      >
        发送邮件给 alice@example.com，主题是项目进展，内容是本周已完成主要功能开发
      </Suggestion>
      <Suggestion
        suggestion="北京天气"
        onClick={() => {
          onSuggestionClick("北京天气");
        }}
      >
        北京天气
      </Suggestion>
    </Suggestions>
  );
};
