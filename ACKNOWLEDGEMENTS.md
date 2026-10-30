# 致谢与来源

本项目是把 dsh-pet 的鲸鱼娘动画与部分交互适配到 Clawd on Desk 的社区扩展，不是从零开发的桌宠程序，也不是两个上游项目的官方版本。

## Clawd on Desk

感谢 [rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk) 及其维护者、贡献者，提供桌面透明窗口、AI 会话状态、额度采集、拖拽、漫游、菜单、主题与通知等基础能力。

- 当前补丁适配原版 **1.4.0**，安装时校验版本与 ASAR 完整性。
- 测试中的 `clawd-tick-1.4.0.js`、`clawd-click-1.4.0.js`、`clawd-roam-1.4.0.js`、`clawd-hit-1.4.0.js` 来源于该版本代码；本项目的修改日期和目的由 Git 提交与功能文档记录。
- 原项目代码及派生适配遵守 **GNU AGPL v3**；完整条款见 [licenses/AGPL-3.0.txt](licenses/AGPL-3.0.txt)。
- 本仓库提供补丁、适配源码与测试，不包含原版 `.app`、Electron 二进制或个人应用数据。原版请从上游官方渠道获取。

## dsh-pet

感谢 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 及其维护者、贡献者，提供 106 段透明动画、分类与桌宠交互设计参考。

- 动画固定来源提交：`71ed01b2010f1a55a4442763d70bcb79d5fadd68`。
- 1.5.3 起的点击音效来自同项目 `34cf7ec4dd1ca99a9a9ac5bcb4571d887862e226` 的 `dsh-pet/assets/sound/click-duck.wav`，按原字节复制；没有为其他动画生成或冒充上游配音。来源、Git blob 与 SHA-256 见 [音效记录](integrations/dsh-click-duck.source.json)，许可与素材限制继续保留上游声明。
- 原文件名、Git blob SHA、源文件 SHA-256、输出 WebP SHA-256、编码参数均保留在主题 `catalog.json` 与 `sources.json`。
- 本项目将动画转换为透明 WebP，保留源片 24 FPS 时间轴、原片时长，调整角色布局并接入 Clawd 状态及菜单。
- dsh-pet 的**程序代码**为 MIT，原条款与署名保留于 [licenses/dsh-pet-MIT.txt](licenses/dsh-pet-MIT.txt)。这一许可不覆盖角色形象的商业使用。

## MerZlin 独立桌面版与新增素材

感谢 [MerZlin/dsh-pet-indesktop](https://github.com/MerZlin/dsh-pet-indesktop) 的功能实现与资源整理。本次只读取功能、素材清单及所需文件，没有安装或运行该应用。

- 固定来源：`34d810b1eadd98d00e7cb9b3b51428a45b5bf03e`；新增 24 张 `assets/big_blue_fat_fish` 静态表情和 6 段 `assets/sounds` 音效，均按原字节复制。
- 每项源路径、Git blob、SHA-256 和大小见 [新增素材记录](integrations/merzlin-media/catalog.json)；106 段动画逐项对应见 [核查结果](themes/dsh-whale-chan/merzlin-audit.json)。
- MerZlin 项目 MIT 原文见 [licenses/MerZlin-MIT.txt](licenses/MerZlin-MIT.txt)。角色及二创素材既有署名和非商业限制继续保留。
- `Ya1.mp3`、`Ya2.mp3` 原始来源为 [MeteorNOX/DeepSeek-Balance-Whale-Widget](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget)，感谢 MeteorNOX。相关第三方声明及完整 MIT 正文随新增素材一起打入 ASAR，见 [随包声明](integrations/merzlin-media/THIRD_PARTY_NOTICES.md)。它们在桌面版中用于小鸭点击包，不当作余额动画自带音轨。

## 形象作者与素材限制

依据 [dsh-pet 上游许可说明](https://github.com/PC2005-cloud/dsh-pet#许可)：

- 鲸鱼娘／DeepSeek“大肥鱼”是社区二创，**不是 DeepSeek 官方形象**。
- 原型“溟月”出自 B 站 [上善无形](https://space.bilibili.com/4456176)。
- DeepSeek 女仆鲸鱼娘设计出自 B 站 [ZipZipPipe](https://space.bilibili.com/4168597)。
- 形象遵守 [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.zh-hans)，即署名、非商业、相同方式共享；请同时阅读[作者声明](https://www.bilibili.com/opus/1247156596114456581)。上游另外明确“素材（动画/提示词/源视频）允许开源使用，禁止商用”，并要求二创公开渠道附上原作者 GitHub 地址：https://github.com/PC2005-cloud/dsh-pet 。本项目对动画的转换不改变这些限制。

请保留这些来源和作者信息，不要把整仓库的代码许可当作素材可商用的授权。其他第三方名称、商标与权利归其各自权利人所有。
