export function getRecommendedCalories(age, gender) {
  if (!age) return '';
  const a = Number(age);
  const isFemale = gender === 'Female';

  if (a >= 2 && a <= 3) return 1200; // 1000-1400
  if (a >= 4 && a <= 8) return isFemale ? 1500 : 1600; // F: 1200-1800, M: 1200-2000
  if (a >= 9 && a <= 13) return isFemale ? 1800 : 2100; // F: 1400-2200, M: 1600-2600
  if (a >= 14 && a <= 18) return isFemale ? 2100 : 2600; // F: 1800-2400, M: 2000-3200
  if (a >= 19 && a <= 30) return isFemale ? 2100 : 2700; // F: 1800-2400, M: 2400-3000
  if (a >= 31 && a <= 50) return isFemale ? 2000 : 2600; // F: 1800-2200, M: 2200-3000
  if (a >= 51) return isFemale ? 1900 : 2400; // F: 1600-2200, M: 2000-2800
  
  // default
  return 2000;
}

export function getRecommendedWater(age, gender) {
  if (!age) return '';
  const a = Number(age);
  const isFemale = gender === 'Female';

  if (a >= 1 && a <= 3) return 1.3;
  if (a >= 4 && a <= 8) return 1.7;
  if (a >= 9 && a <= 13) return isFemale ? 2.1 : 2.4;
  if (a >= 14 && a <= 18) return isFemale ? 2.3 : 3.3;
  if (a >= 19 && a <= 50) return isFemale ? 2.7 : 3.7;
  if (a >= 51) return isFemale ? 2.5 : 3.0;
  
  // default
  return 2.5;
}

export function getRecommendedSleep(age) {
  if (!age) return '';
  const a = Number(age);

  if (a <= 2) return 12;
  if (a >= 3 && a <= 5) return 11;
  if (a >= 6 && a <= 13) return 10;
  if (a >= 14 && a <= 17) return 9;
  if (a >= 18 && a <= 64) return 8;
  if (a >= 65) return 7.5;
  
  return 8;
}
