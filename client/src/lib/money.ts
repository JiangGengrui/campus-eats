// 金额展示与换算：DB 存分，展示 ÷100（CODEBUDDY §2）
export function yuan(cents: number): number {
  return cents / 100;
}

export function formatCents(cents: number): string {
  return `¥${yuan(cents)}`;
}

/** 管理表单的元输入 → 分；空串/非法输入返回 null */
export function yuanToCents(input: string): number | null {
  if (input.trim() === "") {
    return null;
  }
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value * 100);
}
