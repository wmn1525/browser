import type { ProfileDetail, ProfileDraft } from '../../../../shared/types';
import { buildRenewProfileDraft } from './profile-renew-draft';

/**
 * 生成副本的更新草稿：复用换新的随机指纹，但保留原环境的 UA、语言和时区。
 * 语言时区跟着业务地区走，随机化会让副本对不上原环境的使用场景。
 * osVersion 和 clientHintsBrandVersion 必须跟着 UA 一起保留——
 * UA 报 Chrome/140 而 Sec-CH-UA 报别的版本，本身就是可被检测的破绽。
 * name 传副本自己的名字，否则会被原环境名字覆盖、丢掉核心库加的 " (Copy)" 后缀。
 */
export function buildDuplicateProfileDraft(detail: ProfileDetail, name: string): ProfileDraft {
  const renewed = buildRenewProfileDraft(detail);
  return {
    ...renewed,
    name,
    osVersion: detail.osVersion,
    userAgent: detail.userAgent,
    timezone: detail.timezone,
    fingerprint: {
      ...renewed.fingerprint,
      language: detail.fingerprint?.language,
      languages: detail.fingerprint?.languages,
      clientHintsBrandVersion: detail.fingerprint?.clientHintsBrandVersion
    }
  };
}

/**
 * 复制环境：先让核心库忠实克隆配置，再给副本换一套随机指纹。
 * 不走 createProfile 重建，是因为草稿不携带库里已存的 cookies 数组，重建会悄悄丢数据。
 */
export async function duplicateProfileWithNewFingerprint(profileId: string): Promise<void> {
  const detail = await window.browserShell.getProfile(profileId);
  const copy = await window.browserShell.duplicateProfile(profileId);
  await window.browserShell.updateProfile(copy.id, buildDuplicateProfileDraft(detail, copy.name));
}
