# 烧烤店记账

## 给执行 agent

按本文实现，放在当前分支。范围以本文为准，不要再加支付、打印、库存、折扣、备注、顾客端或服务端数据库。

完成后跑：

- 新增测试：`node --import tsx --test src/lib/bbq/*.test.ts`
- `nr check`

不要跑 `nr build`。不要提交，除非用户另说。

## 目标

烧烤店老板在已登录的内网后台自己记账：维护菜品，从已上架菜单给 1 到 8 号座或打包带走开单，手动标记订单是否做完，并按营业日回看。金额由系统按整数分计算，总额在界面上最大、最醒目。

顾客不点单。只有老板操作。

## 已确认决策

- 进行中订单不限张数。同一座号可以同时有多张进行中订单。
- 状态只有 `open`（进行中）和 `done`（已完成）。状态只供老板区分哪些单还没做完，不锁定明细。两种状态都可以改座号、加减菜、改数量、删除整单。
- 金额用整数「分」保存和计算。展示为人民币元，固定两位小数。总额字号大于页面上其他文字。
- 每个菜品必须指定单价和单位。单位是 trim 后非空的自由文本，例如「串」「份」「瓶」。
- 记账数据只存在这台浏览器的 IndexedDB 里，不上传服务器，也不使用 Turso、`localStorage` 或 tRPC。数据留在本机，读写不走网络。
- 老板可以导出、导入一份 JSON 备份。导出下载当前全部数据。导入按每条记录的 `id` 合并：文件里有、本机也有的同 `id` 用文件内容替换；文件里有、本机没有的 `id` 追加；本机有、文件里没有的记录保留。
- 领域类型、金额、营业日和文档读写都是纯函数，不依赖浏览器、Turso、tRPC 或 Next.js。IndexedDB 只通过 Dexie，出现在 `src/lib/bbq/idb-store.ts`。
- 个人使用，不做锁、队列、缓存或并发控制。
- 界面文案用中文硬编码，不走 Lingui，不跑 `nr lingui:extract`。
- 页面放在 `src/app/[lang]/admin/bbq/`。这是单路由功能，组件留在该路由的 `_components`，不放进 `packages/biz-ui`。

## 不做

顾客下单、支付、收款、小票打印、库存、折扣抹零、会员、后厨状态、订单备注、多门店、新角色、删除菜系、服务端数据库、高并发方案、折叠屏折痕专用布局。

## 营业日

时区固定 `Asia/Shanghai`。用纯函数计算，不读浏览器时区。

设本地时间为 `t`：

| 条件 | `businessDayKey` | 界面标题 |
|---|---|---|
| 当天 12:00 ≤ t < 次日 03:00 | 开始日的 `YYYY-MM-DD` | `YYYY-MM-DD` 营业日 |
| 当天 03:00 ≤ t < 当天 12:00 | `YYYY-MM-DD#off` | `YYYY-MM-DD` 非营业时段 |

例：北京时间 2026-10-10 02:30 的 `businessDayKey` 是 `2026-10-09`。2026-10-10 03:00 的 key 是 `2026-10-10#off`。2026-10-10 12:00 的 key 是 `2026-10-10`。

函数放在 `src/lib/bbq/business-day.ts`：

- `businessDayKey(openedAt: Date): string`
- `businessDayLabel(key: string): string`，返回上面的中文标题
- `currentBusinessDayKey(now: Date): string`
- `shiftBusinessDayKey(key: string, direction: -1 | 1): string` 按时间顺序移动一档。顺序是 `YYYY-MM-DD#off`（当天 03:00–12:00），然后同一个日期的 `YYYY-MM-DD`（当天 12:00–次日 03:00），然后下一天的 `#off`。例如 `2026-10-09` 加一档是 `2026-10-10#off`，再加一档是 `2026-10-10`。减一档走相反方向。

`openedAt` 存 UTC ISO 字符串。归类时先换算到上海时区。

## 金额

函数放在 `src/lib/bbq/money.ts`。文档读写和 IndexedDB 适配都调用这里，不各自写公式。

- `priceCents`、`quantity`、`lineCents`、`totalCents` 都是整数。
- `quantity` 为大于 0 的整数。
- `priceCents` 为大于或等于 0 的整数。
- `lineCents = priceCents * quantity`
- `totalCents =` 各行 `lineCents` 之和
- `formatYuan(cents)` 返回 `¥` 加两位小数，例如 `¥12.50`
- 拒绝非整数、负数数量、负数单价

每次保存订单时，存储层用这些函数重算行金额和总额，忽略调用方传入的金额。改数量、加菜、删菜都整单重算，不在旧总额上增量加减。

开单时把当时的菜品名称、`priceCents` 和单位抄进明细。之后改名、改价、改单位或下架，已有明细保持抄下来的名称、单价和单位。

## 存储接口

`src/lib/bbq/types.ts` 与 `src/lib/bbq/store.ts` 只放类型和接口。这两个文件禁止 import `dexie`、`next`、tRPC、Lingui。

```ts
export type OrderStatus = "open" | "done";

export type Category = {
  id: string;
  name: string;
  sort: number;
  listed: boolean;
};

export type Dish = {
  id: string;
  categoryId: string;
  name: string;
  priceCents: number;
  unit: string;
  sort: number;
  listed: boolean;
};

export type OrderLine = {
  id: string;
  dishId: string | null;
  name: string;
  priceCents: number;
  unit: string;
  quantity: number;
  lineCents: number;
};

export type Order = {
  id: string;
  businessDayKey: string;
  seq: number;
  seat: number | null;
  status: OrderStatus;
  openedAt: string;
  lines: OrderLine[];
  totalCents: number;
};

export type SaveCategoryInput = {
  id?: string;
  name: string;
  sort: number;
  listed: boolean;
};

export type SaveDishInput = {
  id?: string;
  categoryId: string;
  name: string;
  priceCents: number;
  unit: string;
  sort: number;
  listed: boolean;
};

export type SaveOrderLineInput = {
  id?: string;
  dishId: string | null;
  name: string;
  priceCents: number;
  unit: string;
  quantity: number;
};

export type BbqBackup = {
  version: 1;
  categories: Category[];
  dishes: Dish[];
  orders: Order[];
};

export type SaveOrderInput = {
  id?: string;
  seat: number | null;
  status: OrderStatus;
  openedAt?: string;
  lines: SaveOrderLineInput[];
};

export interface BbqStore {
  listCategories(): Promise<Category[]>;
  saveCategory(input: SaveCategoryInput): Promise<Category>;
  listDishes(): Promise<Dish[]>;
  saveDish(input: SaveDishInput): Promise<Dish>;
  deleteDish(id: string): Promise<void>;
  listOrders(businessDayKey: string): Promise<Order[]>;
  getOrder(id: string): Promise<Order | null>;
  saveOrder(input: SaveOrderInput): Promise<Order>;
  deleteOrder(id: string): Promise<void>;
  exportBackup(): Promise<BbqBackup>;
  importBackup(backup: BbqBackup): Promise<void>;
}
```

规则：

- 新建订单不传 `openedAt` 时，用浏览器当前时间，并由此得出 `businessDayKey`。归类仍按上海时区，不按浏览器时区。已有订单更新时保留原来的 `openedAt` 和 `businessDayKey`，避免改单后跳到另一天。
- 新建订单的 `seq` 是该 `businessDayKey` 下当前最大 `seq + 1`，从 1 起。
- `seat` 只能是 `null`（打包带走）或 1 到 8。
- 菜系、菜品名称和菜品单位 trim 后不能为空。
- 保存菜品时菜系必须存在。`saveDish` 只接收整数分。菜单页的单价输入框按元填写，最多两位小数，页面在调用前换成整数分；超过两位小数时不提交，并提示金额不正确。名称、单价或单位不合法时不能上架。
- `saveOrder` 用传入的 `lines` 覆盖整张订单的明细。带 `id` 的行是修改，数量可变，名称、`priceCents` 和单位保持数据库里的原值。不带 `id` 的行是新加菜，必须有 `dishId`，且该菜品存在并已上架；名称、`priceCents` 和单位以数据库里的菜品为准，忽略调用方传入的快照值。本次未提交的旧行删除。
- 没有不关联菜品的手工行。
- 下架把 `listed` 设为 false。`deleteDish` 物理删除菜品；菜品不存在时抛 `not_found`。没有删除菜系的接口。
- 删除菜品不修改历史订单明细。历史明细继续保留下单时抄入的菜名、单价和单位；删除后的菜品不能再加入新订单。
- 删除订单同时删除其明细。进行中和已完成都可以删。
- `listCategories`、`listDishes` 按 `sort` 升序，相同则按名称。
- `listOrders` 先 `open` 后 `done`，同一状态内按 `openedAt` 降序。
- `importBackup` 按 `id` 合并，不删除本机独有的记录。菜系、菜品、订单各自按 `id` 合并。订单对上之后，明细再按明细 `id` 合并：同 `id` 替换，新 `id` 追加，本机独有的明细保留。合并后的订单总额用合并后的明细重算。文件校验失败时不写入任何数据。

错误用一个 `BbqStoreError`，`code` 为：

- `storage_failed`
- `invalid_backup`
- `not_found`
- `invalid_seat`
- `invalid_money`
- `invalid_name`
- `category_not_found`
- `dish_unavailable`

## IndexedDB

客户端用 Dexie 操作 IndexedDB。安装：`ni dexie`。

只有 `src/lib/bbq/idb-store.ts` 可以 import `dexie`，并且只被客户端组件引用。不手写 `indexedDB.open`。

```ts
const db = new Dexie("bbq");
db.version(1).stores({
  categories: "id, sort, name",
  dishes: "id, categoryId, sort, name",
  orders: "id, businessDayKey, status, openedAt, seat",
});
```

订单对象里嵌着 `lines`，不单独建明细表。主键用 `crypto.randomUUID()`。时间用 ISO 字符串。读写用 Dexie 的 `toArray`、`get`、`put`、`bulkPut`、`delete`。导入合并后用 `bulkPut` 写回命中的记录，不 `clear` 整张表。

当前分支可能已在浏览器里留下不含 `unit` 的开发数据。读取这类旧菜品和旧订单明细时统一补为「份」，避免已有本机数据导致页面打不开；之后的新增、编辑和备份导入都要求显式单位。

`src/lib/bbq/document.ts` 放纯函数 `mergeBackup(current, incoming): BbqDocument`，测试直接调用它。`idb-store.ts` 用 Dexie 读出当前文档，调用 `mergeBackup`，再写回。IndexedDB 打不开时抛 `storage_failed`，页面显示「本机数据库打不开」。

## 备份 JSON

`exportBackup` 返回：

```ts
{
  version: 1,
  categories: Category[],
  dishes: Dish[],
  orders: Order[]
}
```

页面把这份对象 `JSON.stringify` 后下载，文件名 `bbq-backup-YYYY-MM-DD.json`。

导入先 `JSON.parse`，校验失败抛 `invalid_backup`，本机数据保持原样。校验要求：

- `version === 1`
- 三个数组都存在
- 每条菜系、菜品、订单、明细都有非空字符串 `id`
- 每条菜品和订单明细都有 trim 后非空的 `unit`
- 同一数组内 `id` 不重复；同一订单的明细 `id` 不重复
- 金额、数量、座号、状态符合上面的规则
- 每条明细的 `lineCents` 等于 `priceCents * quantity`
- 菜品的 `categoryId` 能在「本机菜系 ∪ 文件菜系」里找到

通过校验后按 `id` 合并：

| 记录 | 同 `id` | 文件有、本机没有 | 本机有、文件没有 |
|---|---|---|---|
| 菜系 | 用文件记录替换 | 追加 | 保留 |
| 菜品 | 用文件记录替换 | 追加 | 保留 |
| 订单 | 座号、状态、开单时间、营业日、单号用文件记录替换，明细再按下表合并 | 追加整张订单 | 保留 |
| 订单明细 | 用文件明细替换 | 追加到该订单 | 保留在该订单 |

明细合并完成后，用 `money.ts` 重算该订单的 `totalCents`。文件里的 `totalCents` 不作为合并结果。

确认文案：「把备份按编号合并进当前记账数据？」。取消则不写入。

## 页面

管理首页 `src/app/[lang]/admin/page.tsx` 的 `tools` 增加一项：

- `href`: `/admin/bbq`
- `title`: 烧烤记账
- `description`: 上架菜单，按座号记账

路由：

| 路径 | 作用 |
|---|---|
| `/admin/bbq` | 当前营业日的订单列表。可用 `?day=` 切换 `businessDayKey` |
| `/admin/bbq/orders/new` | 开单 |
| `/admin/bbq/orders/[id]` | 改单 |
| `/admin/bbq/menu` | 菜品 |

`/admin/bbq` 默认 `day` 为 `currentBusinessDayKey(new Date())`。提供上一档、下一档，调用 `shiftBusinessDayKey`。标题用 `businessDayLabel`。

列表每张卡片显示：单号、座号、状态、开单时间（上海时区 `HH:mm`）、总额。进行中排在前面。空列表写「这一档还没有订单」。本机数据库打不开时显示「本机数据库打不开」，不渲染会失败的空表单。

列表页提供「导出备份」和「导入备份」。导入选择 `.json` 文件，确认后按 `id` 合并。校验失败时显示「备份文件不正确」，本机数据不变。

开单页：

- 8 个座号按钮外加「打包」，选中态明确。新单默认打包；不选座号也能保存。
- 直接列出全部 `listed` 菜品，不按菜系分组，也不受菜系上架状态影响。
- 菜品按钮显示菜名和 `¥单价/单位`。
- 点菜品即加入明细，数量默认 1。同一菜品再点则数量加 1，沿用第一次抄下的单价。
- 每行可减到删除、可加数量。
- 状态默认进行中，可用一个开关标成已完成。
- 保存后回到该订单的营业日列表。

改单页读已有订单，座号、明细、状态都可改，保存后仍留在原来的营业日。提供删除，删除前用 `window.confirm`，确认文案「删除这张订单？」。删除后回到该营业日列表。

菜单页：

- 不展示或编辑菜系，只显示一个菜品表格。
- 没有菜系记录时自动创建一个内部默认菜系；新增菜品自动关联该内部菜系。
- 新增菜品：名称、单价（元，输入后换成整数分）、单位、排序、上架开关。
- 默认以紧凑列表展示已有菜品，每行显示菜名、`¥单价/单位` 和上架状态；点击菜品进入编辑状态。
- 已有项可改名、改排序、改价、改单位、上下架。保存成功后立即刷新列表和点单菜单。
- 新增和编辑都只在点击「保存」后提交；输入框失焦、按回车或切换上架状态都不自动保存。
- 名称、单价和单位均合法且保存成功后，菜品才能上架。
- 每个已有菜品提供「删除」按钮，新菜品空行不显示。删除前用 `window.confirm`，确认文案「删除这个菜品？」；确认后删除并刷新菜单列表。
- 菜系没有界面入口。菜品下架后点单菜单不再出现该项。
- 菜单保存或删除成功后发送同页菜单变更事件。已被浏览器返回缓存恢复的开单/改单页监听该事件并重新读取菜品，避免继续显示进入菜单前的旧数据。
- 菜单在手机上使用两列字段卡片，不产生横向滚动；在 `md` 及以上宽度使用六列网格。新增菜品区域置顶并用虚线边框区分，已有菜品列表在其下方。

## 小屏幕

老板主要在手机上操作。只按宽度分两级，不做折叠屏、Viewport Segments 或折痕适配。

- 宽度小于 `768px`：单列。列表、开单、菜单各自占满一屏。开单页把座号和明细放在菜单上面。开单和改单的总额条固定在视口底部，并加上 `env(safe-area-inset-bottom)`。
- 宽度大于或等于 `768px`：左列菜单或列表，右列订单，右列底部固定总额。

订单页在双栏时：左列已上架菜单，右列座号、明细、状态、总额。列表页在双栏时：左列该营业日订单，右列所选订单的摘要和总额，并链到改单页。未选择订单时，右列显示「选择一张订单」。窄屏不出现左右分栏，用页面跳转。菜单管理页在所有宽度下保持单列，内容区 `max-w-lg`。

`src/app/[lang]/admin/layout.tsx` 的 `main` 改为紧凑边距，避免手机上 `py-20` 把操作区顶出首屏：

现有 class 顺序保持不变，只把 `px-6 py-20` 换成 `px-4 py-4 sm:px-6 lg:py-20`。`max-w-6xl` 留在原位。

账号页仍走这个壳，只接受边距变化。

触控：座号、加减数量、菜品、保存、状态开关的可点区域至少 `44px`（`min-h-11`）。输入字号不小于 `16px`，避免 iOS 聚焦时放大页面。

总额：

- 开单和改单的总额使用 `text-4xl font-semibold tabular-nums`，放在固定底栏，底栏不透明，滚动明细时仍然可见。
- 列表卡片总额使用 `text-2xl font-semibold tabular-nums`。进行中用 `text-foreground`，已完成用 `text-muted-foreground`，字号不变。
- 金额始终通过 `formatYuan` 输出。

样式只用 Tailwind。需要变量时写 `const someCls = cls\`...\``。不重排已有 class。

## 测试

用 `node:test` 与 `node:assert/strict`，不新增测试框架。

`business-day.test.ts` 至少覆盖：

- 12:00 整点进入当天营业日
- 次日 02:59 仍属于前一天营业日
- 03:00 进入当天非营业时段
- 11:59 仍是非营业时段
- `shiftBusinessDayKey` 从营业日跨到下一天的非营业时段，再跨回营业日

`money.test.ts` 至少覆盖：行金额、总额重算、`formatYuan`、拒绝小数数量。

`document.test.ts` 用内存文档覆盖业务规则，不打开 IndexedDB：

- 上架菜品后能开单，总额等于各行之和；内部菜系是否上架不影响点单
- 菜品缺少单位时不能保存或上架
- 开单时把菜品单位抄入明细，之后修改菜品单位不影响旧订单
- 改价后旧订单明细单价不变，新单使用新单价
- 下架菜品不能加入新单
- 删除菜品后不能加入新单，已有订单仍保留该菜品的名称、价格和单位快照
- 同一座号可以有两张 `open` 订单
- 改数量后总额按明细重算
- `listOrders` 为进行中在前、同状态内新单在前
- 02:30 上海时区的新单落入前一营业日 key
- 导入时同 `id` 被文件替换，新 `id` 被追加，本机独有的菜系、菜品、订单和明细都还在
- 明细合并后订单总额按合并结果重算
- 非法备份不会改动当前文档

## 验收

- 管理首页能进入烧烤记账。
- 能为菜品指定单价和单位；菜单列表显示 `¥单价/单位`。
- 能上架菜品，下架后点单菜单不再显示，历史订单仍显示原名、原价和原单位。
- 从下单页进入菜单添加菜品后，用浏览器返回，下单页无需刷新即可看到新菜品。
- 能删除单个菜品；删除后点单菜单不再显示，历史订单不变。
- 能为 1 到 8 号座或打包带走开出任意张进行中订单，同一座号不互相阻挡。
- 状态可在进行中与已完成之间切换，切换后仍能改明细。
- 列表默认进入当前营业日；12:00 到次日 03:00 的单在同一档；03:00 到 12:00 的单在非营业时段。
- 进行中在前，同状态内开单时间倒序。
- 总额与明细整数分一致，底栏或卡片上的总额明显大于其他文字。
- 宽度小于 `768px` 为单列，总额贴底且避开安全区。宽度大于或等于 `768px` 为左右两栏。
- 导出得到版本为 1 的 JSON。导入按 `id` 合并：同号替换，新号追加，本机多出来的记录还在。非法文件不改本机数据。
- 页面只通过 `BbqStore` 读写。IndexedDB 只通过 Dexie，出现在 `idb-store.ts`。
