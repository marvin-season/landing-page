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
        Hello
      </Suggestion>
    </Suggestions>
  );
};
