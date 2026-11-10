import { setTimeout as delay } from "node:timers/promises";
import {
  actorContext,
  canWaitForUser,
  directorContext,
  eligibleCharacters,
  fallbackSpeaker,
  narratorContext,
  parseSelection,
  summaryBatch,
  summaryContext,
} from "./context";
import {
  WorldError,
  type WorldEvent,
  type WorldEventPayload,
  type WorldMessage,
  type WorldRoom,
} from "./model";
import { type Complete, type ModelMessage, providerError } from "./provider";
import { appendMessage, finishRun, type WorldStore } from "./store";

type ActiveRun = { controller: AbortController; done: Promise<void> };
const runtime = globalThis as typeof globalThis & {
  worldChatRuns?: Map<string, ActiveRun>;
};
runtime.worldChatRuns ??= new Map<string, ActiveRun>();
const activeRuns = runtime.worldChatRuns;
export function abortRun(id?: string | null) {
  if (id) activeRuns.get(id)?.controller.abort();
}

export function createWorldEngine(store: WorldStore, complete: Complete) {
  return function execute(
    ownerId: string,
    initialRoom: WorldRoom,
    requestSignal: AbortSignal,
    emit: (event: WorldEvent) => void,
    replacedRunId?: string | null,
  ) {
    const runId = initialRoom.run!.id;
    const roomId = initialRoom.id;
    const controller = new AbortController();
    const signal = AbortSignal.any([requestSignal, controller.signal]);
    let eventSeq = 0;
    const send = (event: WorldEventPayload) => {
      if (!requestSignal.aborted)
        emit({ ...event, runId, eventSeq: ++eventSeq } as WorldEvent);
    };
    const old = replacedRunId ? activeRuns.get(replacedRunId) : undefined;
    old?.controller.abort();
    const done = (async () => {
      if (old) await old.done;
      let room = initialRoom;
      let message: WorldMessage | undefined;
      let partial = "";
      let checkpoint: Promise<unknown> = Promise.resolve();
      let storageError: unknown;
      let heartbeating = false;
      const deadlineTimer = setTimeout(
        () => controller.abort(),
        Math.max(1, initialRoom.run!.deadline - Date.now()),
      );
      const heartbeat = setInterval(() => {
        if (heartbeating || signal.aborted) return;
        heartbeating = true;
        void store
          .during(ownerId, roomId, runId, () => {})
          .catch((error: unknown) => {
            storageError = error;
            controller.abort();
          })
          .finally(() => {
            heartbeating = false;
          });
      }, 5000);
      async function change(work: (room: WorldRoom) => void) {
        signal.throwIfAborted();
        room = await store.during(ownerId, roomId, runId, work);
      }
      async function phase(label: string) {
        await change((r) => {
          r.run!.phase = label;
        });
        send({ type: "phase", phase: label });
      }
      async function call(
        model: string,
        messages: ModelMessage[],
        maxCharacters: number,
        onText?: (text: string) => void,
      ) {
        await change((r) => {
          if (r.run!.calls >= 25 || r.run!.deadline <= Date.now())
            throw new WorldError("budget", "本轮调用或时间额度已用完");
          r.run!.calls += 1;
        });
        const result = await complete({
          model,
          messages,
          signal,
          maxCharacters,
          onText,
        });
        await change((r) => {
          if (result.usage) {
            r.run!.usage.input += result.usage.input;
            r.run!.usage.output += result.usage.output;
            r.run!.usage.reportedCalls += 1;
          }
        });
        return result.text;
      }
      try {
        await change(() => {});
        send({ type: "room", room });
        for (let turn = 0; turn < initialRoom.run!.limit; turn += 1) {
          let batch = summaryBatch(room);
          while (batch.length) {
            await phase("正在整理公共剧情");
            const text = await call(
              room.config.characters.find((c) => c.enabled)!.model,
              summaryContext(room, batch),
              5000,
            );
            await change((r) => {
              r.summary = {
                text,
                throughSeq: batch.at(-1)!.seq,
                configVersion: r.version,
              };
            });
            batch = summaryBatch(room);
          }
          const mentioned = room.run!.mentions[turn];
          const eligible = eligibleCharacters(room);
          let speaker =
            mentioned && mentioned !== "system"
              ? room.config.characters.find(
                  (c) => c.id === mentioned && c.enabled,
                )
              : fallbackSpeaker(room, eligible);
          if (!speaker)
            throw new WorldError("no_characters", "没有可发言的角色");
          let narrating =
            mentioned === "system" ||
            (!mentioned &&
              !room.messages.some(
                (m) => m.kind === "narrator" && m.status === "complete",
              ));
          let direction = "承接当前事件，给出一个可供角色回应的具体场景变化。";
          if (!mentioned && !narrating) {
            await phase("系统正在安排剧情");
            const recent = room.messages
              .filter((m) => m.kind === "agent" && m.status === "complete")
              .slice(
                -room.config.characters.filter((c) => c.enabled).length * 2,
              );
            const overdue =
              recent.length >=
                room.config.characters.filter((c) => c.enabled).length * 2 &&
              !recent.some((m) => m.speakerId === speaker!.id);
            try {
              const text = await call(
                process.env.GROUP_CHAT_DIRECTOR_MODEL || speaker.model,
                directorContext(room, eligible),
                1500,
              );
              const selected = parseSelection(text, eligible);
              if (selected.action === "wait" && canWaitForUser(room)) {
                await change((r) => {
                  message = appendMessage(r, {
                    speakerId: "system",
                    name: "系统",
                    kind: "narrator",
                    text: selected.question,
                    status: "complete",
                    runId,
                    mentions: [],
                  });
                  r.run!.turns += 1;
                  r.updatedAt = new Date().toISOString();
                  finishRun(r, "paused", "等待你的决定");
                });
                send({ type: "message", message: message! });
                message = undefined;
                break;
              }
              if (selected.action === "speak") {
                if (!overdue) speaker = selected.character;
                direction =
                  speaker.id === selected.character.id
                    ? selected.direction
                    : "";
              } else if (
                selected.action === "narrate" &&
                room.messages
                  .filter((m) => m.status === "complete" && m.kind !== "system")
                  .at(-1)?.kind !== "narrator"
              ) {
                narrating = true;
                direction = selected.direction;
              } else {
                direction =
                  "直接回应最近的用户消息或系统事件，并自主推进一个小行动，不要再次把话题退回给用户。";
              }
            } catch (error) {
              if (
                signal.aborted ||
                storageError ||
                (error instanceof WorldError &&
                  [
                    "stopped",
                    "budget",
                    "tools_disabled",
                    "proxy_auth",
                  ].includes(error.code))
              )
                throw error;
              // One failed director attempt uses the deterministic speaker, never a repair loop.
            }
          }
          const messages = narrating
            ? narratorContext(room, direction)
            : actorContext(room, speaker, direction);
          await phase(
            narrating ? "系统正在推进剧情" : `${speaker.name} 正在回应`,
          );
          await change((r) => {
            message = appendMessage(r, {
              speakerId: narrating ? "system" : speaker!.id,
              name: narrating ? "系统" : speaker!.name,
              kind: narrating ? "narrator" : "agent",
              text: "",
              status: "streaming",
              runId,
              mentions: [],
            });
          });
          send({ type: "message", message: message! });
          partial = "";
          let lastCheckpoint = Date.now();
          const model = narrating
            ? process.env.GROUP_CHAT_DIRECTOR_MODEL || speaker.model
            : speaker.model;
          const text = await call(model, messages, 2000, (delta) => {
            if (signal.aborted) return;
            partial += delta;
            send({ type: "delta", messageId: message!.id, text: delta });
            if (Date.now() - lastCheckpoint > 500) {
              const snapshot = partial;
              const messageId = message!.id;
              lastCheckpoint = Date.now();
              checkpoint = checkpoint
                .then(() =>
                  store.during(ownerId, roomId, runId, (r) => {
                    const current = r.messages.find((m) => m.id === messageId);
                    if (current?.status === "streaming")
                      current.text = snapshot;
                  }),
                )
                .catch((error: unknown) => {
                  storageError = error;
                  controller.abort();
                });
            }
          });
          await checkpoint;
          if (storageError) throw storageError;
          await change((r) => {
            const current = r.messages.find((m) => m.id === message!.id)!;
            current.text = text;
            current.status = "complete";
            r.run!.turns += 1;
            r.updatedAt = new Date().toISOString();
            message = current;
          });
          send({ type: "message", message: message! });
          message = undefined;
          partial = "";
          if (room.run!.mode === "auto") {
            await phase("留一点时间阅读，随后继续剧情…");
            await delay(
              Math.min(5000, Math.max(1500, text.length * 25)),
              undefined,
              {
                signal,
              },
            );
          }
        }
        if (room.run?.status === "running") {
          await change((r) =>
            finishRun(
              r,
              r.run!.mode === "step" || r.run!.mode === "retry"
                ? "paused"
                : "completed",
              "本轮对话已完成",
            ),
          );
        }
      } catch (error) {
        await checkpoint;
        const failure =
          signal.aborted && !storageError
            ? new WorldError(
                "stopped",
                Date.now() >= initialRoom.run!.deadline
                  ? "本轮运行已达到时间上限"
                  : "对话已中断，可手动继续",
              )
            : providerError(storageError || error);
        try {
          const result = await store.change(ownerId, roomId, (r) => {
            const current = r.messages.find((m) => m.id === message?.id);
            if (current && current.status !== "complete") {
              current.text = partial;
              current.status =
                failure.code === "truncated"
                  ? "truncated"
                  : signal.aborted
                    ? "interrupted"
                    : "failed";
            }
            if (r.run?.id === runId && r.run.status === "running")
              finishRun(
                r,
                signal.aborted ? "interrupted" : "failed",
                failure.message,
              );
          });
          room = result.room;
        } catch {
          /* The stream still reports failure if durable storage is unavailable. */
        }
        if (failure.code !== "stopped")
          send({ type: "error", message: failure.message, code: failure.code });
      } finally {
        clearInterval(heartbeat);
        clearTimeout(deadlineTimer);
        controller.abort();
        activeRuns.delete(runId);
        // A replaced run cannot overwrite the client's new room snapshot.
        if (room.run?.id === runId) send({ type: "room", room });
        send({ type: "done" });
      }
    })();
    activeRuns.set(runId, { controller, done });
    return done;
  };
}
