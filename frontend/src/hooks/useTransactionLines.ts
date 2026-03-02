import { useCallback, useState } from 'react';

interface UseTransactionLinesConfig<TLine extends { key: string }> {
  buildEmptyLine: () => TLine;
  isLineComplete: (line: TLine) => boolean;
  onIncompleteLine?: () => void;
}

export function useTransactionLines<TLine extends { key: string }>(
  config: UseTransactionLinesConfig<TLine>,
) {
  const { buildEmptyLine, isLineComplete, onIncompleteLine } = config;

  const [lines, setLines] = useState<TLine[]>([buildEmptyLine()]);
  const [activeLineKeys, setActiveLineKeys] = useState<string[]>([]);

  const updateLine = useCallback((lineKey: string, changes: Partial<TLine>) => {
    setLines((prev) =>
      prev.map((line) => (line.key === lineKey ? { ...line, ...changes } : line)),
    );
  }, []);

  const addLine = useCallback((): boolean => {
    const lastLine = lines[lines.length - 1];
    if (!lastLine || !isLineComplete(lastLine)) {
      onIncompleteLine?.();
      return false;
    }
    const newLine = buildEmptyLine();
    setLines((prev) => [...prev, newLine]);
    setActiveLineKeys([newLine.key]);
    return true;
  }, [buildEmptyLine, isLineComplete, lines, onIncompleteLine]);

  const removeLine = useCallback((lineKey: string) => {
    if (lines.length <= 1) return;
    const remaining = lines.filter((line) => line.key !== lineKey);
    setLines(remaining);
    setActiveLineKeys((prevKeys) => {
      const next = prevKeys.filter((k) => k !== lineKey);
      return next.length > 0
        ? next
        : remaining.length > 0
          ? [remaining[remaining.length - 1].key]
          : [];
    });
  }, [lines]);

  return {
    lines,
    setLines,
    activeLineKeys,
    setActiveLineKeys,
    updateLine,
    addLine,
    removeLine,
  };
}

