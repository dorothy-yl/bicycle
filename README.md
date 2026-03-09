# Treadmill 跑步机智能面板小程序

一个基于涂鸦（Tuya）智能面板 SDK 开发的跑步机控制小程序，提供完整的运动数据监控、目标设置、历史记录等功能。

## 📋 项目简介

Treadmill 是一个智能跑步机控制面板应用，支持实时监控运动数据（时间、距离、速度、卡路里、心率等），提供目标设置、运动记录、FTMS 连接等丰富功能。

## ✨ 主要功能

- **首页概览**：显示今日运动时间和距离统计
- **运动模式**：实时监控运动数据（速度、卡路里、心率、功率、阻力等）
- **目标设置**：支持设置时间、距离、卡路里等运动目标
- **历史记录**：查看历史运动记录和详细数据
- **FTMS 连接**：支持 FTMS 协议连接
- **日程提醒**：设置运动提醒和日程安排
- **多语言支持**：支持中文和英文

## 🛠️ 技术栈

- **框架**：涂鸦智能面板小程序
- **UI 组件**：`@tuya-miniapp/miniapp-components-plus`
- **手势库**：`@tuya-miniapp/miniapp-gesture`
- **状态管理**：`@tuya-miniapp/redux-connect-page`
- **API**：`@tuya/tuya-panel-api`
- **国际化**：自定义 i18n 工具

## 📁 项目结构

```
Treadmill/
├── app/                          # 应用主目录
│   ├── app.js                    # 应用入口文件
│   ├── app.json                  # 应用配置文件
│   ├── assets/                   # 静态资源
│   │   ├── icons/               # 图标资源
│   │   └── *.png, *.svg         # 图片资源
│   ├── components/              # 组件目录
│   │   └── bottom-nav/          # 底部导航组件
│   ├── i18n/                    # 国际化文件
│   │   └── strings.json         # 多语言字符串
│   ├── pages/                   # 页面目录
│   │   ├── index/               # 首页
│   │   ├── exercise/            # 运动页面
│   │   ├── history/             # 历史记录
│   │   ├── history-detail/      # 历史详情
│   │   ├── goal/                # 目标设置
│   │   ├── target/               # 目标模式
│   │   ├── ftms/                # FTMS 连接
│   │   ├── alarm/               # 闹钟/提醒
│   │   └── congrats/            # 完成页面
│   └── utils/                   # 工具类
│       ├── i18n.js              # 国际化工具
│       └── cloudSync.js         # 云同步工具
├── packages/                    # 本地包
│   └── tuya-panel-kit-stub/    # 涂鸦面板工具包
├── scripts/                     # 脚本目录
│   └── create-tuya-panel-kit-stub.js
├── package.json                 # 项目依赖配置
└── project.tuya.json            # 涂鸦项目配置
```

## 🚀 快速开始

### 环境要求

- Node.js (推荐 v14+)
- 涂鸦开发者账号
- 涂鸦智能面板开发工具

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd Treadmill
```

2. **安装依赖**
```bash
npm install
```

安装完成后会自动执行 `postinstall` 脚本，创建涂鸦面板工具包。

3. **配置项目**

在 `project.tuya.json` 中配置你的涂鸦项目信息：
- `projectname`: 项目名称
- `baseversion`: 基础版本
- `dependencies`: SDK 依赖版本

4. **运行项目**

使用涂鸦智能面板开发工具打开项目，进行预览和调试。

## 📱 页面说明

### 首页 (`pages/index`)
- 显示今日运动时间和距离
- 提供快速开始、目标模式、FTMS 等快捷入口
- 实时接收设备 DP 点数据更新

### 运动页面 (`pages/exercise`)
- 实时显示运动数据：速度、卡路里、心率、功率、阻力等
- 支持开始/暂停/停止运动
- 目标达成提醒

### 历史记录 (`pages/history`)
- 查看历史运动记录列表
- 支持查看详细运动数据

### 目标设置 (`pages/goal`)
- 设置运动目标（时间、距离、卡路里）
- 支持目标模式选择

### FTMS 连接 (`pages/ftms`)
- 支持 FTMS 协议设备连接

### 日程提醒 (`pages/alarm`)
- 设置运动提醒和日程安排

## 🔌 设备通信

项目通过涂鸦 DP 点（数据点）与设备进行通信：

- **DP 103**: 距离（单位：米，显示时转换为公里）
- **DP 104**: 运动时间（单位：秒）

在 `pages/index/index.js` 中监听设备数据变化：

```javascript
onDpDataChange((event) => {
  // 处理 DP 点数据变化
  const dpID = formatDpState(event.dps);
  // 更新页面数据
});
```

## 🌐 国际化

项目支持多语言，目前支持：
- 中文 (zh)
- 英文 (en)

语言文件位于 `app/i18n/strings.json`，应用启动时会根据系统语言自动加载对应语言包。

### 添加新语言

1. 在 `app/i18n/strings.json` 中添加新的语言键值对
2. 在 `app/utils/i18n.js` 中配置语言映射

## 📦 依赖说明

### 主要依赖

- `@tuya-miniapp/miniapp-components-plus`: 涂鸦小程序组件库
- `@tuya-miniapp/miniapp-gesture`: 手势识别库
- `@tuya-miniapp/redux-connect-page`: Redux 页面连接
- `@tuya/tuya-panel-api`: 涂鸦面板 API

### 涂鸦 SDK 版本

- BaseKit: 3.0.6
- MiniKit: 3.0.7
- BizKit: 4.2.0
- DeviceKit: 4.6.1

## 🔧 开发说明

### 添加新页面

1. 在 `app/pages/` 目录下创建新页面文件夹
2. 创建页面文件：`*.js`, `*.json`, `*.tyml`, `*.tyss`
3. 在 `app/app.json` 的 `pages` 数组中注册页面路径

### 使用国际化

在页面中使用国际化：

```javascript
const I18n = require('../../utils/i18n.js');
// 或使用全局 I18n
const I18n = global.I18n;

// 获取翻译文本
const text = I18n.t('key');
```

## 📝 注意事项

1. **设备连接**：确保设备已正确连接到涂鸦云平台
2. **DP 点配置**：确保设备 DP 点配置与代码中的 DP 点 ID 一致
3. **权限配置**：某些功能可能需要特定的设备权限
4. **调试模式**：开发时可以使用涂鸦开发工具的远程调试功能

## 📄 许可证

ISC

## 👥 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 联系方式

如有问题或建议，请通过 Issue 反馈。

---

**注意**：本项目基于涂鸦智能面板 SDK 开发，使用前请确保已注册涂鸦开发者账号并完成相关配置。
