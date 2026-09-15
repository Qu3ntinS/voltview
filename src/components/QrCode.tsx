import { useMemo } from "react";
import { renderSVG } from "uqr";

export function QrCode({ value, label }: { value: string; label: string }) {
  const svg = useMemo(
    () =>
      renderSVG(value, {
        ecc: "M",
        border: 2,
        pixelSize: 4,
        whiteColor: "#ffffff",
        blackColor: "#111111",
      }),
    [value]
  );

  return (
    <div
      className="qr-box"
      role="img"
      aria-label={label}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
