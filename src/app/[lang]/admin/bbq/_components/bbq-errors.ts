import { BbqStoreError } from "@/lib/bbq/store";

export function bbqErrorMessage(error: unknown): string {
  if (!(error instanceof BbqStoreError)) return "本机数据库打不开";
  switch (error.code) {
    case "storage_failed":
      return "本机数据库打不开";
    case "invalid_backup":
      return "备份文件不正确";
    case "invalid_name":
      return "名称不能为空";
    case "invalid_seat":
      return "座号只能空着或选 1 到 8";
    case "invalid_money":
      return "金额不正确";
    case "category_not_found":
      return "菜系不存在";
    case "dish_unavailable":
      return "这个菜现在不能点";
    case "not_found":
      return "没有找到这张订单";
  }
}
