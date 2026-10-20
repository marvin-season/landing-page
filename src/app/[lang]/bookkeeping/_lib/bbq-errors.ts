import type { I18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { BbqStoreError } from "@/lib/bbq/store";

export function bbqErrorMessage(i18n: I18n, error: unknown): string {
  if (!(error instanceof BbqStoreError)) return i18n._(msg`本机数据库打不开`);
  switch (error.code) {
    case "invalid_group_name":
      return i18n._(msg`分组名称不能为空，最多 10 个字符`);
    case "invalid_group_settings":
      return i18n._(msg`分组设置不正确`);
    case "group_exists":
      return i18n._(msg`分组已存在`);
    case "invalid_cleanup_range":
      return i18n._(msg`请选择有效的起止日期，开始日期不能晚于结束日期`);
    case "tag_in_use":
      return i18n._(msg`标签仍有项目或历史明细使用，无法删除`);
    case "tag_not_found":
      return i18n._(msg`标签不存在，请重新选择`);
    case "tag_exists":
      return i18n._(msg`标签已存在`);
    case "storage_failed":
      return i18n._(msg`本机数据库打不开`);
    case "invalid_backup":
      return i18n._(msg`备份文件不正确`);
    case "invalid_name":
      return i18n._(msg`名称不能为空`);
    case "invalid_seat":
      return i18n._(msg`座号只能空着或选 1 到 8`);
    case "invalid_calories":
      return i18n._(msg`热量应为有效数字（kcal），支持负数`);
    case "invalid_money":
      return i18n._(msg`金额不正确`);
    case "category_not_found":
      return i18n._(msg`分类不存在`);
    case "dish_unavailable":
      return i18n._(msg`这个项目当前不可用`);
    case "not_found":
      return i18n._(msg`没有找到这条记录`);
  }
}
