// SPDX-License-Identifier: AGPL-3.0-only
'use strict';

const labels = {
  cube: '玩魔方', hotpot: '涮火锅', cat: '撸猫', yawning: '打哈欠',
  'look-around': '东张西望', snack: '吃零食', 'ice-cream': '吃冰淇淋',
  watermelon: '吃西瓜', violin: '拉小提琴', flute: '吹笛子',
  'card-magic': '扑克魔术', dance: '跳宅舞', balloon: '吹气球',
  mirror: '照镜子', stretch: '伸懒腰', game: '玩游戏',
  'toy-car': '玩玩具汽车', fan: '摇扇纳凉', humming: '哼歌', gift: '拆礼物',
};

module.exports = function buildAnimationMenu(theme, controls) {
  const entries = theme && Array.isArray(theme.manualAnimations)
    ? theme.manualAnimations
    : (theme && Array.isArray(theme.idleAnimations) ? theme.idleAnimations : []);
  const seen = new Set();
  const submenu = [];
  for (const entry of entries) {
    if (!entry || typeof entry.file !== 'string'
        || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(entry.file)
        || !Number.isFinite(entry.duration) || entry.duration <= 0
        || seen.has(entry.file)) continue;
    seen.add(entry.file);
    const file = entry.file;
    const duration = Math.min(entry.duration, 60000);
    const stem = file.replace(/\.[^.]+$/, '');
    let destination = submenu;
    if (Array.isArray(entry.category)) {
      const categories = entry.category.filter(x => typeof x === 'string' && x.trim()).slice(0, 2);
      for (const category of categories) {
        const label = category.trim().slice(0, 64);
        let group = destination.find(item => item.submenu && item.label === label);
        if (!group) { group = {label, submenu: []}; destination.push(group); }
        destination = group.submenu;
      }
    }
    destination.push({
      label: typeof entry.label === 'string' && entry.label.trim()
        ? entry.label.trim().slice(0, 80) : (labels[stem] || stem),
      click: () => {
        if (typeof controls.cancelRoam === 'function') controls.cancelRoam();
        controls.play(file, duration);
      },
    });
  }
  if (!submenu.length) return null;
  submenu.push({type: 'separator'}, {label: '停止播放，恢复自动状态', click: () => controls.stop()});
  return {label: '播放动画', enabled: controls.disabled !== true, submenu};
};
