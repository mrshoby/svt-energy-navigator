window.SVTPriceProfiles = (() => {
  const pzuTypical = [0.31,0.30,0.29,0.28,0.29,0.34,0.42,0.88,0.92,0.85,0.72,0.55,0.48,0.50,0.52,0.60,0.72,0.89,0.91,0.82,0.70,0.58,0.45,0.36];
  function priceForHour(hour) { return pzuTypical[Math.max(0, Math.min(23, Number(hour)||0))]; }
  return { pzuTypical, priceForHour };
})();