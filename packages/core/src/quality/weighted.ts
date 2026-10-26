export function weightedQuality(
  definitions: Record<string, { label: string; weight: number }>,
  checks: readonly { passed: boolean }[],
  scores: Partial<Record<string, number>> | undefined,
  minimum: number,
  technicalWeight: number,
) {
  const dimensions: { key: string; label: string; weight: number; score: number | null }[] = Object.entries(definitions).map(
    ([key, definition]) => {
      const value = scores?.[key];
      return {
        key,
        ...definition,
        score: typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null,
      };
    },
  );
  const technical = checks.length > 0 && checks.every((c) => c.passed);
  dimensions.push({
    key: 'technical',
    label: 'Technische Prüfungen',
    weight: technicalWeight,
    score: checks.length ? (technical ? 100 : 0) : null,
  });
  const complete = dimensions.every((d) => d.score !== null);
  const total = complete ? Math.round(dimensions.reduce((sum, d) => sum + (d.score! * d.weight) / 100, 0) * 10) / 10 : null;
  return {
    version: 1 as const,
    dimensions,
    total,
    minimum,
    complete,
    passed: technical && complete && total! >= minimum && dimensions.every((d) => d.score! >= 60),
  };
}
