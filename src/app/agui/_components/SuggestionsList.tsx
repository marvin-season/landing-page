import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

export const SuggestionsList = (props: {
  onSuggestionClick: (suggestion: string) => void;
}) => {
  const { onSuggestionClick } = props;
  console.log("onSuggestionClick", onSuggestionClick);
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
