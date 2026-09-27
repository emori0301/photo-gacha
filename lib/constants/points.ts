/** 新規ユーザーの初期ポイント */
export const DEFAULT_USER_POINTS = 10;
/** ガチャ 1 回に必要なポイント */
export const PACK_OPEN_COST = 5;
/** ガチャ 1 回で排出されるカード枚数 */
export const CARDS_PER_PULL = 5;
/** 写真を登録したときのボーナス（削除すると返却） */
export const IMAGE_UPLOAD_REWARD = 1;
/** パックを作ったときのボーナス（削除すると返却） */
export const PACK_CREATE_REWARD = 5;
/** ボーナスを受け取れる 1 日あたりの回数（作成と削除を繰り返して稼げないように） */
export const IMAGE_REWARD_DAILY_LIMIT = 10;
export const PACK_REWARD_DAILY_LIMIT = 3;
/** シャッター連打: 何回で報酬になるか */
export const TAP_TARGET = 10;
/** シャッター連打: 1 セットの報酬 */
export const TAP_REWARD = 1;
/** シャッター連打: 報酬を受け取れる最短間隔（10 回押すのにかかる時間の目安） */
export const TAP_COOLDOWN_MS = 2000;
/** シャッター連打: 1 日に受け取れる回数の上限 */
export const TAP_DAILY_LIMIT = 30;
/** 1 日 1 回のログインボーナス */
export const DAILY_BONUS = 5;
