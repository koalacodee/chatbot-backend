import * as React from "react";

export default function Briefcase(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      {/* briefcase body */}
      <rect x="4" y="8" width="16" height="10" rx="2" ry="2" />
      {/* briefcase lid (top) */}
      <rect x="4" y="6" width="16" height="4" rx="2" ry="2" />
      {/* handle */}
      <path strokeLinecap="round" d="M12 6v-2" />
      {/* optional latch */}
      <path strokeLinecap="round" d="M10 12h4" />
    </svg>
  );
}
