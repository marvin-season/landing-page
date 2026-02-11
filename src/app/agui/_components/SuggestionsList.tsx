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
