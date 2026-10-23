# Flux Atlas · 三维聚变平衡实验室

基于两篇论文公式实现的静态理想 MHD 解析平衡浏览器：交互式三维磁面、磁力线动画、论文图例预设和参数扫描。无需安装依赖。

## 使用

- 离线：下载 `dist/flux-atlas-offline.html`，用现代浏览器打开。
- 本机预览：安装 Node.js 后运行 `node serve.cjs`，访问终端显示的地址。
- 在线版：仓库启用 GitHub Pages 后，由部署工作流提供访问地址。

## 功能

- 两类平衡模型：恒定旋转变换与具有磁剪切的平衡；各自支持对称性破缺参数。
- 论文图册覆盖第一篇图 1–2、第二篇图 1–8，共 42 个可载入预设，显示论文版本及图号。
- 三维磁面与磁轴、静态场线动画、固定几何环向角截面、压力剖面与 Poincaré 截点。
- 多参数旋转变换曲线、局部磁剪切、体积和体积平均 beta 扫描、Hamada 积分及体积平均量。
- 导出参数、曲线和诊断 JSON、扫描 CSV、三维视图 PNG。

图册保留论文参数供对照；点击“载入”同步三维工作区，修改滑块后工作区显示自定义参数。未由论文明确给出的内层磁通、场线种子和采样密度均在页面标注为展示选择。

## 模型范围与数值方法

本程序不求解随时间演化的 MHD 方程，不计算聚变反应率、稳定性、湍流或工程线圈。动画为静态磁力线上的展示标记，不代表真实粒子运动。使用无量纲坐标、μ₀ = 1、边界压力为零。

磁剪切定义为 dι/dρ，其中 ρ = ψ/δ，不能与以 √(ψ/δ) 为径向坐标的剪切定义混用。快速剖面使用 48 环向周回；精细剖面通常使用 512 周回，论文图 6 缓存使用 1024 周回 × 256 步。周回加倍差是收敛指示，不是严格误差界。

第二篇图 3 的 ε = 0.75、τ₀ = 0 位于严格磁面定义域边界；扫描留空，该参数组预设载入 τ₀ = 0.1。图册为同参数重绘，不声称逐像素复刻原图。

## 验证与构建

```sh
node verify.cjs
node verify-atlas.cjs
node build-offline.cjs
```

原有 95 项检查和新增 1,104 项检查涵盖论文数值基准、全部预设定义域、力平衡残差、磁通恒等式、积分收敛、正负破缺参数一致性及独立 Hamada 弧长积分。检查报告写入 `verification.json` 和 `atlas-verification.json`。

仅当计算方法或图例采样需要改变时，运行 `node build-atlas-data.cjs` 重新计算图 6 缓存。此操作耗时较长。

## 论文来源

1. Matt Landreman, *Analytic toroidal 3D MHD equilibria and steady Euler flows with invariant surfaces*, [arXiv:2609.26742v2](https://arxiv.org/html/2609.26742v2).
2. Opal Issan, Jonathan Citrin, Matt Landreman, Brendan Tracey, *Analytic non-axisymmetric 3D MHD equilibria without stellarator symmetry*, [arXiv:2610.07304v1](https://arxiv.org/html/2610.07304v1).

上述论文采用 CC BY 4.0。程序依据公式独立实现；解析解的研究成果归原论文作者。公开仓库不意味着本程序另行授予软件开源许可证。