# 基于 Qwen-VL 的人体动作识别与安全风险评估系统

这是一个可部署到 GitHub Pages 的纯前端智能体应用。用户在页面中填写阿里云百炼 / DashScope API Key，上传人体动作图片或短视频，系统调用 Qwen-VL 系列模型输出动作识别、风险等级、分析依据和安全建议。

## 项目定位

- 应用类型：专业功能型智能体
- 应用场景：工地安全、实验室安全、养老看护、校园公共区域安全分析
- 核心能力：人体动作识别、异常动作判断、安全风险评估、结构化 JSON 输出
- 非目标：不做人脸识别，不判断人物身份，不作为执法或医疗诊断工具

## 功能

1. 支持用户在页面填写 API Key 后调用模型。
2. 支持图片上传并自动压缩为 Base64 Data URL。
3. 支持短视频上传并在浏览器端抽取 4、6 或 8 帧关键帧。
4. 支持选择模型：`qwen3-vl-plus`、`qwen3-vl-flash`、`qwen-vl-plus`、`qwen-vl-max`、`qwen3.7-plus`。
5. 输出动作、类别、风险等级、置信度、人数估计、识别依据、建议和相关标签。
6. 支持复制结构化 JSON。

## 文件结构

```text
qwen-vl-action-recognition/
├── index.html
├── style.css
├── app.js
├── README.md
└── .nojekyll
```

## 使用方法

1. 打开网页。
2. 填写 DashScope / 百炼 API Key。
3. 保持默认接口地址，或按你的地域和业务空间 ID 修改接口地址。
4. 上传图片或短视频。
5. 点击“开始识别”。
6. 查看动作识别与风险评估结果。

## API 接口说明

默认接口地址：

```text
https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
```

如果使用阿里云百炼推荐的业务空间专属域名，需要将页面里的接口地址改成类似下面的形式：

```text
https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions
```

其中 `{WorkspaceId}` 替换为你的真实业务空间 ID。

## GitHub Pages 部署

1. 新建 GitHub 仓库，例如 `qwen-vl-action-recognition`。
2. 上传本项目全部文件到仓库根目录。
3. 打开仓库 `Settings`。
4. 进入 `Pages`。
5. `Build and deployment` 选择：
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
6. 保存后等待部署完成。
7. 访问 GitHub Pages 生成的公开 URL。

## 安全说明

这个版本为了满足 GitHub Pages 纯静态部署需求，API Key 由用户在浏览器页面中填写。它适合课程作业、个人演示或本地测试，但不适合正式生产环境。

正式部署时，建议使用 Cloudflare Workers、Vercel Serverless Function 或阿里云函数计算作为后端代理，把 API Key 放在后端环境变量中，前端不要直接接触 API Key。

## 可能的问题

### 1. CORS 报错

如果浏览器提示 CORS 跨域错误，说明当前模型接口不允许前端页面直接调用。解决办法是增加一个后端代理接口。

### 2. 视频太大导致请求失败

建议上传 10 秒以内的短视频，并把抽帧数量设置为 4 或 6 帧。

### 3. 输出不是 JSON

可重新点击识别，或把任务提示词中的“必须只输出严格 JSON”进一步加重。

## 示例输出

```json
{
  "action": "弯腰搬运",
  "category": "劳动动作",
  "risk_level": "中风险",
  "confidence": 0.82,
  "persons_count": 1,
  "scene": "室内搬运场景",
  "description": "人物弯腰接触物体，疑似正在搬运，腰背弯曲明显。",
  "suggestion": "建议屈膝下蹲并保持背部挺直，避免腰部受力过大。",
  "evidence": ["人体上身前倾", "手部靠近物体"],
  "labels": ["弯腰", "弯腰搬运"]
}
```
