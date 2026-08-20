"use client";

import { useLanguage } from "@/context/LanguageContext";

interface ToolOptionsProps {
  activeTool: string;
  options: Record<string, unknown>;
  onOptionChange: (key: string, value: unknown) => void;
}

const colorPresets = ["#000000", "#FF0000", "#00AA00", "#0000FF", "#FF6600", "#9933CC"];

export default function ToolOptions({ activeTool, options, onOptionChange }: ToolOptionsProps) {
  const { t } = useLanguage();

  if (!activeTool) {
    return (
      <div className="flex h-full w-64 flex-col items-center justify-center border-l border-gray-200 bg-gray-50 px-4 dark:border-gray-700 dark:bg-gray-900">
        <svg xmlns="http://www.w3.org/2000/svg" className="mb-3 h-8 w-8 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Select a tool to see options
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-64 flex-col border-l border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 px-3 py-2 dark:border-gray-700">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {t(`editor.${activeTool === "text" ? "addText" : activeTool === "comment" ? "addComment" : activeTool === "image" ? "addImage" : activeTool === "watermark" ? "addWatermark" : activeTool === "pageNumbers" ? "addPageNumbers" : activeTool === "rotate" ? "rotatePages" : activeTool === "crop" ? "cropPages" : activeTool}`)}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {activeTool === "text" && (
          <TextOptions options={options} onOptionChange={onOptionChange} t={t} />
        )}
        {activeTool === "comment" && (
          <CommentOptions options={options} onOptionChange={onOptionChange} t={t} />
        )}
        {activeTool === "image" && (
          <ImageOptions options={options} onOptionChange={onOptionChange} t={t} />
        )}
        {activeTool === "watermark" && (
          <WatermarkOptions options={options} onOptionChange={onOptionChange} t={t} />
        )}
        {activeTool === "pageNumbers" && (
          <PageNumbersOptions options={options} onOptionChange={onOptionChange} t={t} />
        )}
        {activeTool === "rotate" && (
          <RotateOptions options={options} onOptionChange={onOptionChange} t={t} />
        )}
        {activeTool === "crop" && (
          <CropOptions options={options} onOptionChange={onOptionChange} t={t} />
        )}
        {(activeTool === "annotate" || activeTool === "highlight") && (
          <AnnotateOptions options={options} onOptionChange={onOptionChange} t={t} />
        )}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
    />
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function TextOptions({
  options,
  onOptionChange,
  t,
}: {
  options: Record<string, unknown>;
  onOptionChange: (key: string, value: unknown) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>{t("editor.addText")}</FieldLabel>
        <textarea
          value={(options.text as string) || ""}
          onChange={(e) => onOptionChange("text", e.target.value)}
          placeholder={t("editor.addText")}
          rows={3}
          className="w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
        />
      </div>
      <div>
        <FieldLabel>{t("toolPages.fontSize")}</FieldLabel>
        <NumberInput
          value={(options.fontSize as number) || 16}
          onChange={(v) => onOptionChange("fontSize", v)}
          min={8}
          max={200}
        />
      </div>
      <div>
        <FieldLabel>Color</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {colorPresets.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onOptionChange("color", c)}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                options.color === c
                  ? "border-brand-500 scale-110"
                  : "border-gray-200 hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={(options.color as string) || "#000000"}
            onChange={(e) => onOptionChange("color", e.target.value)}
            className="h-6 w-6 cursor-pointer rounded-full border-0"
          />
        </div>
      </div>
      <div>
        <FieldLabel>Position X</FieldLabel>
        <NumberInput
          value={(options.x as number) || 100}
          onChange={(v) => onOptionChange("x", v)}
          min={0}
        />
      </div>
      <div>
        <FieldLabel>Position Y</FieldLabel>
        <NumberInput
          value={(options.y as number) || 100}
          onChange={(v) => onOptionChange("y", v)}
          min={0}
        />
      </div>
    </div>
  );
}

function ImageOptions({
  options,
  onOptionChange,
  t,
}: {
  options: Record<string, unknown>;
  onOptionChange: (key: string, value: unknown) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>{t("editor.addImage")}</FieldLabel>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-6 transition-colors hover:border-brand-400 dark:border-gray-600 dark:bg-gray-900">
          <svg xmlns="http://www.w3.org/2000/svg" className="mb-2 h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-xs text-gray-500">Click to upload image</p>
        </div>
      </div>
      <div>
        <FieldLabel>Position X</FieldLabel>
        <NumberInput
          value={(options.x as number) || 100}
          onChange={(v) => onOptionChange("x", v)}
          min={0}
        />
      </div>
      <div>
        <FieldLabel>Position Y</FieldLabel>
        <NumberInput
          value={(options.y as number) || 100}
          onChange={(v) => onOptionChange("y", v)}
          min={0}
        />
      </div>
      <div>
        <FieldLabel>Width</FieldLabel>
        <NumberInput
          value={(options.width as number) || 200}
          onChange={(v) => onOptionChange("width", v)}
          min={10}
        />
      </div>
    </div>
  );
}

function WatermarkOptions({
  options,
  onOptionChange,
  t,
}: {
  options: Record<string, unknown>;
  onOptionChange: (key: string, value: unknown) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>{t("toolPages.watermarkText")}</FieldLabel>
        <TextInput
          value={(options.text as string) || ""}
          onChange={(v) => onOptionChange("text", v)}
          placeholder={t("toolPages.watermarkTextPlaceholder")}
        />
      </div>
      <div>
        <FieldLabel>{t("toolPages.fontSize")}</FieldLabel>
        <NumberInput
          value={(options.fontSize as number) || 36}
          onChange={(v) => onOptionChange("fontSize", v)}
          min={8}
          max={200}
        />
      </div>
      <div>
        <FieldLabel>{t("toolPages.opacity")} ({Math.round(((options.opacity as number) ?? 0.3) * 100)}%)</FieldLabel>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(((options.opacity as number) ?? 0.3) * 100)}
          onChange={(e) => onOptionChange("opacity", Number(e.target.value) / 100)}
          className="w-full accent-brand-600"
        />
      </div>
      <div>
        <FieldLabel>{t("toolPages.position")}</FieldLabel>
        <SelectInput
          value={(options.position as string) || "center"}
          onChange={(v) => onOptionChange("position", v)}
          options={[
            { label: t("toolPages.positionCenter"), value: "center" },
            { label: t("toolPages.positionTop"), value: "top" },
            { label: t("toolPages.positionBottom"), value: "bottom" },
          ]}
        />
      </div>
      <div>
        <FieldLabel>Color</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {colorPresets.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onOptionChange("color", c)}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                options.color === c
                  ? "border-brand-500 scale-110"
                  : "border-gray-200 hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={(options.color as string) || "#000000"}
            onChange={(e) => onOptionChange("color", e.target.value)}
            className="h-6 w-6 cursor-pointer rounded-full border-0"
          />
        </div>
      </div>
    </div>
  );
}

function PageNumbersOptions({
  options,
  onOptionChange,
  t,
}: {
  options: Record<string, unknown>;
  onOptionChange: (key: string, value: unknown) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>{t("toolPages.position")}</FieldLabel>
        <SelectInput
          value={(options.position as string) || "bottom-center"}
          onChange={(v) => onOptionChange("position", v)}
          options={[
            { label: t("toolPages.bottomCenter"), value: "bottom-center" },
            { label: t("toolPages.bottomLeft"), value: "bottom-left" },
            { label: t("toolPages.bottomRight"), value: "bottom-right" },
            { label: t("toolPages.positionCenter"), value: "center" },
            { label: t("toolPages.positionTop"), value: "top" },
          ]}
        />
      </div>
      <div>
        <FieldLabel>{t("toolPages.startPageNumber")}</FieldLabel>
        <NumberInput
          value={(options.startNumber as number) || 1}
          onChange={(v) => onOptionChange("startNumber", v)}
          min={1}
        />
      </div>
      <div>
        <FieldLabel>{t("toolPages.fontSize")}</FieldLabel>
        <NumberInput
          value={(options.fontSize as number) || 12}
          onChange={(v) => onOptionChange("fontSize", v)}
          min={6}
          max={72}
        />
      </div>
    </div>
  );
}

function RotateOptions({
  options,
  onOptionChange,
  t,
}: {
  options: Record<string, unknown>;
  onOptionChange: (key: string, value: unknown) => void;
  t: (k: string) => string;
}) {
  const angles = [90, 180, 270];

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>{t("toolPages.rotationAngle")}</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {angles.map((angle) => (
            <button
              key={angle}
              type="button"
              onClick={() => onOptionChange("rotation", angle)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                options.rotation === angle
                  ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {angle}°
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Custom Angle</FieldLabel>
        <NumberInput
          value={(options.rotation as number) || 0}
          onChange={(v) => onOptionChange("rotation", v)}
          min={0}
          max={360}
          step={15}
        />
      </div>
    </div>
  );
}

function CropOptions({
  options,
  onOptionChange,
  t,
}: {
  options: Record<string, unknown>;
  onOptionChange: (key: string, value: unknown) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>{t("toolPages.cropMargins")}</FieldLabel>
        <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
          {t("toolPages.cropMarginsHint")}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>{t("toolPages.marginTop")}</FieldLabel>
          <NumberInput
            value={(options.marginTop as number) || 0}
            onChange={(v) => onOptionChange("marginTop", v)}
            min={0}
          />
        </div>
        <div>
          <FieldLabel>{t("toolPages.marginBottom")}</FieldLabel>
          <NumberInput
            value={(options.marginBottom as number) || 0}
            onChange={(v) => onOptionChange("marginBottom", v)}
            min={0}
          />
        </div>
        <div>
          <FieldLabel>{t("toolPages.marginLeft")}</FieldLabel>
          <NumberInput
            value={(options.marginLeft as number) || 0}
            onChange={(v) => onOptionChange("marginLeft", v)}
            min={0}
          />
        </div>
        <div>
          <FieldLabel>{t("toolPages.marginRight")}</FieldLabel>
          <NumberInput
            value={(options.marginRight as number) || 0}
            onChange={(v) => onOptionChange("marginRight", v)}
            min={0}
          />
        </div>
      </div>
    </div>
  );
}

function AnnotateOptions({
  options,
  onOptionChange,
  t,
}: {
  options: Record<string, unknown>;
  onOptionChange: (key: string, value: unknown) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>{t("toolPages.opacity")} ({Math.round(((options.opacity as number) ?? 0.5) * 100)}%)</FieldLabel>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(((options.opacity as number) ?? 0.5) * 100)}
          onChange={(e) => onOptionChange("opacity", Number(e.target.value) / 100)}
          className="w-full accent-brand-600"
        />
      </div>
      <div>
        <FieldLabel>Color</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {colorPresets.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onOptionChange("color", c)}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                options.color === c
                  ? "border-brand-500 scale-110"
                  : "border-gray-200 hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={(options.color as string) || "#FFD700"}
            onChange={(e) => onOptionChange("color", e.target.value)}
            className="h-6 w-6 cursor-pointer rounded-full border-0"
          />
        </div>
      </div>
      <div>
        <FieldLabel>Line Width</FieldLabel>
        <NumberInput
          value={(options.lineWidth as number) || 2}
          onChange={(v) => onOptionChange("lineWidth", v)}
          min={1}
          max={20}
        />
      </div>
    </div>
  );
}

function CommentOptions({
  options,
  onOptionChange,
  t,
}: {
  options: Record<string, unknown>;
  onOptionChange: (key: string, value: unknown) => void;
  t: (k: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>{t("editor.writeComment")}</FieldLabel>
        <textarea
          value={(options.commentText as string) || ""}
          onChange={(e) => onOptionChange("commentText", e.target.value)}
          placeholder={t("editor.writeCommentPlaceholder")}
          rows={4}
          className="w-full resize-none rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm text-gray-700 outline-none transition-colors focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200"
        />
      </div>
      <div>
        <FieldLabel>{t("toolPages.fontSize")}</FieldLabel>
        <NumberInput
          value={(options.fontSize as number) || 14}
          onChange={(v) => onOptionChange("fontSize", v)}
          min={8}
          max={72}
        />
      </div>
      <div>
        <FieldLabel>Color</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {colorPresets.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onOptionChange("color", c)}
              className={`h-6 w-6 rounded-full border-2 transition-transform ${
                options.color === c
                  ? "border-brand-500 scale-110"
                  : "border-gray-200 hover:scale-105"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={(options.color as string) || "#FF0000"}
            onChange={(e) => onOptionChange("color", e.target.value)}
            className="h-6 w-6 cursor-pointer rounded-full border-0"
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {t("editor.clickToPlaceComment")}
      </p>
    </div>
  );
}
