type Parser<T> = (input: string, pos: number) => ParseResult<T>;
type ParseSuccess<T> = { success: true; value: T; pos: number };
type ParseResult<T> =
  | ParseSuccess<T>
  | { success: false; expected: string; pos: number };

const literal =
  (s: string): Parser<string> =>
  (input: string, pos: number) =>
    input.startsWith(s, pos)
      ? { success: true, pos: pos + s.length, value: s }
      : { success: false, expected: s, pos };

const untilWhitespace: Parser<string> = (input: string, pos: number) => {
  let i = pos;
  while (input[i] !== " " && i < input.length) i++;
  if (input[i] !== " " && i !== input.length)
    return { success: false, expected: " ", pos };

  const str = input.slice(pos, Math.max(i, 0));
  console.log(str);

  while (input[i] === " " && i < input.length - 1) i++;
  const newPos = i;

  return { success: true, pos: newPos, value: str };
};

const litTrimTrail =
  (s: string): Parser<string> =>
  (input: string, pos: number) => {
    const parsed = untilWhitespace(input, pos);
    return parsed.success && parsed.value === s
      ? parsed
      : { success: false, pos, expected: s };
  };

type Unwrap<T> = T extends Parser<infer U> ? U : never;
type UnwrappedTuple<T> = {
  [K in keyof T]: Unwrap<T[K]>;
};

const alt =
  <T extends Parser<any>[]>(...ps: T): Parser<UnwrappedTuple<T>[number]> =>
  (input: string, pos: number) => {
    let res: ParseResult<UnwrappedTuple<T>[number]> = {
      success: false,
      expected: "",
      pos,
    };

    for (const p of ps) {
      res = p(input, pos);
      if (res.success) return res;
    }

    return res;
  };

const seq =
  <T extends Parser<any>[]>(...ps: T): Parser<UnwrappedTuple<T>> =>
  (input: string, pos: number) => {
    let prevPos = pos;

    const res: any[] = [];
    for (const p of ps) {
      const pRes = p(input, prevPos);

      if (!pRes.success) {
        return pRes;
      }

      prevPos = pRes.pos;
      res.push(pRes.value);
    }

    return { success: true, value: res as UnwrappedTuple<T>, pos: prevPos };
  };

type MapFn<X, Y> = (x: X) => Y;
const map =
  <X, Y>(p: Parser<X>, fn: MapFn<X, Y>): Parser<Y> =>
  (input: string, pos: number) => {
    const parsed = p(input, pos);
    if (!parsed.success) return parsed;

    return { success: true, value: fn(parsed.value), pos: parsed.pos };
  };

const many =
  <T>(p: Parser<T>): Parser<T[]> =>
  (input: string, pos: number) => {
    const result: ParseSuccess<T[]> = { success: true, pos, value: [] };
    let prevSucc = true;
    let prevPos = pos;
    while (prevSucc) {
      const res = p(input, prevPos);
      prevPos = res.pos;
      prevSucc = res.success;

      if (res.success) result.value.push(res.value);
    }

    return result;
  };

const x = seq(
  litTrimTrail("let"),
  untilWhitespace,
  litTrimTrail("="),
  untilWhitespace,
);

console.log(x("let a = 2", 0));

const y = alt(literal("a"), literal("b"), literal("c"));

console.log(y("a", 0));
console.log(y("b", 0));
console.log(y("c", 0));
console.log(y("d", 0));
