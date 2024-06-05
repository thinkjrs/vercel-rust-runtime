"use client";

import { useRef } from "react";

function getSliderLabelText(
  labelText?: string,
  currentValue?: string | number,
  divisor?: number
) {
  if (divisor) {
    return labelText !== "undefined"
      ? `${labelText} - ${Number(currentValue) / divisor}%`
      : "Range steps";
  } else {
    return labelText !== "undefined"
      ? `${labelText} - ${currentValue}`
      : "Range steps";
  }
}
export default function Slider({
  id,
  labelText,
  min,
  max,
  value,
  step,
  onValueChange,
  divisor,
}: {
  id?: string;
  labelText?: string;
  min?: number | string;
  max?: number | string;
  value?: number | string;
  step?: number | string;
  onValueChange: (value: string) => void;
  divisor?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = () => {
    if (inputRef.current) {
      const currentValue = inputRef.current.value;
      onValueChange(currentValue);
    }
  };
  let labelDisplayText = getSliderLabelText(
    labelText,
    inputRef.current?.value,
    divisor
  );

  return (
    <div>
      <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
        {labelDisplayText}
      </label>
      <input
        ref={inputRef}
        id={id || "steps-range"}
        type="range"
        min={min || "10"}
        max={max || "1000"}
        defaultValue={value || "10"}
        step={step || "10"}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
        onInput={handleChange}
      />
    </div>
  );
}
