# claw-desk-dsh

将 [dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 的鲸鱼娘透明动画适配到 [Clawd on Desk](https://github.com/rullerzhou-afk/clawd-on-desk)，提供完整点播、更多随机小动作、工作联动和额度提醒。

这是社区适配项目，**不是上游官方版本**。感谢两个原项目及全部贡献者，也感谢角色作者「上善无形」和「ZipZipPipe」。完整来源、署名和许可见 [致谢](ACKNOWLEDGEMENTS.md) 与 [LICENSE](LICENSE)。动画素材仅限非商业使用。

## 当前功能

- 106 段透明 WebP 动画，保留源片 24 FPS 时间轴和完整时长。
- 右键分层点播：9 个主分类、15 个末级分组；播完恢复最新任务状态。
- 71 段自动小动作，按日常、玩耍、音乐、美食、节日分类加权，不连续重复。
- 没有 AI 工作约 20 秒后开始随机动作；普通鼠标移动不重置待机时间。
- 单击角色左半边挥手、右半边害羞；增加点击 Q 弹和轻音效，长按挠痒、Shift＋单击受惊。
- 空闲时快速拖拽甩抛、重力、屏幕四边反弹、地面摩擦；双击按住第二下拖动可反向弹弓。
- 5 小时剩余额度下降跨过 **95%、80%、70%、50%、25%、5%** 时自动提醒；跨多档只播最低档，启动不补播历史档位。
- 头顶气泡显示实际额度、恢复时间、确认时间，或当前真实工作状态/工具类别；鼠标穿透、不抢焦点。
- 移动与素材对齐：先原地准备，再缓起步、中段匀速、收步后停住；等画面加载完成才移动。
- 保留 Clawd 的会话集成、工作状态、漫游等能力，已修正角色跑步方向。

**当前安装脚本仅支持 macOS 上的 Clawd on Desk 1.4.0。** Windows 动画版安装包尚未提供；不要把这里的 `.py` 安装脚本当作 Windows 安装器。聊天、语音、多宠物尚未实现；物理交互限定到当前屏幕边界反弹。

## 安装（macOS）

1. 从 [Clawd on Desk 官方 Releases](https://github.com/rullerzhou-afk/clawd-on-desk/releases/tag/v1.4.0) 获取原版 **1.4.0**，放到 `/Applications/Clawd on Desk.app`。先完成原版初始化，然后退出所有 Clawd 实例。
2. 准备 Python 3.9+；以下安装步骤只使用标准库。Node.js 18+ 用于运行测试。
3. 克隆本仓库并安装主题、构建独立动画版：

```sh
git clone https://github.com/litchi0-0/claw-desk-dsh.git
cd claw-desk-dsh
python3 scripts/install-dsh-theme.py
python3 scripts/install-clawd-animation-menu.py
```

4. 启动 `~/Applications/Clawd on Desk 动画版.app`，在主题设置里选择 **DSH 鲸鱼娘**。

脚本不覆盖原版。动画版会在本机重新签名，使用不同的应用标识，但与原版共享 `clawd-on-desk` 配置目录，因此**一次只运行一版**。安装主题前会备份同名旧主题，不读取或上传账号密钥。

动画已随仓库提供，安装无需重编码。此仓库含约 282 MB 素材，首次克隆需要一些时间。`sources.json` 记录每个文件的来源和校验信息。

## 更新与回退

先退出桌宠，再 `git pull`、重新安装主题。应用构建脚本拒绝覆盖已有目标；更新时可先把旧动画版移到另一个位置留作备份，或用以下参数构建到一个**不存在**的新路径：

```sh
python3 scripts/install-clawd-animation-menu.py \
  --source "/Applications/Clawd on Desk.app" \
  --target "$HOME/Applications/Clawd on Desk 动画版-新版.app"
```

回退：退出动画版，再启动原版；需要恢复主题时使用主题目录旁的备份。上游应用升级后这些补丁不会自动继承；安装器会拒绝适配非 1.4.0 版本。

## 使用与配置

| 操作 | 效果 |
| --- | --- |
| 右键 → 播放动画 | 按分类点播完整动画 |
| 右键 → 查看5小时余额 | 查看各服务的真实剩余值与确认时间，可播放当前档动画 |
| 单击身体左/右半边 | 等约 0.4 秒区分多击后，播放挥手/害羞 |
| 快速拖动后松手（AI 空闲时） | 甩抛、重力、屏幕边缘反弹与摩擦停下 |
| 双击按住第二下拖动（AI 空闲时） | 弹性拉伸，松手反向弹出 |
| 长按 700 ms / Shift＋单击（AI 空闲时） | 挠痒 / 受惊 |
| 没有 AI 工作 | 约 20 秒后随机小动作，播完再间隔约 20 秒 |
| 额度向下跨阈值 | 自动播放余额动画并显示信息气泡 |

额度来自 Clawd 已采集的数据，报告到达后才能触发；不会主动调用供应商接口。需要在原版 Clawd 中配置相应会话/额度采集。没有或过期的数据不会伪装为满额。动画、右键菜单、拖拽与免打扰的优先级详见下面文档。

`themes/dsh-whale-chan/theme.json` 的扩展字段：

- `idleTrigger: "work"`：无工作计时。
- `autoIdleCategoryWeights`：分类权重（默认日常30、玩耍25、音乐15、美食20、节日10）。
- `infoBubbles: true`：显示工作/额度气泡，设为 `false` 可关闭。

修改后重新安装主题并重启。节日动作当前全年随机出现；不按节日日期自动识别。普通随机池不混入工作、余额、拖拽或点击动作。

## 开发与验证

```sh
node --test tests/clawd-*.test.cjs
```

当前 66 项测试，覆盖真实修补后的待机循环、点播生命周期、交互优先级、额度边界、分类抽取和气泡行为。未安装本地 macOS 动画版时，依赖已安装 ASAR 的一项集成检查会跳过。

仅在修改素材或编码时运行媒体检查：

```sh
python3 -m venv .venv
.venv/bin/pip install Pillow imageio-ffmpeg
.venv/bin/python -m unittest discover -s tests -p 'test_dsh_theme.py'
```

重建透明 WebP：

```sh
.venv/bin/python scripts/build-dsh-theme.py
```

构建脚本固定上游版本并核对 Git blob，增量复用已校验文件；通常安装不需要执行。真实 macOS 气泡已通过原生窗口截图检查。未逐段人工观察全部 71 个自动动作，未验证 Windows/Linux 运行效果。

## 文档

- [甩抛、弹弓与更多点击反馈](docs/clawd-physics-and-feedback.md)

- [移动动画与位移同步、逐段采样对比](docs/clawd-roam-motion.md)

- [自动动作与头顶气泡](docs/clawd-auto-actions-and-bubbles.md)
- [5 小时额度阈值](docs/clawd-quota-animation.md)
- [点击回应](docs/clawd-click-reactions.md)
- [按工作计时的待机](docs/clawd-work-idle.md)
- [全量动画目录](docs/dsh-animation-catalog.md)
- [右键点播与播放优先级](docs/clawd-animation-menu.md)
- [素材转换、来源与历史验证](docs/dsh-pet-adaptation.md)
- [适配差异核查](docs/dsh-adaptation-audit.md)
- [致谢与许可证](ACKNOWLEDGEMENTS.md)

## 原项目与许可

感谢 **[Clawd on Desk](https://github.com/rullerzhou-afk/clawd-on-desk)** 提供桌宠应用与会话状态基础，感谢 **[dsh-pet](https://github.com/PC2005-cloud/dsh-pet)** 提供动画素材和交互设计参考。请优先到原项目了解完整能力，并尊重上游作者的维护工作。

Clawd 派生适配代码遵守 AGPL-3.0，dsh-pet 程序代码为 MIT；**鲸鱼娘形象和对应动画素材遵守 CC BY-NC-SA 4.0，不能商用**。本仓库转换 WebP 不改变原素材限制。具体署名、来源版本和条款见 [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md)、[LICENSE](LICENSE) 和 [licenses/](licenses/)。
