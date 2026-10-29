# 独立仓库发布

项目地址：[litchi0-0/claw-desk-dsh](https://github.com/litchi0-0/claw-desk-dsh)。

## 发布范围

只发布桌宠适配源码、测试、主题和中文说明，不上传当前学习仓库的其他文章，也不上传个人账号配置、运行日志、原版或修改版应用二进制。独立项目首页由 `docs/github-README.md` 提供。

主题包含 106 项预转换动画及来源/输出哈希；当前应用补丁适配 Clawd 1.4.0，主题版本为 1.4.0。保留 AGPL 代码条款、dsh-pet MIT 原文、素材非商业声明及角色作者署名。

## 导出步骤

先提交要发布的变更，再克隆空的目标仓库。`scripts/export-github-project.py --target <目录>` 只从 Git HEAD 导出允许的路径，不会带入未提交的修改；目标必须只包含 `.git`，防止覆盖已有内容。

独立仓库中执行 `node --test tests/clawd-*.test.cjs`，核对 Markdown 相对链接、素材哈希和安装器构建；然后提交并推送目标仓库。GitHub Actions 配置会在推送和 PR 时执行 Node 调度与交互测试，尚未运行的远端检查不应宣称通过。

本次没有生成 Windows 安装包，README 明确区分 macOS 安装支持与尚未迁移的功能。未来已存在内容的仓库应使用正常 Git 修改与提交更新，不重复调用空目录导出脚本覆盖。
