// SPDX-License-Identifier: AGPL-3.0-only
'use strict';
const providers = {
  claudeQuota: 'Claude', codexQuota: 'Codex', codexSparkQuota: 'Codex Spark',
  kimiQuota: 'Kimi', antigravityQuota: 'Antigravity',
};
// Six actual assets; the lowest tier also covers exhausted quota.
const tiers = [
  [95, 'qian-dai-man-yi.webp'], [80, 'jin-dai-ding-dang.webp'],
  [70, 'qian-dai-ru-chang.webp'], [50, 'shu-jin-zhou-mei.webp'],
  [25, 'dai-kong-ru-xi.webp'], [0, 'fen-wen-bu-sheng.webp'],
];
function selectTier(remaining) {
  if (!Number.isFinite(remaining) || remaining < 0 || remaining > 100) return null;
  return tiers.find(([minimum]) => remaining >= minimum)[1];
}
function rows(snapshot, now = Date.now()) {
  const result = [];
  for (const source of snapshot?.accountQuota || []) {
    for (const [key, name] of Object.entries(providers)) {
      const provider = source[key];
      for (const [field, bucket] of Object.entries(provider?.group || {})) {
        // New services can change the actual window despite legacy field names.
        const minutes = bucket.windowMinutes;
        if (Number.isFinite(minutes) ? minutes !== 300 : !/FiveHour$/.test(field)) continue;
        if (!Number.isFinite(bucket.usedPercent) || bucket.usedPercent < 0 || bucket.usedPercent > 100) continue;
        const expired = bucket.expired === true || (Number.isFinite(bucket.resetAt) && bucket.resetAt <= now);
        const remaining = 100 - bucket.usedPercent;
        result.push({id:JSON.stringify([source.sourceKey ?? source.host ?? null,key,field]),
          label:`${source.host || '本机'} · ${name}${key === 'antigravityQuota' ? ` · ${field}` : ''}`,
          remaining, expired, resetAt:bucket.resetAt, lastSeenAt:bucket.lastSeenAt || provider.lastSeenAt || provider.updatedAt,
          file:selectTier(remaining)});
      }
    }
  }
  return result;
}
function buildMenu(theme, controls) {
  const entries = theme?.manualAnimations || [];
  if (!tiers.every(([,file])=>entries.some(entry=>entry.file===file))) return null;
  const items = rows(controls.snapshot());
  return {label:'查看5小时余额', enabled:!controls.disabled, submenu: items.length ? items.map(row=>({
    label:`${row.label}：${row.expired ? '已重置，等待更新' : `剩余 ${Number(row.remaining.toFixed(1))}%${row.remaining <= 5 ? '（即将用尽）' : ''}`}`,
    submenu:[
      {label:row.lastSeenAt ? `上次确认：${new Date(row.lastSeenAt).toLocaleString('zh-CN')}` : '尚无确认时间',enabled:false},
      {label:'播放当前余额动画',enabled:!row.expired,click:()=>{
        // Re-read on selection so an open menu cannot replay a pre-reset balance.
        const current=rows(controls.snapshot()).find(item=>item.id===row.id);
        if (!current || current.expired) return;
        const asset=entries.find(entry=>entry.file===current.file);
        if (asset && Number.isFinite(asset.duration) && asset.duration>0) {
          controls.play(asset.file,asset.duration);
          if (controls.notify) controls.notify(current,asset.duration);
        }
      }},
    ],
  })) : [{label:'暂无5小时额度数据，请先在对应服务中同步额度',enabled:false}]};
}
module.exports={selectTier,rows,buildMenu};

// Crossings refer to remaining quota decreasing, not to percentage used.
function createWatcher(controls) {
  const previous = new Map();
  const pending = new Map();
  const thresholds = [95,80,70,50,25,5];
  let nextPollAt = 0;
  return function poll() {
    const now = controls.now ? controls.now() : Date.now();
    if (now < nextPollAt) return;
    nextPollAt = now + 1000;
    const theme = controls.theme();
    const assets = theme?.manualAnimations || [];
    if (!tiers.every(([,file])=>assets.some(a=>a.file===file))) {
      previous.clear(); pending.clear(); return;
    }
    const current = rows(controls.snapshot(),now);
    const live = new Set();
    for (const row of current) {
      if (row.expired) {previous.delete(row.id);pending.delete(row.id);continue;}
      live.add(row.id);
      const before = previous.get(row.id);
      if (before !== undefined && row.remaining > before) pending.delete(row.id);
      if (before !== undefined && row.remaining < before) {
        const crossed=thresholds.filter(t=>before>t && row.remaining<=t);
        if (crossed.length) {
          // A large drop plays the most urgent crossed threshold once.
          const threshold=crossed[crossed.length-1];
          pending.set(row.id,{file:tiers[thresholds.indexOf(threshold)][1]});
        }
      }
      previous.set(row.id,row.remaining);
    }
    for (const id of previous.keys()) if (!live.has(id)) {previous.delete(id);pending.delete(id);}
    if (controls.blocked()) return;
    const event=pending.entries().next().value;
    if (!event) return;
    pending.delete(event[0]);
    const asset=assets.find(a=>a.file===event[1].file);
    if (asset && Number.isFinite(asset.duration) && asset.duration>0) {
      controls.play(asset.file,asset.duration);
      const row=current.find(row=>row.id===event[0]);
      if (row && controls.notify) controls.notify(row,asset.duration);
    }
  };
}
module.exports.createWatcher=createWatcher;
