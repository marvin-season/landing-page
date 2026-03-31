"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type PretextModule = typeof import("@chenglou/pretext");
type WhiteSpaceMode = "normal" | "pre-wrap";
type SampleId = "mixed" | "article" | "prewrap" | "custom";

const SAMPLE_TEXTS: Record<Exclude<SampleId, "custom">, string> = {
  mixed:
    "AGI 春天到了. بدأت الرحلة 🚀 Pretext lets you prepare once, then relayout many times as width changes.",
  article:
    "Pretext is a pure JavaScript text layout engine. It measures once, caches widths, and gives you line breaks, total height, and per-line widths without asking the DOM how tall the paragraph became.",
  prewrap:
    "Todo list:\n\t1. Keep whitespace\n\t2. Preserve line breaks\n\t3. Compare predicted height with DOM\n\nThis block is ideal for { whiteSpace: 'pre-wrap' }.",
};

const RANGE_CLASS_NAME =
  "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-foreground";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatMs(value: number) {
  return `${value.toFixed(value < 1 ? 2 : 1)} ms`;
}

function formatPx(value: number | null) {
  if (value == null || Number.isNaN(value)) {
    return "--";
  }

  return `${value.toFixed(value < 10 ? 2 : 1)} px`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function NumberControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">{value}</span>
      </div>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) =>
          onChange(clamp(Number(event.target.value) || min, min, max))
        }
      />
      <input
        type="range"
        className={RANGE_CLASS_NAME}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function PretextDemo() {
  const [sampleId, setSampleId] = useState<SampleId>("mixed");
  const [text, setText] = useState(SAMPLE_TEXTS.mixed);
  const [width, setWidth] = useState(360);
  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(28);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [fontWeight, setFontWeight] = useState(400);
  const [whiteSpace, setWhiteSpace] = useState<WhiteSpaceMode>("normal");
  const [pretext, setPretext] = useState<PretextModule | null>(null);
  const [moduleError, setModuleError] = useState<string | null>(null);
  const [domHeight, setDomHeight] = useState<number | null>(null);

  const domPreviewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;

    import("@chenglou/pretext")
      .then((module) => {
        if (disposed) return;
        setPretext(module);
        setModuleError(null);
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setModuleError(getErrorMessage(error));
      });

    return () => {
      disposed = true;
    };
  }, []);

  const fontShorthand = useMemo(
    () => `${fontWeight} ${fontSize}px ${fontFamily}`,
    [fontFamily, fontSize, fontWeight],
  );

  const measurement = useMemo(() => {
    if (!pretext) {
      return null;
    }

    try {
      const options = { whiteSpace };
      const prepareProfile = pretext.profilePrepare(
        text,
        fontShorthand,
        options,
      );
      const prepared = pretext.prepare(text, fontShorthand, options);
      const preparedWithSegments = pretext.prepareWithSegments(
        text,
        fontShorthand,
        options,
      );
      const summary = pretext.layout(prepared, width, lineHeight);
      const detailed = pretext.layoutWithLines(
        preparedWithSegments,
        width,
        lineHeight,
      );

      let widestLineWidth = 0;
      pretext.walkLineRanges(preparedWithSegments, width, (line) => {
        widestLineWidth = Math.max(widestLineWidth, line.width);
      });

      return {
        prepareProfile,
        summary,
        detailed,
        widestLineWidth,
      };
    } catch (error: unknown) {
      return {
        error: getErrorMessage(error),
      };
    }
  }, [fontShorthand, lineHeight, pretext, text, whiteSpace, width]);

  useEffect(() => {
    const element = domPreviewRef.current;
    if (!element) {
      return;
    }

    const updateHeight = () => {
      const rect = element.getBoundingClientRect();
      setDomHeight(Math.round(rect.height * 100) / 100);
    };

    updateHeight();
    const frameId = window.requestAnimationFrame(updateHeight);
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);

    return () => {
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!measurement || "error" in measurement || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const padding = 20;
    const chartHeight = Math.max(measurement.detailed.height, lineHeight);
    const cssWidth = width + padding * 2;
    const cssHeight = chartHeight + padding * 2;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    context.scale(dpr, dpr);
    context.clearRect(0, 0, cssWidth, cssHeight);
    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, cssWidth, cssHeight);
    context.strokeStyle = "#cbd5e1";
    context.lineWidth = 1;
    context.strokeRect(padding, padding, width, chartHeight);
    context.font = fontShorthand;
    context.textBaseline = "top";

    measurement.detailed.lines.forEach((line, index) => {
      const top = padding + index * lineHeight;
      context.fillStyle =
        index % 2 === 0
          ? "rgba(59, 130, 246, 0.08)"
          : "rgba(148, 163, 184, 0.08)";
      context.fillRect(padding, top, width, lineHeight);

      context.fillStyle = "#0f172a";
      context.fillText(line.text || " ", padding + 8, top + 4);

      context.fillStyle = "rgba(14, 165, 233, 0.65)";
      context.fillRect(padding, top + lineHeight - 3, line.width, 2);
    });
  }, [fontShorthand, lineHeight, measurement, width]);

  const activeSampleText =
    sampleId === "custom" ? null : SAMPLE_TEXTS[sampleId];
  const measurementError =
    measurement && "error" in measurement ? measurement.error : null;
  const metrics = measurement && !("error" in measurement) ? measurement : null;
  const domDelta =
    metrics && domHeight != null
      ? Math.abs(domHeight - metrics.summary.height)
      : null;

  const onSampleClick = (nextSampleId: Exclude<SampleId, "custom">) => {
    setSampleId(nextSampleId);
    setText(SAMPLE_TEXTS[nextSampleId]);
    setWhiteSpace(nextSampleId === "prewrap" ? "pre-wrap" : "normal");
  };

  const onTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextText = event.target.value;
    setText(nextText);
    if (nextText !== activeSampleText) {
      setSampleId("custom");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <Card className="h-fit border-border/60 bg-background/75 shadow-lg shadow-black/5">
        <CardHeader>
          <CardTitle>Interactive Playground</CardTitle>
          <CardDescription>
            This demo loads `@chenglou/pretext` on the client, then uses
            `profilePrepare`, `layout`, `layoutWithLines`, and `walkLineRanges`
            against the same paragraph.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(
                Object.keys(SAMPLE_TEXTS) as Array<Exclude<SampleId, "custom">>
              ).map((id) => (
                <Button
                  key={id}
                  size="sm"
                  variant={sampleId === id ? "default" : "outline"}
                  onClick={() => onSampleClick(id)}
                >
                  {id}
                </Button>
              ))}
            </div>
            <Textarea
              rows={10}
              value={text}
              onChange={onTextChange}
              placeholder="Type any multilingual paragraph here..."
            />
          </div>

          <Separator />

          <div className="grid gap-5 md:grid-cols-2">
            <NumberControl
              label="Width"
              value={width}
              min={180}
              max={720}
              step={10}
              onChange={setWidth}
            />
            <NumberControl
              label="Font Size"
              value={fontSize}
              min={12}
              max={36}
              step={1}
              onChange={setFontSize}
            />
            <NumberControl
              label="Line Height"
              value={lineHeight}
              min={16}
              max={48}
              step={1}
              onChange={setLineHeight}
            />
            <NumberControl
              label="Font Weight"
              value={fontWeight}
              min={300}
              max={700}
              step={100}
              onChange={setFontWeight}
            />
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">
              Font Family
            </span>
            <Input
              value={fontFamily}
              onChange={(event) => setFontFamily(event.target.value)}
              placeholder='Arial, "Helvetica Neue", serif'
            />
          </label>

          <div className="space-y-3">
            <span className="text-sm font-medium text-foreground">
              whiteSpace
            </span>
            <div className="flex flex-wrap gap-2">
              {(["normal", "pre-wrap"] as WhiteSpaceMode[]).map((mode) => (
                <Button
                  key={mode}
                  size="sm"
                  variant={whiteSpace === mode ? "default" : "outline"}
                  onClick={() => setWhiteSpace(mode)}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
            <div className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Current font shorthand
            </div>
            <code className="mt-2 block break-all text-sm text-foreground">
              {fontShorthand}
            </code>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {moduleError || measurementError ? (
          <Alert className="border-destructive/30 bg-destructive/5">
            <AlertTitle>Pretext failed to initialize</AlertTitle>
            <AlertDescription>
              {moduleError ?? measurementError}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/60 bg-background/70">
            <CardHeader>
              <CardDescription>prepare()</CardDescription>
              <CardTitle>
                {metrics ? formatMs(metrics.prepareProfile.totalMs) : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              analysis{" "}
              {metrics ? formatMs(metrics.prepareProfile.analysisMs) : "--"}
              <br />
              measure{" "}
              {metrics ? formatMs(metrics.prepareProfile.measureMs) : "--"}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70">
            <CardHeader>
              <CardDescription>layout()</CardDescription>
              <CardTitle>
                {metrics ? formatPx(metrics.summary.height) : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              line count {metrics?.summary.lineCount ?? "--"}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70">
            <CardHeader>
              <CardDescription>walkLineRanges()</CardDescription>
              <CardTitle>
                {metrics ? formatPx(metrics.widestLineWidth) : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              widest visible line
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70">
            <CardHeader>
              <CardDescription>DOM Comparison</CardDescription>
              <CardTitle>
                {domHeight != null ? formatPx(domHeight) : "--"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              delta {formatPx(domDelta)}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/60 bg-background/70">
            <CardHeader>
              <CardTitle>Browser DOM reference</CardTitle>
              <CardDescription>
                This box uses regular browser flow and `getBoundingClientRect()`
                as a comparison target.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-2xl border border-border/60 bg-muted/10 p-5">
                <div
                  ref={domPreviewRef}
                  style={{
                    width: `${width}px`,
                    fontSize: `${fontSize}px`,
                    fontFamily,
                    fontWeight,
                    lineHeight: `${lineHeight}px`,
                    whiteSpace,
                    overflowWrap: "break-word",
                  }}
                  className="text-foreground"
                >
                  {text}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-background/70">
            <CardHeader>
              <CardTitle>Canvas preview from layoutWithLines()</CardTitle>
              <CardDescription>
                Each row is drawn from Pretext's computed lines instead of
                asking the DOM where the paragraph wrapped.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-2xl border border-border/60 bg-muted/10">
                <canvas ref={canvasRef} className="block" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/60 bg-background/70">
          <CardHeader>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">prepareWithSegments()</Badge>
              <Badge variant="outline">layoutWithLines()</Badge>
            </div>
            <CardTitle>Line breakdown</CardTitle>
            <CardDescription>
              Inspect the line strings and widths returned by Pretext.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {metrics?.detailed.lines.map((line, index) => (
                <div
                  key={`${index}-${line.start.segmentIndex}-${line.end.segmentIndex}`}
                  className="rounded-xl border border-border/60 bg-muted/10 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge variant="secondary">line {index + 1}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatPx(line.width)}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{
                        width: `${Math.min(100, (line.width / width) * 100)}%`,
                      }}
                    />
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap wrap-break-word text-sm text-foreground">
                    {line.text || "(empty line)"}
                  </pre>
                </div>
              )) ?? (
                <div className="rounded-xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
                  Waiting for Pretext to load...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
