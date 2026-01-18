import { ButtonHTMLAttributes } from "react";
import { cn } from "./utils";

export function Button({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md bg-black px-4 py-2 text-sm text-white",
        "hover:bg-gray-800 disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
