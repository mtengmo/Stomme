/** A fresh programme variation seed (uint32). The generator itself takes the seed as input. */
export function randomSeed(): number {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] as number;
}
