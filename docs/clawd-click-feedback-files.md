# 桌宠点击反馈：文件位置与修改说明

整理日期：2026-11-23。适用于当前 Clawd 动画版适配项目（主题 1.6.0）。

## 先找你想修改的效果

- **点击后身体弹一下、挤压回弹**：改 [clawd-feedback-renderer.js](../integrations/clawd-feedback-renderer.js)。
- **点击后挥手、害羞或生气**：先看 [theme.json](../themes/dsh-whale-chan/theme.json) 的 `reactions` 配置，再看点击判断与播放调度。
- **长按挠痒、Shift＋单击受惊**：看 [patch-clawd-gestures.py](../scripts/patch-clawd-gestures.py)。
- **点击声音**：看 [clawd-extra-media.js](../integrations/clawd-extra-media.js)。

本机维护项目目录为 `/Users/zigguo/me/claw-desk-dsh`；学习仓库 `/Users/zigguo/me/learn` 也保留了对应源码副本。下文的相对路径均以项目根目录为起点。

## 文件索引

| 文件 | 负责什么 | 常见修改 |
| --- | --- | --- |
| [integrations/clawd-feedback-renderer.js](../integrations/clawd-feedback-renderer.js) | 在 `pet-motion-stage` 上执行缩放、旋转和回弹 | Q 弹强度、时长、缓动、碰撞挤压方向 |
| [scripts/patch-clawd-click.py](../scripts/patch-clawd-click.py) | 为原版输入处理器补上单击后的左右动作 | 单击后选择哪一侧的回应 |
| [scripts/patch-clawd-gestures.py](../scripts/patch-clawd-gestures.py) | 注入按下、松手、长按、修饰键与拖动判断 | 700 ms 长按、Shift 单击、弹弓与取消条件 |
| [integrations/clawd-physics-runtime.js](../integrations/clawd-physics-runtime.js) | 将手势转成 `tap`、`tickle`、`startle` 等反馈，管理甩抛 | 手势反馈、飞行与碰撞触发 |
| [integrations/clawd-interaction-main.js](../integrations/clawd-interaction-main.js) | 接收可信输入 IPC，检查模式，连接动画、视觉与声音 | 工作/空闲限制、挠痒和受惊素材、反馈分发 |
| [integrations/clawd-extra-media.js](../integrations/clawd-extra-media.js) | 点击声音选择、音量、节流、可选碰撞音和任务音 | 默认声音、音量系数和试听入口 |
| [integrations/clawd-manual-playback.js](../integrations/clawd-manual-playback.js) | 等素材加载完成后，按完整时长播放一次 | 播放完成恢复、切换和加载失败处理 |
| [themes/dsh-whale-chan/theme.json](../themes/dsh-whale-chan/theme.json) | 动画映射、时长与交互开关 | `reactions`、`petInteractions`、`manualAnimations` |
| [scripts/patch-clawd-interactions.py](../scripts/patch-clawd-interactions.py) | 把主进程、输入桥和反馈脚本接入原版应用 | 新模块、预加载桥、打包资源接线 |
| [scripts/install-clawd-animation-menu.py](../scripts/install-clawd-animation-menu.py) | 构建并本机签名独立动画版 | 将修改后的适配文件打进应用 ASAR |

## 点击后实际发生什么

### 立即触碰反馈：Q 弹和声音

```text
输入窗口收到按下、松手
→ patch-clawd-gestures.py 发出 tap 手势
→ clawd-interaction-main.js 接收 clawd-pet-gesture
→ clawd-physics-runtime.js 的 tap() 生成反馈
→ 主进程发送 clawd-pet-feedback，并调用 petExtraMedia.click()
→ clawd-feedback-renderer.js 执行 Q 弹
→ clawd-extra-media.js 通过原播放通道发声
```

### 表情动画：挥手、害羞等

```text
原版 hit-renderer.js 累积点击次数和首次点击位置
→ 单击补丁补上左右动作；双击、四连击沿用原版判断
→ 通过点击动画 IPC 请求播放
→ 安装器将点击请求接到 clawd-manual-playback.js
→ 素材提交成功后开始计算完整播放时长
→ 播完恢复最新状态
```

Q 弹时长与表情素材时长分别控制。Q 弹结束后，约 10 秒的表情动画仍可继续播放。

## 点击动画与素材对应

在 `theme.json` 中搜索 `"reactions"`：

| 配置键 | 当前素材 | 作用 |
| --- | --- | --- |
| `clickLeft` | [wave.webp](../themes/dsh-whale-chan/assets/wave.webp) | 单击左侧：挥手 |
| `clickRight` | [shy.webp](../themes/dsh-whale-chan/assets/shy.webp) | 单击右侧：害羞 |
| `annoyed` | [annoyed.webp](../themes/dsh-whale-chan/assets/annoyed.webp) | 双击时有 50% 概率触发生气，其余回到首次点击侧的动作 |
| `double.files` | [happy.webp](../themes/dsh-whale-chan/assets/happy.webp) | 当前原版逻辑用于四连击；配置键名虽为 `double`，不要据此误认为它只管双击 |
| `drag` | [drag.webp](../themes/dsh-whale-chan/assets/drag.webp) | 拖拽及飞行悬空画面 |

上述点击动画当前配置时长为 `10042` ms。单击会等待 400 ms，以便判断后续连续点击。

挠痒和受惊素材由 `clawd-interaction-main.js` 的 `reaction` 回调选择，并从 `manualAnimations` 查找完整时长：

- 挠痒：[dianji-huiying-naoyang-gegexiao.webp](../themes/dsh-whale-chan/assets/dianji-huiying-naoyang-gegexiao.webp)。
- 受惊：[beixiayitiao-zhamao.webp](../themes/dsh-whale-chan/assets/beixiayitiao-zhamao.webp)。

点击表情动画有空闲、免打扰及正在回应等门限。工作时的轻 Q 弹和点击音，与这些完整表情动画的门限分别处理。

## 修改 Q 弹手感

打开 `integrations/clawd-feedback-renderer.js`，重点看以下值：

| 当前值或代码 | 含义 |
| --- | --- |
| `strength` 默认 `.12` | 普通点击的挤压强度；增大后变形更明显 |
| 普通反馈 `duration: 260` | 普通点击回弹时长，单位毫秒 |
| 受惊反馈 `duration: 360` | 受惊时的回弹时长 |
| `easing: 'ease-out'` | 回弹缓动 |
| `transformOrigin: '50% 85%'` | 点击与碰撞反馈的变形支点 |
| `p.axis === 'x'` | 碰撞时区分水平和竖直挤压 |

脚本使用独立的 `scale`、`rotate`，保留原有朝向和移动的 `transform`。调整时应保留这种组合方式。

## 修改手势或声音

- 长按阈值：在 `patch-clawd-gestures.py` 中找 `700`。
- Shift 单击受惊：在同文件中找 `e.shiftKey` 和 `petGesture("startle")`。
- 普通轻触反馈：在 `clawd-physics-runtime.js` 中找 `function tap()`。
- 点击声音与音量：在 `clawd-extra-media.js` 中找 `function click()` 和 `function sound()`；当前为主音量乘以 `0.5`，100 ms 连点节流。
- 运行时切换声音：右键 → 播放动画 → 扩展素材 → 点击声音，可选原版嘎嘎、桌面版轻点、小鸭 Ya1、Ya2。
- 声音资源：原版嘎嘎为 [dsh-click-duck.wav](../integrations/dsh-click-duck.wav)，新增声音位于 [merzlin-media](../integrations/merzlin-media/catalog.json) 中列出的路径。

全局静音、免打扰和 `petInteractions.clickSound: false` 会抑制点击发声；碰撞音与任务提示音默认关闭，另有独立开关。

## 修改后怎样生效

仓库采用受控补丁适配 Clawd 1.4.0。实际运行的输入处理器位于动画版应用的 `Contents/Resources/app.asar` 内，路径为 `src/hit-renderer.js`；Q 弹脚本在同一 ASAR 的 `src/clawd-feedback-renderer.js`。

`tests/fixtures/clawd-hit-1.4.0.js` 是原版布局参考与测试输入。修改点击、多击规则时，应调整正式补丁并重新构建；单独改测试 fixture 不会改变运行中的桌宠。

源码改好后，先运行相关回归：

```sh
node --test tests/clawd-click.test.cjs tests/clawd-gestures.test.cjs \
  tests/clawd-feedback-renderer.test.cjs tests/clawd-interaction-main.test.cjs
```

然后构建到一个尚不存在的新应用路径：

```sh
python3 scripts/install-clawd-animation-menu.py \
  --target "$HOME/Applications/Clawd on Desk 点击反馈新版.app"
```

若改了主题配置，还需要重新安装主题：

```sh
python3 scripts/install-dsh-theme.py
```

退出旧动画版，再打开新构建的应用。构建脚本会拒绝覆盖已存在的目标，原版应用仍保留。

更多行为说明见 [点击回应](clawd-click-reactions.md)、[物理与点击反馈](clawd-physics-and-feedback.md) 和 [音效来源](clawd-audio.md)。
