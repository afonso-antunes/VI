export function preprocess(raw) {
  const num = v => (v === "" || v == null) ? NaN : +v;
  const intish = v => {
    const n = +v;
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  };

  const rows = raw.map(d => ({
    Rank: +d.Rank,
    Name: (d.Name || '').trim(),
    Platform: (d.Platform || '').trim(),
    Genre: (d.Genre || '').trim(),
    Publisher: (d.Publisher || '').trim(),
    NA_Sales: num(d.NA_Sales),
    EU_Sales: num(d.EU_Sales),
    JP_Sales: num(d.JP_Sales),
    Other_Sales: num(d.Other_Sales),
    Global_Sales: num(d.Global_Sales),
    Decade: (d.Decade).trim(),         
    Critic_Score: num(d.Critic_Score),
    User_Score: num(d.User_Score),
  }))
  .filter(d => Number.isFinite(d.Global_Sales) && d.Global_Sales > 0);

  const uniq = arr => [...new Set(arr)].sort();
  //const uniqNum = arr => [...new Set(arr.filter(Number.isFinite))].sort((a,b) => a - b);


  const lookups = {
    genres:     uniq(rows.map(d => d.Genre)),
    publishers: uniq(rows.map(d => d.Publisher)),
    regions:    ['North America','Europe', 'Japan','Other'],
    platforms:  uniq(rows.map(d => d.Platform)),
    decades:    uniq(rows.map(d => d.Decade)), 
  };

  return { raw: rows, lookups };
}
