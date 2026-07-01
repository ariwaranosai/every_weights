# Every Weights

一个公开 GitHub Pages 静态体重追踪页面。数据按每人一个 JSON 文件维护，页面自动统计体重曲线、起始变化百分比和 BMI。

## 维护数据

每个人只需要修改自己的文件：

```text
src/data/people/<id>.json
```

格式示例：

```json
{
  "id": "alice",
  "displayName": "佐为",
  "avatarUrl": "avatars/sai.svg",
  "heightCm": 168,
  "records": [
    { "date": "2026-07-01", "weightKg": 65.2 },
    { "date": "2026-07-04", "weightKg": 64.9 }
  ]
}
```

公开仓库会公开这些原始数据，建议使用昵称。

`avatarUrl` 可以是外链，也可以是 `public/` 目录下的相对路径。比如头像文件放在 `public/avatars/alice.svg`，这里就填写 `avatars/alice.svg`。图表会把头像展示在每个人最新记录的点位上。

## 本地运行

```bash
npm install
npm run validate:data
npm run typecheck
npm run build
npm run dev
```
