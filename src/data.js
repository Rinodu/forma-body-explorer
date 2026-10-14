export const demo = Object.freeze({ weight: 75, height: 175, fat: 20, muscle: 32, shape: 'neutral', chest: '', waist: '', hip: '' });

export function validateBody(input) {
  const ranges = { weight: [25, 350], height: [120, 230], fat: [3, 65], muscle: [5, 100], chest: [50, 200], waist: [40, 220], hip: [50, 220] };
  const body = { shape: ['neutral', 'masculine', 'feminine'].includes(input.shape) ? input.shape : 'neutral' };
  for (const [key, [min, max]] of Object.entries(ranges)) {
    if ((input[key] === '' || input[key] == null) && !['weight', 'height', 'fat'].includes(key)) { body[key] = null; continue; }
    const value = Number(input[key]);
    if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${{ weight: 'Berat', height: 'Tinggi', fat: 'Lemak', muscle: 'Otot rangka', chest: 'Dada', waist: 'Pinggang', hip: 'Pinggul' }[key]} harus antara ${min}–${max}.`);
    body[key] = value;
  }
  const lean = body.weight * (1 - body.fat / 100);
  if (body.muscle != null && body.muscle > lean) throw new Error('Otot rangka tidak boleh melebihi massa bebas lemak. Periksa angka dan satuannya.');
  return body;
}

export function composition(body) {
  const fatMass = body.weight * body.fat / 100;
  return { fatMass, leanMass: body.weight - fatMass, bmi: body.weight / (body.height / 100) ** 2 };
}

// OCR labels may precede or follow a number; never substitute missing fields with demo data.
export function parseReport(text) {
  const normalized = text.replace(/(\d),(\d)/g, '$1.$2').replace(/[|]/g, '1');
  const lines = normalized.split(/\n/).map(line => line.trim()).filter(Boolean);
  const result = {};
  const num = '(\\d{1,3}(?:\\.\\d{1,2})?)';
  function extract(labels, unit, min, max) {
    for (let i = 0; i < lines.length; i++) {
      if (!labels.test(lines[i])) continue;
      const nearby = [lines[i], lines[i - 1] || '', lines[i + 1] || ''];
      for (const line of nearby) {
        const match = line.match(new RegExp(`${num}\\s*${unit}`, 'i'));
        if (match && +match[1] >= min && +match[1] <= max) return +match[1];
      }
    }
  }
  result.weight = extract(/^(?:weight|berat(?: badan)?)\b/i, 'kg', 25, 350);
  // Some scale screenshots show only a large weight above the BMI section.
  if (result.weight == null) {
    const heading = lines.slice(0, Math.max(10, lines.findIndex(l => /body composition/i.test(l)))).join('\n');
    const match = heading.match(new RegExp(`${num}\\s*kg`, 'i'));
    if (match && +match[1] >= 25 && +match[1] <= 350) result.weight = +match[1];
  }
  result.fat = extract(/body fat percentage|fat percentage|persentase lemak|lemak tubuh|^body fat$|^fat\s*%/i, '%', 3, 65);
  result.muscle = extract(/skeletal muscle mass|otot rangka/i, 'kg', 5, 100);
  result.height = extract(/height|tinggi/i, 'cm', 120, 230);
  const bmi = extract(/^BMI\b/i, '(?:BMI|$)', 10, 70);
  if (!result.height && result.weight && bmi) {
    const height = Math.round(Math.sqrt(result.weight / bmi) * 1000) / 10;
    if (height >= 120 && height <= 230) { result.height = height; result.heightDerived = true; }
  }
  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== undefined));
}

export function dimensions(body) {
  const height = body.height / 100;
  const { bmi } = composition(body);
  const fat = (body.fat - 20) / 100;
  const bulk = Math.sqrt(bmi / 24);
  const muscle = body.muscle == null ? 1 : Math.max(.85, Math.min(1.2, Math.sqrt(body.muscle / (body.weight * .4))));
  // shortcut: heuristic adult silhouettes, replace with a validated statistical body model before claiming individual accuracy.
  const chest = body.chest ? body.chest / 100 : height * .53 * bulk * (body.shape === 'masculine' ? 1.04 : 1);
  const waist = body.waist ? body.waist / 100 : height * .43 * bulk * (1 + fat * 1.5);
  const hip = body.hip ? body.hip / 100 : height * .54 * bulk * (body.shape === 'feminine' ? 1.09 : 1);
  return { height, chest, waist, hip, bulk, muscle };
}
