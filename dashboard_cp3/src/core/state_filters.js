export function initialFilters(pre) {
  const [minRank, maxRank] = extentNum(pre.raw.map(d => d.Rank));
  const [minCrit, maxCrit] = extentNum(pre.raw.map(d => d.Critic_Score).filter(Number.isFinite));
  const [minUser, maxUser] = extentNum(pre.raw.map(d => d.User_Score).filter(Number.isFinite));
  return {
    genres: new Set(),
    publishers: new Set(),
    regions: new Set(),       
    platforms: new Set(),
    decades: new Set(),
    rank: [minRank ?? 1, maxRank ?? 99999],
    critic: [minCrit ?? 0, maxCrit ?? 100],
    user: [minUser ?? 0, maxUser ?? 10],
    search: ""
  };
}

const num = v => (v===""||v===null||v===undefined) ? NaN : +v;
const str = v => (v ?? "").toString().trim();

function includesIfSet(set, val) {
  return set.size === 0 || set.has(val);
}

export function applyFilters(rows, f) {
  return rows.filter(d => {
    if (!includesIfSet(f.genres, d.Genre)) return false;
    if (!includesIfSet(f.publishers, d.Publisher)) return false;
    if (!includesIfSet(f.platforms, d.Platform)) return false;
    if (!includesIfSet(f.decades, d.Decade)) return false;
    if (!includesIfSet(f.regions, 'North America') && d.NA_Sales <= 0) return false;
    if (!includesIfSet(f.regions, 'Europe') && d.EU_Sales <= 0) return false;
    if (!includesIfSet(f.regions, 'Japan') && d.JP_Sales <= 0) return false;
    if (!includesIfSet(f.regions, 'Other') && d.Other_Sales <= 0) return false;
    if (!(d.Rank >= f.rank[0] && d.Rank <= f.rank[1])) return false;
    if (Number.isFinite(d.Critic_Score) && !(d.Critic_Score >= f.critic[0] && d.Critic_Score <= f.critic[1])) return false;
    if (Number.isFinite(d.User_Score) && !(d.User_Score >= f.user[0] && d.User_Score <= f.user[1])) return false;
    if (f.search && !str(d.Name).toLowerCase().includes(f.search.toLowerCase())) return false;
    return true;
  });
}

export function filtersHash(f) {
  return JSON.stringify({
    genres: [...f.genres], pubs: [...f.publishers], regs: [...f.regions], plats: [...f.platforms], decs: [...f.decades],
    rank: f.rank, critic: f.critic, user: f.user, s: f.search
  });
}

function extentNum(arr) {
  const xs = arr.map(num).filter(Number.isFinite);
  if (!xs.length) return [undefined, undefined];
  return [Math.min(...xs), Math.max(...xs)];
}
