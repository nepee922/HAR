# 基于 Qwen-VL 的人体康复动作识别系统

这是一个可部署到 GitHub Pages 的纯前端智能体应用。用户只需要在页面中填写阿里云百炼 / DashScope API Key，上传康复训练图片或短视频，系统会调用 Qwen-VL 系列模型输出康复动作、训练部位、动作规范性、风险等级、识别依据和纠正建议。

## 项目定位

- 应用类型：专业功能型智能体
- 应用场景：人体康复训练辅助观察、动作规范性反馈、居家康复训练记录、康复教学演示
- 核心能力：康复动作识别、训练部位判断、动作规范性评估、风险提示、结构化 JSON 输出
- 非目标：不做人脸识别，不判断人物身份，不进行疾病诊断，不替代医生或康复治疗师

## 功能

1. 页面只需要填写 API Key，不需要用户配置模型或接口地址。
2. 支持图片上传并自动压缩为 Base64 Data URL。
3. 支持短视频上传并在浏览器端抽取 4、6 或 8 帧关键帧。
4. 默认调用 `qwen3-vl-plus`。
5. 支持常见康复动作识别，例如坐站转换、步行训练、直腿抬高、踝泵、抬臂、屈肘、下蹲和平衡训练。
6. 输出康复动作、训练部位、训练类别、动作规范性、风险等级、置信度、识别依据、纠正建议和相关标签。
7. 支持复制结构化 JSON。

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
3. 上传康复动作图片或短视频。
4. 点击“开始识别”。
5. 查看康复动作分析结果。

## API 接口说明

页面已经固定使用以下 OpenAI 兼容接口地址：

```text
https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
```

默认模型：

```text
qwen3-vl-plus
```

如需改成其他模型或业务空间专属域名，可在 `app.js` 顶部修改：

```javascript
const DEFAULT_ENDPOINT = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const DEFAULT_MODEL = 'qwen3-vl-plus';
```

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

不要把 API Key 写死到 `app.js`，也不要提交到 GitHub 仓库。

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
  "action": "坐站转换",
  "body_part": "下肢",
  "category": "功能性训练",
  "standardness": "基本规范",
  "risk_level": "低风险",
  "confidence": 0.86,
  "persons_count": 1,
  "scene": "室内康复训练场景",
  "description": "人物由坐姿向站姿过渡，膝髋关节参与明显。",
  "correction": "起身时保持躯干稳定，双脚踩实，避免膝关节内扣。",
  "rehab_note": "训练中应控制速度，必要时在治疗师或家属保护下完成。",
  "evidence": ["人物位于椅子前方", "下肢和躯干正在协同发力"],
  "labels": ["坐站转换", "下肢训练"]
}
```
