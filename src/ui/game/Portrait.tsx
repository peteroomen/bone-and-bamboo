/**
 * A host's or the sparrow's portrait. Until the generated art lands this is a circle in the
 * host's colour with the first letter of its name. `size` is the portrait's width; the crop data
 * shape (close, full) is ready for real art.
 */
export function Portrait({ name, colour, size }: { name: string; colour: string; size: number }) {
  return (
    <span
      className="portrait"
      aria-hidden
      style={{ width: size, height: size, background: colour, fontSize: size * 0.5 }}
    >
      {name.charAt(0)}
    </span>
  );
}
