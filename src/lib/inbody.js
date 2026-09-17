const numeric = raw => {
  const match = String(raw ?? '').match(/-?\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(',', '.')) : null;
};
const compact = value => Object.fromEntries(Object.entries(value).filter(([, item]) => item !== null && item !== undefined && (!(typeof item === 'object') || Object.keys(item).length)));

function parseSegments(items = []) {
  const positioned = items.map(item => ({
    text: String(item.str || '').trim(),
    x: Number(item.transform?.[4]),
    y: Number(item.transform?.[5])
  })).filter(item => item.text && Number.isFinite(item.x) && Number.isFinite(item.y));
  if (!positioned.some(item => item.text.toLowerCase() === 'торс') || !positioned.some(item => item.text.toLowerCase() === 'мышц')) return {};
  const read = (x1, x2, y1, y2) => {
    const item = positioned.find(entry => entry.x >= x1 && entry.x <= x2 && entry.y >= y1 && entry.y <= y2 && /^-?\d+(?:[.,]\d+)?(?:\s*%)?$/.test(entry.text));
    return item ? numeric(item.text) : null;
  };
  const status = (x1, x2, y1, y2) => {
    const words = positioned.filter(entry => entry.x >= x1 && entry.x <= x2 && entry.y >= y1 && entry.y <= y2).sort((a, b) => a.x - b.x).map(entry => entry.text).join(' ');
    const match = /(Ниже\s+нормы|Выше\s+нормы|Норма)/i.exec(words);
    return match ? match[1].replace(/\s+/g, ' ') : '';
  };
  const segment = (valueBox, percentBox, statusBox) => compact({
    value: read(...valueBox),
    unit: 'кг',
    percent: read(...percentBox),
    status: status(...statusBox) || undefined
  });
  const group = (x) => ({
    leftArm: segment([x[0], x[1], 176, 190], [x[0], x[1], 165, 176], [x[0], x[1], 150, 165]),
    rightArm: segment([x[2], x[3], 176, 190], [x[2], x[3], 165, 176], [x[2], x[3], 150, 165]),
    trunk: segment([x[4], x[5], 116, 131], [x[4], x[5], 101, 116], [x[4], x[5], 136, 151]),
    leftLeg: segment([x[0], x[1], 45, 61], [x[0], x[1], 61, 78], [x[0], x[1], 76, 89]),
    rightLeg: segment([x[2], x[3], 45, 61], [x[2], x[3], 61, 78], [x[2], x[3], 76, 89])
  });
  const muscle = group([50, 130, 220, 300, 130, 220]);
  const fat = group([310, 385, 490, 555, 390, 475]);
  const complete = value => Object.values(value).some(item => Number.isFinite(item.value) || Number.isFinite(item.percent));
  return compact({ muscle: complete(muscle) ? muscle : undefined, fat: complete(fat) ? fat : undefined });
}

export function parseInBodyText(input, items = []) {
  const text = String(input || '').replace(/\s+/g, ' ').trim();
  const number = re => {
    const match = re.exec(text);
    return match ? Number(match[1].replace(',', '.')) : null;
  };
  const dateMatch = /Дата\s+(\d{2})\.(\d{2})\.(\d{2,4})/.exec(text);
  if (!dateMatch) throw new Error('Не удалось распознать дату InBody. Используй ручной ввод.');
  const year = dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3];
  const measuredAt = year + '-' + dateMatch[2] + '-' + dateMatch[1];
  const metrics = compact({
    weight: number(/Вес\s+Норма\s+([\d.,]+)\s+кг/i),
    skeletalMuscleMass: number(/Мышцы\s+Норма\s+([\d.,]+)\s+кг/i),
    bodyFatPercent: number(/Жир\s+Норма\s+([\d.,]+)\s*%/i),
    bodyFatMass: number(/Содержание\s+Жира\s+([\d.,]+)\s+кг/i),
    inBodyScore: number(/Оценка\s+InBody\s+([\d.,]+)\s*\/\s*100/i),
    totalBodyWater: number(/Вода\s+([\d.,]+)\s+л/i),
    protein: number(/Белок\s+([\d.,]+)\s+кг/i),
    minerals: number(/Кости\s+([\d.,]+)\s+кг/i),
    visceralFatLevel: number(/Висцеральный\s+жир\s+(?:Ниже\s+нормы|Норма|Выше\s+нормы)\s+([\d.,]+)/i),
    bmi: number(/Индекс\s+массы\s+тела\s+([\d.,]+)/i),
    fatFreeMass: number(/Безжировая\s+масса\s+([\d.,]+)\s+кг/i),
    basalMetabolicRate: number(/Обмен\s+веществ\s+([\d.,]+)\s+ккал/i),
    recommendedCalories: number(/Суточная\s+норма\s+калорий\s+([\d.,]+)\s+ккал/i),
    idealWeight: number(/Идеальный\s+вес\s+([\d.,]+)\s+кг/i)
  });
  const control = /До\s+идеального\s+веса\s+Вес\s+(-?[\d.,]+)\s+кг\s+Жир\s+(-?[\d.,]+)\s+кг\s+Мышцы\s+(-?[\d.,]+)\s+кг/i.exec(text);
  if (control) Object.assign(metrics, { weightControl: numeric(control[1]), fatControl: numeric(control[2]), muscleControl: numeric(control[3]) });
  if (!Number.isFinite(metrics.weight) || !Number.isFinite(metrics.skeletalMuscleMass) || !Number.isFinite(metrics.bodyFatPercent)) {
    throw new Error('PDF распознан не полностью. Проверь файл или используй ручной ввод.');
  }
  const person = /Имя\s+(.{1,80}?)\s+Пол\s+([МЖ])\s+Возраст\s+([\d.,]+)\s+Рост\s+([\d.,]+)\s+см/i.exec(text);
  const context = person ? { subjectName: person[1].trim(), sex: person[2], ageAtMeasurement: numeric(person[3]), heightAtMeasurement: numeric(person[4]) } : {};
  const assessment = re => {
    const match = re.exec(text);
    return match ? match[1].replace(/\s+/g, ' ') : null;
  };
  const readRange = (label, unit) => {
    const re = new RegExp(label + '\\s+[\\d.,]+\\s*' + unit + '\\s*<\\s*([\\d.,]+)\\s+([\\d.,]+)\\s*[–-]\\s*([\\d.,]+)\\s*>\\s*([\\d.,]+)', 'i');
    const match = re.exec(text);
    return match ? { below: numeric(match[1]), normalMin: numeric(match[2]), normalMax: numeric(match[3]), above: numeric(match[4]) } : null;
  };
  const ranges = compact({
    weight: readRange('Вес', 'кг'),
    skeletalMuscleMass: readRange('Мышцы', 'кг'),
    bodyFatPercent: readRange('Жир', '%'),
    totalBodyWater: readRange('Вода', 'л'),
    protein: readRange('Белок', 'кг'),
    minerals: readRange('Кости', 'кг'),
    visceralFatLevel: readRange('Висцеральный\\s+жир(?:\\s+(?:Ниже\\s+нормы|Норма|Выше\\s+нормы))?', ''),
    bmi: readRange('Индекс\\s+массы\\s+тела', ''),
    fatFreeMass: readRange('Безжировая\\s+масса', 'кг')
  });
  const assessments = compact({
    weight: assessment(/Вес\s+(Ниже\s+нормы|Норма|Выше\s+нормы)\s+[\d.,]+\s+кг/i),
    skeletalMuscleMass: assessment(/Мышцы\s+(Ниже\s+нормы|Норма|Выше\s+нормы)\s+[\d.,]+\s+кг/i),
    bodyFatPercent: assessment(/Жир\s+(Ниже\s+нормы|Норма|Выше\s+нормы)\s+[\d.,]+\s*%/i),
    visceralFatLevel: assessment(/Висцеральный\s+жир\s+(Ниже\s+нормы|Норма|Выше\s+нормы)\s+[\d.,]+/i)
  });
  const sourceDetails = {
    format: 'Поддерживаемый одностраничный InBody PDF',
    labels: {
      skeletalMuscleMass: 'Мышцы', bodyFatPercent: 'Жир', minerals: 'Кости',
      basalMetabolicRate: 'Обмен веществ', recommendedCalories: 'Суточная норма калорий',
      muscleSegments: 'Содержание мышц', fatSegments: 'Содержание Жира'
    },
    units: {
      weight: 'кг', skeletalMuscleMass: 'кг', bodyFatMass: 'кг', bodyFatPercent: '%',
      totalBodyWater: 'л', protein: 'кг', minerals: 'кг', fatFreeMass: 'кг',
      basalMetabolicRate: 'ккал', recommendedCalories: 'ккал', idealWeight: 'кг'
    },
    ranges,
    assessments
  };
  return { measuredAt, metrics, context, segments: parseSegments(items), sourceDetails };
}
