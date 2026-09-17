export function parseInBodyText(input) {
  const text = String(input || '').replace(/\s+/g, ' ').trim();
  const number = re => {
    const match = re.exec(text);
    return match ? Number(match[1].replace(',', '.')) : null;
  };
  const dateMatch = /Дата\s+(\d{2})\.(\d{2})\.(\d{2,4})/.exec(text);
  if (!dateMatch) throw new Error('Не удалось распознать дату InBody. Используй ручной ввод.');
  const year = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3];
  const measuredAt = year + '-' + dateMatch[2] + '-' + dateMatch[1];
  const metrics = {
    weight: number(/Вес\s+Норма\s+([\d.,]+)\s+кг/i),
    skeletalMuscleMass: number(/Мышцы\s+Норма\s+([\d.,]+)\s+кг/i),
    bodyFatPercent: number(/Жир\s+Норма\s+([\d.,]+)\s*%/i),
    bodyFatMass: number(/Содержание\s+Жира\s+([\d.,]+)\s+кг/i),
    inBodyScore: number(/Оценка\s+InBody\s+([\d.,]+)\s*\/\s*100/i),
    totalBodyWater: number(/Вода\s+([\d.,]+)\s+л/i),
    protein: number(/Белок\s+([\d.,]+)\s+кг/i),
    minerals: number(/Кости\s+([\d.,]+)\s+кг/i),
    visceralFatLevel: number(/Висцеральный\s+жир\s+Ниже\s+нормы\s+([\d.,]+)/i),
    bmi: number(/Индекс\s+массы\s+тела\s+([\d.,]+)/i),
    basalMetabolicRate: number(/Обмен\s+веществ\s+([\d.,]+)\s+ккал/i)
  };
  for (const key of Object.keys(metrics)) if (!Number.isFinite(metrics[key])) delete metrics[key];
  if (!Number.isFinite(metrics.weight) || !Number.isFinite(metrics.skeletalMuscleMass) || !Number.isFinite(metrics.bodyFatPercent)) {
    throw new Error('PDF распознан не полностью. Проверь файл или используй ручной ввод.');
  }
  return { measuredAt, metrics };
}
