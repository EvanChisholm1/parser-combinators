type Parser<T> = (input: string, pos: number) => ParseResult<T>;
type ParseSuccess<T> = { success: true; value: T; pos: number };
type ParseResult<T> =
  | ParseSuccess<T>
  | { success: false; expected: string; pos: number };

const any: Parser<string> = (input, pos) => {
  if (pos >= input.length) return { success: false, expected: "anything", pos };
  return { success: true, value: input[pos]!, pos: pos + 1 };
};

const succeed =
  <T>(val: T): Parser<T> =>
  (input, pos) => ({ success: true, pos, value: val });

const fail: Parser<any> = (input, pos) => ({
  success: false,
  pos,
  expected: "",
});

const literal =
  (s: string): Parser<string> =>
  (input: string, pos: number) =>
    input.startsWith(s, pos)
      ? { success: true, pos: pos + s.length, value: s }
      : { success: false, expected: s, pos };

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

const numeric = alt(
  literal("0"),
  literal("1"),
  literal("2"),
  literal("3"),
  literal("4"),
  literal("5"),
  literal("6"),
  literal("7"),
  literal("8"),
  literal("9"),
);

const int = map(many(numeric), (x) => parseInt(x.join("")));
const float = alt(
  map(seq(int, literal("."), int), (x) => parseFloat(x.join(""))),
  int,
);

const ws = many(alt(literal(" "), literal("\t"), literal("\n")));

const token = <T>(p: Parser<T>) => map(seq(p, ws), ([v, _]) => v);

const x = seq(
  token(literal("let")),
  token(literal("x")),
  token(literal("=")),
  token(float),
);

const parse = <T>(p: Parser<T>, input: string) => p(input, 0);

console.log(parse(x, "let x = 1"));
console.log(parse(x, "let x = 1.1"));
console.log(parse(x, "let x = 23.34"));
