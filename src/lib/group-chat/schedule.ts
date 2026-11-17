import { type Character, WorldError, type WorldRoom } from "./model";

const MAX_DIRECT_EXCHANGES = 4;
const NARRATION_INTERVAL = 3;

export type TurnPlan = {
  kind: "speak" | "narrate";
  speaker: Character;
  direction: string;
};

export function eligibleCharacters(room: WorldRoom) {
  return room.config.characters.filter((c) => c.enabled);
}

function directlyAddresses(text: string, name: string) {
  const value = text.trim();
  if (
    value === name ||
    value.startsWith(`@${name}`) ||
    ["，", ",", "：", ":"].some((punctuation) =>
      value.startsWith(name + punctuation),
    )
  )
    return true;
  const tail = value.replace(/[？?！!。.\s]+$/u, "");
  if (tail === name) return true;
  if (!tail.endsWith(name)) return false;
  return /[，,：:@、\s]$/u.test(tail.slice(0, -name.length));
}

export function addressedCharacter(room: WorldRoom) {
  const history = publicHistory(room);
  const latest = history.at(-1);
  if (!latest || latest.kind === "narrator") return undefined;
  const active = eligibleCharacters(room);
  const addressed = active.find(
    (c) => c.id !== latest.speakerId && directlyAddresses(latest.text, c.name),
  );
  if (addressed) return addressed;
  return undefined;
}
export function consecutiveActorTurns(room: WorldRoom) {
  const history = publicHistory(room);
  return (
    history.length -
    1 -
    history.findLastIndex((message) => message.kind !== "agent")
  );
}

function publicHistory(room: WorldRoom) {
  return room.messages.filter(
    (message) => message.status === "complete" && message.kind !== "system",
  );
}
function beatText(text: string, names: string[]) {
  let value = text;
  for (const name of [...names].sort((a, b) => b.length - a.length))
    value = value.split(name).join("");
  return value.replace(/[\s，。！？、,.!?:：；;（）()「」《》""“”@]/gu, "");
}
function similarBeat(left: string, right: string) {
  if (!left || !right) return false;
  if (left === right) return true;
  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  if (shorter.length >= 6 && longer.includes(shorter)) return true;
  if (shorter.length < 4) return false;
  const grams = (value: string) => {
    const set = new Set<string>();
    for (let index = 0; index < value.length - 1; index += 1)
      set.add(value.slice(index, index + 2));
    return set;
  };
  const leftGrams = grams(left);
  const rightGrams = grams(right);
  let shared = 0;
  for (const gram of leftGrams) if (rightGrams.has(gram)) shared += 1;
  const smaller = Math.min(leftGrams.size, rightGrams.size);
  return smaller > 0 && shared / smaller >= 0.6;
}
function dialogueStalled(room: WorldRoom) {
  const history = publicHistory(room);
  const start = history.findLastIndex((message) => message.kind !== "agent");
  const tail = history.slice(start + 1);
  if (tail.length < 3) return false;
  const names = eligibleCharacters(room).map((character) => character.name);
  const recent = tail.slice(-3).map((message) => beatText(message.text, names));
  if (recent.every((beat) => similarBeat(beat, recent[2]))) return true;
  if (tail.length < 4) return false;
  const speakers = new Set(tail.slice(-4).map((message) => message.speakerId));
  return speakers.size <= 2;
}
function interventionCue(room: WorldRoom) {
  const latest = publicHistory(room).at(-1);
  if (latest?.kind !== "intervention") return undefined;
  if (addressedCharacter(room)) return undefined;
  return { ask: /[?？]\s*$/u.test(latest.text), text: latest.text };
}
function directReplySpeaker(room: WorldRoom) {
  // Stop name-to-name replies after four actor lines so a later turn can advance the scene.
  if (consecutiveActorTurns(room) >= MAX_DIRECT_EXCHANGES) return undefined;
  return addressedCharacter(room);
}

export function fallbackSpeaker(
  room: WorldRoom,
  eligible = eligibleCharacters(room),
) {
  const recent = room.messages
    .filter((m) => m.kind === "agent" && m.status === "complete")
    .slice(-room.config.characters.length * 2);
  return [...eligible].sort((a, b) => {
    const countA = recent.filter((m) => m.speakerId === a.id).length;
    const countB = recent.filter((m) => m.speakerId === b.id).length;
    return (
      countA - countB ||
      recent.findLastIndex((m) => m.speakerId === a.id) -
        recent.findLastIndex((m) => m.speakerId === b.id) ||
      a.id.localeCompare(b.id)
    );
  })[0];
}

export function nextTurn(room: WorldRoom, turn: number): TurnPlan {
  const mentioned = room.run!.mentions[turn];
  const eligible = eligibleCharacters(room);
  const cue = mentioned ? undefined : interventionCue(room);
  const stalled = !mentioned && !cue && dialogueStalled(room);
  const narrationOn = room.config.narration;
  const directSpeaker =
    !mentioned && !cue && !stalled ? directReplySpeaker(room) : undefined;
  const narrationDue =
    !mentioned &&
    !cue &&
    !directSpeaker &&
    consecutiveActorTurns(room) >= NARRATION_INTERVAL;
  const fallback = fallbackSpeaker(room, eligible);
  const speaker =
    mentioned && mentioned !== "system"
      ? room.config.characters.find((c) => c.id === mentioned && c.enabled)
      : (directSpeaker ?? fallback ?? eligible[0]);
  if (!speaker) throw new WorldError("no_characters", "没有可发言的角色");
  const narrating =
    narrationOn &&
    (mentioned === "system" ||
      cue?.ask === false ||
      stalled ||
      narrationDue ||
      (!mentioned &&
        !cue &&
        !directSpeaker &&
        !room.messages.some(
          (m) =>
            m.status === "complete" &&
            (m.kind === "narrator" || m.kind === "agent"),
        )));
  const direction = narrating
    ? cue && !cue.ask
      ? "依据最新系统干预叙述当前场景。"
      : "承接当前场景和角色言行，写一段旁白。"
    : cue
      ? "以角色身份回应最新系统干预。"
      : "轮到你发言。";
  return { kind: narrating ? "narrate" : "speak", speaker, direction };
}
