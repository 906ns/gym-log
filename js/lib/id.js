// UUID生成だけは共通規約で要求された乱数源を使う。
export const newId = () => crypto.randomUUID();
