# 上游音效核查与接入

## 核查结论

2026-10-30 核对 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet) 的 main，固定到提交 `34cf7ec4dd1ca99a9a9ac5bcb4571d887862e226`：

- 仓库随附一段统一点击音效：[click-duck.wav](https://github.com/PC2005-cloud/dsh-pet/blob/34cf7ec4dd1ca99a9a9ac5bcb4571d887862e226/dsh-pet/assets/sound/click-duck.wav)。[点击代码](https://github.com/PC2005-cloud/dsh-pet/blob/34cf7ec4dd1ca99a9a9ac5bcb4571d887862e226/dsh-pet/src/client/pet/click-sound.ts) 使用 50% 音量和 100 ms 连点节流。
- 没有找到“动画文件名 → 独立音效”的配置。GIF 本身不携带音轨；上游实际动画使用透明视频，[视频元素](https://github.com/PC2005-cloud/dsh-pet/blob/34cf7ec4dd1ca99a9a9ac5bcb4571d887862e226/dsh-pet/src/client/pet/card/view.ts) 也统一设为 `muted: true`。因此小提琴、吹笛、舞蹈、吃饭等动作不额外添加猜测的声音。本次没有声称逐一探测了全部源视频的音轨。
- [聊天语音](https://github.com/PC2005-cloud/dsh-pet/blob/34cf7ec4dd1ca99a9a9ac5bcb4571d887862e226/FEATURES.md) 是按文本另行生成的 TTS，不是动画自带录音，本次不接入聊天语音服务。

## 实施与使用

执行计划：核对资源与触发代码；为原音效完整性、音量、静音和连点补回归；替换点击反馈声音；更新本机动画版、文档、署名和 GitHub。

主题升级到 1.5.3，保留已有单击/多击和挠痒反馈的触碰音触发点，将原来的合成短音替换为上游原版“嘎嘎”声，不叠加两种声音。声音对应直接触碰反馈，不会因每次动画循环或右键点播普通动画而反复播放。

- 音量为应用主音量乘以 0.5；全局静音、免打扰及 `petInteractions.clickSound: false` 均可关闭。
- 100 ms 内连点最多触发一次；不改变单击、双击、四连击动画判定。
- WAV 约 345 ms，单声道、44.1 kHz、16 位 PCM，共 30,514 字节；按原字节复制，无重新编码。
- 上游音效打包进应用 ASAR，本地离线播放，不依赖运行时网络下载。

来源记录：[dsh-click-duck.source.json](../integrations/dsh-click-duck.source.json)。SHA-256：`f1dafe05dfaa696b190e127800c48513e192d3efb521c246d1eaf86a4589b617`；Git blob：`1f63b736f8589bdc8c2341ff1d4c5557bc663a61`。原作者与许可声明见 [致谢](../ACKNOWLEDGEMENTS.md)，原素材限制保持不变。

## 验证

77 项 Node 测试通过：验证 WAV 与固定上游版本字节一致、播放地址正确、音量随主音量变化、静音/免打扰/主题开关生效、100 ms 连点节流，以及既有动画、甩抛、额度与气泡回归。安装时另核对 ASAR 内音效哈希、播放接线和本机签名；自动化验证不代表已人工听辨扬声器输出。

已更新并重启本机动画版，当前主音量开启、未静音；上述 ASAR 哈希、播放接线、脚本语法与签名检查通过。更新前应用和主题备份于用户数据目录 `app-backups/upstream-sound-v153-20261030-141656/`。原版 Clawd 应用保留。
