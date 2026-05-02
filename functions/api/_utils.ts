import { Md5 } from "ts-md5";

export function md5(str: string): string {
  return Md5.hashStr(str);
}

export async function createLastfmSignature(
  params: Record<string, string>,
  secret: string
): Promise<string> {
  const keys = Object.keys(params).sort();
  let sig = keys.map((k) => k + params[k]).join("") + secret;

  return md5(sig);
}
